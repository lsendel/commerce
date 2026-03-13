import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type CheckStatus = "pass" | "fail";
type ReportStatus = "passed" | "failed";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RoleBinding {
  id: string;
  description: string;
  sourceFile: string;
  expectedSourceSnippets: string[];
}

interface GuardAssertion {
  id: string;
  sourceFile: string;
  mustContain: string[];
}

interface BreakGlassPolicy {
  owner: string;
  escalationChannel: string;
  approversRequired: number;
  maxWindowMinutes: number;
  drillCadenceDays: number;
  lastDrillOn: string;
  nextDrillBy: string;
  scenarios: Array<{
    id: string;
    name: string;
    targetSurface: string;
    expectedOutcome: string;
  }>;
}

interface AccessGovernancePolicy {
  version: "v1";
  roleModel: {
    platformRoles: string[];
    storeMemberRoles: string[];
    adminAliasResolvesTo: string[];
  };
  roleBindings: RoleBinding[];
  guardAssertions: GuardAssertion[];
  breakGlass: BreakGlassPolicy;
}

interface GovernanceCheck {
  id: string;
  status: CheckStatus;
  note: string;
}

interface BreakGlassDrillCheck {
  id: string;
  status: CheckStatus;
  note: string;
}

interface BreakGlassDrillReport {
  startedAt: string;
  finishedAt: string;
  status: ReportStatus;
  reportVersion: "v1";
  policyOwner: string;
  checks: BreakGlassDrillCheck[];
  metrics: {
    totalChecks: number;
    failedChecks: number;
  };
  scenarios: Array<{
    scenarioId: string;
    name: string;
    targetSurface: string;
    expectedOutcome: string;
    status: CheckStatus;
  }>;
}

interface AccessGovernanceReport {
  startedAt: string;
  finishedAt: string;
  status: ReportStatus;
  reportVersion: "v1";
  policyPath: string;
  checks: GovernanceCheck[];
  metrics: {
    totalChecks: number;
    failedChecks: number;
    discoveredAdminApiEndpoints: number;
    discoveredRoleProtectedApiRoutes: number;
  };
  drillArtifactPath: string;
}

interface EndpointRecord {
  method: HttpMethod;
  fullPath: string;
}

function runCheck(id: string, condition: boolean, note: string): GovernanceCheck {
  return {
    id,
    status: condition ? "pass" : "fail",
    note,
  };
}

function runDrillCheck(id: string, condition: boolean, note: string): BreakGlassDrillCheck {
  return {
    id,
    status: condition ? "pass" : "fail",
    note,
  };
}

function normalizePrefix(prefix: string): string {
  const trimmed = prefix.trim();
  if (!trimmed) return "/";
  if (trimmed === "/") return "/";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.endsWith("/") ? withSlash.slice(0, -1) : withSlash;
}

function joinPaths(prefix: string, routePath: string): string {
  const normalizedPrefix = normalizePrefix(prefix);
  const normalizedRoute = routePath.trim();
  if (!normalizedRoute || normalizedRoute === "/") return normalizedPrefix;
  const segment = normalizedRoute.startsWith("/") ? normalizedRoute : `/${normalizedRoute}`;
  return `${normalizedPrefix}${segment}`.replace(/\/+/g, "/");
}

function parseRouteImports(indexSource: string): Map<string, string> {
  const imports = new Map<string, string>();

  const namedImportPattern =
    /^import\s+\{\s*([A-Za-z0-9_]+)\s*\}\s+from\s+"(\.\/routes\/api\/[^"]+)";/gm;
  const defaultImportPattern =
    /^import\s+([A-Za-z0-9_]+)\s+from\s+"(\.\/routes\/api\/[^"]+)";/gm;

  let match: RegExpExecArray | null;
  while ((match = namedImportPattern.exec(indexSource)) !== null) {
    const symbol = match[1];
    const importPath = match[2];
    if (!symbol || !importPath) continue;
    imports.set(symbol, `src/${importPath.replace(/^\.\//, "")}.ts`);
  }

  while ((match = defaultImportPattern.exec(indexSource)) !== null) {
    const symbol = match[1];
    const importPath = match[2];
    if (!symbol || !importPath) continue;
    imports.set(symbol, `src/${importPath.replace(/^\.\//, "")}.ts`);
  }

  return imports;
}

