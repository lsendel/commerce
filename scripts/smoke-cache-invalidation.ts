import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { buildCacheKey } from "../src/infrastructure/cache/cache";
import {
  buildCacheInvalidationPlan,
  type CacheInvalidationResource,
  type CacheInvalidationResourceType,
  type CacheInvalidationResolvers,
} from "../src/infrastructure/cache/invalidation-plan";

type CheckStatus = "pass" | "fail";
type ReportStatus = "passed" | "failed";

interface CachePolicySurface {
  id: string;
  label: string;
  routePath: string;
  sourcePath: string;
  ttlSeconds: number;
  tags: string[];
  requiredSnippets: string[];
  targetHitRatePercent: number;
  invalidationResourceTypes: CacheInvalidationResourceType[];
}

interface CacheInvalidationTrigger {
  id: string;
  label: string;
  sourcePath: string;
  resourceTypes: CacheInvalidationResourceType[];
  requiredSnippets: string[];
}

interface CachePolicyMatrix {
  version: "v1";
  owner: string;
  reviewCadenceDays: number;
  lastReviewedOn: string;
  nextReviewBy: string;
  webhookPath: string;
  resourceTypeCoverage: CacheInvalidationResourceType[];
  surfaces: CachePolicySurface[];
  invalidationTriggers: CacheInvalidationTrigger[];
}

interface SmokeCheck {
  id: string;
  status: CheckStatus;
  note: string;
}

interface PlanEvaluation {
  id: string;
  status: CheckStatus;
  tagsOk: boolean;
  directKeysOk: boolean;
  unresolvedOk: boolean;
  touchedSurfacesOk: boolean;
  note: string;
}

interface CacheInvalidationSmokeReport {
  startedAt: string;
  finishedAt: string;
  status: ReportStatus;
  reportVersion: "v1";
  policyPath: string;
  checks: SmokeCheck[];
  planEvaluations: PlanEvaluation[];
  metrics: {
    totalChecks: number;
    failedChecks: number;
    surfaceCount: number;
    triggerCount: number;
    planCases: number;
    planCasesPassing: number;
  };
}

interface PlanCaseSpec {
  id: string;
  resources: CacheInvalidationResource[];
  expectedTags: string[];
  expectedDirectKeys: string[];
  expectedUnresolved?: Array<{ type: CacheInvalidationResourceType; id: string }>;
  expectedTouchedSurfaces: string[];
  resolvers?: CacheInvalidationResolvers;
}

const SUPPORTED_RESOURCE_TYPES: CacheInvalidationResourceType[] = [
  "product",
  "collection",
  "event",
  "currency_rates",
  "products_listing",
  "collections_listing",
  "events_listing",
];

const STORE_ID = "smoke-store";

function runCheck(id: string, condition: boolean, note: string): SmokeCheck {
  return {
    id,
    status: condition ? "pass" : "fail",
    note,
  };
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadPolicy(path: string): Promise<CachePolicyMatrix> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as Partial<CachePolicyMatrix>;

  if (parsed.version !== "v1") {
    throw new Error("Cache policy matrix version must be v1.");
  }
  if (!Array.isArray(parsed.surfaces) || !Array.isArray(parsed.invalidationTriggers)) {
    throw new Error("Cache policy matrix must define surfaces and invalidationTriggers arrays.");
  }

  return parsed as CachePolicyMatrix;
}

function includesAll<T>(actual: T[], expected: T[]): boolean {
  return expected.every((item) => actual.includes(item));
}

function normalizeUnresolved(items: Array<{ type: CacheInvalidationResourceType; id: string }>): string[] {
  return items
    .map((item) => `${item.type}:${item.id}`)
    .sort((a, b) => a.localeCompare(b));
}

async function evaluatePlanCase(spec: PlanCaseSpec): Promise<PlanEvaluation> {
  const plan = await buildCacheInvalidationPlan({
    storeId: STORE_ID,
    resources: spec.resources,
    resolvers: spec.resolvers,
  });

  const tagsOk = includesAll(plan.tags, spec.expectedTags);
  const directKeysOk = includesAll(plan.directKeys, spec.expectedDirectKeys);

  const expectedUnresolved = spec.expectedUnresolved ?? [];
  const unresolvedOk =
    normalizeUnresolved(plan.unresolved).join("|") ===
    normalizeUnresolved(expectedUnresolved).join("|");

  const touchedSurfacesOk = includesAll(plan.touchedSurfaces, spec.expectedTouchedSurfaces);

  const status: CheckStatus = tagsOk && directKeysOk && unresolvedOk && touchedSurfacesOk ? "pass" : "fail";

  const notes: string[] = [];
  if (!tagsOk) notes.push("missing expected tags");
  if (!directKeysOk) notes.push("missing expected direct keys");
  if (!unresolvedOk) notes.push("unexpected unresolved set");
  if (!touchedSurfacesOk) notes.push("missing expected touched surfaces");

  return {
    id: spec.id,
    status,
    tagsOk,
    directKeysOk,
    unresolvedOk,
    touchedSurfacesOk,
    note: notes.length > 0 ? notes.join(", ") : "all expected outputs present",
  };
}

