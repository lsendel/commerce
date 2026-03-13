import { controlTowerContract } from "../src/contracts/control-tower.contract";
import { policiesContract } from "../src/contracts/policies.contract";
import { pricingExperimentContract } from "../src/contracts/pricing-experiment.contract";
import { fulfillmentExceptionContract } from "../src/contracts/fulfillment-exception.contract";
import { workflowsContract } from "../src/contracts/workflows.contract";
import { integrationMarketplaceContract } from "../src/contracts/integration-marketplace.contract";
import { headlessApiPacksContract } from "../src/contracts/headless-api-packs.contract";
import { storeTemplatesContract } from "../src/contracts/store-templates.contract";
import { platformContract } from "../src/contracts/platform.contract";
import { productsContract } from "../src/contracts/products.contract";
import { cartContract } from "../src/contracts/cart.contract";
import { checkoutContract } from "../src/contracts/checkout.contract";
import { reviewsContract } from "../src/contracts/reviews.contract";
import { bookingsContract } from "../src/contracts/bookings.contract";
import { authContract } from "../src/contracts/auth.contract";
import { subscriptionsContract } from "../src/contracts/subscriptions.contract";
import { analyticsContract } from "../src/contracts/analytics.contract";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type ContractRoute = {
  method: string;
  path: string;
  responses: Record<string, { safeParse: (value: unknown) => { success: boolean; error?: unknown } }>;
};

type Provider =
  | "stripe"
  | "printful"
  | "gooten"
  | "prodigi"
  | "shapeways"
  | "gemini"
  | "resend";

interface SmokeCheckResult {
  name: string;
  method: string;
  path: string;
  status: number | "contract";
  ok: boolean;
  durationMs?: number;
  attempts?: number;
  suppressed?: boolean;
  note?: string;
  owner?: string;
  tags?: string[];
}

interface SmokeLatencyMetrics {
  count: number;
  min: number | null;
  p50: number | null;
  p95: number | null;
  max: number | null;
  avg: number | null;
}

interface SmokeGroupedMetrics {
  key: string;
  total: number;
  passed: number;
  failed: number;
  suppressed: number;
}

interface SmokeOwnerLatencyRollup {
  owner: string;
  checkCount: number;
  latencyMs: SmokeLatencyMetrics;
}

interface SmokeOwnerLatencySloThreshold {
  owner: string;
  warnP95Ms: number | null;
  failP95Ms: number | null;
}

interface SmokeOwnerLatencySloBreach {
  owner: string;
  p95Ms: number;
  thresholdMs: number;
}

interface SmokeOwnerLatencySloMetrics {
  configuredOwners: number;
  warnings: SmokeOwnerLatencySloBreach[];
  failures: SmokeOwnerLatencySloBreach[];
}

interface SmokeMetrics {
  totalChecks: number;
  failedChecks: number;
  suppressedChecks: number;
  latencyMs: SmokeLatencyMetrics;
  ownerRollups: SmokeGroupedMetrics[];
  ownerLatencyRollups: SmokeOwnerLatencyRollup[];
  ownerLatencySlo: SmokeOwnerLatencySloMetrics;
  tagRollups: SmokeGroupedMetrics[];
}

interface FlakyPolicy {
  externalProviderDefault: {
    maxAttempts: number;
    retryDelayMs: number;
    suppressFailures: boolean;
  };
  verifyIntegrationApp: {
    maxAttempts: number;
    retryDelayMs: number;
    suppressFailures: boolean;
  };
  installIntegrationApp: {
    maxAttempts: number;
    retryDelayMs: number;
    suppressFailures: boolean;
  };
  uninstallIntegrationApp: {
    maxAttempts: number;
    retryDelayMs: number;
    suppressFailures: boolean;
  };
}

interface SmokeReport {
  startedAt: string;
  finishedAt: string;
  status: "passed" | "failed" | "contract_only" | "passed_with_suppressed";
  mutationChecksEnabled: boolean;
  flakyPolicy: FlakyPolicy;
  metrics: SmokeMetrics;
  checks: SmokeCheckResult[];
  error: string | null;
}

const SMOKE_STARTED_AT = new Date().toISOString();
const SMOKE_CHECK_RESULTS: SmokeCheckResult[] = [];

type RouteMetadata = {
  owner: string;
  tags: string[];
};

type SchemaDescriptor =
  | { type: "string" | "number" | "boolean" | "null" }
  | { type: "literal"; value: string | number | boolean | null }
  | { type: "array"; items: SchemaDescriptor }
  | {
      type: "object";
      required: string[];
      optional?: string[];
      properties: Record<string, SchemaDescriptor>;
    }
  | { type: "union"; anyOf: SchemaDescriptor[] };

const UNKNOWN_ROUTE_METADATA: RouteMetadata = {
  owner: "unknown",
  tags: ["unmapped"],
};

const ROUTE_METADATA: Record<string, RouteMetadata> = {
  "GET /api/admin/policies": {
    owner: "commerce-control-tower",
    tags: ["admin", "policies", "compliance"],
  },
  "PUT /api/admin/policies": {
    owner: "commerce-control-tower",
    tags: ["admin", "policies", "mutations"],
  },
  "GET /api/admin/policies/violations": {
    owner: "commerce-control-tower",
    tags: ["admin", "policies", "violations"],
  },
  "GET /api/admin/control-tower/summary": {
    owner: "commerce-control-tower",
    tags: ["admin", "control-tower", "summary"],
  },
  "GET /api/admin/pricing-experiments": {
    owner: "commerce-growth",
    tags: ["admin", "pricing", "experiments"],
  },
  "POST /api/admin/pricing-experiments/preflight": {
    owner: "commerce-growth",
    tags: ["admin", "pricing", "preflight"],
  },
  "GET /api/admin/pricing-experiments/:id/performance": {
    owner: "commerce-growth",
    tags: ["admin", "pricing", "performance"],
  },
  "GET /api/admin/ops/fulfillment-sla": {
    owner: "commerce-operations",
    tags: ["admin", "fulfillment", "sla"],
  },
  "POST /api/admin/ops/fulfillment-sla/interventions": {
    owner: "commerce-operations",
    tags: ["admin", "fulfillment", "sla", "interventions"],
  },
  "GET /api/admin/workflows": {
    owner: "commerce-automation",
    tags: ["admin", "workflows"],
  },
  "GET /api/analytics/recommendations/history": {
    owner: "commerce-automation",
    tags: ["admin", "analytics", "recommendations", "automation", "read"],
  },
  "POST /api/analytics/recommendations/apply": {
    owner: "commerce-automation",
    tags: ["admin", "analytics", "recommendations", "automation", "mutations"],
  },
  "GET /api/admin/integration-marketplace/apps": {
    owner: "commerce-integrations",
    tags: ["admin", "integrations", "marketplace"],
  },
  "POST /api/admin/integration-marketplace/apps/:provider/install": {
    owner: "commerce-integrations",
    tags: ["admin", "integrations", "provider", "mutations"],
  },
  "POST /api/admin/integration-marketplace/apps/:provider/uninstall": {
    owner: "commerce-integrations",
    tags: ["admin", "integrations", "provider", "mutations"],
  },
  "POST /api/admin/integration-marketplace/apps/:provider/verify": {
    owner: "commerce-integrations",
    tags: ["admin", "integrations", "provider", "verification"],
  },
  "GET /api/admin/headless/packs": {
    owner: "commerce-platform",
    tags: ["admin", "headless", "api-packs"],
  },
  "POST /api/admin/headless/packs": {
    owner: "commerce-platform",
    tags: ["admin", "headless", "api-packs", "mutations"],
  },
  "POST /api/admin/headless/packs/:id/revoke": {
    owner: "commerce-platform",
    tags: ["admin", "headless", "api-packs", "mutations"],
  },
  "GET /api/admin/store-templates": {
    owner: "commerce-platform",
    tags: ["admin", "store-templates"],
  },
  "POST /api/admin/store-templates": {
    owner: "commerce-platform",
    tags: ["admin", "store-templates", "mutations"],
  },
  "POST /api/admin/store-templates/:id/clone": {
    owner: "commerce-platform",
    tags: ["admin", "store-templates", "clone"],
  },
  "DELETE /api/admin/store-templates/:id": {
    owner: "commerce-platform",
    tags: ["admin", "store-templates", "mutations"],
  },
  "GET /api/platform/plans": {
    owner: "commerce-platform",
    tags: ["platform", "plans", "read"],
  },
  "POST /api/platform/stores/:id/invite": {
    owner: "commerce-platform",
    tags: ["platform", "members", "invite", "mutations"],
  },
  "POST /api/platform/invitations/:token/accept": {
    owner: "commerce-platform",
    tags: ["platform", "members", "invite", "mutations"],
  },
  "PATCH /api/platform/stores/:id/members/:userId/role": {
    owner: "commerce-platform",
    tags: ["platform", "members", "role", "mutations"],
  },
  "POST /api/platform/stores/:id/logo": {
    owner: "commerce-platform",
    tags: ["platform", "stores", "branding", "mutations"],
  },
  "DELETE /api/platform/stores/:id/members/:userId": {
    owner: "commerce-platform",
    tags: ["platform", "members", "mutations"],
  },
  "GET /api/products": {
    owner: "commerce-catalog",
    tags: ["storefront", "catalog", "products", "read"],
  },
  "GET /api/products/:slug": {
    owner: "commerce-catalog",
    tags: ["storefront", "catalog", "product-detail", "read"],
  },
  "GET /api/collections": {
    owner: "commerce-catalog",
    tags: ["storefront", "catalog", "collections", "read"],
  },
  "GET /api/cart": {
    owner: "commerce-checkout",
    tags: ["storefront", "cart", "read"],
  },
  "POST /api/cart/validate": {
    owner: "commerce-checkout",
    tags: ["storefront", "cart", "validation"],
  },
  "POST /api/cart/apply-coupon": {
    owner: "commerce-checkout",
    tags: ["storefront", "cart", "coupon", "mutations"],
  },
  "DELETE /api/cart/remove-coupon": {
    owner: "commerce-checkout",
    tags: ["storefront", "cart", "coupon", "mutations"],
  },
  "POST /api/checkout": {
    owner: "commerce-checkout",
    tags: ["storefront", "checkout", "mutations"],
  },
  "GET /api/checkout/success": {
    owner: "commerce-checkout",
    tags: ["storefront", "checkout", "read"],
  },
  "GET /api/products/:slug/reviews": {
    owner: "commerce-reviews",
    tags: ["storefront", "reviews", "read"],
  },
  "POST /api/reviews/:id/helpful": {
    owner: "commerce-reviews",
    tags: ["storefront", "reviews", "engagement", "mutations"],
  },
  "POST /api/reviews/:id/report": {
    owner: "commerce-reviews",
    tags: ["storefront", "reviews", "moderation", "mutations"],
  },
  "POST /api/reviews/:id/respond": {
    owner: "commerce-reviews",
    tags: ["admin", "reviews", "moderation", "mutations"],
  },
  "POST /api/bookings/:id/no-show": {
    owner: "commerce-bookings",
    tags: ["admin", "bookings", "mutations"],
  },
  "POST /api/bookings/availability/:id/waitlist": {
    owner: "commerce-bookings",
    tags: ["storefront", "bookings", "waitlist", "mutations"],
  },
  "GET /api/bookings/waitlist": {
    owner: "commerce-bookings",
    tags: ["storefront", "bookings", "waitlist", "read"],
  },
  "DELETE /api/bookings/waitlist/:id": {
    owner: "commerce-bookings",
    tags: ["storefront", "bookings", "waitlist", "mutations"],
  },
  "POST /api/auth/forgot-password": {
    owner: "commerce-identity",
    tags: ["auth", "password-reset", "mutations"],
  },
  "POST /api/auth/reset-password": {
    owner: "commerce-identity",
    tags: ["auth", "password-reset", "mutations"],
  },
  "POST /api/auth/verify-email": {
    owner: "commerce-identity",
    tags: ["auth", "email-verification", "mutations"],
  },
  "GET /api/auth/profile": {
    owner: "commerce-identity",
    tags: ["auth", "profile", "read"],
  },
  "PATCH /api/auth/profile": {
    owner: "commerce-identity",
    tags: ["auth", "profile", "mutations"],
  },
  "POST /api/auth/request-verification": {
    owner: "commerce-identity",
    tags: ["auth", "email-verification", "mutations"],
  },
  "POST /api/auth/change-password": {
    owner: "commerce-identity",
    tags: ["auth", "password", "mutations"],
  },
  "POST /api/subscriptions": {
    owner: "commerce-billing",
    tags: ["account", "subscriptions", "mutations"],
  },
  "GET /api/subscriptions": {
    owner: "commerce-billing",
    tags: ["account", "subscriptions", "read"],
  },
  "GET /api/subscriptions/builder/options": {
    owner: "commerce-billing",
    tags: ["account", "subscriptions", "builder", "read"],
  },
  "POST /api/subscriptions/builder/quote": {
    owner: "commerce-billing",
    tags: ["account", "subscriptions", "builder", "quote"],
  },
  "POST /api/subscriptions/builder/checkout": {
    owner: "commerce-billing",
    tags: ["account", "subscriptions", "builder", "mutations"],
  },
  "POST /api/subscriptions/portal": {
    owner: "commerce-billing",
    tags: ["account", "subscriptions", "portal", "mutations"],
  },
  "DELETE /api/subscriptions/:id": {
    owner: "commerce-billing",
    tags: ["account", "subscriptions", "mutations"],
  },
  "PATCH /api/subscriptions/:id/change-plan": {
    owner: "commerce-billing",
    tags: ["account", "subscriptions", "plan-change", "mutations"],
  },
  "POST /api/subscriptions/:id/resume": {
    owner: "commerce-billing",
    tags: ["account", "subscriptions", "resume", "mutations"],
  },
  "GET /api/platform/stores/:id": {
    owner: "commerce-platform",
    tags: ["platform", "stores", "read"],
  },
};

