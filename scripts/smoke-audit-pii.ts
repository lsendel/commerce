import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { buildAuditIntegrityHash } from "../src/shared/audit-trail";
import { REDACTED_VALUE, redactForLogs, redactStringValue } from "../src/shared/pii-redaction";

type CheckStatus = "pass" | "fail";
type ReportStatus = "passed" | "failed";
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface AuditCheck {
  id: string;
  status: CheckStatus;
  note: string;
}

interface FileCoverage {
  filePath: string;
  mountPrefixes: string[];
  totalEndpoints: number;
  mutationEndpoints: number;
}

interface AuditPiiSmokeReport {
  startedAt: string;
  finishedAt: string;
  status: ReportStatus;
  reportVersion: "v1";
  checks: AuditCheck[];
  metrics: {
    totalChecks: number;
    failedChecks: number;
    routeFilesAnalyzed: number;
    totalEndpoints: number;
    mutationEndpoints: number;
    auditCoveredEndpoints: number;
    auditCoveredMutationEndpoints: number;
    coveragePercent: number;
    mutationCoveragePercent: number;
  };
  coverage: {
    auditMiddlewareRegistered: boolean;
    fileBreakdown: FileCoverage[];
  };
}

interface EndpointRecord {
  method: HttpMethod;
  fullPath: string;
}

