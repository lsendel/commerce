import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type CheckStatus = "pass" | "fail";
type ReportStatus = "passed" | "failed";

interface HotPathBudget {
  id: string;
  label: string;
  repositoryPath: string;
  methodName: string;
  requiredPredicates: string[];
  requiredIndexes: string[];
  targetP95Ms: number;
  queryBudgetUnits: number;
}

interface CacheSurfaceBudget {
  id: string;
  sourcePath: string;
  requiredSnippet: string;
  targetHitRatePercent: number;
}

interface QueryPerformancePolicy {
  version: "v1";
  owner: string;
  reviewCadenceDays: number;
  lastReviewedOn: string;
  nextReviewBy: string;
  indexMigrationPath: string;
  indexCatalog: string[];
  hotPaths: HotPathBudget[];
  cacheSurfaces: CacheSurfaceBudget[];
}

interface QueryPerformanceCheck {
  id: string;
  status: CheckStatus;
  note: string;
}

interface HotPathEvaluation {
  id: string;
  label: string;
  repositoryPath: string;
  methodName: string;
  targetP95Ms: number;
  queryBudgetUnits: number;
  predicatesSatisfied: boolean;
  indexCoverageSatisfied: boolean;
  status: CheckStatus;
}

interface CacheSurfaceEvaluation {
  id: string;
  sourcePath: string;
  targetHitRatePercent: number;
  snippetPresent: boolean;
  status: CheckStatus;
}

interface QueryPerformanceReport {
  startedAt: string;
  finishedAt: string;
  status: ReportStatus;
  reportVersion: "v1";
  policyPath: string;
  checks: QueryPerformanceCheck[];
  hotPathEvaluations: HotPathEvaluation[];
  cacheSurfaceEvaluations: CacheSurfaceEvaluation[];
  metrics: {
    totalChecks: number;
    failedChecks: number;
    hotPaths: number;
    hotPathsPassing: number;
    cacheSurfaces: number;
    cacheSurfacesPassing: number;
    indexCatalogSize: number;
  };
}

function runCheck(id: string, condition: boolean, note: string): QueryPerformanceCheck {
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

async function loadPolicy(path: string): Promise<QueryPerformancePolicy> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as Partial<QueryPerformancePolicy>;

  if (parsed.version !== "v1") {
    throw new Error("Query performance policy version must be v1.");
  }
  if (!Array.isArray(parsed.hotPaths) || !Array.isArray(parsed.cacheSurfaces) || !Array.isArray(parsed.indexCatalog)) {
    throw new Error("Query performance policy missing required arrays.");
  }

  return parsed as QueryPerformancePolicy;
}