async function evaluateChecks(policyPath: string): Promise<{
  checks: SmokeCheck[];
  planEvaluations: PlanEvaluation[];
  surfaceCount: number;
  triggerCount: number;
}> {
  const checks: SmokeCheck[] = [];
  const policy = await loadPolicy(policyPath);

  checks.push(
    runCheck(
      "policy-owner-present",
      policy.owner.trim().length > 0,
      "Policy owner must be defined.",
    ),
  );
  checks.push(
    runCheck(
      "surfaces-present",
      policy.surfaces.length > 0,
      "Policy must define at least one cache surface.",
    ),
  );
  checks.push(
    runCheck(
      "triggers-present",
      policy.invalidationTriggers.length > 0,
      "Policy must define at least one invalidation trigger.",
    ),
  );
  checks.push(
    runCheck(
      "resource-type-coverage",
      includesAll(policy.resourceTypeCoverage, SUPPORTED_RESOURCE_TYPES),
      `resourceTypeCoverage must include all supported resource types: ${SUPPORTED_RESOURCE_TYPES.join(", ")}`,
    ),
  );
  checks.push(
    runCheck(
      "webhook-path-valid",
      policy.webhookPath.startsWith("/api/") && policy.webhookPath.includes("cache-invalidate"),
      "webhookPath must include /api/ and cache-invalidate path semantics.",
    ),
  );

  const cadenceValid = Number.isFinite(policy.reviewCadenceDays) && policy.reviewCadenceDays > 0;
  checks.push(
    runCheck(
      "review-cadence-valid",
      cadenceValid,
      "reviewCadenceDays must be a positive number.",
    ),
  );

  const reviewDatesValid = isIsoDate(policy.lastReviewedOn) && isIsoDate(policy.nextReviewBy);
  checks.push(
    runCheck(
      "review-dates-format",
      reviewDatesValid,
      "lastReviewedOn and nextReviewBy must use YYYY-MM-DD format.",
    ),
  );

  if (cadenceValid && reviewDatesValid) {
    const last = parseDate(policy.lastReviewedOn);
    const next = parseDate(policy.nextReviewBy);
    const maxNext = new Date(last.getTime() + ((policy.reviewCadenceDays + 1) * 86_400_000));
    const nextEnd = new Date(next.getTime() + 86_400_000 - 1);

    checks.push(
      runCheck(
        "review-next-after-last",
        next.getTime() >= last.getTime(),
        "nextReviewBy must be on or after lastReviewedOn.",
      ),
    );
    checks.push(
      runCheck(
        "review-window-valid",
        next.getTime() <= maxNext.getTime(),
        "nextReviewBy must stay within reviewCadenceDays window.",
      ),
    );
    checks.push(
      runCheck(
        "review-not-overdue",
        Date.now() <= nextEnd.getTime(),
        "Cache policy review date must not be overdue.",
      ),
    );
  }

  const sourceCache = new Map<string, string>();
  async function getSource(path: string): Promise<string> {
    if (sourceCache.has(path)) return sourceCache.get(path) ?? "";
    const source = await readFile(path, "utf8");
    sourceCache.set(path, source);
    return source;
  }

  for (const surface of policy.surfaces) {
    const prefix = `surface-${surface.id}`;

    checks.push(
      runCheck(
        `${prefix}-route-path-valid`,
        surface.routePath.startsWith("/"),
        `Surface routePath must start with /: ${surface.routePath}`,
      ),
    );

    checks.push(
      runCheck(
        `${prefix}-ttl-valid`,
        Number.isFinite(surface.ttlSeconds) && surface.ttlSeconds > 0,
        `Surface ttlSeconds must be positive: ${surface.ttlSeconds}`,
      ),
    );

    checks.push(
      runCheck(
        `${prefix}-tags-present`,
        Array.isArray(surface.tags) && surface.tags.length > 0,
        "Surface tags must be a non-empty array.",
      ),
    );

    checks.push(
      runCheck(
        `${prefix}-target-hit-rate-valid`,
        Number.isFinite(surface.targetHitRatePercent) &&
          surface.targetHitRatePercent > 0 &&
          surface.targetHitRatePercent <= 100,
        `targetHitRatePercent must be in range (0, 100]: ${surface.targetHitRatePercent}`,
      ),
    );

    checks.push(
      runCheck(
        `${prefix}-resource-types-valid`,
        includesAll(SUPPORTED_RESOURCE_TYPES, surface.invalidationResourceTypes),
        `Surface invalidationResourceTypes must use supported resource types only: ${surface.invalidationResourceTypes.join(", ")}`,
      ),
    );

    const sourcePathExists = await pathExists(surface.sourcePath);
    checks.push(
      runCheck(
        `${prefix}-source-path-exists`,
        sourcePathExists,
        `Surface source path must exist: ${surface.sourcePath}`,
      ),
    );

    if (sourcePathExists) {
      const source = await getSource(surface.sourcePath);
      for (const [index, snippet] of surface.requiredSnippets.entries()) {
        checks.push(
          runCheck(
            `${prefix}-snippet-${index + 1}`,
            source.includes(snippet),
            `Required snippet must be present in ${surface.sourcePath}: ${snippet}`,
          ),
        );
      }
    }
  }

  for (const trigger of policy.invalidationTriggers) {
    const prefix = `trigger-${trigger.id}`;

    checks.push(
      runCheck(
        `${prefix}-resource-types-valid`,
        includesAll(SUPPORTED_RESOURCE_TYPES, trigger.resourceTypes),
        `Trigger resourceTypes must use supported resource types only: ${trigger.resourceTypes.join(", ")}`,
      ),
    );

    const sourcePathExists = await pathExists(trigger.sourcePath);
    checks.push(
      runCheck(
        `${prefix}-source-path-exists`,
        sourcePathExists,
        `Trigger source path must exist: ${trigger.sourcePath}`,
      ),
    );

    if (sourcePathExists) {
      const source = await getSource(trigger.sourcePath);
      for (const [index, snippet] of trigger.requiredSnippets.entries()) {
        checks.push(
          runCheck(
            `${prefix}-snippet-${index + 1}`,
            source.includes(snippet),
            `Required snippet must be present in ${trigger.sourcePath}: ${snippet}`,
          ),
        );
      }
    }
  }

  const planCases: PlanCaseSpec[] = [
    {
      id: "plan-product-slug",
      resources: [{ type: "product", slug: "pet-tag" }],
      expectedTags: ["products:list", "products:detail", "product:pet-tag"],
      expectedDirectKeys: [
        buildCacheKey(STORE_ID, "/api/products/pet-tag"),
        buildCacheKey(STORE_ID, "/products/pet-tag"),
      ],
      expectedTouchedSurfaces: ["catalog-products"],
    },
    {
      id: "plan-collection-slug",
      resources: [{ type: "collection", slug: "best-sellers" }],
      expectedTags: ["products:list", "collections:list", "collection:best-sellers"],
      expectedDirectKeys: [
        buildCacheKey(STORE_ID, "/api/collections"),
        buildCacheKey(STORE_ID, "/api/collections/best-sellers"),
        buildCacheKey(STORE_ID, "/api/products", { collection: "best-sellers" }),
      ],
      expectedTouchedSurfaces: ["catalog-collections"],
    },
    {
      id: "plan-event-slug",
      resources: [{ type: "event", slug: "spring-grooming" }],
      expectedTags: ["events:list", "events:detail", "event:spring-grooming"],
      expectedDirectKeys: [buildCacheKey(STORE_ID, "/api/events/spring-grooming")],
      expectedTouchedSurfaces: ["catalog-events"],
    },
    {
      id: "plan-currency-rates",
      resources: [{ type: "currency_rates" }],
      expectedTags: ["currency:rates"],
      expectedDirectKeys: [buildCacheKey(STORE_ID, "/api/currency/rates")],
      expectedTouchedSurfaces: ["currency-rates"],
    },
    {
      id: "plan-listing-broadcast",
      resources: [
        { type: "products_listing" },
        { type: "collections_listing" },
        { type: "events_listing" },
      ],
      expectedTags: ["products:list", "collections:list", "events:list"],
      expectedDirectKeys: [
        buildCacheKey(STORE_ID, "/api/products"),
        buildCacheKey(STORE_ID, "/api/collections"),
        buildCacheKey(STORE_ID, "/api/products/collections"),
        buildCacheKey(STORE_ID, "/api/events"),
      ],
      expectedTouchedSurfaces: ["catalog-products", "catalog-collections", "catalog-events"],
    },
    {
      id: "plan-unresolved-product-id",
      resources: [{ type: "product", id: "prod-missing" }],
      expectedTags: ["products:list", "products:detail"],
      expectedDirectKeys: [],
      expectedUnresolved: [{ type: "product", id: "prod-missing" }],
      expectedTouchedSurfaces: ["catalog-products"],
    },
    {
      id: "plan-resolver-id-coverage",
      resources: [
        { type: "product", id: "prod-1" },
        { type: "collection", id: "col-1" },
        { type: "event", id: "evt-1" },
      ],
      resolvers: {
        resolveProductSlugById: async (id) => (id === "prod-1" ? "prod-one" : null),
        resolveCollectionSlugById: async (id) => (id === "col-1" ? "col-one" : null),
        resolveEventSlugById: async (id) => (id === "evt-1" ? "event-one" : null),
      },
      expectedTags: [
        "products:list",
        "products:detail",
        "product:prod-one",
        "collections:list",
        "collection:col-one",
        "events:list",
        "events:detail",
        "event:event-one",
      ],
      expectedDirectKeys: [
        buildCacheKey(STORE_ID, "/api/products/prod-one"),
        buildCacheKey(STORE_ID, "/products/prod-one"),
        buildCacheKey(STORE_ID, "/api/collections"),
        buildCacheKey(STORE_ID, "/api/collections/col-one"),
        buildCacheKey(STORE_ID, "/api/products", { collection: "col-one" }),
        buildCacheKey(STORE_ID, "/api/events/event-one"),
      ],
      expectedUnresolved: [],
      expectedTouchedSurfaces: ["catalog-products", "catalog-collections", "catalog-events"],
    },
  ];

  const planEvaluations: PlanEvaluation[] = [];
  for (const spec of planCases) {
    const evaluation = await evaluatePlanCase(spec);
    planEvaluations.push(evaluation);
    checks.push(
      runCheck(
        `plan-${spec.id}`,
        evaluation.status === "pass",
        `Plan case ${spec.id} must satisfy expected tags/keys/unresolved/touched surfaces.`,
      ),
    );
  }

  return {
    checks,
    planEvaluations,
    surfaceCount: policy.surfaces.length,
    triggerCount: policy.invalidationTriggers.length,
  };
}