const SMOKE_REPORT_SCHEMA_PATH =
  process.env.SMOKE_REPORT_SCHEMA_SNAPSHOT_PATH ??
  "docs/snapshots/admin-api-parity-report.schema.snapshot.json";

const SMOKE_REPORT_SCHEMA: SchemaDescriptor = {
  type: "object",
  required: [
    "startedAt",
    "finishedAt",
    "status",
    "mutationChecksEnabled",
    "flakyPolicy",
    "metrics",
    "checks",
    "error",
  ],
  properties: {
    startedAt: { type: "string" },
    finishedAt: { type: "string" },
    status: {
      type: "union",
      anyOf: [
        { type: "literal", value: "passed" },
        { type: "literal", value: "failed" },
        { type: "literal", value: "contract_only" },
        { type: "literal", value: "passed_with_suppressed" },
      ],
    },
    mutationChecksEnabled: { type: "boolean" },
    flakyPolicy: {
      type: "object",
      required: [
        "externalProviderDefault",
        "verifyIntegrationApp",
        "installIntegrationApp",
        "uninstallIntegrationApp",
      ],
      properties: {
        externalProviderDefault: {
          type: "object",
          required: ["maxAttempts", "retryDelayMs", "suppressFailures"],
          properties: {
            maxAttempts: { type: "number" },
            retryDelayMs: { type: "number" },
            suppressFailures: { type: "boolean" },
          },
        },
        verifyIntegrationApp: {
          type: "object",
          required: ["maxAttempts", "retryDelayMs", "suppressFailures"],
          properties: {
            maxAttempts: { type: "number" },
            retryDelayMs: { type: "number" },
            suppressFailures: { type: "boolean" },
          },
        },
        installIntegrationApp: {
          type: "object",
          required: ["maxAttempts", "retryDelayMs", "suppressFailures"],
          properties: {
            maxAttempts: { type: "number" },
            retryDelayMs: { type: "number" },
            suppressFailures: { type: "boolean" },
          },
        },
        uninstallIntegrationApp: {
          type: "object",
          required: ["maxAttempts", "retryDelayMs", "suppressFailures"],
          properties: {
            maxAttempts: { type: "number" },
            retryDelayMs: { type: "number" },
            suppressFailures: { type: "boolean" },
          },
        },
      },
    },
    metrics: {
      type: "object",
      required: [
        "totalChecks",
        "failedChecks",
        "suppressedChecks",
        "latencyMs",
        "ownerRollups",
        "ownerLatencyRollups",
        "ownerLatencySlo",
        "tagRollups",
      ],
      properties: {
        totalChecks: { type: "number" },
        failedChecks: { type: "number" },
        suppressedChecks: { type: "number" },
        latencyMs: {
          type: "object",
          required: ["count", "min", "p50", "p95", "max", "avg"],
          properties: {
            count: { type: "number" },
            min: { type: "union", anyOf: [{ type: "number" }, { type: "null" }] },
            p50: { type: "union", anyOf: [{ type: "number" }, { type: "null" }] },
            p95: { type: "union", anyOf: [{ type: "number" }, { type: "null" }] },
            max: { type: "union", anyOf: [{ type: "number" }, { type: "null" }] },
            avg: { type: "union", anyOf: [{ type: "number" }, { type: "null" }] },
          },
        },
        ownerRollups: {
          type: "array",
          items: {
            type: "object",
            required: ["key", "total", "passed", "failed", "suppressed"],
            properties: {
              key: { type: "string" },
              total: { type: "number" },
              passed: { type: "number" },
              failed: { type: "number" },
              suppressed: { type: "number" },
            },
          },
        },
        ownerLatencyRollups: {
          type: "array",
          items: {
            type: "object",
            required: ["owner", "checkCount", "latencyMs"],
            properties: {
              owner: { type: "string" },
              checkCount: { type: "number" },
              latencyMs: {
                type: "object",
                required: ["count", "min", "p50", "p95", "max", "avg"],
                properties: {
                  count: { type: "number" },
                  min: { type: "union", anyOf: [{ type: "number" }, { type: "null" }] },
                  p50: { type: "union", anyOf: [{ type: "number" }, { type: "null" }] },
                  p95: { type: "union", anyOf: [{ type: "number" }, { type: "null" }] },
                  max: { type: "union", anyOf: [{ type: "number" }, { type: "null" }] },
                  avg: { type: "union", anyOf: [{ type: "number" }, { type: "null" }] },
                },
              },
            },
          },
        },
        ownerLatencySlo: {
          type: "object",
          required: ["configuredOwners", "warnings", "failures"],
          properties: {
            configuredOwners: { type: "number" },
            warnings: {
              type: "array",
              items: {
                type: "object",
                required: ["owner", "p95Ms", "thresholdMs"],
                properties: {
                  owner: { type: "string" },
                  p95Ms: { type: "number" },
                  thresholdMs: { type: "number" },
                },
              },
            },
            failures: {
              type: "array",
              items: {
                type: "object",
                required: ["owner", "p95Ms", "thresholdMs"],
                properties: {
                  owner: { type: "string" },
                  p95Ms: { type: "number" },
                  thresholdMs: { type: "number" },
                },
              },
            },
          },
        },
        tagRollups: {
          type: "array",
          items: {
            type: "object",
            required: ["key", "total", "passed", "failed", "suppressed"],
            properties: {
              key: { type: "string" },
              total: { type: "number" },
              passed: { type: "number" },
              failed: { type: "number" },
              suppressed: { type: "number" },
            },
          },
        },
      },
    },
    checks: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "method", "path", "status", "ok", "owner", "tags"],
        optional: ["durationMs", "attempts", "suppressed", "note"],
        properties: {
          name: { type: "string" },
          method: { type: "string" },
          path: { type: "string" },
          status: {
            type: "union",
            anyOf: [{ type: "number" }, { type: "literal", value: "contract" }],
          },
          ok: { type: "boolean" },
          durationMs: { type: "number" },
          attempts: { type: "number" },
          suppressed: { type: "boolean" },
          note: { type: "string" },
          owner: { type: "string" },
          tags: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    error: {
      type: "union",
      anyOf: [{ type: "string" }, { type: "null" }],
    },
  },
};

interface PolicySnapshot {
  isActive: boolean;
  config: {
    pricing: {
      maxVariants: number;
      minDeltaPercent: number;
      maxDeltaPercent: number;
      allowAutoApply: boolean;
    };
    shipping: {
      maxFlatRate: number;
      maxEstimatedDays: number;
    };
    promotions: {
      maxPercentageOff: number;
      maxFixedAmount: number;
      maxCampaignDays: number;
      allowStackable: boolean;
    };
    enforcement: {
      mode: "enforce" | "monitor";
    };
  };
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeBaseUrl(raw: string): string {
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function parseJson(text: string): unknown {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function isEnabled(value: string | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isEnabledOrDefault(value: string | undefined, fallback: boolean): boolean {
  if (typeof value === "undefined") return fallback;
  return isEnabled(value);
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

function routeKey(method: string, path: string): string {
  return `${method.trim().toUpperCase()} ${path.trim()}`;
}

function metadataForRoute(method: string, path: string): RouteMetadata {
  return ROUTE_METADATA[routeKey(method, path)] ?? UNKNOWN_ROUTE_METADATA;
}

function toInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

function toFiniteNonNegativeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Number(value.toFixed(2));
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Number(parsed.toFixed(2));
    }
  }
  return null;
}

function parseOwnerLatencySloThresholdsConfig(): Map<string, SmokeOwnerLatencySloThreshold> {
  const raw = process.env.SMOKE_OWNER_P95_SLO_THRESHOLDS_JSON;
  if (!raw) return new Map();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return new Map();
    }

    const thresholds = new Map<string, SmokeOwnerLatencySloThreshold>();
    for (const [owner, value] of Object.entries(parsed)) {
      if (!owner.trim() || !value || typeof value !== "object" || Array.isArray(value)) {
        continue;
      }

      const valueRecord = value as Record<string, unknown>;
      const warnP95Ms =
        toFiniteNonNegativeNumber(valueRecord.warnP95Ms) ??
        toFiniteNonNegativeNumber(valueRecord.warnMs) ??
        toFiniteNonNegativeNumber(valueRecord.warn);
      const failP95Ms =
        toFiniteNonNegativeNumber(valueRecord.failP95Ms) ??
        toFiniteNonNegativeNumber(valueRecord.failMs) ??
        toFiniteNonNegativeNumber(valueRecord.fail);

      if (warnP95Ms === null && failP95Ms === null) {
        continue;
      }

      thresholds.set(owner, {
        owner,
        warnP95Ms,
        failP95Ms,
      });
    }

    return thresholds;
  } catch {
    return new Map();
  }
}

const OWNER_LATENCY_SLO_THRESHOLDS = parseOwnerLatencySloThresholdsConfig();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function percentile(values: number[], percentileValue: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
  );
  return Number(sorted[index]!.toFixed(2));
}

