import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  PARTNER_PROVIDERS,
  type MarketplaceAppView,
} from "../src/application/platform/integration-marketplace.usecase";
import { buildPartnerOnboardingStatus } from "../src/application/platform/partner-onboarding.usecase";
import { integrationMarketplaceContract } from "../src/contracts/integration-marketplace.contract";
import { getKnownAnalyticsEventTypes } from "../src/shared/analytics-taxonomy";

type CheckStatus = "pass" | "fail";
type ReportStatus = "passed" | "failed";

interface ContractRoute {
  method: string;
  path: string;
}

interface SimulationCase {
  id: string;
  app: MarketplaceAppView;
  expected: {
    verified: boolean;
    blockingFailures: number;
    progressMinPercent: number;
  };
}

interface PartnerOnboardingPolicyFile {
  version: "v1";
  owner: string;
  reviewCadenceDays: number;
  lastReviewedOn: string;
  nextReviewBy: string;
  requiredPartnerProviders: string[];
  requiredEventTypes: string[];
  sourcePaths: string[];
  requiredSnippets: string[];
  simulationCases: SimulationCase[];
}

interface SmokeCheck {
  id: string;
  status: CheckStatus;
  note: string;
}

interface SimulationResult {
  id: string;
  expectedVerified: boolean;
  actualVerified: boolean;
  expectedBlockingFailures: number;
  actualBlockingFailures: number;
  expectedProgressMinPercent: number;
  actualProgressPercent: number;
  status: CheckStatus;
}

interface PartnerOnboardingReport {
  startedAt: string;
  finishedAt: string;
  status: ReportStatus;
  reportVersion: "v1";
  policyPath: string;
  checks: SmokeCheck[];
  simulationResults: SimulationResult[];
  metrics: {
    totalChecks: number;
    failedChecks: number;
    simulationCount: number;
    simulationPassing: number;
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

function includesAll<T>(actual: T[], expected: T[]): boolean {
  return expected.every((value) => actual.includes(value));
}

function assertContractRoute(
  route: ContractRoute,
  expectedMethod: string,
  expectedPath: string,
): boolean {
  return route.method === expectedMethod && route.path === expectedPath;
}

async function loadPolicy(path: string): Promise<PartnerOnboardingPolicyFile> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as Partial<PartnerOnboardingPolicyFile>;
  if (parsed.version !== "v1") {
    throw new Error("Partner onboarding policy version must be v1.");
  }
  if (!Array.isArray(parsed.sourcePaths) || !Array.isArray(parsed.simulationCases)) {
    throw new Error("Partner onboarding policy must define sourcePaths and simulationCases arrays.");
  }
  return parsed as PartnerOnboardingPolicyFile;
}

async function evaluateChecks(policyPath: string): Promise<{
  checks: SmokeCheck[];
  simulationResults: SimulationResult[];
}> {
  const policy = await loadPolicy(policyPath);
  const checks: SmokeCheck[] = [];

  checks.push(
    runCheck(
      "policy-owner-present",
      policy.owner.trim().length > 0,
      "Policy owner must be defined.",
    ),
  );
  checks.push(
    runCheck(
      "required-partner-providers-covered",
      includesAll(policy.requiredPartnerProviders, [...PARTNER_PROVIDERS]) &&
        includesAll([...PARTNER_PROVIDERS], policy.requiredPartnerProviders),
      `Policy must match required partner providers: ${PARTNER_PROVIDERS.join(", ")}`,
    ),
  );

  const knownEvents = getKnownAnalyticsEventTypes();
  checks.push(
    runCheck(
      "required-event-types-covered",
      includesAll(knownEvents, policy.requiredEventTypes),
      "Required analytics event types must exist in taxonomy.",
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
        "Partner onboarding policy review date must not be overdue.",
      ),
    );
  }

  for (const [index, sourcePath] of policy.sourcePaths.entries()) {
    checks.push(
      runCheck(
        `source-path-${index + 1}`,
        await pathExists(sourcePath),
        `Source path must exist: ${sourcePath}`,
      ),
    );
  }

  const sourceContents = await Promise.all(
    policy.sourcePaths.map(async (sourcePath) => {
      if (!(await pathExists(sourcePath))) return "";
      return readFile(sourcePath, "utf8");
    }),
  );
  const sourceJoined = sourceContents.join("\n");
  for (const [index, snippet] of policy.requiredSnippets.entries()) {
    checks.push(
      runCheck(
        `required-snippet-${index + 1}`,
        sourceJoined.includes(snippet),
        `Required snippet must be present: ${snippet}`,
      ),
    );
  }

  const routeListPartnerOnboarding =
    integrationMarketplaceContract.listPartnerOnboarding as unknown as ContractRoute;
  const routeGetPartnerOnboarding =
    integrationMarketplaceContract.getPartnerOnboarding as unknown as ContractRoute;
  const routeCompletePartnerOnboarding =
    integrationMarketplaceContract.completePartnerOnboarding as unknown as ContractRoute;
  const routeVerifyPartnerContract =
    integrationMarketplaceContract.verifyPartnerContract as unknown as ContractRoute;