async function evaluateChecks(policyPath: string): Promise<{
  checks: QueryPerformanceCheck[];
  hotPathEvaluations: HotPathEvaluation[];
  cacheSurfaceEvaluations: CacheSurfaceEvaluation[];
  indexCatalogSize: number;
}> {
  const checks: QueryPerformanceCheck[] = [];
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
      "hotpaths-present",
      policy.hotPaths.length > 0,
      "Policy must define at least one hot path budget.",
    ),
  );
  checks.push(
    runCheck(
      "cache-surfaces-present",
      policy.cacheSurfaces.length > 0,
      "Policy must define at least one cache surface budget.",
    ),
  );
  checks.push(
    runCheck(
      "index-catalog-present",
      policy.indexCatalog.length > 0,
      "Policy must define at least one index name in indexCatalog.",
    ),
  );
  checks.push(
    runCheck(
      "index-migration-path-exists",
      await pathExists(policy.indexMigrationPath),
      `Index migration script must exist: ${policy.indexMigrationPath}`,
    ),
  );

  const schemaPath = "src/infrastructure/db/schema.ts";
  const schemaSource = await readFile(schemaPath, "utf8");
  const indexMigrationSource = await readFile(policy.indexMigrationPath, "utf8");

  for (const indexName of policy.indexCatalog) {
    checks.push(
      runCheck(
        `index-schema-${indexName}`,
        schemaSource.includes(indexName),
        `Schema must define index name ${indexName}.`,
      ),
    );
    checks.push(
      runCheck(
        `index-sql-${indexName}`,
        indexMigrationSource.includes(indexName),
        `SQL migration must include index name ${indexName}.`,
      ),
    );
  }

  const hotPathEvaluations: HotPathEvaluation[] = [];
  for (const hotPath of policy.hotPaths) {
    const exists = await pathExists(hotPath.repositoryPath);
    checks.push(
      runCheck(
        `hotpath-${hotPath.id}-file-exists`,
        exists,
        `Repository file must exist: ${hotPath.repositoryPath}`,
      ),
    );

    let source = "";
    if (exists) {
      source = await readFile(hotPath.repositoryPath, "utf8");
    }

    const methodPresent = source.includes(`async ${hotPath.methodName}(`);
    checks.push(
      runCheck(
        `hotpath-${hotPath.id}-method-present`,
        methodPresent,
        `Method ${hotPath.methodName} must exist in ${hotPath.repositoryPath}.`,
      ),
    );

    const predicatesSatisfied = methodPresent
      ? hotPath.requiredPredicates.every((snippet) => source.includes(snippet))
      : false;
    checks.push(
      runCheck(
        `hotpath-${hotPath.id}-predicates`,
        predicatesSatisfied,
        `Hot path ${hotPath.id} must contain all required predicates.`,
      ),
    );

    const missingIndexes = hotPath.requiredIndexes.filter(
      (indexName) => !policy.indexCatalog.includes(indexName),
    );
    const indexCoverageSatisfied = missingIndexes.length === 0;
    checks.push(
      runCheck(
        `hotpath-${hotPath.id}-index-catalog-coverage`,
        indexCoverageSatisfied,
        `Hot path ${hotPath.id} missing indexCatalog entries: ${missingIndexes.join(", ") || "none"}.`,
      ),
    );

    const budgetValid =
      Number.isFinite(hotPath.targetP95Ms) &&
      hotPath.targetP95Ms > 0 &&
      Number.isFinite(hotPath.queryBudgetUnits) &&
      hotPath.queryBudgetUnits > 0;
    checks.push(
      runCheck(
        `hotpath-${hotPath.id}-budget-valid`,
        budgetValid,
        `Hot path ${hotPath.id} must define positive targetP95Ms and queryBudgetUnits.`,
      ),
    );

    hotPathEvaluations.push({
      id: hotPath.id,
      label: hotPath.label,
      repositoryPath: hotPath.repositoryPath,
      methodName: hotPath.methodName,
      targetP95Ms: hotPath.targetP95Ms,
      queryBudgetUnits: hotPath.queryBudgetUnits,
      predicatesSatisfied,
      indexCoverageSatisfied,
      status: predicatesSatisfied && indexCoverageSatisfied ? "pass" : "fail",
    });
  }

  const cacheSurfaceEvaluations: CacheSurfaceEvaluation[] = [];
  for (const cacheSurface of policy.cacheSurfaces) {
    const exists = await pathExists(cacheSurface.sourcePath);
    checks.push(
      runCheck(
        `cache-${cacheSurface.id}-file-exists`,
        exists,
        `Cache surface source path must exist: ${cacheSurface.sourcePath}`,
      ),
    );

    let snippetPresent = false;
    if (exists) {
      const source = await readFile(cacheSurface.sourcePath, "utf8");
      snippetPresent = source.includes(cacheSurface.requiredSnippet);
    }

    checks.push(
      runCheck(
        `cache-${cacheSurface.id}-snippet`,
        snippetPresent,
        `Cache surface ${cacheSurface.id} must include required snippet.`,
      ),
    );

    const targetValid =
      Number.isFinite(cacheSurface.targetHitRatePercent) &&
      cacheSurface.targetHitRatePercent > 0 &&
      cacheSurface.targetHitRatePercent <= 100;
    checks.push(
      runCheck(
        `cache-${cacheSurface.id}-target-valid`,
        targetValid,
        `Cache surface ${cacheSurface.id} targetHitRatePercent must be in range (0, 100].`,
      ),
    );

    cacheSurfaceEvaluations.push({
      id: cacheSurface.id,
      sourcePath: cacheSurface.sourcePath,
      targetHitRatePercent: cacheSurface.targetHitRatePercent,
      snippetPresent,
      status: snippetPresent && targetValid ? "pass" : "fail",
    });
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
        "Query performance policy review date must not be overdue.",
      ),
    );
  }

  checks.push(
    runCheck(
      "runbook-exists",
      await pathExists("docs/runbooks/query-performance-budget-wave1.md"),
      "Runbook must exist: docs/runbooks/query-performance-budget-wave1.md",
    ),
  );

  return {
    checks,
    hotPathEvaluations,
    cacheSurfaceEvaluations,
    indexCatalogSize: policy.indexCatalog.length,
  };
}