function buildLatencyMetricsFromDurations(durations: number[]): SmokeLatencyMetrics {
  return {
    count: durations.length,
    min: durations.length ? Number(Math.min(...durations).toFixed(2)) : null,
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    max: durations.length ? Number(Math.max(...durations).toFixed(2)) : null,
    avg: durations.length
      ? Number((durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(2))
      : null,
  };
}

function incrementGroupedMetric(
  groupedMetrics: Map<string, SmokeGroupedMetrics>,
  key: string,
  check: SmokeCheckResult,
) {
  const current = groupedMetrics.get(key) ?? {
    key,
    total: 0,
    passed: 0,
    failed: 0,
    suppressed: 0,
  };

  current.total += 1;
  if (check.suppressed) {
    current.suppressed += 1;
  } else if (check.ok) {
    current.passed += 1;
  } else {
    current.failed += 1;
  }

  groupedMetrics.set(key, current);
}

function buildGroupedRollups(checks: SmokeCheckResult[], type: "owner" | "tag"): SmokeGroupedMetrics[] {
  const groupedMetrics = new Map<string, SmokeGroupedMetrics>();

  for (const check of checks) {
    if (type === "owner") {
      incrementGroupedMetric(groupedMetrics, check.owner ?? "unknown", check);
      continue;
    }

    const tags = check.tags && check.tags.length > 0 ? check.tags : ["unmapped"];
    for (const tag of tags) {
      incrementGroupedMetric(groupedMetrics, tag, check);
    }
  }

  return [...groupedMetrics.values()].sort((a, b) => {
    if (b.failed !== a.failed) return b.failed - a.failed;
    if (b.suppressed !== a.suppressed) return b.suppressed - a.suppressed;
    if (b.total !== a.total) return b.total - a.total;
    return a.key.localeCompare(b.key);
  });
}

function buildOwnerLatencyRollups(checks: SmokeCheckResult[]): SmokeOwnerLatencyRollup[] {
  const groupedDurations = new Map<string, number[]>();
  const groupedCheckCounts = new Map<string, number>();

  for (const check of checks) {
    const owner = check.owner ?? "unknown";
    groupedCheckCounts.set(owner, (groupedCheckCounts.get(owner) ?? 0) + 1);
    if (typeof check.durationMs === "number" && Number.isFinite(check.durationMs)) {
      const durations = groupedDurations.get(owner) ?? [];
      durations.push(check.durationMs);
      groupedDurations.set(owner, durations);
    }
  }

  return [...groupedCheckCounts.entries()]
    .map(([owner, checkCount]) => ({
      owner,
      checkCount,
      latencyMs: buildLatencyMetricsFromDurations(groupedDurations.get(owner) ?? []),
    }))
    .sort((a, b) => {
      if (b.latencyMs.p95 !== a.latencyMs.p95) {
        return (b.latencyMs.p95 ?? -1) - (a.latencyMs.p95 ?? -1);
      }
      if (b.latencyMs.avg !== a.latencyMs.avg) {
        return (b.latencyMs.avg ?? -1) - (a.latencyMs.avg ?? -1);
      }
      return a.owner.localeCompare(b.owner);
    });
}

function formatRollupSummary(rollups: SmokeGroupedMetrics[], limit: number): string {
  if (rollups.length === 0) return "none";
  return rollups
    .slice(0, limit)
    .map(
      (rollup) =>
        `${rollup.key}(total=${rollup.total},pass=${rollup.passed},fail=${rollup.failed},suppressed=${rollup.suppressed})`,
    )
    .join("; ");
}

function formatOwnerLatencySummary(rollups: SmokeOwnerLatencyRollup[], limit: number): string {
  if (rollups.length === 0) return "none";
  return rollups
    .slice(0, limit)
    .map(
      (rollup) =>
        `${rollup.owner}(checks=${rollup.checkCount},count=${rollup.latencyMs.count},p50=${rollup.latencyMs.p50 ?? "n/a"},p95=${rollup.latencyMs.p95 ?? "n/a"},avg=${rollup.latencyMs.avg ?? "n/a"})`,
    )
    .join("; ");
}

function buildOwnerLatencySloMetrics(
  ownerLatencyRollups: SmokeOwnerLatencyRollup[],
  thresholds: Map<string, SmokeOwnerLatencySloThreshold>,
): SmokeOwnerLatencySloMetrics {
  const warnings: SmokeOwnerLatencySloBreach[] = [];
  const failures: SmokeOwnerLatencySloBreach[] = [];

  for (const rollup of ownerLatencyRollups) {
    const threshold = thresholds.get(rollup.owner);
    const p95Ms = rollup.latencyMs.p95;
    if (!threshold || p95Ms === null) continue;

    if (threshold.failP95Ms !== null && p95Ms > threshold.failP95Ms) {
      failures.push({
        owner: rollup.owner,
        p95Ms,
        thresholdMs: threshold.failP95Ms,
      });
      continue;
    }

    if (threshold.warnP95Ms !== null && p95Ms > threshold.warnP95Ms) {
      warnings.push({
        owner: rollup.owner,
        p95Ms,
        thresholdMs: threshold.warnP95Ms,
      });
    }
  }

  const sortByGapDesc = (a: SmokeOwnerLatencySloBreach, b: SmokeOwnerLatencySloBreach) => {
    const gap = b.p95Ms - b.thresholdMs - (a.p95Ms - a.thresholdMs);
    if (gap !== 0) return gap;
    return a.owner.localeCompare(b.owner);
  };

  return {
    configuredOwners: thresholds.size,
    warnings: warnings.sort(sortByGapDesc),
    failures: failures.sort(sortByGapDesc),
  };
}

function formatOwnerLatencySloBreachSummary(
  breaches: SmokeOwnerLatencySloBreach[],
  limit: number,
): string {
  if (breaches.length === 0) return "none";
  return breaches
    .slice(0, limit)
    .map((breach) => `${breach.owner}(p95=${breach.p95Ms},threshold=${breach.thresholdMs})`)
    .join("; ");
}

function buildMetrics(checks: SmokeCheckResult[]): SmokeMetrics {
  const durations = checks
    .map((check) => check.durationMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  const totalChecks = checks.length;
  const failedChecks = checks.filter((check) => !check.ok && !check.suppressed).length;
  const suppressedChecks = checks.filter((check) => check.suppressed).length;
  const ownerLatencyRollups = buildOwnerLatencyRollups(checks);
  const ownerLatencySlo = buildOwnerLatencySloMetrics(
    ownerLatencyRollups,
    OWNER_LATENCY_SLO_THRESHOLDS,
  );

  return {
    totalChecks,
    failedChecks,
    suppressedChecks,
    latencyMs: buildLatencyMetricsFromDurations(durations),
    ownerRollups: buildGroupedRollups(checks, "owner"),
    ownerLatencyRollups,
    ownerLatencySlo,
    tagRollups: buildGroupedRollups(checks, "tag"),
  };
}

function assertOwnerLatencySlo(metrics: SmokeMetrics) {
  if (metrics.ownerLatencySlo.failures.length === 0) return;

  const summary = formatOwnerLatencySloBreachSummary(metrics.ownerLatencySlo.failures, 5);
  throw new Error(
    `Owner p95 latency SLO failure(s): ${summary}. Configure with SMOKE_OWNER_P95_SLO_THRESHOLDS_JSON or tune endpoint performance.`,
  );
}

function recordCheck(result: SmokeCheckResult) {
  const metadata = metadataForRoute(result.method, result.path);
  SMOKE_CHECK_RESULTS.push({
    ...result,
    owner: result.owner || metadata.owner,
    tags: result.tags && result.tags.length > 0 ? result.tags : metadata.tags,
  });
}

function normalizeSchemaDescriptor(descriptor: SchemaDescriptor): SchemaDescriptor {
  if (descriptor.type === "object") {
    const sortedPropertyEntries = Object.entries(descriptor.properties).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const properties: Record<string, SchemaDescriptor> = {};
    for (const [key, value] of sortedPropertyEntries) {
      properties[key] = normalizeSchemaDescriptor(value);
    }
    return {
      type: "object",
      required: [...descriptor.required].sort((a, b) => a.localeCompare(b)),
      optional: descriptor.optional ? [...descriptor.optional].sort((a, b) => a.localeCompare(b)) : undefined,
      properties,
    };
  }

  if (descriptor.type === "array") {
    return {
      type: "array",
      items: normalizeSchemaDescriptor(descriptor.items),
    };
  }

  if (descriptor.type === "union") {
    const anyOf = descriptor.anyOf
      .map((candidate) => normalizeSchemaDescriptor(candidate))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return {
      type: "union",
      anyOf,
    };
  }

  if (descriptor.type === "literal") {
    return descriptor;
  }

  return descriptor;
}

function validateValueAgainstSchema(
  value: unknown,
  descriptor: SchemaDescriptor,
  path: string,
): string[] {
  if (descriptor.type === "string") {
    return typeof value === "string" ? [] : [`${path}: expected string`];
  }
  if (descriptor.type === "number") {
    return typeof value === "number" && Number.isFinite(value) ? [] : [`${path}: expected number`];
  }
  if (descriptor.type === "boolean") {
    return typeof value === "boolean" ? [] : [`${path}: expected boolean`];
  }
  if (descriptor.type === "null") {
    return value === null ? [] : [`${path}: expected null`];
  }
  if (descriptor.type === "literal") {
    return value === descriptor.value
      ? []
      : [`${path}: expected literal ${JSON.stringify(descriptor.value)}`];
  }
  if (descriptor.type === "array") {
    if (!Array.isArray(value)) return [`${path}: expected array`];
    const errors: string[] = [];
    for (const [index, item] of value.entries()) {
      errors.push(...validateValueAgainstSchema(item, descriptor.items, `${path}[${index}]`));
    }
    return errors;
  }
  if (descriptor.type === "union") {
    for (const candidate of descriptor.anyOf) {
      if (validateValueAgainstSchema(value, candidate, path).length === 0) {
        return [];
      }
    }
    return [`${path}: did not match any allowed union type`];
  }

  if (descriptor.type === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return [`${path}: expected object`];
    }

    const record = value as Record<string, unknown>;
    const required = new Set(descriptor.required);
    const optional = new Set(descriptor.optional ?? []);
    const allowed = new Set([...required, ...optional]);
    const errors: string[] = [];

    for (const key of required) {
      if (!(key in record)) {
        errors.push(`${path}.${key}: missing required field`);
      }
    }

    for (const [key, fieldValue] of Object.entries(record)) {
      if (!allowed.has(key)) {
        errors.push(`${path}.${key}: unexpected field`);
        continue;
      }
      const fieldDescriptor = descriptor.properties[key];
      if (!fieldDescriptor) {
        errors.push(`${path}.${key}: no schema descriptor`);
        continue;
      }
      errors.push(...validateValueAgainstSchema(fieldValue, fieldDescriptor, `${path}.${key}`));
    }

    return errors;
  }

  return [`${path}: unsupported schema descriptor type`];
}

async function ensureReportSchemaSnapshot(report: SmokeReport) {
  if (isEnabled(process.env.SMOKE_SKIP_REPORT_SCHEMA_CHECK)) return;

  const normalizedSchema = normalizeSchemaDescriptor(SMOKE_REPORT_SCHEMA);
  const serializedSchema = `${JSON.stringify(normalizedSchema, null, 2)}\n`;

  if (isEnabled(process.env.SMOKE_UPDATE_REPORT_SCHEMA_SNAPSHOT)) {
    await mkdir(dirname(SMOKE_REPORT_SCHEMA_PATH), { recursive: true });
    await writeFile(SMOKE_REPORT_SCHEMA_PATH, serializedSchema);
  } else {
    let snapshotRaw: string;
    try {
      snapshotRaw = await readFile(SMOKE_REPORT_SCHEMA_PATH, "utf8");
    } catch {
      throw new Error(
        `Smoke report schema snapshot missing at ${SMOKE_REPORT_SCHEMA_PATH}. Set SMOKE_UPDATE_REPORT_SCHEMA_SNAPSHOT=true to create/update it.`,
      );
    }

    let snapshotParsed: SchemaDescriptor;
    try {
      snapshotParsed = JSON.parse(snapshotRaw) as SchemaDescriptor;
    } catch {
      throw new Error(
        `Smoke report schema snapshot at ${SMOKE_REPORT_SCHEMA_PATH} is not valid JSON.`,
      );
    }

    const normalizedSnapshot = normalizeSchemaDescriptor(snapshotParsed);
    if (JSON.stringify(normalizedSnapshot) !== JSON.stringify(normalizedSchema)) {
      throw new Error(
        `Smoke report schema snapshot drift detected at ${SMOKE_REPORT_SCHEMA_PATH}. Update intentionally with SMOKE_UPDATE_REPORT_SCHEMA_SNAPSHOT=true.`,
      );
    }
  }

  const validationErrors = validateValueAgainstSchema(report, normalizedSchema, "report");
  if (validationErrors.length > 0) {
    const preview = validationErrors.slice(0, 10).join("; ");
    throw new Error(`Smoke report failed schema validation: ${preview}`);
  }
}

async function writeReport(report: SmokeReport) {
  if (isEnabled(process.env.SMOKE_SKIP_REPORTS)) return;
  await ensureReportSchemaSnapshot(report);

  const jsonPath = process.env.SMOKE_REPORT_JSON_PATH ?? "output/smoke/admin-api-parity-report.json";
  const mdPath = process.env.SMOKE_REPORT_MD_PATH ?? "output/smoke/admin-api-parity-report.md";

  const markdownLines = [
    "# Admin API Parity Smoke Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Mutation checks enabled: ${report.mutationChecksEnabled}`,
    `- Flaky policy defaults (external-provider): attempts=${report.flakyPolicy.externalProviderDefault.maxAttempts}, delayMs=${report.flakyPolicy.externalProviderDefault.retryDelayMs}, suppress=${report.flakyPolicy.externalProviderDefault.suppressFailures}`,
    `- Flaky policy (verify): attempts=${report.flakyPolicy.verifyIntegrationApp.maxAttempts}, delayMs=${report.flakyPolicy.verifyIntegrationApp.retryDelayMs}, suppress=${report.flakyPolicy.verifyIntegrationApp.suppressFailures}`,
    `- Flaky policy (install): attempts=${report.flakyPolicy.installIntegrationApp.maxAttempts}, delayMs=${report.flakyPolicy.installIntegrationApp.retryDelayMs}, suppress=${report.flakyPolicy.installIntegrationApp.suppressFailures}`,
    `- Flaky policy (uninstall): attempts=${report.flakyPolicy.uninstallIntegrationApp.maxAttempts}, delayMs=${report.flakyPolicy.uninstallIntegrationApp.retryDelayMs}, suppress=${report.flakyPolicy.uninstallIntegrationApp.suppressFailures}`,
    `- Checks: total=${report.metrics.totalChecks}, failed=${report.metrics.failedChecks}, suppressed=${report.metrics.suppressedChecks}`,
    `- Latency (ms): count=${report.metrics.latencyMs.count}, min=${report.metrics.latencyMs.min ?? "n/a"}, p50=${report.metrics.latencyMs.p50 ?? "n/a"}, p95=${report.metrics.latencyMs.p95 ?? "n/a"}, max=${report.metrics.latencyMs.max ?? "n/a"}, avg=${report.metrics.latencyMs.avg ?? "n/a"}`,
    `- Owner rollups (top): ${formatRollupSummary(report.metrics.ownerRollups, 8)}`,
    `- Owner latency rollups (top): ${formatOwnerLatencySummary(report.metrics.ownerLatencyRollups, 8)}`,
    `- Owner latency SLO (p95): configuredOwners=${report.metrics.ownerLatencySlo.configuredOwners}, warnings=${report.metrics.ownerLatencySlo.warnings.length}, failures=${report.metrics.ownerLatencySlo.failures.length}`,
    `- Owner latency SLO warnings (top): ${formatOwnerLatencySloBreachSummary(report.metrics.ownerLatencySlo.warnings, 6)}`,
    `- Owner latency SLO failures (top): ${formatOwnerLatencySloBreachSummary(report.metrics.ownerLatencySlo.failures, 6)}`,
    `- Tag rollups (top): ${formatRollupSummary(report.metrics.tagRollups, 12)}`,
    report.error ? `- Error: ${report.error}` : "- Error: none",
    "",
    "| Name | Method | Path | Owner | Tags | Status | Result | Duration(ms) | Attempts | Suppressed | Note |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...report.checks.map((check) => {
      const result = check.ok ? "pass" : "fail";
      return `| ${check.name} | ${check.method} | ${check.path} | ${check.owner ?? ""} | ${check.tags?.join(",") ?? ""} | ${String(check.status)} | ${result} | ${check.durationMs ?? ""} | ${check.attempts ?? ""} | ${check.suppressed ? "yes" : "no"} | ${check.note ?? ""} |`;
    }),
    "",
  ];

  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(mdPath), { recursive: true });
  await writeFile(jsonPath, JSON.stringify(report, null, 2));
  await writeFile(mdPath, markdownLines.join("\n"));
}

