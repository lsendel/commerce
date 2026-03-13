import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  API_VERSION_POLICY,
  evaluateApiVersion,
  getDefaultApiVersion,
  getLatestApiVersion,
  getSupportedApiVersions,
} from "../src/shared/api-versioning";

type CheckStatus = "pass" | "fail";
type ReportStatus = "passed" | "failed";

interface VersionedEndpoint {
  id: string;
  fromVersion: string;
  toVersion: string;
  requiredBy: string;
  endpoint: string;
}

interface SimulationCase {
  id: string;
  requestedVersion: string | null;
  expected: {
    supported: boolean;
    effectiveVersion: string;
    defaulted: boolean;
    deprecated: boolean;
  };
}

interface ApiVersionPolicyFile {
  version: "v1";
  owner: string;
  reviewCadenceDays: number;
  lastReviewedOn: string;
  nextReviewBy: string;
  latestVersion: string;
  defaultVersion: string;
  supportedVersions: string[];
  deprecatedVersions: {
    version: string;
    deprecatedOn: string;
    sunsetOn: string;
    migrationGuidePath: string;
  }[];
  requestChannels: {
    headers: string[];
    queryParams: string[];
  };
  sourcePaths: string[];
  requiredSnippets: string[];
  simulationCases: SimulationCase[];
  migrationHooks: VersionedEndpoint[];
}

interface VersionCheck {
  id: string;
  status: CheckStatus;
  note: string;
}

interface SimulationResult {
  id: string;
  requestedVersion: string | null;
  expectedSupported: boolean;
  actualSupported: boolean;
  expectedEffectiveVersion: string;
  actualEffectiveVersion: string;
  expectedDefaulted: boolean;
  actualDefaulted: boolean;
  expectedDeprecated: boolean;
  actualDeprecated: boolean;
  status: CheckStatus;
}

interface ApiVersioningReport {
  startedAt: string;
  finishedAt: string;
  status: ReportStatus;
  reportVersion: "v1";
  policyPath: string;
  checks: VersionCheck[];
  simulationResults: SimulationResult[];
  metrics: {
    totalChecks: number;
    failedChecks: number;
    simulationCount: number;
    simulationPassing: number;
  };
}

function runCheck(id: string, condition: boolean, note: string): VersionCheck {
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

async function loadPolicy(path: string): Promise<ApiVersionPolicyFile> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as Partial<ApiVersionPolicyFile>;

  if (parsed.version !== "v1") {
    throw new Error("API version policy version must be v1.");
  }
  if (!Array.isArray(parsed.supportedVersions) || !Array.isArray(parsed.sourcePaths)) {
    throw new Error("API version policy must define supportedVersions and sourcePaths arrays.");
  }

  return parsed as ApiVersionPolicyFile;
}