function parseRouteMounts(indexSource: string): Array<{ mountPrefix: string; symbol: string }> {
  const mounts: Array<{ mountPrefix: string; symbol: string }> = [];
  const routePattern = /app\.route\("([^"]+)",\s*([A-Za-z0-9_]+)\);/g;

  let match: RegExpExecArray | null;
  while ((match = routePattern.exec(indexSource)) !== null) {
    const mountPrefix = match[1];
    const symbol = match[2];
    if (!mountPrefix || !symbol) continue;
    mounts.push({ mountPrefix, symbol });
  }

  return mounts;
}

function parseRouteEndpoints(source: string): Array<{ method: HttpMethod; routePath: string }> {
  const endpoints: Array<{ method: HttpMethod; routePath: string }> = [];
  const endpointPattern = /\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g;

  let match: RegExpExecArray | null;
  while ((match = endpointPattern.exec(source)) !== null) {
    const method = match[1]?.toUpperCase() as HttpMethod | undefined;
    const routePath = match[2];
    if (!method || !routePath) continue;
    endpoints.push({ method, routePath });
  }

  return endpoints;
}

async function discoverApiEndpoints(): Promise<EndpointRecord[]> {
  const indexSource = await readFile("src/index.tsx", "utf8");
  const imports = parseRouteImports(indexSource);
  const mounts = parseRouteMounts(indexSource);

  const endpointSet = new Set<string>();
  for (const mount of mounts) {
    const filePath = imports.get(mount.symbol);
    if (!filePath) continue;

    const routeSource = await readFile(filePath, "utf8");
    const endpoints = parseRouteEndpoints(routeSource);

    for (const endpoint of endpoints) {
      const fullPath = joinPaths(mount.mountPrefix, endpoint.routePath);
      endpointSet.add(`${endpoint.method} ${fullPath}`);
    }
  }

  return [...endpointSet]
    .map((item) => {
      const [method, ...pathParts] = item.split(" ");
      return {
        method: method as HttpMethod,
        fullPath: pathParts.join(" "),
      };
    })
    .sort((a, b) => `${a.method} ${a.fullPath}`.localeCompare(`${b.method} ${b.fullPath}`));
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

async function loadPolicy(path: string): Promise<AccessGovernancePolicy> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as Partial<AccessGovernancePolicy>;

  if (parsed.version !== "v1") {
    throw new Error("Access governance policy version must be v1.");
  }
  if (!parsed.roleModel || !Array.isArray(parsed.roleBindings) || !Array.isArray(parsed.guardAssertions)) {
    throw new Error("Access governance policy is missing required sections.");
  }
  if (!parsed.breakGlass) {
    throw new Error("Access governance policy must define breakGlass policy.");
  }

  return parsed as AccessGovernancePolicy;
}