function resolveFailedCheckForAlert(checks: SmokeCheckResult[]): SmokeCheckResult | null {
  return [...checks].reverse().find((check) => !check.ok && !check.suppressed) ?? null;
}

function resolveRetryPolicyKey(check: SmokeCheckResult): keyof FlakyPolicy | null {
  if (check.path === "/api/admin/integration-marketplace/apps/:provider/verify") {
    return "verifyIntegrationApp";
  }
  if (check.path === "/api/admin/integration-marketplace/apps/:provider/install") {
    return "installIntegrationApp";
  }
  if (check.path === "/api/admin/integration-marketplace/apps/:provider/uninstall") {
    return "uninstallIntegrationApp";
  }
  return null;
}

function parseOwnerAlertRoutingConfig(): Record<string, string> {
  const raw = process.env.SMOKE_ALERT_OWNER_ROUTING_JSON;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim().length > 0) {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

async function sendFailureAlert(report: SmokeReport) {
  const webhookUrl = process.env.SMOKE_ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  const failedCheck = resolveFailedCheckForAlert(report.checks);
  const failedOwner = failedCheck?.owner ?? "unknown";
  const failedTags = failedCheck?.tags ?? [];
  const retryPolicyKey = failedCheck ? resolveRetryPolicyKey(failedCheck) : null;
  const retryPolicy = retryPolicyKey ? report.flakyPolicy[retryPolicyKey] : null;
  const ownerRouting = parseOwnerAlertRoutingConfig();
  const ownerRoute = ownerRouting[failedOwner] ?? null;
  const defaultRoute = process.env.SMOKE_ALERT_DEFAULT_ROUTE ?? null;
  const escalationRoute = ownerRoute ?? defaultRoute;

  const payload = {
    text: `Admin parity smoke failed: ${report.error ?? "unknown error"}`,
    status: report.status,
    error: report.error,
    failedCheck,
    failedOwner,
    failedTags,
    retryPolicyKey,
    retryPolicy,
    ownerLatencySlo: report.metrics.ownerLatencySlo,
    escalation: {
      route: escalationRoute,
      matchedOwnerRoute: Boolean(ownerRoute),
      owner: failedOwner,
      tags: failedTags,
    },
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Alerting should never mask smoke failure.
  }
}

function validateContractResponse(
  route: ContractRoute,
  status: number,
  payload: unknown,
  endpointName: string,
) {
  const schema = route.responses[String(status)];
  invariant(
    schema,
    `${endpointName}: unexpected status ${status}; expected one of ${Object.keys(route.responses).join(", ")}`,
  );

  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new Error(`${endpointName}: response for status ${status} failed contract validation`);
  }
}

function assertContractRoute(
  route: ContractRoute,
  name: string,
  expectedMethod: string,
  expectedPath: string,
) {
  invariant(route.method === expectedMethod, `Contract mismatch: ${name} must use ${expectedMethod}`);
  invariant(route.path === expectedPath, `Contract mismatch: ${name} path changed`);
  recordCheck({
    name: `contract:${name}`,
    method: expectedMethod,
    path: expectedPath,
    status: "contract",
    ok: true,
  });
}

async function requestJson(input: {
  baseUrl: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
}) {
  const startedAt = Date.now();
  const response = await fetch(`${input.baseUrl}${input.path}`, {
    method: input.method,
    headers: input.body
      ? {
          ...input.headers,
          "Content-Type": "application/json",
        }
      : input.headers,
    body: input.body ? JSON.stringify(input.body) : undefined,
  });

  const text = await response.text();
  return {
    status: response.status,
    payload: parseJson(text),
    durationMs: Number((Date.now() - startedAt).toFixed(2)),
  };
}

function buildFlakyPolicy(): FlakyPolicy {
  const externalProviderDefault = {
    maxAttempts: Math.max(1, toInt(process.env.SMOKE_EXTERNAL_PROVIDER_MAX_ATTEMPTS, 3)),
    retryDelayMs: Math.max(0, toInt(process.env.SMOKE_EXTERNAL_PROVIDER_RETRY_DELAY_MS, 750)),
    suppressFailures: isEnabled(process.env.SMOKE_SUPPRESS_FLAKY_EXTERNAL_PROVIDER_FAILURES),
  };

  return {
    externalProviderDefault,
    verifyIntegrationApp: {
      maxAttempts: Math.max(
        1,
        toInt(process.env.SMOKE_VERIFY_MAX_ATTEMPTS, externalProviderDefault.maxAttempts),
      ),
      retryDelayMs: Math.max(
        0,
        toInt(process.env.SMOKE_VERIFY_RETRY_DELAY_MS, externalProviderDefault.retryDelayMs),
      ),
      suppressFailures: isEnabledOrDefault(
        process.env.SMOKE_SUPPRESS_FLAKY_VERIFY_FAILURES,
        externalProviderDefault.suppressFailures,
      ),
    },
    installIntegrationApp: {
      maxAttempts: Math.max(
        1,
        toInt(process.env.SMOKE_INSTALL_MAX_ATTEMPTS, externalProviderDefault.maxAttempts),
      ),
      retryDelayMs: Math.max(
        0,
        toInt(process.env.SMOKE_INSTALL_RETRY_DELAY_MS, externalProviderDefault.retryDelayMs),
      ),
      suppressFailures: isEnabledOrDefault(
        process.env.SMOKE_SUPPRESS_FLAKY_INSTALL_FAILURES,
        externalProviderDefault.suppressFailures,
      ),
    },
    uninstallIntegrationApp: {
      maxAttempts: Math.max(
        1,
        toInt(process.env.SMOKE_UNINSTALL_MAX_ATTEMPTS, externalProviderDefault.maxAttempts),
      ),
      retryDelayMs: Math.max(
        0,
        toInt(process.env.SMOKE_UNINSTALL_RETRY_DELAY_MS, externalProviderDefault.retryDelayMs),
      ),
      suppressFailures: isEnabledOrDefault(
        process.env.SMOKE_SUPPRESS_FLAKY_UNINSTALL_FAILURES,
        externalProviderDefault.suppressFailures,
      ),
    },
  };
}

async function runContractRequestWithRetry(input: {
  baseUrl: string;
  headers: Record<string, string>;
  body?: unknown;
  requestPath: string;
  checkName: string;
  checkMethod: string;
  checkPath: string;
  contractRoute: ContractRoute;
  contractName: string;
  policy: {
    maxAttempts: number;
    retryDelayMs: number;
    suppressFailures: boolean;
  };
}) {
  let lastError: string | null = null;
  let lastStatus: number | "contract" = "contract";
  let lastDurationMs: number | undefined;

  for (let attempt = 1; attempt <= input.policy.maxAttempts; attempt++) {
    try {
      const response = await requestJson({
        baseUrl: input.baseUrl,
        method: input.checkMethod,
        path: input.requestPath,
        headers: input.headers,
        body: input.body,
      });
      lastStatus = response.status;
      lastDurationMs = response.durationMs;

      validateContractResponse(
        input.contractRoute,
        response.status,
        response.payload,
        input.contractName,
      );

      console.log(
        `${input.checkMethod} ${input.checkPath} -> ${response.status} (attempt ${attempt}/${input.policy.maxAttempts})`,
      );
      recordCheck({
        name: input.checkName,
        method: input.checkMethod,
        path: input.checkPath,
        status: response.status,
        durationMs: response.durationMs,
        attempts: attempt,
        ok: true,
      });
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < input.policy.maxAttempts) {
        await sleep(input.policy.retryDelayMs * attempt);
      }
    }
  }

  if (input.policy.suppressFailures) {
    recordCheck({
      name: input.checkName,
      method: input.checkMethod,
      path: input.checkPath,
      status: lastStatus,
      durationMs: lastDurationMs,
      attempts: input.policy.maxAttempts,
      ok: false,
      suppressed: true,
      note: lastError ? `suppressed failure: ${lastError}` : "suppressed failure",
    });
    console.log(`${input.checkMethod} ${input.checkPath} -> suppressed flaky failure`);
    return null;
  }

  throw new Error(lastError ?? `${input.checkName} failed after retry attempts`);
}