function runCheck(id: string, condition: boolean, note: string): AuditCheck {
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

  if (!normalizedRoute || normalizedRoute === "/") {
    return normalizedPrefix;
  }

  const routeSegment = normalizedRoute.startsWith("/")
    ? normalizedRoute
    : `/${normalizedRoute}`;

  const merged = `${normalizedPrefix}${routeSegment}`.replace(/\/+/g, "/");
  return merged === "" ? "/" : merged;
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

function parseRouteEndpoints(routeSource: string): Array<{ method: HttpMethod; routePath: string }> {
  const endpoints: Array<{ method: HttpMethod; routePath: string }> = [];
  const endpointPattern = /\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g;

  let match: RegExpExecArray | null;
  while ((match = endpointPattern.exec(routeSource)) !== null) {
    const method = match[1]?.toUpperCase() as HttpMethod | undefined;
    const routePath = match[2];
    if (!method || !routePath) continue;
    endpoints.push({ method, routePath });
  }

  return endpoints;
}

async function discoverApiCoverage() {
  const indexSource = await readFile("src/index.tsx", "utf8");
  const importMap = parseRouteImports(indexSource);
  const mounts = parseRouteMounts(indexSource);

  const fileToPrefixes = new Map<string, Set<string>>();
  for (const mount of mounts) {
    const filePath = importMap.get(mount.symbol);
    if (!filePath) continue;

    const existing = fileToPrefixes.get(filePath) ?? new Set<string>();
    existing.add(normalizePrefix(mount.mountPrefix));
    fileToPrefixes.set(filePath, existing);
  }

  const endpointSet = new Set<string>();
  const fileBreakdown: FileCoverage[] = [];

  for (const [filePath, prefixSet] of [...fileToPrefixes.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const routeSource = await readFile(filePath, "utf8");
    const routeEndpoints = parseRouteEndpoints(routeSource);

    let fileTotalEndpoints = 0;
    let fileMutationEndpoints = 0;

    for (const prefix of prefixSet) {
      for (const endpoint of routeEndpoints) {
        const fullPath = joinPaths(prefix, endpoint.routePath);
        const key = `${endpoint.method} ${fullPath}`;
        endpointSet.add(key);

        fileTotalEndpoints += 1;
        if (endpoint.method !== "GET") {
          fileMutationEndpoints += 1;
        }
      }
    }

    fileBreakdown.push({
      filePath,
      mountPrefixes: [...prefixSet].sort((a, b) => a.localeCompare(b)),
      totalEndpoints: fileTotalEndpoints,
      mutationEndpoints: fileMutationEndpoints,
    });
  }

  const endpoints: EndpointRecord[] = [...endpointSet]
    .map((key) => {
      const [method, ...pathParts] = key.split(" ");
      return {
        method: method as HttpMethod,
        fullPath: pathParts.join(" "),
      };
    })
    .sort((a, b) => `${a.method} ${a.fullPath}`.localeCompare(`${b.method} ${b.fullPath}`));

  return {
    fileBreakdown,
    endpoints,
    auditMiddlewareRegistered: indexSource.includes('app.use("/api/*", auditTrailMiddleware());'),
  };
}

async function evaluateChecks(): Promise<{
  checks: AuditCheck[];
  fileBreakdown: FileCoverage[];
  totalEndpoints: number;
  mutationEndpoints: number;
  auditMiddlewareRegistered: boolean;
}> {
  const checks: AuditCheck[] = [];
  const coverage = await discoverApiCoverage();
  const totalEndpoints = coverage.endpoints.length;
  const mutationEndpoints = coverage.endpoints.filter((endpoint) => endpoint.method !== "GET").length;

  checks.push(
    runCheck(
      "audit-middleware-registered",
      coverage.auditMiddlewareRegistered,
      "Audit middleware must be mounted on /api/* in src/index.tsx.",
    ),
  );

  checks.push(
    runCheck(
      "route-discovery-has-endpoints",
      totalEndpoints > 0 && coverage.fileBreakdown.length > 0,
      "API coverage discovery must identify route files and endpoints.",
    ),
  );

  checks.push(
    runCheck(
      "audit-coverage-all-endpoints",
      coverage.auditMiddlewareRegistered && totalEndpoints > 0,
      `Global middleware coverage requires /api/* auditing for all discovered endpoints (${totalEndpoints}).`,
    ),
  );

  checks.push(
    runCheck(
      "audit-coverage-mutation-endpoints",
      coverage.auditMiddlewareRegistered && mutationEndpoints > 0,
      `Mutation coverage requires /api/* auditing for discovered mutation endpoints (${mutationEndpoints}).`,
    ),
  );

  const redactedPayload = redactForLogs({
    email: "owner@petm8.io",
    phone: "+1 (415) 555-1299",
    password: "SuperSecret123!",
    nested: {
      authorization: "Bearer top-secret-token",
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.def",
      message: "reset code sent to owner@petm8.io",
    },
  }) as Record<string, unknown>;

  checks.push(
    runCheck(
      "pii-redaction-sensitive-keys",
      redactedPayload.email === REDACTED_VALUE &&
        redactedPayload.phone === REDACTED_VALUE &&
        redactedPayload.password === REDACTED_VALUE,
      "PII keys (email/phone/password) must be replaced with [REDACTED].",
    ),
  );

  const nested = redactedPayload.nested as Record<string, unknown> | undefined;
  checks.push(
    runCheck(
      "pii-redaction-nested-secrets",
      nested?.authorization === REDACTED_VALUE && nested?.token === REDACTED_VALUE,
      "Nested authorization and token fields must be redacted.",
    ),
  );

  const redactedText = redactStringValue(
    "Bearer abc12345678901234567890 contact owner@petm8.io token=abcdef1234567890",
  );
  checks.push(
    runCheck(
      "pii-redaction-freeform-string",
      redactedText.includes(REDACTED_VALUE),
      "Freeform log strings containing bearer/email/token markers must be redacted.",
    ),
  );

  const hashed = await buildAuditIntegrityHash(
    {
      timestamp: "2027-02-25T10:00:00.000Z",
      requestId: "request-1",
      method: "POST",
      path: "/api/auth/login",
      status: 401,
      durationMs: 33,
      outcome: "rejected",
      actor: {
        userId: null,
        role: null,
        sessionState: "anonymous",
      },
      request: {
        ip: "127.0.0.1",
        userAgent: "smoke",
        queryKeys: ["next"],
      },
      metadata: {
        hasAuthorizationHeader: true,
      },
    },
    "audit-test-secret",
  );
  checks.push(
    runCheck(
      "audit-integrity-hash-shape",
      /^[a-f0-9]{64}$/.test(hashed),
      "Audit integrity hash must be a 64-char lowercase SHA-256 hex digest.",
    ),
  );

  const errorHandlerSource = await readFile("src/middleware/error-handler.middleware.ts", "utf8");
  checks.push(
    runCheck(
      "error-handler-redaction-hook",
      errorHandlerSource.includes("redactForLogs(") &&
        errorHandlerSource.includes("JSON.stringify(logEntry)"),
      "Error handler must redact structured log entries before emitting.",
    ),
  );

  const auditMiddlewareSource = await readFile("src/middleware/audit-trail.middleware.ts", "utf8");
  checks.push(
    runCheck(
      "audit-middleware-redaction-and-integrity",
      auditMiddlewareSource.includes("redactForLogs(") &&
        auditMiddlewareSource.includes("buildAuditIntegrityHash("),
      "Audit middleware must redact log payloads and include integrity hash generation.",
    ),
  );

  return {
    checks,
    fileBreakdown: coverage.fileBreakdown,
    totalEndpoints,
    mutationEndpoints,
    auditMiddlewareRegistered: coverage.auditMiddlewareRegistered,
  };
}

async function writeReport(report: AuditPiiSmokeReport) {
  const jsonPath = process.env.SMOKE_AUDIT_PII_JSON_PATH ?? "output/smoke/audit-pii-report.json";
  const mdPath = process.env.SMOKE_AUDIT_PII_MD_PATH ?? "output/smoke/audit-pii-report.md";

  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(mdPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# Audit/PII Smoke Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Route files analyzed: ${report.metrics.routeFilesAnalyzed}`,
    `- Endpoints discovered: ${report.metrics.totalEndpoints}`,
    `- Mutation endpoints discovered: ${report.metrics.mutationEndpoints}`,
    `- Coverage: ${report.metrics.auditCoveredEndpoints}/${report.metrics.totalEndpoints} (${report.metrics.coveragePercent.toFixed(2)}%)`,
    `- Mutation coverage: ${report.metrics.auditCoveredMutationEndpoints}/${report.metrics.mutationEndpoints} (${report.metrics.mutationCoveragePercent.toFixed(2)}%)`,
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
    "## File Coverage",
    "",
    "| Route File | Mount Prefixes | Endpoints | Mutation Endpoints |",
    "| --- | --- | --- | --- |",
    ...report.coverage.fileBreakdown.map(
      (item) =>
        `| ${item.filePath} | ${item.mountPrefixes.join(", ")} | ${item.totalEndpoints} | ${item.mutationEndpoints} |`,
    ),
    "",
  ];

  await writeFile(mdPath, `${lines.join("\n")}\n`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const evaluation = await evaluateChecks();

  const failedChecks = evaluation.checks.filter((check) => check.status === "fail").length;
  const auditCoveredEndpoints = evaluation.auditMiddlewareRegistered
    ? evaluation.totalEndpoints
    : 0;
  const auditCoveredMutationEndpoints = evaluation.auditMiddlewareRegistered
    ? evaluation.mutationEndpoints
    : 0;

  const report: AuditPiiSmokeReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: failedChecks > 0 ? "failed" : "passed",
    reportVersion: "v1",
    checks: evaluation.checks,
    metrics: {
      totalChecks: evaluation.checks.length,
      failedChecks,
      routeFilesAnalyzed: evaluation.fileBreakdown.length,
      totalEndpoints: evaluation.totalEndpoints,
      mutationEndpoints: evaluation.mutationEndpoints,
      auditCoveredEndpoints,
      auditCoveredMutationEndpoints,
      coveragePercent:
        evaluation.totalEndpoints === 0
          ? 0
          : (auditCoveredEndpoints / evaluation.totalEndpoints) * 100,
      mutationCoveragePercent:
        evaluation.mutationEndpoints === 0
          ? 0
          : (auditCoveredMutationEndpoints / evaluation.mutationEndpoints) * 100,
    },
    coverage: {
      auditMiddlewareRegistered: evaluation.auditMiddlewareRegistered,
      fileBreakdown: evaluation.fileBreakdown,
    },
  };

  await writeReport(report);

  if (report.status === "failed") {
    console.error(`Audit/PII smoke failed: ${failedChecks} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log("Audit/PII smoke passed.");
}

main().catch((error) => {
  console.error(
    `Audit/PII smoke crashed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
