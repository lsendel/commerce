import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";

type MatrixStatus = "passed" | "failed" | "skipped";

interface CommandResult {
  name: string;
  ran: boolean;
  status: MatrixStatus;
  exitCode: number | null;
  durationMs: number;
  summary: string;
}

interface HttpCheck {
  id: string;
  journey: "storefront" | "auth" | "account" | "platform" | "admin";
  section: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  expectedStatus: number | number[];
  body?: unknown;
}

interface HttpCheckResult {
  id: string;
  journey: HttpCheck["journey"];
  section: string;
  method: HttpCheck["method"];
  path: string;
  expectedStatus: number | number[];
  actualStatus: number | null;
  ok: boolean;
  durationMs: number;
  note: string | null;
}

interface SmokeMatrixReport {
  startedAt: string;
  finishedAt: string;
  status: MatrixStatus;
  baseUrl: string;
  skipHttpChecks: boolean;
  commands: CommandResult[];
  metrics: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    skippedChecks: number;
  };
  sections: Array<{
    section: string;
    total: number;
    passed: number;
    failed: number;
  }>;
  checks: HttpCheckResult[];
}

const HTTP_CHECKS: HttpCheck[] = [
  // Storefront public journeys.
  { id: "home", journey: "storefront", section: "public-pages", method: "GET", path: "/", expectedStatus: 200 },
  {
    id: "products-page",
    journey: "storefront",
    section: "public-pages",
    method: "GET",
    path: "/products",
    expectedStatus: 200,
  },
  { id: "events-page", journey: "storefront", section: "public-pages", method: "GET", path: "/events", expectedStatus: 200 },
  { id: "health", journey: "storefront", section: "public-api", method: "GET", path: "/health", expectedStatus: 200 },
  {
    id: "products-api",
    journey: "storefront",
    section: "public-api",
    method: "GET",
    path: "/api/products?page=1&limit=5",
    expectedStatus: 200,
  },
  { id: "cart-api", journey: "storefront", section: "public-api", method: "GET", path: "/api/cart", expectedStatus: 200 },
  {
    id: "platform-plans-api",
    journey: "storefront",
    section: "public-api",
    method: "GET",
    path: "/api/platform/plans",
    expectedStatus: 200,
  },
  {
    id: "robots-txt",
    journey: "storefront",
    section: "seo-public-assets",
    method: "GET",
    path: "/robots.txt",
    expectedStatus: 200,
  },
  {
    id: "sitemap-xml",
    journey: "storefront",
    section: "seo-public-assets",
    method: "GET",
    path: "/sitemap.xml",
    expectedStatus: 200,
  },
  {
    id: "llms-txt",
    journey: "storefront",
    section: "seo-public-assets",
    method: "GET",
    path: "/llms.txt",
    expectedStatus: 200,
  },
  {
    id: "ai-plugin-manifest",
    journey: "storefront",
    section: "llm-surface-assets",
    method: "GET",
    path: "/.well-known/ai-plugin.json",
    expectedStatus: 200,
  },

  // Auth entry journeys.
  { id: "auth-login-page", journey: "auth", section: "auth-pages", method: "GET", path: "/auth/login", expectedStatus: 200 },
  {
    id: "auth-register-page",
    journey: "auth",
    section: "auth-pages",
    method: "GET",
    path: "/auth/register",
    expectedStatus: 200,
  },
  {
    id: "auth-forgot-password-page",
    journey: "auth",
    section: "auth-pages",
    method: "GET",
    path: "/auth/forgot-password",
    expectedStatus: 200,
  },
  {
    id: "auth-login-validation",
    journey: "auth",
    section: "auth-api-validation",
    method: "POST",
    path: "/api/auth/login",
    expectedStatus: 400,
    body: {},
  },
  {
    id: "auth-register-validation",
    journey: "auth",
    section: "auth-api-validation",
    method: "POST",
    path: "/api/auth/register",
    expectedStatus: 400,
    body: {},
  },
  {
    id: "auth-forgot-password",
    journey: "auth",
    section: "auth-api-edge-cases",
    method: "POST",
    path: "/api/auth/forgot-password",
    expectedStatus: 400,
    body: {},
  },
  {
    id: "auth-reset-password-invalid-token",
    journey: "auth",
    section: "auth-api-edge-cases",
    method: "POST",
    path: "/api/auth/reset-password",
    expectedStatus: 400,
    body: { token: "00000000-0000-0000-0000-000000000000", password: "Strong123" },
  },
  {
    id: "auth-verify-email-invalid-token",
    journey: "auth",
    section: "auth-api-edge-cases",
    method: "POST",
    path: "/api/auth/verify-email",
    expectedStatus: 400,
    body: { token: "00000000-0000-0000-0000-000000000000" },
  },
  {
    id: "cart-apply-coupon-validation",
    journey: "storefront",
    section: "checkout-failure-modes",
    method: "POST",
    path: "/api/cart/apply-coupon",
    expectedStatus: 400,
    body: {},
  },
  {
    id: "cart-apply-coupon-not-found",
    journey: "storefront",
    section: "checkout-failure-modes",
    method: "POST",
    path: "/api/cart/apply-coupon",
    expectedStatus: 404,
    body: { code: "INVALID_WEEK40_COUPON" },
  },
  {
    id: "shipping-calculate-validation",
    journey: "storefront",
    section: "checkout-failure-modes",
    method: "POST",
    path: "/api/shipping/calculate",
    expectedStatus: 400,
    body: {
      items: [],
      address: { country: "U" },
      subtotal: -1,
    },
  },

  // Account gates (unauth user should be redirected or blocked).
  {
    id: "account-settings-gate",
    journey: "account",
    section: "account-page-gates",
    method: "GET",
    path: "/account/settings",
    expectedStatus: 302,
  },
  {
    id: "account-subscriptions-gate",
    journey: "account",
    section: "account-page-gates",
    method: "GET",
    path: "/account/subscriptions",
    expectedStatus: 302,
  },
  {
    id: "account-orders-gate",
    journey: "account",
    section: "account-page-gates",
    method: "GET",
    path: "/account/orders",
    expectedStatus: 302,
  },
  {
    id: "account-addresses-gate",
    journey: "account",
    section: "account-page-gates",
    method: "GET",
    path: "/account/addresses",
    expectedStatus: 302,
  },
  {
    id: "account-pets-gate",
    journey: "account",
    section: "account-page-gates",
    method: "GET",
    path: "/account/pets",
    expectedStatus: 302,
  },
  {
    id: "account-artwork-gate",
    journey: "account",
    section: "account-page-gates",
    method: "GET",
    path: "/account/artwork",
    expectedStatus: 302,
  },
  {
    id: "account-loyalty-gate",
    journey: "account",
    section: "account-page-gates",
    method: "GET",
    path: "/account/loyalty",
    expectedStatus: 302,
  },
  { id: "auth-me-gate", journey: "account", section: "account-api-gates", method: "GET", path: "/api/auth/me", expectedStatus: 401 },
  { id: "auth-profile-gate", journey: "account", section: "account-api-gates", method: "GET", path: "/api/auth/profile", expectedStatus: 401 },
  {
    id: "account-profile-gate",
    journey: "account",
    section: "account-api-gates",
    method: "GET",
    path: "/api/account/profile",
    expectedStatus: 401,
  },
  {
    id: "account-orders-api-gate",
    journey: "account",
    section: "account-api-gates",
    method: "GET",
    path: "/api/account/orders",
    expectedStatus: 401,
  },
  {
    id: "account-subscriptions-api-gate",
    journey: "account",
    section: "account-api-gates",
    method: "GET",
    path: "/api/account/subscriptions",
    expectedStatus: 401,
  },
  {
    id: "account-addresses-api-gate",
    journey: "account",
    section: "account-api-gates",
    method: "GET",
    path: "/api/account/addresses",
    expectedStatus: 401,
  },
  {
    id: "analytics-readiness-gate",
    journey: "account",
    section: "account-api-gates",
    method: "GET",
    path: "/api/analytics/readiness",
    expectedStatus: 401,
  },
  {
    id: "analytics-top-products-gate",
    journey: "account",
    section: "account-api-gates",
    method: "GET",
    path: "/api/analytics/top-products",
    expectedStatus: 401,
  },
  {
    id: "analytics-revenue-gate",
    journey: "account",
    section: "account-api-gates",
    method: "GET",
    path: "/api/analytics/revenue",
    expectedStatus: 401,
  },
  {
    id: "analytics-cost-observability-gate",
    journey: "account",
    section: "account-api-gates",
    method: "GET",
    path: "/api/analytics/cost-observability?from=2026-02-01&to=2026-02-07",
    expectedStatus: 401,
  },
  {
    id: "analytics-recommendations-history-gate",
    journey: "account",
    section: "account-api-gates",
    method: "GET",
    path: "/api/analytics/recommendations/history?limit=5",
    expectedStatus: 401,
  },
  {
    id: "analytics-recommendations-apply-gate",
    journey: "account",
    section: "account-api-gates",
    method: "POST",
    path: "/api/analytics/recommendations/apply",
    expectedStatus: 401,
    body: {
      actionId: "smoke-recommendation",
      title: "Smoke recommendation",
      href: "/admin/analytics",
    },
  },
  {
    id: "checkout-create-gate",
    journey: "account",
    section: "account-api-gates",
    method: "POST",
    path: "/api/checkout",
    expectedStatus: 401,
    body: {},
  },
  {
    id: "auth-request-verification-gate",
    journey: "account",
    section: "account-api-gates",
    method: "POST",
    path: "/api/auth/request-verification",
    expectedStatus: 401,
    body: {},
  },
  {
    id: "auth-change-password-gate",
    journey: "account",
    section: "account-api-gates",
    method: "POST",
    path: "/api/auth/change-password",
    expectedStatus: 401,
    body: { currentPassword: "Password123", newPassword: "Password456" },
  },
  {
    id: "subscriptions-list-gate",
    journey: "account",
    section: "account-api-gates",
    method: "GET",
    path: "/api/subscriptions",
    expectedStatus: 401,
  },
  {
    id: "subscriptions-create-gate",
    journey: "account",
    section: "account-api-gates",
    method: "POST",
    path: "/api/subscriptions",
    expectedStatus: 401,
    body: { planId: "00000000-0000-0000-0000-000000000000" },
  },
  {
    id: "subscriptions-builder-options-gate",
    journey: "account",
    section: "account-api-gates",
    method: "GET",
    path: "/api/subscriptions/builder/options",
    expectedStatus: 401,
  },
  {
    id: "subscriptions-builder-quote-gate",
    journey: "account",
    section: "account-api-gates",
    method: "POST",
    path: "/api/subscriptions/builder/quote",
    expectedStatus: 401,
    body: { selections: [{ planId: "00000000-0000-0000-0000-000000000000", quantity: 1 }] },
  },
  {
    id: "subscriptions-builder-checkout-gate",
    journey: "account",
    section: "account-api-gates",
    method: "POST",
    path: "/api/subscriptions/builder/checkout",
    expectedStatus: 401,
    body: { selections: [{ planId: "00000000-0000-0000-0000-000000000000", quantity: 1 }] },
  },
  {
    id: "subscriptions-portal-gate",
    journey: "account",
    section: "account-api-gates",
    method: "POST",
    path: "/api/subscriptions/portal",
    expectedStatus: 401,
    body: {},
  },
  {
    id: "subscriptions-cancel-gate",
    journey: "account",
    section: "account-api-gates",
    method: "DELETE",
    path: "/api/subscriptions/00000000-0000-0000-0000-000000000000",
    expectedStatus: 401,
  },
  {
    id: "subscriptions-change-plan-gate",
    journey: "account",
    section: "account-api-gates",
    method: "PATCH",
    path: "/api/subscriptions/00000000-0000-0000-0000-000000000000/change-plan",
    expectedStatus: 401,
    body: { newPlanId: "00000000-0000-0000-0000-000000000000" },
  },
  {
    id: "subscriptions-resume-gate",
    journey: "account",
    section: "account-api-gates",
    method: "POST",
    path: "/api/subscriptions/00000000-0000-0000-0000-000000000000/resume",
    expectedStatus: 401,
    body: {},
  },

  // Platform/admin operator gates.
  {
    id: "platform-dashboard-gate",
    journey: "platform",
    section: "platform-page-gates",
    method: "GET",
    path: "/platform/dashboard",
    expectedStatus: 302,
  },
  {
    id: "platform-settings-gate",
    journey: "platform",
    section: "platform-page-gates",
    method: "GET",
    path: "/platform/settings",
    expectedStatus: 302,
  },
  {
    id: "platform-members-gate",
    journey: "platform",
    section: "platform-page-gates",
    method: "GET",
    path: "/platform/members",
    expectedStatus: 302,
  },
  {
    id: "platform-integrations-gate",
    journey: "platform",
    section: "platform-page-gates",
    method: "GET",
    path: "/platform/integrations",
    expectedStatus: 302,
  },
  {
    id: "platform-stores-gate",
    journey: "platform",
    section: "platform-api-gates",
    method: "GET",
    path: "/api/platform/stores",
    expectedStatus: 401,
  },
  {
    id: "admin-orders-gate",
    journey: "admin",
    section: "admin-page-gates",
    method: "GET",
    path: "/admin/orders",
    expectedStatus: 302,
  },
  {
    id: "admin-analytics-gate",
    journey: "admin",
    section: "admin-page-gates",
    method: "GET",
    path: "/admin/analytics",
    expectedStatus: 302,
  },
  {
    id: "admin-bookings-gate",
    journey: "admin",
    section: "admin-page-gates",
    method: "GET",
    path: "/admin/bookings",
    expectedStatus: 302,
  },
  {
    id: "admin-reviews-gate",
    journey: "admin",
    section: "admin-page-gates",
    method: "GET",
    path: "/admin/reviews",
    expectedStatus: 302,
  },
  {
    id: "admin-segments-gate",
    journey: "admin",
    section: "admin-page-gates",
    method: "GET",
    path: "/admin/segments",
    expectedStatus: 302,
  },
  {
    id: "admin-affiliates-gate",
    journey: "admin",
    section: "admin-page-gates",
    method: "GET",
    path: "/admin/affiliates",
    expectedStatus: 302,
  },
  {
    id: "admin-fulfillment-gate",
    journey: "admin",
    section: "admin-page-gates",
    method: "GET",
    path: "/admin/fulfillment",
    expectedStatus: 302,
  },
  {
    id: "admin-promotions-gate",
    journey: "admin",
    section: "admin-page-gates",
    method: "GET",
    path: "/admin/promotions",
    expectedStatus: 302,
  },
  {
    id: "admin-promotion-codes-gate",
    journey: "admin",
    section: "admin-page-gates",
    method: "GET",
    path: "/admin/promotion-codes",
    expectedStatus: 302,
  },
  {
    id: "admin-shipping-gate",
    journey: "admin",
    section: "admin-page-gates",
    method: "GET",
    path: "/admin/shipping",
    expectedStatus: 302,
  },
  {
    id: "admin-tax-gate",
    journey: "admin",
    section: "admin-page-gates",
    method: "GET",
    path: "/admin/tax",
    expectedStatus: 302,
  },
  {
    id: "admin-workflows-page-gate",
    journey: "admin",
    section: "admin-page-gates",
    method: "GET",
    path: "/admin/workflows",
    expectedStatus: 302,
  },
  {
    id: "admin-workflows-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/workflows",
    expectedStatus: 401,
  },
  {
    id: "admin-orders-api-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/orders",
    expectedStatus: 401,
  },
  {
    id: "admin-reviews-api-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/reviews",
    expectedStatus: 401,
  },
  {
    id: "admin-segments-api-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/segments",
    expectedStatus: 401,
  },
  {
    id: "admin-affiliates-api-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/affiliates",
    expectedStatus: 401,
  },
  {
    id: "admin-bookings-api-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/bookings",
    expectedStatus: 401,
  },
  {
    id: "admin-fulfillment-dashboard-api-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/fulfillment-dashboard",
    expectedStatus: 401,
  },
  {
    id: "admin-loyalty-program-api-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/loyalty/program",
    expectedStatus: 401,
  },
  {
    id: "admin-loyalty-members-api-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/loyalty/members",
    expectedStatus: 401,
  },
  {
    id: "admin-loyalty-transactions-api-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/loyalty/transactions",
    expectedStatus: 401,
  },
  {
    id: "admin-support-tickets-api-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/support/tickets",
    expectedStatus: 401,
  },
  {
    id: "admin-support-ticket-stats-api-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/support/tickets/stats",
    expectedStatus: 401,
  },
  {
    id: "admin-pricing-experiments-api-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/pricing-experiments",
    expectedStatus: 401,
  },
  {
    id: "admin-returns-api-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/returns",
    expectedStatus: 401,
  },
  {
    id: "admin-pricing-preflight-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "POST",
    path: "/api/admin/pricing-experiments/preflight",
    expectedStatus: 401,
    body: {},
  },
  {
    id: "admin-segment-freshness-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/promotions/segments/freshness",
    expectedStatus: 401,
  },
  {
    id: "admin-fulfillment-sla-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/ops/fulfillment-sla",
    expectedStatus: 401,
  },
  {
    id: "admin-control-tower-summary-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/control-tower/summary",
    expectedStatus: 401,
  },
  {
    id: "admin-control-tower-health-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/control-tower/health",
    expectedStatus: 401,
  },
  {
    id: "admin-integration-marketplace-apps-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/integration-marketplace/apps",
    expectedStatus: 401,
  },
  {
    id: "admin-headless-api-packs-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/headless/api-packs",
    expectedStatus: 401,
  },
  {
    id: "admin-policies-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/policies",
    expectedStatus: 401,
  },
  {
    id: "admin-policy-violations-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/policies/violations",
    expectedStatus: 401,
  },
  {
    id: "admin-store-templates-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/store-templates",
    expectedStatus: 401,
  },
  {
    id: "admin-incident-runbooks-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "GET",
    path: "/api/admin/ops/incidents/runbooks",
    expectedStatus: 401,
  },
  {
    id: "admin-fulfillment-sla-interventions-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "POST",
    path: "/api/admin/ops/fulfillment-sla/interventions",
    expectedStatus: 401,
    body: {},
  },
  {
    id: "booking-admin-checkin-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "POST",
    path: "/api/bookings/00000000-0000-0000-0000-000000000000/check-in",
    expectedStatus: 401,
    body: {},
  },
  {
    id: "booking-admin-noshow-gate",
    journey: "admin",
    section: "admin-api-gates",
    method: "POST",
    path: "/api/bookings/00000000-0000-0000-0000-000000000000/no-show",
    expectedStatus: 401,
    body: {},
  },
];