function policyPayloadToBody(policy: PolicySnapshot) {
  return {
    pricing: policy.config.pricing,
    shipping: policy.config.shipping,
    promotions: policy.config.promotions,
    enforcement: policy.config.enforcement,
    isActive: policy.isActive,
  };
}

function assertUnchangedFields(
  baseline: {
    pricing: {
      minDeltaPercent: number;
      maxDeltaPercent: number;
      allowAutoApply: boolean;
    };
    shipping: {
      maxFlatRate: number;
      maxEstimatedDays: number;
    };
    promotions: {
      maxPercentageOff: number;
      maxFixedAmount: number;
      maxCampaignDays: number;
      allowStackable: boolean;
    };
    enforcement: { mode: "enforce" | "monitor" };
  },
  updated: {
    pricing: {
      minDeltaPercent: number;
      maxDeltaPercent: number;
      allowAutoApply: boolean;
    };
    shipping: {
      maxFlatRate: number;
      maxEstimatedDays: number;
    };
    promotions: {
      maxPercentageOff: number;
      maxFixedAmount: number;
      maxCampaignDays: number;
      allowStackable: boolean;
    };
    enforcement: { mode: "enforce" | "monitor" };
  },
) {
  invariant(
    updated.pricing.minDeltaPercent === baseline.pricing.minDeltaPercent,
    "Partial update changed pricing.minDeltaPercent unexpectedly",
  );
  invariant(
    updated.pricing.maxDeltaPercent === baseline.pricing.maxDeltaPercent,
    "Partial update changed pricing.maxDeltaPercent unexpectedly",
  );
  invariant(
    updated.pricing.allowAutoApply === baseline.pricing.allowAutoApply,
    "Partial update changed pricing.allowAutoApply unexpectedly",
  );
  invariant(
    updated.shipping.maxFlatRate === baseline.shipping.maxFlatRate,
    "Partial update changed shipping.maxFlatRate unexpectedly",
  );
  invariant(
    updated.shipping.maxEstimatedDays === baseline.shipping.maxEstimatedDays,
    "Partial update changed shipping.maxEstimatedDays unexpectedly",
  );
  invariant(
    updated.promotions.maxPercentageOff === baseline.promotions.maxPercentageOff,
    "Partial update changed promotions.maxPercentageOff unexpectedly",
  );
  invariant(
    updated.promotions.maxFixedAmount === baseline.promotions.maxFixedAmount,
    "Partial update changed promotions.maxFixedAmount unexpectedly",
  );
  invariant(
    updated.promotions.maxCampaignDays === baseline.promotions.maxCampaignDays,
    "Partial update changed promotions.maxCampaignDays unexpectedly",
  );
  invariant(
    updated.promotions.allowStackable === baseline.promotions.allowStackable,
    "Partial update changed promotions.allowStackable unexpectedly",
  );
  invariant(
    updated.enforcement.mode === baseline.enforcement.mode,
    "Partial update changed enforcement.mode unexpectedly",
  );
}