  checks.push(
    runCheck(
      "contract-route-list-onboarding",
      assertContractRoute(
        routeListPartnerOnboarding,
        "GET",
        "/api/admin/integration-marketplace/partners/onboarding",
      ),
      "Contract listPartnerOnboarding must match method/path.",
    ),
  );
  checks.push(
    runCheck(
      "contract-route-get-onboarding",
      assertContractRoute(
        routeGetPartnerOnboarding,
        "GET",
        "/api/admin/integration-marketplace/partners/:provider/onboarding",
      ),
      "Contract getPartnerOnboarding must match method/path.",
    ),
  );
  checks.push(
    runCheck(
      "contract-route-complete-onboarding",
      assertContractRoute(
        routeCompletePartnerOnboarding,
        "POST",
        "/api/admin/integration-marketplace/partners/:provider/onboarding/complete",
      ),
      "Contract completePartnerOnboarding must match method/path.",
    ),
  );
  checks.push(
    runCheck(
      "contract-route-verify-partner-contract",
      assertContractRoute(
        routeVerifyPartnerContract,
        "POST",
        "/api/admin/integration-marketplace/partners/:provider/contract-verify",
      ),
      "Contract verifyPartnerContract must match method/path.",
    ),
  );

  checks.push(
    runCheck(
      "policy-md-exists",
      await pathExists("docs/policies/partner-onboarding-contract-v1.md"),
      "Policy markdown must exist: docs/policies/partner-onboarding-contract-v1.md",
    ),
  );
  checks.push(
    runCheck(
      "runbook-exists",
      await pathExists("docs/runbooks/partner-onboarding-self-serve.md"),
      "Runbook must exist: docs/runbooks/partner-onboarding-self-serve.md",
    ),
  );

  const simulationResults: SimulationResult[] = policy.simulationCases.map((scenario) => {
    const status = buildPartnerOnboardingStatus(scenario.app);
    const blockingFailures = status.contractVerification.checks.filter(
      (check) => check.severity === "error" && !check.passed,
    ).length;

    const pass =
      status.contractVerification.verified === scenario.expected.verified &&
      blockingFailures === scenario.expected.blockingFailures &&
      status.progressPercent >= scenario.expected.progressMinPercent;

    return {
      id: scenario.id,
      expectedVerified: scenario.expected.verified,
      actualVerified: status.contractVerification.verified,
      expectedBlockingFailures: scenario.expected.blockingFailures,
      actualBlockingFailures: blockingFailures,
      expectedProgressMinPercent: scenario.expected.progressMinPercent,
      actualProgressPercent: status.progressPercent,
      status: pass ? "pass" : "fail",
    };
  });

  for (const result of simulationResults) {
    checks.push(
      runCheck(
        `simulation-${result.id}-verified`,
        result.expectedVerified === result.actualVerified,
        `Expected verified=${result.expectedVerified}, got ${result.actualVerified}`,
      ),
    );
    checks.push(
      runCheck(
        `simulation-${result.id}-blocking-failures`,
        result.expectedBlockingFailures === result.actualBlockingFailures,
        `Expected blockingFailures=${result.expectedBlockingFailures}, got ${result.actualBlockingFailures}`,
      ),
    );
    checks.push(
      runCheck(
        `simulation-${result.id}-progress-min`,
        result.actualProgressPercent >= result.expectedProgressMinPercent,
        `Expected progress >= ${result.expectedProgressMinPercent}, got ${result.actualProgressPercent}`,
      ),
    );
  }

  return { checks, simulationResults };
}

async function writeReport(report: PartnerOnboardingReport) {
  const jsonPath = process.env.SMOKE_PARTNER_ONBOARDING_JSON_PATH ?? "output/smoke/partner-onboarding-report.json";
  const mdPath = process.env.SMOKE_PARTNER_ONBOARDING_MD_PATH ?? "output/smoke/partner-onboarding-report.md";
  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(mdPath), { recursive: true });

  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# Partner Onboarding Smoke Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Policy path: ${report.policyPath}`,
    `- Total checks: ${report.metrics.totalChecks}`,
    `- Failed checks: ${report.metrics.failedChecks}`,
    `- Simulation cases: ${report.metrics.simulationCount}`,
    `- Simulation passing: ${report.metrics.simulationPassing}`,
    "",
    "## Simulation Results",
    "",
    "| Case | Expected Verified | Actual Verified | Expected Blocking | Actual Blocking | Progress% | Status |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...report.simulationResults.map(
      (result) =>
        `| ${result.id} | ${result.expectedVerified} | ${result.actualVerified} | ${result.expectedBlockingFailures} | ${result.actualBlockingFailures} | ${result.actualProgressPercent} | ${result.status} |`,
    ),
    "",
    "## Checks",
    "",
    "| Check | Status | Note |",
    "| --- | --- | --- |",
    ...report.checks.map((check) => `| ${check.id} | ${check.status} | ${check.note.replace(/\|/g, "\\|")} |`),
  ];

  await writeFile(mdPath, `${lines.join("\n")}\n`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const policyPath = process.env.SMOKE_PARTNER_ONBOARDING_POLICY_PATH ?? "docs/policies/partner-onboarding-contract-v1.json";

  const { checks, simulationResults } = await evaluateChecks(policyPath);
  const failedChecks = checks.filter((check) => check.status === "fail").length;

  const report: PartnerOnboardingReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: failedChecks > 0 ? "failed" : "passed",
    reportVersion: "v1",
    policyPath,
    checks,
    simulationResults,
    metrics: {
      totalChecks: checks.length,
      failedChecks,
      simulationCount: simulationResults.length,
      simulationPassing: simulationResults.filter((result) => result.status === "pass").length,
    },
  };

  await writeReport(report);
  if (report.status === "failed") {
    console.error(`Partner onboarding smoke failed: ${failedChecks} check(s) failed.`);
    process.exitCode = 1;
    return;
  }
  console.log("Partner onboarding smoke passed.");
}

main().catch((error) => {
  console.error(`Partner onboarding smoke crashed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