async function evaluateChecks(policyPath: string): Promise<{
  checks: GovernanceCheck[];
  drillReport: BreakGlassDrillReport;
  discoveredAdminApiEndpoints: number;
  discoveredRoleProtectedApiRoutes: number;
}> {
  const checks: GovernanceCheck[] = [];
  const policy = await loadPolicy(policyPath);

  const requiredPlatformRoles = ["super_admin", "group_admin", "user"];
  const requiredStoreRoles = ["owner", "admin", "staff"];
  const requiredAdminAlias = ["super_admin", "group_admin"];

  checks.push(
    runCheck(
      "role-model-platform-coverage",
      requiredPlatformRoles.every((role) => policy.roleModel.platformRoles.includes(role)),
      "Role model must include super_admin/group_admin/user platform roles.",
    ),
  );

  checks.push(
    runCheck(
      "role-model-store-coverage",
      requiredStoreRoles.every((role) => policy.roleModel.storeMemberRoles.includes(role)),
      "Role model must include owner/admin/staff store roles.",
    ),
  );

  checks.push(
    runCheck(
      "admin-alias-coverage",
      requiredAdminAlias.every((role) => policy.roleModel.adminAliasResolvesTo.includes(role)),
      "Admin alias must resolve to super_admin and group_admin.",
    ),
  );

  for (const binding of policy.roleBindings) {
    const source = await readFile(binding.sourceFile, "utf8");
    const matched = binding.expectedSourceSnippets.every((snippet) => source.includes(snippet));
    checks.push(
      runCheck(
        `binding-${binding.id}`,
        matched,
        matched
          ? `Role binding ${binding.id} source snippets verified.`
          : `Role binding ${binding.id} missing expected snippets in ${binding.sourceFile}.`,
      ),
    );
  }

  for (const assertion of policy.guardAssertions) {
    const source = await readFile(assertion.sourceFile, "utf8");
    const matched = assertion.mustContain.every((snippet) => source.includes(snippet));
    checks.push(
      runCheck(
        `guard-${assertion.id}`,
        matched,
        matched
          ? `Guard assertion ${assertion.id} verified.`
          : `Guard assertion ${assertion.id} failed in ${assertion.sourceFile}.`,
      ),
    );
  }

  const endpoints = await discoverApiEndpoints();
  const discoveredAdminApiEndpoints = endpoints.filter((endpoint) => endpoint.fullPath.startsWith("/api/admin/")).length;
  const discoveredRoleProtectedApiRoutes = endpoints.filter(
    (endpoint) =>
      endpoint.fullPath.startsWith("/api/admin/") ||
      endpoint.fullPath.startsWith("/api/platform/") ||
      endpoint.fullPath.startsWith("/api/account/"),
  ).length;

  checks.push(
    runCheck(
      "admin-api-surface-discovered",
      discoveredAdminApiEndpoints > 0,
      `Admin API surface discovery must find endpoints (found ${discoveredAdminApiEndpoints}).`,
    ),
  );

  checks.push(
    runCheck(
      "role-protected-surface-discovered",
      discoveredRoleProtectedApiRoutes > 0,
      `Role-protected API surface discovery must find endpoints (found ${discoveredRoleProtectedApiRoutes}).`,
    ),
  );

  const breakGlass = policy.breakGlass;
  const drillChecks: BreakGlassDrillCheck[] = [];
  const lastValid = isIsoDate(breakGlass.lastDrillOn);
  const nextValid = isIsoDate(breakGlass.nextDrillBy);

  drillChecks.push(
    runDrillCheck(
      "break-glass-approver-quorum",
      Number.isFinite(breakGlass.approversRequired) && breakGlass.approversRequired >= 2,
      "Break-glass policy must require at least 2 approvers.",
    ),
  );

  drillChecks.push(
    runDrillCheck(
      "break-glass-window-bound",
      Number.isFinite(breakGlass.maxWindowMinutes)
        && breakGlass.maxWindowMinutes > 0
        && breakGlass.maxWindowMinutes <= 240,
      "Break-glass window must be bounded to <= 240 minutes.",
    ),
  );

  drillChecks.push(
    runDrillCheck(
      "break-glass-channel-defined",
      breakGlass.escalationChannel.trim().length > 0,
      "Break-glass escalation channel must be configured.",
    ),
  );

  drillChecks.push(
    runDrillCheck(
      "break-glass-scenarios-present",
      breakGlass.scenarios.length > 0,
      "At least one break-glass scenario must be defined.",
    ),
  );

  drillChecks.push(
    runDrillCheck(
      "break-glass-date-format",
      lastValid && nextValid,
      "Break-glass drill dates must use YYYY-MM-DD format.",
    ),
  );

  if (lastValid && nextValid) {
    const last = parseDate(breakGlass.lastDrillOn);
    const next = parseDate(breakGlass.nextDrillBy);
    const now = new Date();
    const maxNext = new Date(last.getTime() + breakGlass.drillCadenceDays * 86_400_000 + 86_400_000);

    drillChecks.push(
      runDrillCheck(
        "break-glass-next-after-last",
        next.getTime() >= last.getTime(),
        "nextDrillBy must be on or after lastDrillOn.",
      ),
    );

    drillChecks.push(
      runDrillCheck(
        "break-glass-window-valid",
        next.getTime() <= maxNext.getTime(),
        "nextDrillBy must stay within drillCadenceDays window.",
      ),
    );

    drillChecks.push(
      runDrillCheck(
        "break-glass-not-overdue",
        next.getTime() >= now.getTime(),
        "Break-glass drill schedule must not be overdue.",
      ),
    );
  }

  const globalAdminPageFence = checks.find((item) => item.id === "guard-admin-page-fence")?.status === "pass";
  const globalAdminApiFence = checks.find((item) => item.id === "guard-admin-api-fence")?.status === "pass";

  const scenarios = breakGlass.scenarios.map((scenario) => {
    const passed = globalAdminPageFence && globalAdminApiFence;
    return {
      scenarioId: scenario.id,
      name: scenario.name,
      targetSurface: scenario.targetSurface,
      expectedOutcome: scenario.expectedOutcome,
      status: (passed ? "pass" : "fail") as CheckStatus,
    };
  });

  const scenarioFailures = scenarios.filter((scenario) => scenario.status === "fail").length;
  if (scenarioFailures > 0) {
    drillChecks.push(
      runDrillCheck(
        "break-glass-scenario-evaluation",
        false,
        `${scenarioFailures} scenario(s) failed guard preconditions.`,
      ),
    );
  } else {
    drillChecks.push(
      runDrillCheck(
        "break-glass-scenario-evaluation",
        true,
        "All break-glass scenarios passed guard preconditions.",
      ),
    );
  }

  const drillFailed = drillChecks.filter((item) => item.status === "fail").length;
  const drillReport: BreakGlassDrillReport = {
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    status: drillFailed > 0 ? "failed" : "passed",
    reportVersion: "v1",
    policyOwner: breakGlass.owner,
    checks: drillChecks,
    metrics: {
      totalChecks: drillChecks.length,
      failedChecks: drillFailed,
    },
    scenarios,
  };

  checks.push(
    runCheck(
      "break-glass-drill-status",
      drillReport.status === "passed",
      drillReport.status === "passed"
        ? "Break-glass drill simulation passed."
        : "Break-glass drill simulation failed.",
    ),
  );

  return {
    checks,
    drillReport,
    discoveredAdminApiEndpoints,
    discoveredRoleProtectedApiRoutes,
  };
}