async function main() {
  const policyGet = policiesContract.getPolicy as unknown as ContractRoute;
  const policyPut = policiesContract.updatePolicy as unknown as ContractRoute;
  const policyViolations = policiesContract.listViolations as unknown as ContractRoute;
  const controlTowerSummary = controlTowerContract.getSummary as unknown as ContractRoute;
  const pricingList = pricingExperimentContract.listExperiments as unknown as ContractRoute;
  const pricingPreflight = pricingExperimentContract.preflight as unknown as ContractRoute;
  const pricingPerformance = pricingExperimentContract.performance as unknown as ContractRoute;
  const fulfillmentSlaDashboard = fulfillmentExceptionContract.slaDashboard as unknown as ContractRoute;
  const fulfillmentSlaInterventions =
    fulfillmentExceptionContract.runSlaInterventions as unknown as ContractRoute;
  const workflowsList = workflowsContract.list as unknown as ContractRoute;
  const analyticsRecommendationHistory =
    analyticsContract.getRecommendationHistory as unknown as ContractRoute;
  const analyticsApplyRecommendation =
    analyticsContract.applyRecommendation as unknown as ContractRoute;
  const integrationAppsList = integrationMarketplaceContract.listApps as unknown as ContractRoute;
  const integrationInstall = integrationMarketplaceContract.installApp as unknown as ContractRoute;
  const integrationUninstall = integrationMarketplaceContract.uninstallApp as unknown as ContractRoute;
  const integrationVerify = integrationMarketplaceContract.verifyApp as unknown as ContractRoute;
  const integrationListPartnerOnboarding =
    integrationMarketplaceContract.listPartnerOnboarding as unknown as ContractRoute;
  const integrationGetPartnerOnboarding =
    integrationMarketplaceContract.getPartnerOnboarding as unknown as ContractRoute;
  const integrationCompletePartnerOnboarding =
    integrationMarketplaceContract.completePartnerOnboarding as unknown as ContractRoute;
  const integrationVerifyPartnerContract =
    integrationMarketplaceContract.verifyPartnerContract as unknown as ContractRoute;
  const headlessPacksList = headlessApiPacksContract.listAdminPacks as unknown as ContractRoute;
  const headlessPackCreate = headlessApiPacksContract.createAdminPack as unknown as ContractRoute;
  const headlessPackRevoke = headlessApiPacksContract.revokeAdminPack as unknown as ContractRoute;
  const storeTemplatesList = storeTemplatesContract.listTemplates as unknown as ContractRoute;
  const storeTemplateCreate = storeTemplatesContract.createTemplate as unknown as ContractRoute;
  const storeTemplateClone = storeTemplatesContract.cloneTemplate as unknown as ContractRoute;
  const storeTemplateDelete = storeTemplatesContract.deleteTemplate as unknown as ContractRoute;
  const platformPlans = platformContract.getPlans as unknown as ContractRoute;
  const platformInviteMember = platformContract.inviteMember as unknown as ContractRoute;
  const platformAcceptInvitation = platformContract.acceptInvitation as unknown as ContractRoute;
  const platformChangeMemberRole = platformContract.changeMemberRole as unknown as ContractRoute;
  const platformUploadLogo = platformContract.uploadLogo as unknown as ContractRoute;
  const platformRemoveMember = platformContract.removeMember as unknown as ContractRoute;
  const productList = productsContract.list as unknown as ContractRoute;
  const productBySlug = productsContract.getBySlug as unknown as ContractRoute;
  const collectionList = productsContract.listCollections as unknown as ContractRoute;
  const cartGet = cartContract.get as unknown as ContractRoute;
  const cartValidate = cartContract.validate as unknown as ContractRoute;
  const cartApplyCoupon = cartContract.applyCoupon as unknown as ContractRoute;
  const cartRemoveCoupon = cartContract.removeCoupon as unknown as ContractRoute;
  const checkoutCreate = checkoutContract.create as unknown as ContractRoute;
  const checkoutSuccess = checkoutContract.success as unknown as ContractRoute;
  const reviewList = reviewsContract.list as unknown as ContractRoute;
  const reviewHelpful = reviewsContract.markHelpful as unknown as ContractRoute;
  const reviewReport = reviewsContract.report as unknown as ContractRoute;
  const reviewRespond = reviewsContract.respond as unknown as ContractRoute;
  const bookingNoShow = bookingsContract.noShow as unknown as ContractRoute;
  const bookingJoinWaitlist = bookingsContract.joinWaitlist as unknown as ContractRoute;
  const bookingListWaitlist = bookingsContract.listWaitlist as unknown as ContractRoute;
  const bookingRemoveWaitlist = bookingsContract.removeWaitlist as unknown as ContractRoute;
  const authForgotPassword = authContract.forgotPassword as unknown as ContractRoute;
  const authResetPassword = authContract.resetPassword as unknown as ContractRoute;
  const authVerifyEmail = authContract.verifyEmail as unknown as ContractRoute;
  const authProfile = authContract.profile as unknown as ContractRoute;
  const authUpdateProfile = authContract.updateProfile as unknown as ContractRoute;
  const authRequestVerification = authContract.requestVerification as unknown as ContractRoute;
  const authChangePassword = authContract.changePassword as unknown as ContractRoute;
  const subscriptionCreate = subscriptionsContract.create as unknown as ContractRoute;
  const subscriptionList = subscriptionsContract.list as unknown as ContractRoute;
  const subscriptionBuilderOptions = subscriptionsContract.builderOptions as unknown as ContractRoute;
  const subscriptionBuilderQuote = subscriptionsContract.builderQuote as unknown as ContractRoute;
  const subscriptionBuilderCheckout = subscriptionsContract.builderCheckout as unknown as ContractRoute;
  const subscriptionPortal = subscriptionsContract.portal as unknown as ContractRoute;
  const subscriptionCancel = subscriptionsContract.cancel as unknown as ContractRoute;
  const subscriptionChangePlan = subscriptionsContract.changePlan as unknown as ContractRoute;
  const subscriptionResume = subscriptionsContract.resume as unknown as ContractRoute;

  assertContractRoute(policyGet, "getPolicy", "GET", "/api/admin/policies");
  assertContractRoute(policyPut, "updatePolicy", "PUT", "/api/admin/policies");
  assertContractRoute(policyViolations, "listViolations", "GET", "/api/admin/policies/violations");
  assertContractRoute(
    controlTowerSummary,
    "getControlTowerSummary",
    "GET",
    "/api/admin/control-tower/summary",
  );
  assertContractRoute(pricingList, "listPricingExperiments", "GET", "/api/admin/pricing-experiments");
  assertContractRoute(
    pricingPreflight,
    "pricingExperimentPreflight",
    "POST",
    "/api/admin/pricing-experiments/preflight",
  );
  assertContractRoute(
    pricingPerformance,
    "pricingExperimentPerformance",
    "GET",
    "/api/admin/pricing-experiments/:id/performance",
  );
  assertContractRoute(
    fulfillmentSlaDashboard,
    "fulfillmentSlaDashboard",
    "GET",
    "/api/admin/ops/fulfillment-sla",
  );
  assertContractRoute(
    fulfillmentSlaInterventions,
    "fulfillmentSlaInterventions",
    "POST",
    "/api/admin/ops/fulfillment-sla/interventions",
  );
  assertContractRoute(workflowsList, "listWorkflows", "GET", "/api/admin/workflows");
  assertContractRoute(
    analyticsRecommendationHistory,
    "analyticsRecommendationHistory",
    "GET",
    "/api/analytics/recommendations/history",
  );
  assertContractRoute(
    analyticsApplyRecommendation,
    "analyticsApplyRecommendation",
    "POST",
    "/api/analytics/recommendations/apply",
  );
  assertContractRoute(
    integrationAppsList,
    "listIntegrationMarketplaceApps",
    "GET",
    "/api/admin/integration-marketplace/apps",
  );
  assertContractRoute(
    integrationInstall,
    "installIntegrationApp",
    "POST",
    "/api/admin/integration-marketplace/apps/:provider/install",
  );
  assertContractRoute(
    integrationUninstall,
    "uninstallIntegrationApp",
    "POST",
    "/api/admin/integration-marketplace/apps/:provider/uninstall",
  );
  assertContractRoute(
    integrationVerify,
    "verifyIntegrationApp",
    "POST",
    "/api/admin/integration-marketplace/apps/:provider/verify",
  );
  assertContractRoute(
    integrationListPartnerOnboarding,
    "listPartnerOnboarding",
    "GET",
    "/api/admin/integration-marketplace/partners/onboarding",
  );
  assertContractRoute(
    integrationGetPartnerOnboarding,
    "getPartnerOnboarding",
    "GET",
    "/api/admin/integration-marketplace/partners/:provider/onboarding",
  );
  assertContractRoute(
    integrationCompletePartnerOnboarding,
    "completePartnerOnboarding",
    "POST",
    "/api/admin/integration-marketplace/partners/:provider/onboarding/complete",
  );
  assertContractRoute(
    integrationVerifyPartnerContract,
    "verifyPartnerContract",
    "POST",
    "/api/admin/integration-marketplace/partners/:provider/contract-verify",
  );
  assertContractRoute(headlessPacksList, "listHeadlessPacks", "GET", "/api/admin/headless/packs");
  assertContractRoute(headlessPackCreate, "createHeadlessPack", "POST", "/api/admin/headless/packs");
  assertContractRoute(
    headlessPackRevoke,
    "revokeHeadlessPack",
    "POST",
    "/api/admin/headless/packs/:id/revoke",
  );
  assertContractRoute(storeTemplatesList, "listStoreTemplates", "GET", "/api/admin/store-templates");
  assertContractRoute(storeTemplateCreate, "createStoreTemplate", "POST", "/api/admin/store-templates");
  assertContractRoute(
    storeTemplateClone,
    "cloneStoreTemplate",
    "POST",
    "/api/admin/store-templates/:id/clone",
  );
  assertContractRoute(
    storeTemplateDelete,
    "deleteStoreTemplate",
    "DELETE",
    "/api/admin/store-templates/:id",
  );
  assertContractRoute(platformPlans, "getPlatformPlans", "GET", "/api/platform/plans");
  assertContractRoute(
    platformInviteMember,
    "invitePlatformMember",
    "POST",
    "/api/platform/stores/:id/invite",
  );
  assertContractRoute(
    platformAcceptInvitation,
    "acceptPlatformInvitation",
    "POST",
    "/api/platform/invitations/:token/accept",
  );
  assertContractRoute(
    platformChangeMemberRole,
    "changePlatformMemberRole",
    "PATCH",
    "/api/platform/stores/:id/members/:userId/role",
  );
  assertContractRoute(
    platformUploadLogo,
    "uploadPlatformStoreLogo",
    "POST",
    "/api/platform/stores/:id/logo",
  );
  assertContractRoute(
    platformRemoveMember,
    "removePlatformMember",
    "DELETE",
    "/api/platform/stores/:id/members/:userId",
  );
  assertContractRoute(productList, "listProducts", "GET", "/api/products");
  assertContractRoute(productBySlug, "getProductBySlug", "GET", "/api/products/:slug");
  assertContractRoute(collectionList, "listCollections", "GET", "/api/collections");
  assertContractRoute(cartGet, "getCart", "GET", "/api/cart");
  assertContractRoute(cartValidate, "validateCart", "POST", "/api/cart/validate");
  assertContractRoute(cartApplyCoupon, "applyCartCoupon", "POST", "/api/cart/apply-coupon");
  assertContractRoute(
    cartRemoveCoupon,
    "removeCartCoupon",
    "DELETE",
    "/api/cart/remove-coupon",
  );
  assertContractRoute(checkoutCreate, "createCheckout", "POST", "/api/checkout");
  assertContractRoute(
    checkoutSuccess,
    "checkoutSuccess",
    "GET",
    "/api/checkout/success",
  );
  assertContractRoute(reviewList, "listProductReviews", "GET", "/api/products/:slug/reviews");
  assertContractRoute(reviewHelpful, "markReviewHelpful", "POST", "/api/reviews/:id/helpful");
  assertContractRoute(reviewReport, "reportReview", "POST", "/api/reviews/:id/report");
  assertContractRoute(reviewRespond, "respondToReview", "POST", "/api/reviews/:id/respond");
  assertContractRoute(bookingNoShow, "markBookingNoShow", "POST", "/api/bookings/:id/no-show");
  assertContractRoute(
    bookingJoinWaitlist,
    "joinBookingWaitlist",
    "POST",
    "/api/bookings/availability/:id/waitlist",
  );
  assertContractRoute(bookingListWaitlist, "listBookingWaitlist", "GET", "/api/bookings/waitlist");
  assertContractRoute(
    bookingRemoveWaitlist,
    "removeBookingWaitlistEntry",
    "DELETE",
    "/api/bookings/waitlist/:id",
  );
  assertContractRoute(
    authForgotPassword,
    "authForgotPassword",
    "POST",
    "/api/auth/forgot-password",
  );
  assertContractRoute(
    authResetPassword,
    "authResetPassword",
    "POST",
    "/api/auth/reset-password",
  );
  assertContractRoute(authVerifyEmail, "authVerifyEmail", "POST", "/api/auth/verify-email");
  assertContractRoute(authProfile, "authProfile", "GET", "/api/auth/profile");
  assertContractRoute(authUpdateProfile, "authUpdateProfile", "PATCH", "/api/auth/profile");
  assertContractRoute(
    authRequestVerification,
    "authRequestVerification",
    "POST",
    "/api/auth/request-verification",
  );
  assertContractRoute(
    authChangePassword,
    "authChangePassword",
    "POST",
    "/api/auth/change-password",
  );
  assertContractRoute(
    subscriptionCreate,
    "subscriptionCreate",
    "POST",
    "/api/subscriptions",
  );
  assertContractRoute(
    subscriptionList,
    "subscriptionList",
    "GET",
    "/api/subscriptions",
  );
  assertContractRoute(
    subscriptionBuilderOptions,
    "subscriptionBuilderOptions",
    "GET",
    "/api/subscriptions/builder/options",
  );
  assertContractRoute(
    subscriptionBuilderQuote,
    "subscriptionBuilderQuote",
    "POST",
    "/api/subscriptions/builder/quote",
  );
  assertContractRoute(
    subscriptionBuilderCheckout,
    "subscriptionBuilderCheckout",
    "POST",
    "/api/subscriptions/builder/checkout",
  );
  assertContractRoute(
    subscriptionPortal,
    "subscriptionPortal",
    "POST",
    "/api/subscriptions/portal",
  );
  assertContractRoute(
    subscriptionCancel,
    "subscriptionCancel",
    "DELETE",
    "/api/subscriptions/:id",
  );
  assertContractRoute(
    subscriptionChangePlan,
    "subscriptionChangePlan",
    "PATCH",
    "/api/subscriptions/:id/change-plan",
  );
  assertContractRoute(
    subscriptionResume,
    "subscriptionResume",
    "POST",
    "/api/subscriptions/:id/resume",
  );

  const flakyPolicy = buildFlakyPolicy();

  const baseUrlRaw = process.env.SMOKE_BASE_URL;
  if (!baseUrlRaw) {
    console.log("Contract metadata checks passed.");
    console.log("Live smoke skipped: set SMOKE_BASE_URL (and auth headers) to run HTTP checks.");
    await writeReport({
      startedAt: SMOKE_STARTED_AT,
      finishedAt: new Date().toISOString(),
      status: "contract_only",
      mutationChecksEnabled: false,
      flakyPolicy,
      metrics: buildMetrics(SMOKE_CHECK_RESULTS),
      checks: SMOKE_CHECK_RESULTS,
      error: null,
    });
    return;
  }

  const baseUrl = normalizeBaseUrl(baseUrlRaw);
  const headers: Record<string, string> = {};
  if (process.env.SMOKE_COOKIE) {
    headers.Cookie = process.env.SMOKE_COOKIE;
  }
  if (process.env.SMOKE_AUTHORIZATION) {
    headers.Authorization = process.env.SMOKE_AUTHORIZATION;
  }
  const enableMutations = isEnabled(process.env.SMOKE_ENABLE_MUTATIONS);
  console.log(`Mutation checks ${enableMutations ? "enabled" : "disabled"} (SMOKE_ENABLE_MUTATIONS).`);

  let baselinePolicy: PolicySnapshot | null = null;
  let createdHeadlessPackId: string | null = null;
  let createdStoreTemplateId: string | null = null;
  let installedIntegrationProvider: Provider | null = null;

  let changedPolicy = false;

  try {
    const getPolicyResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/admin/policies",
      headers,
    });
    validateContractResponse(policyGet, getPolicyResponse.status, getPolicyResponse.payload, "getPolicy");
    console.log(`GET /api/admin/policies -> ${getPolicyResponse.status}`);
    recordCheck({
      name: "getPolicy",
      method: "GET",
      path: "/api/admin/policies",
      status: getPolicyResponse.status,
      durationMs: getPolicyResponse.durationMs,
      ok: true,
    });

    if (getPolicyResponse.status === 200) {
      const policyPayload = getPolicyResponse.payload as { policy: PolicySnapshot };
      baselinePolicy = policyPayload.policy;
      const targetMaxVariants =
        baselinePolicy.config.pricing.maxVariants >= 100
          ? 99
          : baselinePolicy.config.pricing.maxVariants + 1;

      const partialUpdateResponse = await requestJson({
        baseUrl,
        method: "PUT",
        path: "/api/admin/policies",
        headers,
        body: {
          pricing: {
            maxVariants: targetMaxVariants,
          },
        },
      });
      validateContractResponse(
        policyPut,
        partialUpdateResponse.status,
        partialUpdateResponse.payload,
        "updatePolicy(partial)",
      );
      console.log(`PUT /api/admin/policies (partial) -> ${partialUpdateResponse.status}`);
      recordCheck({
        name: "updatePolicy(partial)",
        method: "PUT",
        path: "/api/admin/policies",
        status: partialUpdateResponse.status,
        durationMs: partialUpdateResponse.durationMs,
        ok: true,
      });

      if (partialUpdateResponse.status === 200) {
        changedPolicy = true;
        const updated = partialUpdateResponse.payload as { policy: PolicySnapshot };
        invariant(
          updated.policy.config.pricing.maxVariants === targetMaxVariants,
          "Partial update did not apply pricing.maxVariants",
        );
        assertUnchangedFields(baselinePolicy.config, updated.policy.config);
      }
    }

    const violationsResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/admin/policies/violations?limit=20",
      headers,
    });
    validateContractResponse(
      policyViolations,
      violationsResponse.status,
      violationsResponse.payload,
      "listViolations",
    );
    console.log(`GET /api/admin/policies/violations -> ${violationsResponse.status}`);
    recordCheck({
      name: "listViolations",
      method: "GET",
      path: "/api/admin/policies/violations",
      status: violationsResponse.status,
      durationMs: violationsResponse.durationMs,
      ok: true,
    });

    const towerResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/admin/control-tower/summary",
      headers,
    });
    validateContractResponse(
      controlTowerSummary,
      towerResponse.status,
      towerResponse.payload,
      "getControlTowerSummary",
    );
    console.log(`GET /api/admin/control-tower/summary -> ${towerResponse.status}`);
    recordCheck({
      name: "getControlTowerSummary",
      method: "GET",
      path: "/api/admin/control-tower/summary",
      status: towerResponse.status,
      durationMs: towerResponse.durationMs,
      ok: true,
    });

    const pricingListResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/admin/pricing-experiments?limit=20",
      headers,
    });
    validateContractResponse(
      pricingList,
      pricingListResponse.status,
      pricingListResponse.payload,
      "listPricingExperiments",
    );
    console.log(`GET /api/admin/pricing-experiments -> ${pricingListResponse.status}`);
    recordCheck({
      name: "listPricingExperiments",
      method: "GET",
      path: "/api/admin/pricing-experiments",
      status: pricingListResponse.status,
      durationMs: pricingListResponse.durationMs,
      ok: true,
    });

    const pricingPreflightResponse = await requestJson({
      baseUrl,
      method: "POST",
      path: "/api/admin/pricing-experiments/preflight",
      headers,
      body: {
        maxVariants: 6,
        minDeltaPercent: -8,
        maxDeltaPercent: 8,
        autoApply: false,
      },
    });
    validateContractResponse(
      pricingPreflight,
      pricingPreflightResponse.status,
      pricingPreflightResponse.payload,
      "pricingExperimentPreflight",
    );
    console.log(
      `POST /api/admin/pricing-experiments/preflight -> ${pricingPreflightResponse.status}`,
    );
    recordCheck({
      name: "pricingExperimentPreflight",
      method: "POST",
      path: "/api/admin/pricing-experiments/preflight",
      status: pricingPreflightResponse.status,
      durationMs: pricingPreflightResponse.durationMs,
      ok: true,
    });

    const pricingPerformanceResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/admin/pricing-experiments/non-existent/performance?windowDays=14",
      headers,
    });
    validateContractResponse(
      pricingPerformance,
      pricingPerformanceResponse.status,
      pricingPerformanceResponse.payload,
      "pricingExperimentPerformance",
    );
    console.log(
      `GET /api/admin/pricing-experiments/:id/performance -> ${pricingPerformanceResponse.status}`,
    );
    recordCheck({
      name: "pricingExperimentPerformance",
      method: "GET",
      path: "/api/admin/pricing-experiments/:id/performance",
      status: pricingPerformanceResponse.status,
      durationMs: pricingPerformanceResponse.durationMs,
      ok: true,
    });

    const fulfillmentSlaDashboardResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/admin/ops/fulfillment-sla?limit=30",
      headers,
    });
    validateContractResponse(
      fulfillmentSlaDashboard,
      fulfillmentSlaDashboardResponse.status,
      fulfillmentSlaDashboardResponse.payload,
      "fulfillmentSlaDashboard",
    );
    console.log(`GET /api/admin/ops/fulfillment-sla -> ${fulfillmentSlaDashboardResponse.status}`);
    recordCheck({
      name: "fulfillmentSlaDashboard",
      method: "GET",
      path: "/api/admin/ops/fulfillment-sla",
      status: fulfillmentSlaDashboardResponse.status,
      durationMs: fulfillmentSlaDashboardResponse.durationMs,
      ok: true,
    });

    const fulfillmentSlaInterventionsResponse = await requestJson({
      baseUrl,
      method: "POST",
      path: "/api/admin/ops/fulfillment-sla/interventions",
      headers,
      body: {
        dryRun: true,
        minRiskLevel: "high",
        limit: 10,
      },
    });
    validateContractResponse(
      fulfillmentSlaInterventions,
      fulfillmentSlaInterventionsResponse.status,
      fulfillmentSlaInterventionsResponse.payload,
      "fulfillmentSlaInterventions",
    );
    console.log(
      `POST /api/admin/ops/fulfillment-sla/interventions -> ${fulfillmentSlaInterventionsResponse.status}`,
    );
    recordCheck({
      name: "fulfillmentSlaInterventions",
      method: "POST",
      path: "/api/admin/ops/fulfillment-sla/interventions",
      status: fulfillmentSlaInterventionsResponse.status,
      durationMs: fulfillmentSlaInterventionsResponse.durationMs,
      ok: true,
    });

    const workflowsListResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/admin/workflows?limit=20",
      headers,
    });
    validateContractResponse(
      workflowsList,
      workflowsListResponse.status,
      workflowsListResponse.payload,
      "listWorkflows",
    );
    console.log(`GET /api/admin/workflows -> ${workflowsListResponse.status}`);
    recordCheck({
      name: "listWorkflows",
      method: "GET",
      path: "/api/admin/workflows",
      status: workflowsListResponse.status,
      durationMs: workflowsListResponse.durationMs,
      ok: true,
    });

    const recommendationHistoryResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/analytics/recommendations/history?limit=5",
      headers,
    });
    validateContractResponse(
      analyticsRecommendationHistory,
      recommendationHistoryResponse.status,
      recommendationHistoryResponse.payload,
      "analyticsRecommendationHistory",
    );
    console.log(
      `GET /api/analytics/recommendations/history -> ${recommendationHistoryResponse.status}`,
    );
    recordCheck({
      name: "analyticsRecommendationHistory",
      method: "GET",
      path: "/api/analytics/recommendations/history",
      status: recommendationHistoryResponse.status,
      durationMs: recommendationHistoryResponse.durationMs,
      ok: true,
    });

    const recommendationApplyResponse = await requestJson({
      baseUrl,
      method: "POST",
      path: "/api/analytics/recommendations/apply",
      headers,
      body: {
        actionId: `smoke-reco-${Date.now()}`,
        title: "Smoke recommendation apply",
        detail: "Contract/live smoke probe for automation apply route.",
        href: "/admin/analytics",
        payload: {
          source: "smoke-policy-control-tower",
          runId: `run-${Date.now()}`,
        },
        context: {
          dateFrom: "2026-03-01",
          dateTo: "2026-03-05",
        },
      },
    });
    validateContractResponse(
      analyticsApplyRecommendation,
      recommendationApplyResponse.status,
      recommendationApplyResponse.payload,
      "analyticsApplyRecommendation",
    );
    console.log(`POST /api/analytics/recommendations/apply -> ${recommendationApplyResponse.status}`);
    recordCheck({
      name: "analyticsApplyRecommendation",
      method: "POST",
      path: "/api/analytics/recommendations/apply",
      status: recommendationApplyResponse.status,
      durationMs: recommendationApplyResponse.durationMs,
      ok: true,
    });

    const integrationAppsListResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/admin/integration-marketplace/apps",
      headers,
    });
    validateContractResponse(
      integrationAppsList,
      integrationAppsListResponse.status,
      integrationAppsListResponse.payload,
      "listIntegrationMarketplaceApps",
    );
    console.log(`GET /api/admin/integration-marketplace/apps -> ${integrationAppsListResponse.status}`);
    recordCheck({
      name: "listIntegrationMarketplaceApps",
      method: "GET",
      path: "/api/admin/integration-marketplace/apps",
      status: integrationAppsListResponse.status,
      durationMs: integrationAppsListResponse.durationMs,
      ok: true,
    });

    const headlessPacksListResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/admin/headless/packs?limit=20",
      headers,
    });
    validateContractResponse(
      headlessPacksList,
      headlessPacksListResponse.status,
      headlessPacksListResponse.payload,
      "listHeadlessPacks",
    );
    console.log(`GET /api/admin/headless/packs -> ${headlessPacksListResponse.status}`);
    recordCheck({
      name: "listHeadlessPacks",
      method: "GET",
      path: "/api/admin/headless/packs",
      status: headlessPacksListResponse.status,
      durationMs: headlessPacksListResponse.durationMs,
      ok: true,
    });

    const storeTemplatesListResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/admin/store-templates?limit=20",
      headers,
    });
    validateContractResponse(
      storeTemplatesList,
      storeTemplatesListResponse.status,
      storeTemplatesListResponse.payload,
      "listStoreTemplates",
    );
    console.log(`GET /api/admin/store-templates -> ${storeTemplatesListResponse.status}`);
    recordCheck({
      name: "listStoreTemplates",
      method: "GET",
      path: "/api/admin/store-templates",
      status: storeTemplatesListResponse.status,
      durationMs: storeTemplatesListResponse.durationMs,
      ok: true,
    });

    const platformPlansResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/platform/plans",
      headers,
    });
    validateContractResponse(
      platformPlans,
      platformPlansResponse.status,
      platformPlansResponse.payload,
      "getPlatformPlans",
    );
    console.log(`GET /api/platform/plans -> ${platformPlansResponse.status}`);
    recordCheck({
      name: "getPlatformPlans",
      method: "GET",
      path: "/api/platform/plans",
      status: platformPlansResponse.status,
      durationMs: platformPlansResponse.durationMs,
      ok: true,
    });

    const productsListResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/products?page=1&limit=5",
      headers,
    });
    validateContractResponse(
      productList,
      productsListResponse.status,
      productsListResponse.payload,
      "listProducts",
    );
    console.log(`GET /api/products -> ${productsListResponse.status}`);
    recordCheck({
      name: "listProducts",
      method: "GET",
      path: "/api/products",
      status: productsListResponse.status,
      durationMs: productsListResponse.durationMs,
      ok: true,
    });

    const missingSlug = `smoke-missing-${randomSuffix()}`;
    const productBySlugResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: `/api/products/${missingSlug}`,
      headers,
    });
    validateContractResponse(
      productBySlug,
      productBySlugResponse.status,
      productBySlugResponse.payload,
      "getProductBySlug",
    );
    console.log(`GET /api/products/:slug -> ${productBySlugResponse.status}`);
    recordCheck({
      name: "getProductBySlug",
      method: "GET",
      path: "/api/products/:slug",
      status: productBySlugResponse.status,
      durationMs: productBySlugResponse.durationMs,
      ok: true,
    });

    const collectionsResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/collections?page=1&limit=5",
      headers,
    });
    validateContractResponse(
      collectionList,
      collectionsResponse.status,
      collectionsResponse.payload,
      "listCollections",
    );
    console.log(`GET /api/collections -> ${collectionsResponse.status}`);
    recordCheck({
      name: "listCollections",
      method: "GET",
      path: "/api/collections",
      status: collectionsResponse.status,
      durationMs: collectionsResponse.durationMs,
      ok: true,
    });

    const cartGetResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/cart",
      headers,
    });
    validateContractResponse(cartGet, cartGetResponse.status, cartGetResponse.payload, "getCart");
    console.log(`GET /api/cart -> ${cartGetResponse.status}`);
    recordCheck({
      name: "getCart",
      method: "GET",
      path: "/api/cart",
      status: cartGetResponse.status,
      durationMs: cartGetResponse.durationMs,
      ok: true,
    });

    const cartValidateResponse = await requestJson({
      baseUrl,
      method: "POST",
      path: "/api/cart/validate",
      headers,
      body: {},
    });
    validateContractResponse(
      cartValidate,
      cartValidateResponse.status,
      cartValidateResponse.payload,
      "validateCart",
    );
    console.log(`POST /api/cart/validate -> ${cartValidateResponse.status}`);
    recordCheck({
      name: "validateCart",
      method: "POST",
      path: "/api/cart/validate",
      status: cartValidateResponse.status,
      durationMs: cartValidateResponse.durationMs,
      ok: true,
    });

    const reviewListResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: `/api/products/${missingSlug}/reviews?page=1&limit=5`,
      headers,
    });
    validateContractResponse(
      reviewList,
      reviewListResponse.status,
      reviewListResponse.payload,
      "listProductReviews",
    );
    console.log(`GET /api/products/:slug/reviews -> ${reviewListResponse.status}`);
    recordCheck({
      name: "listProductReviews",
      method: "GET",
      path: "/api/products/:slug/reviews",
      status: reviewListResponse.status,
      durationMs: reviewListResponse.durationMs,
      ok: true,
    });

    const missingReviewId = crypto.randomUUID();
    const reviewHelpfulResponse = await requestJson({
      baseUrl,
      method: "POST",
      path: `/api/reviews/${missingReviewId}/helpful`,
      headers,
      body: {},
    });
    validateContractResponse(
      reviewHelpful,
      reviewHelpfulResponse.status,
      reviewHelpfulResponse.payload,
      "markReviewHelpful",
    );
    console.log(`POST /api/reviews/:id/helpful -> ${reviewHelpfulResponse.status}`);
    recordCheck({
      name: "markReviewHelpful",
      method: "POST",
      path: "/api/reviews/:id/helpful",
      status: reviewHelpfulResponse.status,
      durationMs: reviewHelpfulResponse.durationMs,
      ok: true,
    });

    const reviewReportResponse = await requestJson({
      baseUrl,
      method: "POST",
      path: `/api/reviews/${missingReviewId}/report`,
      headers,
      body: {},
    });
    validateContractResponse(
      reviewReport,
      reviewReportResponse.status,
      reviewReportResponse.payload,
      "reportReview",
    );
    console.log(`POST /api/reviews/:id/report -> ${reviewReportResponse.status}`);
    recordCheck({
      name: "reportReview",
      method: "POST",
      path: "/api/reviews/:id/report",
      status: reviewReportResponse.status,
      durationMs: reviewReportResponse.durationMs,
      ok: true,
    });

    if (enableMutations) {
      if (integrationAppsListResponse.status === 200) {
        const payload = integrationAppsListResponse.payload as {
          apps: Array<{ provider: Provider; installed: boolean; source: "store_override" | "platform" | "none" }>;
        };
        const verifyCandidate = payload.apps[0];
        if (verifyCandidate) {
          const verifyPath = `/api/admin/integration-marketplace/apps/${verifyCandidate.provider}/verify`;
          await runContractRequestWithRetry({
            baseUrl,
            headers,
            requestPath: verifyPath,
            checkName: "verifyIntegrationApp",
            checkMethod: "POST",
            checkPath: "/api/admin/integration-marketplace/apps/:provider/verify",
            contractRoute: integrationVerify,
            contractName: "verifyIntegrationApp",
            policy: flakyPolicy.verifyIntegrationApp,
          });
        }

        const installCandidate = payload.apps.find(
          (app) => !app.installed && app.source === "none",
        );

        if (installCandidate) {
          const installResponse = await runContractRequestWithRetry({
            baseUrl,
            headers,
            requestPath: `/api/admin/integration-marketplace/apps/${installCandidate.provider}/install`,
            checkName: "installIntegrationApp",
            checkMethod: "POST",
            checkPath: "/api/admin/integration-marketplace/apps/:provider/install",
            contractRoute: integrationInstall,
            contractName: "installIntegrationApp",
            policy: flakyPolicy.installIntegrationApp,
          });

          if (installResponse?.status === 201) {
            installedIntegrationProvider = installCandidate.provider;
            const uninstallResponse = await runContractRequestWithRetry({
              baseUrl,
              headers,
              requestPath: `/api/admin/integration-marketplace/apps/${installCandidate.provider}/uninstall`,
              checkName: "uninstallIntegrationApp",
              checkMethod: "POST",
              checkPath: "/api/admin/integration-marketplace/apps/:provider/uninstall",
              contractRoute: integrationUninstall,
              contractName: "uninstallIntegrationApp",
              policy: flakyPolicy.uninstallIntegrationApp,
            });

            if (!uninstallResponse) {
              console.log(
                "POST /api/admin/integration-marketplace/apps/:provider/uninstall -> suppressed; deferring strict cleanup to finally block.",
              );
            } else if (uninstallResponse.status !== 200) {
              throw new Error(
                `Expected integration uninstall to return 200 after install, received ${uninstallResponse.status}`,
              );
            } else {
              installedIntegrationProvider = null;
            }
          }
        } else {
          console.log(
            "Skipping integration install/uninstall mutation check: no safe provider candidate (installed=false, source=none).",
          );
        }
      } else {
        console.log(
          "Skipping integration install/uninstall mutation check: list endpoint did not return 200.",
        );
      }

      const headlessPackName = `Smoke Pack ${randomSuffix()}`;
      const createHeadlessPackResponse = await requestJson({
        baseUrl,
        method: "POST",
        path: "/api/admin/headless/packs",
        headers,
        body: {
          name: headlessPackName,
          description: "Parity smoke fixture (auto-revoked).",
          scopes: ["catalog:read"],
          rateLimitPerMinute: 100,
        },
      });
      validateContractResponse(
        headlessPackCreate,
        createHeadlessPackResponse.status,
        createHeadlessPackResponse.payload,
        "createHeadlessPack",
      );
      console.log(`POST /api/admin/headless/packs -> ${createHeadlessPackResponse.status}`);
      recordCheck({
        name: "createHeadlessPack",
        method: "POST",
        path: "/api/admin/headless/packs",
        status: createHeadlessPackResponse.status,
        durationMs: createHeadlessPackResponse.durationMs,
        ok: true,
      });

      if (createHeadlessPackResponse.status === 201) {
        const payload = createHeadlessPackResponse.payload as { pack: { id: string } };
        createdHeadlessPackId = payload.pack.id;
        const revokeHeadlessPackResponse = await requestJson({
          baseUrl,
          method: "POST",
          path: `/api/admin/headless/packs/${createdHeadlessPackId}/revoke`,
          headers,
        });
        validateContractResponse(
          headlessPackRevoke,
          revokeHeadlessPackResponse.status,
          revokeHeadlessPackResponse.payload,
          "revokeHeadlessPack",
        );
        console.log(`POST /api/admin/headless/packs/:id/revoke -> ${revokeHeadlessPackResponse.status}`);
        recordCheck({
          name: "revokeHeadlessPack",
          method: "POST",
          path: "/api/admin/headless/packs/:id/revoke",
          status: revokeHeadlessPackResponse.status,
          durationMs: revokeHeadlessPackResponse.durationMs,
          ok: true,
        });

        if (revokeHeadlessPackResponse.status !== 200) {
          throw new Error(
            `Expected headless pack revoke to return 200 after create, received ${revokeHeadlessPackResponse.status}`,
          );
        }
        createdHeadlessPackId = null;
      }

      const storeTemplateName = `Smoke Template ${randomSuffix()}`;
      const createStoreTemplateResponse = await requestJson({
        baseUrl,
        method: "POST",
        path: "/api/admin/store-templates",
        headers,
        body: {
          name: storeTemplateName,
          description: "Parity smoke fixture (auto-deleted).",
        },
      });
      validateContractResponse(
        storeTemplateCreate,
        createStoreTemplateResponse.status,
        createStoreTemplateResponse.payload,
        "createStoreTemplate",
      );
      console.log(`POST /api/admin/store-templates -> ${createStoreTemplateResponse.status}`);
      recordCheck({
        name: "createStoreTemplate",
        method: "POST",
        path: "/api/admin/store-templates",
        status: createStoreTemplateResponse.status,
        durationMs: createStoreTemplateResponse.durationMs,
        ok: true,
      });

      if (createStoreTemplateResponse.status === 201) {
        const payload = createStoreTemplateResponse.payload as {
          template: { id: string; sourceStoreId: string };
        };
        createdStoreTemplateId = payload.template.id;

        const sourceStoreResponse = await requestJson({
          baseUrl,
          method: "GET",
          path: `/api/platform/stores/${payload.template.sourceStoreId}`,
          headers,
        });
        const sourceStorePayload =
          sourceStoreResponse.payload &&
          typeof sourceStoreResponse.payload === "object"
            ? (sourceStoreResponse.payload as {
                store?: { slug?: string };
                error?: string;
              })
            : null;
        const sourceStoreSlug = sourceStorePayload?.store?.slug;

        if (sourceStoreResponse.status === 200 && sourceStoreSlug) {
          const cloneResponse = await requestJson({
            baseUrl,
            method: "POST",
            path: `/api/admin/store-templates/${createdStoreTemplateId}/clone`,
            headers,
            body: {
              name: `Smoke Clone ${randomSuffix()}`,
              slug: sourceStoreSlug,
            },
          });
          validateContractResponse(
            storeTemplateClone,
            cloneResponse.status,
            cloneResponse.payload,
            "cloneStoreTemplate",
          );
          console.log(`POST /api/admin/store-templates/:id/clone -> ${cloneResponse.status}`);
          recordCheck({
            name: "cloneStoreTemplate",
            method: "POST",
            path: "/api/admin/store-templates/:id/clone",
            status: cloneResponse.status,
            durationMs: cloneResponse.durationMs,
            ok: true,
          });

          if (cloneResponse.status !== 400) {
            throw new Error(
              `Expected clone template with conflicting slug to return 400, received ${cloneResponse.status}`,
            );
          }
        } else {
          console.log(
            "Skipping clone-template conflict check: source store slug was not retrievable.",
          );
        }

        const deleteStoreTemplateResponse = await requestJson({
          baseUrl,
          method: "DELETE",
          path: `/api/admin/store-templates/${createdStoreTemplateId}`,
          headers,
        });
        validateContractResponse(
          storeTemplateDelete,
          deleteStoreTemplateResponse.status,
          deleteStoreTemplateResponse.payload,
          "deleteStoreTemplate",
        );
        console.log(`DELETE /api/admin/store-templates/:id -> ${deleteStoreTemplateResponse.status}`);
        recordCheck({
          name: "deleteStoreTemplate",
          method: "DELETE",
          path: "/api/admin/store-templates/:id",
          status: deleteStoreTemplateResponse.status,
          durationMs: deleteStoreTemplateResponse.durationMs,
          ok: true,
        });

        if (deleteStoreTemplateResponse.status !== 200) {
          throw new Error(
            `Expected store template delete to return 200 after create, received ${deleteStoreTemplateResponse.status}`,
          );
        }
        createdStoreTemplateId = null;
      }
    }

    console.log("Admin parity smoke passed.");
  } finally {
    if (installedIntegrationProvider) {
      const uninstallResponse = await runContractRequestWithRetry({
        baseUrl,
        headers,
        requestPath: `/api/admin/integration-marketplace/apps/${installedIntegrationProvider}/uninstall`,
        checkName: "uninstallIntegrationApp(cleanup)",
        checkMethod: "POST",
        checkPath: "/api/admin/integration-marketplace/apps/:provider/uninstall",
        contractRoute: integrationUninstall,
        contractName: "uninstallIntegrationApp(cleanup)",
        policy: flakyPolicy.uninstallIntegrationApp,
      });
      if (uninstallResponse?.status === 200) {
        installedIntegrationProvider = null;
      }
    }
    if (createdHeadlessPackId) {
      const revokeResponse = await requestJson({
        baseUrl,
        method: "POST",
        path: `/api/admin/headless/packs/${createdHeadlessPackId}/revoke`,
        headers,
      });
      validateContractResponse(
        headlessPackRevoke,
        revokeResponse.status,
        revokeResponse.payload,
        "revokeHeadlessPack(cleanup)",
      );
      console.log(`POST /api/admin/headless/packs/:id/revoke (cleanup) -> ${revokeResponse.status}`);
      recordCheck({
        name: "revokeHeadlessPack(cleanup)",
        method: "POST",
        path: "/api/admin/headless/packs/:id/revoke",
        status: revokeResponse.status,
        durationMs: revokeResponse.durationMs,
        ok: true,
      });
    }
    if (createdStoreTemplateId) {
      const deleteResponse = await requestJson({
        baseUrl,
        method: "DELETE",
        path: `/api/admin/store-templates/${createdStoreTemplateId}`,
        headers,
      });
      validateContractResponse(
        storeTemplateDelete,
        deleteResponse.status,
        deleteResponse.payload,
        "deleteStoreTemplate(cleanup)",
      );
      console.log(`DELETE /api/admin/store-templates/:id (cleanup) -> ${deleteResponse.status}`);
      recordCheck({
        name: "deleteStoreTemplate(cleanup)",
        method: "DELETE",
        path: "/api/admin/store-templates/:id",
        status: deleteResponse.status,
        durationMs: deleteResponse.durationMs,
        ok: true,
      });
    }
    if (changedPolicy && baselinePolicy) {
      const restoreResponse = await requestJson({
        baseUrl,
        method: "PUT",
        path: "/api/admin/policies",
        headers,
        body: policyPayloadToBody(baselinePolicy),
      });
      validateContractResponse(policyPut, restoreResponse.status, restoreResponse.payload, "updatePolicy(restore)");
      console.log(`PUT /api/admin/policies (restore) -> ${restoreResponse.status}`);
      recordCheck({
        name: "updatePolicy(restore)",
        method: "PUT",
        path: "/api/admin/policies",
        status: restoreResponse.status,
        durationMs: restoreResponse.durationMs,
        ok: true,
      });
    }
  }

  const finalMetrics = buildMetrics(SMOKE_CHECK_RESULTS);
  assertOwnerLatencySlo(finalMetrics);

  await writeReport({
    startedAt: SMOKE_STARTED_AT,
    finishedAt: new Date().toISOString(),
    status: SMOKE_CHECK_RESULTS.some((check) => check.suppressed)
      ? "passed_with_suppressed"
      : "passed",
    mutationChecksEnabled: enableMutations,
    flakyPolicy,
    metrics: finalMetrics,
    checks: SMOKE_CHECK_RESULTS,
    error: null,
  });
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  recordCheck({
    name: "run_failure",
    method: "N/A",
    path: "N/A",
    status: "contract",
    ok: false,
  });
  const report: SmokeReport = {
    startedAt: SMOKE_STARTED_AT,
    finishedAt: new Date().toISOString(),
    status: "failed",
    mutationChecksEnabled: isEnabled(process.env.SMOKE_ENABLE_MUTATIONS),
    flakyPolicy: buildFlakyPolicy(),
    metrics: buildMetrics(SMOKE_CHECK_RESULTS),
    checks: SMOKE_CHECK_RESULTS,
    error: message,
  };
  await writeReport(report);
  await sendFailureAlert(report);
  console.error(`Admin parity smoke failed: ${message}`);
  process.exitCode = 1;
});