async function writeReport(report: QueryPerformanceReport) {
  const jsonPath =
    process.env.SMOKE_QUERY_PERFORMANCE_JSON_PATH ?? "output/smoke/query-performance-report.json";
  const mdPath =
    process.env.SMOKE_QUERY_PERFORMANCE_MD_PATH ?? "output/smoke/query-performance-report.md";

  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(mdPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# Query Performance Smoke Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Policy: ${report.policyPath}`,
    `- Metrics: checks=${report.metrics.totalChecks}, failed=${report.metrics.failedChecks}, hotPaths=${report.metrics.hotPathsPassing}/${report.metrics.hotPaths}, cacheSurfaces=${report.metrics.cacheSurfacesPassing}/${report.metrics.cacheSurfaces}, indexes=${report.metrics.indexCatalogSize}`,
    "",
    "## Hot Path Evaluation",
    "",
    "| ID | Label | Target P95 (ms) | Budget Units | Predicates | Index Coverage | Status |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...report.hotPathEvaluations.map(
      (hotPath) =>
        `| ${hotPath.id} | ${hotPath.label} | ${hotPath.targetP95Ms} | ${hotPath.queryBudgetUnits} | ${hotPath.predicatesSatisfied ? "ok" : "missing"} | ${hotPath.indexCoverageSatisfied ? "ok" : "missing"} | ${hotPath.status} |`,
    ),
    "",
    "## Cache Surface Evaluation",
    "",
    "| ID | Target Hit Rate (%) | Snippet Present | Status |",
    "| --- | --- | --- | --- |",
    ...report.cacheSurfaceEvaluations.map(
      (cacheSurface) =>
        `| ${cacheSurface.id} | ${cacheSurface.targetHitRatePercent} | ${cacheSurface.snippetPresent ? "yes" : "no"} | ${cacheSurface.status} |`,
    ),
    "",
    "## Checks",
    "",
    "| Check | Status | Note |",
    "| --- | --- | --- |",
    ...report.checks.map(
      (check) => `| ${check.id} | ${check.status} | ${check.note.replace(/\|/g, "\\|")} |`,
    ),
    "",
  ];

  await writeFile(mdPath, `${lines.join("\n")}\n`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const policyPath =
    process.env.SMOKE_QUERY_PERFORMANCE_POLICY_PATH ??
    "docs/policies/query-performance-budget-v1.json";

  const { checks, hotPathEvaluations, cacheSurfaceEvaluations, indexCatalogSize } =
    await evaluateChecks(policyPath);
  const failedChecks = checks.filter((check) => check.status === "fail").length;

  const report: QueryPerformanceReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: failedChecks > 0 ? "failed" : "passed",
    reportVersion: "v1",
    policyPath,
    checks,
    hotPathEvaluations,
    cacheSurfaceEvaluations,
    metrics: {
      totalChecks: checks.length,
      failedChecks,
      hotPaths: hotPathEvaluations.length,
      hotPathsPassing: hotPathEvaluations.filter((hotPath) => hotPath.status === "pass").length,
      cacheSurfaces: cacheSurfaceEvaluations.length,
      cacheSurfacesPassing: cacheSurfaceEvaluations.filter((cache) => cache.status === "pass").length,
      indexCatalogSize,
    },
  };

  await writeReport(report);

  if (report.status === "failed") {
    console.error(`Query performance smoke failed: ${failedChecks} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log("Query performance smoke passed.");
}

main().catch((error) => {
  console.error(`Query performance smoke crashed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
