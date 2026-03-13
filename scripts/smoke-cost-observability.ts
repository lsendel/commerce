import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { analyticsContract } from "../src/contracts/analytics.contract";
import { GetCostObservabilityUseCase } from "../src/application/analytics/get-cost-observability.usecase";

type CheckStatus = "pass" | "fail";
type ReportStatus = "passed" | "failed";

interface CostPolicyFeatureModel {
  key: string;
  label: string;
  ownerTeam: string;
  targetRevenueToCostRatio: number;
  targetCostPerOrderUsd: number;
  sourceEventTypes: string[];
}

interface CostPolicyTeamModel {
  key: string;
  label: string;
  focus: string;
}

interface CostPolicyTenantModel {
  key: string;
  label: string;
  scope: string;
}

interface CostPolicyMetricModel {
  id: string;
  unit: string;
  required: boolean;
}

interface CostPolicyBacklogItem {
  id: string;
  title: string;
  dimension: "feature" | "team" | "tenant";
  ownerTeam: string;
  estimatedMonthlySavingsUsd: number;
  status: "candidate" | "planned" | "in_progress";
  priority: "p0" | "p1" | "p2";
  targetDate: string;
}

interface CostObservabilityPolicy {
  version: "v1";
  owner: string;
  reviewCadenceDays: number;
  lastReviewedOn: string;
  nextReviewBy: string;
  dimensions: {
    required: string[];
    feature: CostPolicyFeatureModel[];
    team: CostPolicyTeamModel[];
    tenant: CostPolicyTenantModel[];
  };
  telemetry: {
    metricCatalog: CostPolicyMetricModel[];
    dashboardSections: string[];
  };
  optimizationBacklog: CostPolicyBacklogItem[];
}

interface SmokeCheck {
  id: string;
  status: CheckStatus;
  note: string;
}

interface CostObservabilityReport {
  startedAt: string;
  finishedAt: string;
  status: ReportStatus;
  reportVersion: "v1";
  policyPath: string;
  checks: SmokeCheck[];
  metrics: {
    totalChecks: number;
    failedChecks: number;
    featureModels: number;
    teamModels: number;
    tenantModels: number;
    backlogItems: number;
  };
}

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

async function loadPolicy(path: string): Promise<CostObservabilityPolicy> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as Partial<CostObservabilityPolicy>;

  if (parsed.version !== "v1") {
    throw new Error("Cost observability policy version must be v1.");
  }
  if (!parsed.dimensions || !parsed.telemetry || !Array.isArray(parsed.optimizationBacklog)) {
    throw new Error("Cost observability policy missing required sections.");
  }

  return parsed as CostObservabilityPolicy;
}

async function buildSampleResponse() {
  const fakeRepo = {
    async queryRollups() {
      return [
        { date: "2026-02-01", metric: "revenue", value: "1450.24", count: 22 },
        { date: "2026-02-02", metric: "revenue", value: "1320.11", count: 19 },
        { date: "2026-02-01", metric: "purchases", value: "22", count: 22 },
        { date: "2026-02-02", metric: "purchases", value: "19", count: 19 },
      ];
    },
    async countEventsByType(
      _dateFrom: string,
      _dateTo: string,
      eventTypes: string[],
    ) {
      return new Map(eventTypes.map((eventType, index) => [eventType, 64 + (index * 5)]));
    },
  };

  const useCase = new GetCostObservabilityUseCase(fakeRepo as any, "week56-smoke");
  return useCase.execute("2026-02-01", "2026-02-07");
}