async function evaluateChecks(policyPath: string): Promise<{
  checks: VersionCheck[];
  simulationResults: SimulationResult[];
}> {
  const policy = await loadPolicy(policyPath);
  const checks: VersionCheck[] = [];

  checks.push(
    runCheck(
      "policy-owner-present",
      policy.owner.trim().length > 0,
      "Policy owner must be defined.",
    ),
  );
  checks.push(
    runCheck(
      "supported-versions-present",
      policy.supportedVersions.length > 0,
      "Policy must define supported API versions.",
    ),
  );
  checks.push(
    runCheck(
      "deprecated-versions-present",
      policy.deprecatedVersions.length > 0,
      "Policy must define at least one deprecated API version.",
    ),
  );
  checks.push(
    runCheck(
      "migration-hooks-present",
      policy.migrationHooks.length > 0,
      "Policy must define migration hooks.",
    ),
  );
  checks.push(
    runCheck(
      "simulation-cases-present",
      policy.simulationCases.length > 0,
      "Policy must define simulation cases.",
    ),
  );

  checks.push(
    runCheck(
      "latest-supported",
      policy.supportedVersions.includes(policy.latestVersion),
      "Latest version must be part of supportedVersions.",
    ),
  );
  checks.push(
    runCheck(
      "default-supported",
      policy.supportedVersions.includes(policy.defaultVersion),
      "Default version must be part of supportedVersions.",
    ),
  );
  checks.push(
    runCheck(
      "latest-equals-runtime",
      policy.latestVersion === getLatestApiVersion(),
      "Policy latestVersion must match runtime latest API version.",
    ),
  );
  checks.push(
    runCheck(
      "default-equals-runtime",
      policy.defaultVersion === getDefaultApiVersion(),
      "Policy defaultVersion must match runtime default API version.",
    ),
  );
  checks.push(
    runCheck(
      "supported-equals-runtime",
      includesAll(getSupportedApiVersions(), policy.supportedVersions) &&
        includesAll(policy.supportedVersions, getSupportedApiVersions()),
      "Policy supportedVersions must match runtime supported API versions.",
    ),
  );
  checks.push(
    runCheck(
      "request-header-channels",
      policy.requestChannels.headers.length > 0,
      "Policy must define request header channels for version negotiation.",
    ),
  );
  checks.push(
    runCheck(
      "request-query-channels",
      policy.requestChannels.queryParams.length > 0,
      "Policy must define request query channels for version negotiation.",
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
        "API version policy review date must not be overdue.",
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

  checks.push(
    runCheck(
      "policy-md-exists",
      await pathExists("docs/policies/api-version-policy-v1.md"),
      "Policy markdown must exist: docs/policies/api-version-policy-v1.md",
    ),
  );
  checks.push(
    runCheck(
      "migration-guide-exists",
      await pathExists("docs/runbooks/api-versioning-migration.md"),
      "Migration guide must exist: docs/runbooks/api-versioning-migration.md",
    ),
  );

  for (const hook of policy.migrationHooks) {
    const prefix = `migration-hook-${hook.id}`;
    checks.push(
      runCheck(
        `${prefix}-from-supported`,
        policy.supportedVersions.includes(hook.fromVersion),
        "Migration hook fromVersion must be supported.",
      ),
    );
    checks.push(
      runCheck(
        `${prefix}-to-supported`,
        policy.supportedVersions.includes(hook.toVersion),
        "Migration hook toVersion must be supported.",
      ),
    );
    checks.push(
      runCheck(
        `${prefix}-required-by-format`,
        isIsoDate(hook.requiredBy),
        "Migration hook requiredBy must use YYYY-MM-DD format.",
      ),
    );
    checks.push(
      runCheck(
        `${prefix}-endpoint-format`,
        hook.endpoint.startsWith("/api/"),
        "Migration hook endpoint must begin with /api/.",
      ),
    );
  }

  const simulationResults: SimulationResult[] = policy.simulationCases.map((scenario) => {
    const resolution = evaluateApiVersion(scenario.requestedVersion);
    const checksPass =
      resolution.supported === scenario.expected.supported &&
      resolution.effectiveVersion === scenario.expected.effectiveVersion &&
      resolution.defaulted === scenario.expected.defaulted &&
      resolution.isDeprecated === scenario.expected.deprecated;
    return {
      id: scenario.id,
      requestedVersion: scenario.requestedVersion,
      expectedSupported: scenario.expected.supported,
      actualSupported: resolution.supported,
      expectedEffectiveVersion: scenario.expected.effectiveVersion,
      actualEffectiveVersion: resolution.effectiveVersion,
      expectedDefaulted: scenario.expected.defaulted,
      actualDefaulted: resolution.defaulted,
      expectedDeprecated: scenario.expected.deprecated,
      actualDeprecated: resolution.isDeprecated,
      status: checksPass ? "pass" : "fail",
    };
  });

  for (const result of simulationResults) {
    checks.push(
      runCheck(
        `simulation-${result.id}-supported`,
        result.expectedSupported === result.actualSupported,
        `Expected supported=${result.expectedSupported}, got ${result.actualSupported}`,
      ),
    );
    checks.push(
      runCheck(
        `simulation-${result.id}-effective-version`,
        result.expectedEffectiveVersion === result.actualEffectiveVersion,
        `Expected effectiveVersion=${result.expectedEffectiveVersion}, got ${result.actualEffectiveVersion}`,
      ),
    );
    checks.push(
      runCheck(
        `simulation-${result.id}-defaulted`,
        result.expectedDefaulted === result.actualDefaulted,
        `Expected defaulted=${result.expectedDefaulted}, got ${result.actualDefaulted}`,
      ),
    );
    checks.push(
      runCheck(
        `simulation-${result.id}-deprecated`,
        result.expectedDeprecated === result.actualDeprecated,
        `Expected deprecated=${result.expectedDeprecated}, got ${result.actualDeprecated}`,
      ),
    );
  }

  checks.push(
    runCheck(
      "runtime-policy-version",
      API_VERSION_POLICY.policyVersion === "v1",
      "Runtime API version policy must be v1.",
    ),
  );

  return { checks, simulationResults };
}

async function writeReport(report: ApiVersioningReport) {
  const jsonPath = process.env.SMOKE_API_VERSIONING_JSON_PATH ?? "output/smoke/api-versioning-report.json";
  const mdPath = process.env.SMOKE_API_VERSIONING_MD_PATH ?? "output/smoke/api-versioning-report.md";
  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(mdPath), { recursive: true });

  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# API Versioning Smoke Report",
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
    "| Case | Requested | Expected Supported | Actual Supported | Expected Effective | Actual Effective | Status |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...report.simulationResults.map(
      (result) =>
        `| ${result.id} | ${result.requestedVersion ?? "default"} | ${result.expectedSupported} | ${result.actualSupported} | ${result.expectedEffectiveVersion} | ${result.actualEffectiveVersion} | ${result.status} |`,
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
  const policyPath = process.env.SMOKE_API_VERSIONING_POLICY_PATH ?? "docs/policies/api-version-policy-v1.json";

  const { checks, simulationResults } = await evaluateChecks(policyPath);
  const failedChecks = checks.filter((check) => check.status === "fail").length;

  const report: ApiVersioningReport = {
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
    console.error(`API versioning smoke failed: ${failedChecks} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log("API versioning smoke passed.");
}

main().catch((error) => {
  console.error(`API versioning smoke crashed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