async function writeBreakGlassDrillReport(report: BreakGlassDrillReport) {
  const jsonPath =
    process.env.SMOKE_BREAK_GLASS_DRILL_JSON_PATH ??
    "output/smoke/break-glass-drill-report.json";
  const mdPath =
    process.env.SMOKE_BREAK_GLASS_DRILL_MD_PATH ??
    "output/smoke/break-glass-drill-report.md";

  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(mdPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# Break-Glass Drill Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Policy owner: ${report.policyOwner}`,
    `- Total checks: ${report.metrics.totalChecks}`,
    `- Failed checks: ${report.metrics.failedChecks}`,
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
    "## Scenarios",
    "",
    "| Scenario ID | Name | Surface | Expected | Status |",
    "| --- | --- | --- | --- | --- |",
    ...report.scenarios.map(
      (scenario) =>
        `| ${scenario.scenarioId} | ${scenario.name.replace(/\|/g, "\\|")} | ${scenario.targetSurface.replace(/\|/g, "\\|")} | ${scenario.expectedOutcome.replace(/\|/g, "\\|")} | ${scenario.status} |`,
    ),
    "",
  ];

  await writeFile(mdPath, `${lines.join("\n")}\n`);
}

async function writeAccessGovernanceReport(report: AccessGovernanceReport) {
  const jsonPath =
    process.env.SMOKE_ACCESS_GOVERNANCE_JSON_PATH ??
    "output/smoke/access-governance-report.json";
  const mdPath =
    process.env.SMOKE_ACCESS_GOVERNANCE_MD_PATH ??
    "output/smoke/access-governance-report.md";

  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(mdPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# Access Governance Smoke Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Policy path: ${report.policyPath}`,
    `- Discovered admin API endpoints: ${report.metrics.discoveredAdminApiEndpoints}`,
    `- Discovered role-protected API routes: ${report.metrics.discoveredRoleProtectedApiRoutes}`,
    `- Drill artifact: ${report.drillArtifactPath}`,
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
    process.env.SMOKE_ACCESS_GOVERNANCE_POLICY_PATH ??
    "docs/policies/access-governance-policy-v1.json";

  const evaluation = await evaluateChecks(policyPath);
  const failedChecks = evaluation.checks.filter((check) => check.status === "fail").length;

  await writeBreakGlassDrillReport(evaluation.drillReport);

  const accessReport: AccessGovernanceReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: failedChecks > 0 ? "failed" : "passed",
    reportVersion: "v1",
    policyPath,
    checks: evaluation.checks,
    metrics: {
      totalChecks: evaluation.checks.length,
      failedChecks,
      discoveredAdminApiEndpoints: evaluation.discoveredAdminApiEndpoints,
      discoveredRoleProtectedApiRoutes: evaluation.discoveredRoleProtectedApiRoutes,
    },
    drillArtifactPath: "output/smoke/break-glass-drill-report.json",
  };

  await writeAccessGovernanceReport(accessReport);

  if (accessReport.status === "failed") {
    console.error(`Access governance smoke failed: ${failedChecks} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log("Access governance smoke passed.");
}

main().catch((error) => {
  console.error(
    `Access governance smoke crashed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