function isEnabled(value: string | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function normalizeBaseUrl(raw: string): string {
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function expectedToArray(expectedStatus: number | number[]) {
  return Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
}

function statusMatches(actual: number, expectedStatus: number | number[]) {
  return expectedToArray(expectedStatus).includes(actual);
}

function summarizeCommandOutput(output: string): string {
  const trimmed = output.trim();
  if (!trimmed) return "No output";
  const lines = trimmed.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.slice(-3).join(" | ");
}

function runAdminParityCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_ADMIN_PARITY);
  if (skip) {
    return {
      name: "pnpm smoke:admin-parity",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_ADMIN_PARITY",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  if ((process.env.SMOKE_MATRIX_ADMIN_PARITY_MODE ?? "contract").trim().toLowerCase() === "contract") {
    delete env.SMOKE_BASE_URL;
    delete env.SMOKE_COOKIE;
    delete env.SMOKE_AUTHORIZATION;
    delete env.SMOKE_ENABLE_MUTATIONS;
  }

  const result = spawnSync("pnpm", ["smoke:admin-parity"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:admin-parity",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runSeoAuditCommand(baseUrl: string, skipHttpChecks: boolean): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_SEO) || skipHttpChecks;
  if (skip) {
    return {
      name: "pnpm smoke:seo",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: skipHttpChecks
        ? "Skipped via SMOKE_MATRIX_SKIP_HTTP"
        : "Skipped via SMOKE_MATRIX_SKIP_SEO",
    };
  }

  const start = Date.now();
  const env = { ...process.env, SMOKE_BASE_URL: baseUrl };
  const result = spawnSync("pnpm", ["smoke:seo"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:seo",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runLlmSurfaceCommand(baseUrl: string, skipHttpChecks: boolean): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_LLM_SURFACE) || skipHttpChecks;
  if (skip) {
    return {
      name: "pnpm smoke:llm-surface",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: skipHttpChecks
        ? "Skipped via SMOKE_MATRIX_SKIP_HTTP"
        : "Skipped via SMOKE_MATRIX_SKIP_LLM_SURFACE",
    };
  }

  const start = Date.now();
  const env = { ...process.env, SMOKE_BASE_URL: baseUrl };
  const result = spawnSync("pnpm", ["smoke:llm-surface"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:llm-surface",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runStructuredDataCommand(baseUrl: string, skipHttpChecks: boolean): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_STRUCTURED_DATA) || skipHttpChecks;
  if (skip) {
    return {
      name: "pnpm smoke:structured-data",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: skipHttpChecks
        ? "Skipped via SMOKE_MATRIX_SKIP_HTTP"
        : "Skipped via SMOKE_MATRIX_SKIP_STRUCTURED_DATA",
    };
  }

  const start = Date.now();
  const env = { ...process.env, SMOKE_BASE_URL: baseUrl };
  const result = spawnSync("pnpm", ["smoke:structured-data"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:structured-data",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runAdminAnalyticsAutomationCommand(baseUrl: string, skipHttpChecks: boolean): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_ADMIN_ANALYTICS_AUTOMATION) || skipHttpChecks;
  if (skip) {
    return {
      name: "pnpm smoke:admin-analytics-automation",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: skipHttpChecks
        ? "Skipped via SMOKE_MATRIX_SKIP_HTTP"
        : "Skipped via SMOKE_MATRIX_SKIP_ADMIN_ANALYTICS_AUTOMATION",
    };
  }

  const start = Date.now();
  const env = { ...process.env, SMOKE_BASE_URL: baseUrl };
  const result = spawnSync("pnpm", ["smoke:admin-analytics-automation"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const skippedInScript =
    result.status === 0 &&
    combinedOutput.toLowerCase().includes("admin analytics automation smoke skipped");
  return {
    name: "pnpm smoke:admin-analytics-automation",
    ran: true,
    status: skippedInScript ? "skipped" : result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runStorefrontBrowserCommand(
  baseUrl: string,
  skipHttpChecks: boolean,
): CommandResult {
  const skip =
    isEnabled(process.env.SMOKE_MATRIX_SKIP_STOREFRONT_BROWSER) ||
    skipHttpChecks ||
    !isEnabled(process.env.SMOKE_ENABLE_MUTATIONS) ||
    !process.env.SMOKE_BASE_URL?.trim();

  if (skip) {
    return {
      name: "pnpm smoke:storefront-browser",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: isEnabled(process.env.SMOKE_MATRIX_SKIP_STOREFRONT_BROWSER)
        ? "Skipped via SMOKE_MATRIX_SKIP_STOREFRONT_BROWSER"
        : skipHttpChecks
          ? "Skipped via SMOKE_MATRIX_SKIP_HTTP"
          : !isEnabled(process.env.SMOKE_ENABLE_MUTATIONS)
            ? "Skipped because SMOKE_ENABLE_MUTATIONS is not enabled"
            : "Skipped because browser smoke requires explicit SMOKE_BASE_URL",
    };
  }

  const start = Date.now();
  const env = { ...process.env, SMOKE_BASE_URL: baseUrl };
  const result = spawnSync("pnpm", ["smoke:storefront-browser"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const skippedInScript =
    result.status === 0 &&
    combinedOutput.toLowerCase().includes("storefront browser smoke skipped");
  return {
    name: "pnpm smoke:storefront-browser",
    ran: true,
    status: skippedInScript ? "skipped" : result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runLandingPagesCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_LANDING_PAGES);
  if (skip) {
    return {
      name: "pnpm smoke:landing-pages",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_LANDING_PAGES",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  const result = spawnSync("pnpm", ["smoke:landing-pages"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:landing-pages",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runGrowthExperimentsCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_GROWTH_EXPERIMENTS);
  if (skip) {
    return {
      name: "pnpm smoke:growth-experiments",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_GROWTH_EXPERIMENTS",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  const result = spawnSync("pnpm", ["smoke:growth-experiments"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:growth-experiments",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runEventPipelineCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_EVENT_PIPELINE);
  if (skip) {
    return {
      name: "pnpm smoke:event-pipeline",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_EVENT_PIPELINE",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  const result = spawnSync("pnpm", ["smoke:event-pipeline"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:event-pipeline",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runSegmentFreshnessCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_SEGMENT_FRESHNESS);
  if (skip) {
    return {
      name: "pnpm smoke:segment-freshness",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_SEGMENT_FRESHNESS",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  const result = spawnSync("pnpm", ["smoke:segment-freshness"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:segment-freshness",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runIdentityResolutionCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_IDENTITY_RESOLUTION);
  if (skip) {
    return {
      name: "pnpm smoke:identity-resolution",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_IDENTITY_RESOLUTION",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  const result = spawnSync("pnpm", ["smoke:identity-resolution"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:identity-resolution",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runRecommendationQualityCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_RECOMMENDATION_QUALITY);
  if (skip) {
    return {
      name: "pnpm smoke:recommendation-quality",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_RECOMMENDATION_QUALITY",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  const result = spawnSync("pnpm", ["smoke:recommendation-quality"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:recommendation-quality",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runPricingPolicySimulationCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_PRICING_POLICY_SIMULATION);
  if (skip) {
    return {
      name: "pnpm smoke:pricing-policy-simulation",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_PRICING_POLICY_SIMULATION",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  const result = spawnSync("pnpm", ["smoke:pricing-policy-simulation"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:pricing-policy-simulation",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runFulfillmentSlaCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_FULFILLMENT_SLA);
  if (skip) {
    return {
      name: "pnpm smoke:fulfillment-sla",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_FULFILLMENT_SLA",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  const result = spawnSync("pnpm", ["smoke:fulfillment-sla"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:fulfillment-sla",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runComplianceControlsCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_COMPLIANCE_CONTROLS);
  if (skip) {
    return {
      name: "pnpm smoke:compliance-controls",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_COMPLIANCE_CONTROLS",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  const result = spawnSync("pnpm", ["smoke:compliance-controls"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:compliance-controls",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runAuditPiiCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_AUDIT_PII);
  if (skip) {
    return {
      name: "pnpm smoke:audit-pii",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_AUDIT_PII",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  const result = spawnSync("pnpm", ["smoke:audit-pii"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:audit-pii",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runSecretsHygieneCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_SECRETS_HYGIENE);
  if (skip) {
    return {
      name: "pnpm smoke:secrets-hygiene",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_SECRETS_HYGIENE",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  const result = spawnSync("pnpm", ["smoke:secrets-hygiene"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:secrets-hygiene",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runAccessGovernanceCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_ACCESS_GOVERNANCE);
  if (skip) {
    return {
      name: "pnpm smoke:access-governance",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_ACCESS_GOVERNANCE",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  const result = spawnSync("pnpm", ["smoke:access-governance"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:access-governance",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runCostObservabilityCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_COST_OBSERVABILITY);
  if (skip) {
    return {
      name: "pnpm smoke:cost-observability",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_COST_OBSERVABILITY",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  const result = spawnSync("pnpm", ["smoke:cost-observability"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:cost-observability",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runQueryPerformanceCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_QUERY_PERFORMANCE);
  if (skip) {
    return {
      name: "pnpm smoke:query-performance",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_QUERY_PERFORMANCE",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  const result = spawnSync("pnpm", ["smoke:query-performance"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:query-performance",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runCacheInvalidationCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_CACHE_INVALIDATION);
  if (skip) {
    return {
      name: "pnpm smoke:cache-invalidation",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_CACHE_INVALIDATION",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  const result = spawnSync("pnpm", ["smoke:cache-invalidation"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:cache-invalidation",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runWorkflowReliabilityCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_WORKFLOW_RELIABILITY);
  if (skip) {
    return {
      name: "pnpm smoke:workflow-reliability",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_WORKFLOW_RELIABILITY",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  const result = spawnSync("pnpm", ["smoke:workflow-reliability"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:workflow-reliability",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runDlqRemediationCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_DLQ_REMEDIATION);
  if (skip) {
    return {
      name: "pnpm smoke:dlq-remediation",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_DLQ_REMEDIATION",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  const result = spawnSync("pnpm", ["smoke:dlq-remediation"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:dlq-remediation",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runApiVersioningCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_API_VERSIONING);
  if (skip) {
    return {
      name: "pnpm smoke:api-versioning",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_API_VERSIONING",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  const result = spawnSync("pnpm", ["smoke:api-versioning"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:api-versioning",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

function runPartnerOnboardingCommand(): CommandResult {
  const skip = isEnabled(process.env.SMOKE_MATRIX_SKIP_PARTNER_ONBOARDING);
  if (skip) {
    return {
      name: "pnpm smoke:partner-onboarding",
      ran: false,
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      summary: "Skipped via SMOKE_MATRIX_SKIP_PARTNER_ONBOARDING",
    };
  }

  const start = Date.now();
  const env = { ...process.env };
  const result = spawnSync("pnpm", ["smoke:partner-onboarding"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    name: "pnpm smoke:partner-onboarding",
    ran: true,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs,
    summary: summarizeCommandOutput(combinedOutput),
  };
}

async function runHttpCheck(baseUrl: string, check: HttpCheck): Promise<HttpCheckResult> {
  const startedAt = Date.now();
  const url = `${baseUrl}${check.path}`;
  try {
    const response = await fetch(url, {
      method: check.method,
      redirect: "manual",
      headers: check.body ? { "Content-Type": "application/json" } : undefined,
      body: check.body ? JSON.stringify(check.body) : undefined,
    });
    return {
      id: check.id,
      journey: check.journey,
      section: check.section,
      method: check.method,
      path: check.path,
      expectedStatus: check.expectedStatus,
      actualStatus: response.status,
      ok: statusMatches(response.status, check.expectedStatus),
      durationMs: Date.now() - startedAt,
      note: null,
    };
  } catch (error) {
    return {
      id: check.id,
      journey: check.journey,
      section: check.section,
      method: check.method,
      path: check.path,
      expectedStatus: check.expectedStatus,
      actualStatus: null,
      ok: false,
      durationMs: Date.now() - startedAt,
      note: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildSectionMetrics(results: HttpCheckResult[]) {
  const grouped = new Map<string, { section: string; total: number; passed: number; failed: number }>();
  for (const result of results) {
    const current = grouped.get(result.section) ?? { section: result.section, total: 0, passed: 0, failed: 0 };
    current.total += 1;
    if (result.ok) current.passed += 1;
    else current.failed += 1;
    grouped.set(result.section, current);
  }
  return [...grouped.values()].sort((a, b) => a.section.localeCompare(b.section));
}

async function writeReport(report: SmokeMatrixReport) {
  const jsonPath = process.env.SMOKE_MATRIX_JSON_PATH ?? "output/smoke/e2e-smoke-matrix-report.json";
  const mdPath = process.env.SMOKE_MATRIX_MD_PATH ?? "output/smoke/e2e-smoke-matrix-report.md";
  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(mdPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# End-to-End Smoke Matrix Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Base URL: ${report.baseUrl}`,
    `- Skip HTTP checks: ${report.skipHttpChecks}`,
    `- Metrics: total=${report.metrics.totalChecks}, passed=${report.metrics.passedChecks}, failed=${report.metrics.failedChecks}, skipped=${report.metrics.skippedChecks}`,
    "",
    "## Command Results",
    "",
    "| Command | Ran | Status | Exit Code | Duration(ms) | Summary |",
    "| --- | --- | --- | --- | --- | --- |",
    ...report.commands.map(
      (command) =>
        `| ${command.name} | ${command.ran ? "yes" : "no"} | ${command.status} | ${command.exitCode ?? ""} | ${command.durationMs} | ${command.summary.replace(/\|/g, "\\|")} |`,
    ),
    "",
    "## Section Results",
    "",
    "| Section | Total | Passed | Failed |",
    "| --- | --- | --- | --- |",
    ...report.sections.map((section) => `| ${section.section} | ${section.total} | ${section.passed} | ${section.failed} |`),
    "",
  ];

  if (report.checks.length > 0) {
    lines.push("## HTTP Checks");
    lines.push("");
    lines.push("| ID | Journey | Method | Path | Expected | Actual | Result | Note |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const check of report.checks) {
      const expected = expectedToArray(check.expectedStatus).join(",");
      lines.push(
        `| ${check.id} | ${check.journey} | ${check.method} | ${check.path} | ${expected} | ${check.actualStatus ?? ""} | ${check.ok ? "pass" : "fail"} | ${(check.note ?? "").replace(/\|/g, "\\|")} |`,
      );
    }
  }

  await writeFile(mdPath, `${lines.join("\n")}\n`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const baseUrl = normalizeBaseUrl(process.env.SMOKE_BASE_URL ?? "https://petm8.io");
  const skipHttpChecks = isEnabled(process.env.SMOKE_MATRIX_SKIP_HTTP);

  const commandResults: CommandResult[] = [
    runAdminParityCommand(),
    runStorefrontBrowserCommand(baseUrl, skipHttpChecks),
    runSeoAuditCommand(baseUrl, skipHttpChecks),
    runLlmSurfaceCommand(baseUrl, skipHttpChecks),
    runStructuredDataCommand(baseUrl, skipHttpChecks),
    runAdminAnalyticsAutomationCommand(baseUrl, skipHttpChecks),
    runLandingPagesCommand(),
    runGrowthExperimentsCommand(),
    runEventPipelineCommand(),
    runSegmentFreshnessCommand(),
    runIdentityResolutionCommand(),
    runRecommendationQualityCommand(),
    runPricingPolicySimulationCommand(),
    runFulfillmentSlaCommand(),
    runComplianceControlsCommand(),
    runAuditPiiCommand(),
    runSecretsHygieneCommand(),
    runAccessGovernanceCommand(),
    runCostObservabilityCommand(),
    runQueryPerformanceCommand(),
    runCacheInvalidationCommand(),
    runWorkflowReliabilityCommand(),
    runDlqRemediationCommand(),
    runApiVersioningCommand(),
    runPartnerOnboardingCommand(),
  ];
  const commandFailed = commandResults.some((result) => result.status === "failed");

  const checkResults: HttpCheckResult[] = [];
  if (!skipHttpChecks) {
    for (const check of HTTP_CHECKS) {
      checkResults.push(await runHttpCheck(baseUrl, check));
    }
  }

  const failedChecks = checkResults.filter((check) => !check.ok).length;
  const report: SmokeMatrixReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: commandFailed || failedChecks > 0 ? "failed" : "passed",
    baseUrl,
    skipHttpChecks,
    commands: commandResults,
    metrics: {
      totalChecks: checkResults.length,
      passedChecks: checkResults.filter((check) => check.ok).length,
      failedChecks,
      skippedChecks: skipHttpChecks ? HTTP_CHECKS.length : 0,
    },
    sections: buildSectionMetrics(checkResults),
    checks: checkResults,
  };

  await writeReport(report);
  if (report.status === "failed") {
    const failures = [
      commandFailed ? "command failures" : null,
      failedChecks > 0 ? `HTTP check failures (${failedChecks})` : null,
    ]
      .filter(Boolean)
      .join(", ");
    console.error(`E2E smoke matrix failed: ${failures}`);
    process.exitCode = 1;
    return;
  }
  console.log("E2E smoke matrix passed.");
}

main().catch((error) => {
  console.error(`E2E smoke matrix crashed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