async function evaluateChecks(policyPath: string): Promise<{
  checks: SmokeCheck[];
  featureModels: number;
  teamModels: number;
  tenantModels: number;
  backlogItems: number;
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
      "dimensions-required-coverage",
      ["feature", "team", "tenant"].every((dimension) => policy.dimensions.required.includes(dimension)),
      "Required dimensions must include feature/team/tenant.",
    ),
  );

  checks.push(
    runCheck(
      "feature-models-present",
      policy.dimensions.feature.length >= 3,
      "Feature dimension must define at least 3 models.",
    ),
  );
  checks.push(
    runCheck(
      "team-models-present",
      policy.dimensions.team.length >= 3,
      "Team dimension must define at least 3 models.",
    ),
  );
  checks.push(
    runCheck(
      "tenant-models-present",
      policy.dimensions.tenant.length >= 1,
      "Tenant dimension must define at least one model.",
    ),
  );

  const knownTeamKeys = new Set(policy.dimensions.team.map((team) => team.key));
  checks.push(
    runCheck(
      "feature-owner-team-coverage",
      policy.dimensions.feature.every((feature) => knownTeamKeys.has(feature.ownerTeam)),
      "Every feature model ownerTeam must map to a team model.",
    ),
  );

  checks.push(
    runCheck(
      "telemetry-metric-catalog",
      policy.telemetry.metricCatalog.length >= 5,
      "Telemetry metric catalog must include at least 5 metrics.",
    ),
  );

  const requiredMetricIds = [
    "estimated_cost_usd",
    "attributed_revenue_usd",
    "cost_per_order_usd",
    "revenue_to_cost_ratio",
    "orders",
    "events",
  ];
  checks.push(
    runCheck(
      "telemetry-required-metrics",
      requiredMetricIds.every((metricId) =>
        policy.telemetry.metricCatalog.some((metric) => metric.id === metricId && metric.required),
      ),
      "Telemetry catalog must include required cost and unit-economics metrics.",
    ),
  );

  checks.push(
    runCheck(
      "dashboard-sections-coverage",
      ["summary", "feature_dimension", "team_dimension", "tenant_dimension", "optimization_backlog"].every(
        (section) => policy.telemetry.dashboardSections.includes(section),
      ),
      "Dashboard sections must include summary, feature/team/tenant dimensions, and optimization backlog.",
    ),
  );

  checks.push(
    runCheck(
      "optimization-backlog-present",
      policy.optimizationBacklog.length >= 3,
      "Optimization backlog must include at least 3 items.",
    ),
  );

  const backlogStatuses = new Set(["candidate", "planned", "in_progress"]);
  const backlogPriorities = new Set(["p0", "p1", "p2"]);
  for (const item of policy.optimizationBacklog) {
    checks.push(
      runCheck(
        `backlog-${item.id}-status-valid`,
        backlogStatuses.has(item.status),
        `Backlog status must be candidate|planned|in_progress (${item.id}).`,
      ),
    );
    checks.push(
      runCheck(
        `backlog-${item.id}-priority-valid`,
        backlogPriorities.has(item.priority),
        `Backlog priority must be p0|p1|p2 (${item.id}).`,
      ),
    );
    checks.push(
      runCheck(
        `backlog-${item.id}-date-format`,
        isIsoDate(item.targetDate),
        `Backlog targetDate must use YYYY-MM-DD (${item.id}).`,
      ),
    );
  }

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
    const lastReviewed = parseDate(policy.lastReviewedOn);
    const nextReview = parseDate(policy.nextReviewBy);
    const maxNextReview = new Date(lastReviewed.getTime() + ((policy.reviewCadenceDays + 1) * 86_400_000));
    const endOfNextReviewDay = new Date(nextReview.getTime() + 86_400_000 - 1);

    checks.push(
      runCheck(
        "review-next-after-last",
        nextReview.getTime() >= lastReviewed.getTime(),
        "nextReviewBy must be on or after lastReviewedOn.",
      ),
    );
    checks.push(
      runCheck(
        "review-window-valid",
        nextReview.getTime() <= maxNextReview.getTime(),
        "nextReviewBy must stay inside reviewCadenceDays window.",
      ),
    );
    checks.push(
      runCheck(
        "review-not-overdue",
        Date.now() <= endOfNextReviewDay.getTime(),
        "Cost observability policy review date must not be overdue.",
      ),
    );
  }

  checks.push(
    runCheck(
      "runbook-exists",
      await pathExists("docs/runbooks/cost-observability-unit-economics.md"),
      "Runbook must exist: docs/runbooks/cost-observability-unit-economics.md",
    ),
  );

  const contractRoute = (analyticsContract as any).getCostObservability as
    | {
        method?: string;
        path?: string;
        responses?: Record<number, { safeParse: (value: unknown) => { success: boolean } }>;
      }
    | undefined;
  checks.push(
    runCheck(
      "contract-route-present",
      Boolean(contractRoute),
      "Analytics contract must define getCostObservability route.",
    ),
  );
  checks.push(
    runCheck(
      "contract-route-method",
      contractRoute?.method === "GET",
      "Cost observability contract route method must be GET.",
    ),
  );
  checks.push(
    runCheck(
      "contract-route-path",
      contractRoute?.path === "/api/analytics/cost-observability",
      "Cost observability contract route path must match backend route.",
    ),
  );

  if (contractRoute?.responses?.[200]) {
    const samplePayload = await buildSampleResponse();
    const parsed = contractRoute.responses[200].safeParse(samplePayload);
    checks.push(
      runCheck(
        "contract-response-shape",
        parsed.success,
        "Sample cost observability payload must satisfy analytics contract response schema.",
      ),
    );
  } else {
    checks.push(
      runCheck(
        "contract-response-shape",
        false,
        "Contract response schema for 200 status is missing.",
      ),
    );
  }

  const analyticsRouteSource = await readFile("src/routes/api/analytics.routes.ts", "utf8");
  checks.push(
    runCheck(
      "api-route-snippet",
      analyticsRouteSource.includes('"/analytics/cost-observability"') &&
        analyticsRouteSource.includes("requireAuth()") &&
        analyticsRouteSource.includes('requireRole("admin")') &&
        analyticsRouteSource.includes("GetCostObservabilityUseCase"),
      "Analytics API route must gate and serve /analytics/cost-observability.",
    ),
  );

  const adminPageSource = await readFile("src/routes/pages/admin/analytics.page.tsx", "utf8");
  checks.push(
    runCheck(
      "admin-page-section",
      adminPageSource.includes("Cost Observability &amp; Unit Economics"),
      "Admin analytics page must render Cost Observability section.",
    ),
  );

  const appIndexSource = await readFile("src/index.tsx", "utf8");
  checks.push(
    runCheck(
      "admin-page-data-wiring",
      appIndexSource.includes("new CostObsUC(analyticsRepo, storeId).execute(dateFrom, dateTo)") &&
        appIndexSource.includes("costObservability={costObservability as any}") &&
        appIndexSource.includes("cost_summary"),
      "Admin analytics route and CSV export must wire cost observability data.",
    ),
  );

  return {
    checks,
    featureModels: policy.dimensions.feature.length,
    teamModels: policy.dimensions.team.length,
    tenantModels: policy.dimensions.tenant.length,
    backlogItems: policy.optimizationBacklog.length,
  };
}