async function writeReport(report: CacheInvalidationSmokeReport) {
  const jsonPath =
    process.env.SMOKE_CACHE_INVALIDATION_JSON_PATH ??
    "output/smoke/cache-invalidation-report.json";
  const mdPath =
    process.env.SMOKE_CACHE_INVALIDATION_MD_PATH ??
    "output/smoke/cache-invalidation-report.md";

  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(mdPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# Cache Invalidation Smoke Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Policy path: ${report.policyPath}`,
    `- Surface count: ${report.metrics.surfaceCount}`,
    `- Trigger count: ${report.metrics.triggerCount}`,
    `- Plan cases: ${report.metrics.planCases}`,
    `- Plan cases passing: ${report.metrics.planCasesPassing}`,
    `- Total checks: ${report.metrics.totalChecks}`,
    `- Failed checks: ${report.metrics.failedChecks}`,
    "",
    "## Plan Evaluations",
    "",
    "| Case | Status | Tags | Direct Keys | Unresolved | Touched Surfaces | Note |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...report.planEvaluations.map(
      (evaluation) =>
        `| ${evaluation.id} | ${evaluation.status} | ${evaluation.tagsOk ? "pass" : "fail"} | ${evaluation.directKeysOk ? "pass" : "fail"} | ${evaluation.unresolvedOk ? "pass" : "fail"} | ${evaluation.touchedSurfacesOk ? "pass" : "fail"} | ${evaluation.note.replace(/\|/g, "\\|")} |`,
    ),
    "",
    "## Checks",
    "",
    "| Check | Status | Note |",
    "| --- | --- | --- |",
    ...report.checks.map(
      (check) =>
        `| ${check.id} | ${check.status} | ${check.note.replace(/\|/g, "\\|")} |`,
    ),
    "",
  ];

  await writeFile(mdPath, `${lines.join("\n")}\n`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const policyPath =
    process.env.SMOKE_CACHE_POLICY_PATH ??
    "docs/policies/cache-policy-matrix-v1.json";

  const { checks, planEvaluations, surfaceCount, triggerCount } =
    await evaluateChecks(policyPath);
  const failedChecks = checks.filter((check) => check.status === "fail").length;
  const planCasesPassing = planEvaluations.filter(
    (evaluation) => evaluation.status === "pass",
  ).length;

  const report: CacheInvalidationSmokeReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: failedChecks > 0 ? "failed" : "passed",
    reportVersion: "v1",
    policyPath,
    checks,
    planEvaluations,
    metrics: {
      totalChecks: checks.length,
      failedChecks,
      surfaceCount,
      triggerCount,
      planCases: planEvaluations.length,
      planCasesPassing,
    },
  };

  await writeReport(report);

  if (report.status === "failed") {
    console.error(`Cache invalidation smoke failed: ${failedChecks} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log("Cache invalidation smoke passed.");
}

main().catch((error) => {
  console.error(
    `Cache invalidation smoke crashed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