async function writeReport(report: CostObservabilityReport) {
  const jsonPath =
    process.env.SMOKE_COST_OBSERVABILITY_JSON_PATH ?? "output/smoke/cost-observability-report.json";
  const mdPath =
    process.env.SMOKE_COST_OBSERVABILITY_MD_PATH ?? "output/smoke/cost-observability-report.md";

  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(mdPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# Cost Observability Smoke Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Policy: ${report.policyPath}`,
    `- Models: feature=${report.metrics.featureModels}, team=${report.metrics.teamModels}, tenant=${report.metrics.tenantModels}`,
    `- Optimization backlog items: ${report.metrics.backlogItems}`,
    `- Checks: total=${report.metrics.totalChecks}, failed=${report.metrics.failedChecks}`,
    "",
    "| Check | Status | Note |",
    "| --- | --- | --- |",
    ...report.checks.map((check) => `| ${check.id} | ${check.status} | ${check.note.replace(/\|/g, "\\|")} |`),
    "",
  ];

  await writeFile(mdPath, `${lines.join("\n")}\n`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const policyPath =
    process.env.SMOKE_COST_OBSERVABILITY_POLICY_PATH ??
    "docs/policies/cost-observability-unit-economics-v1.json";

  const {
    checks,
    featureModels,
    teamModels,
    tenantModels,
    backlogItems,
  } = await evaluateChecks(policyPath);

  const failedChecks = checks.filter((check) => check.status === "fail").length;
  const report: CostObservabilityReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: failedChecks > 0 ? "failed" : "passed",
    reportVersion: "v1",
    policyPath,
    checks,
    metrics: {
      totalChecks: checks.length,
      failedChecks,
      featureModels,
      teamModels,
      tenantModels,
      backlogItems,
    },
  };

  await writeReport(report);

  if (report.status === "failed") {
    console.error(`Cost observability smoke failed: ${failedChecks} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log("Cost observability smoke passed.");
}

main().catch((error) => {
  console.error(`Cost observability smoke crashed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
