import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type CheckStatus = "pass" | "fail";
type ReportStatus = "passed" | "failed";
type SecretSurface = "runtime_env" | "github_actions_secret";

type MatchType = "exact" | "prefix" | "regex";

interface RotationRule {
  cadenceDays: number;
  lastRotatedOn: string;
  nextRotationBy: string;
}

interface InventoryRule {
  id: string;
  surface: SecretSurface;
  matchType: MatchType;
  matchValue: string;
  sensitivity: "secret" | "credential" | "public_credential";
  owner: string;
  runbookPath: string;
  rotation: RotationRule;
  notes?: string;
}

interface SecretsInventoryFile {
  version: "v1";
  rules: InventoryRule[];
}

interface HygieneCheck {
  id: string;
  status: CheckStatus;
  note: string;
}

interface SecretsHygieneReport {
  startedAt: string;
  finishedAt: string;
  status: ReportStatus;
  reportVersion: "v1";
  inventoryPath: string;
  checks: HygieneCheck[];
  metrics: {
    totalChecks: number;
    failedChecks: number;
    runtimeDiscovered: number;
    runtimeCovered: number;
    ciDiscovered: number;
    ciCovered: number;
    envExampleCoveragePercent: number;
  };
  coverage: {
    runtimeUnmatched: string[];
    ciUnmatched: string[];
    envExampleMissing: string[];
  };
}

const RUNTIME_SECRET_PATTERN =
  /(SECRET|TOKEN|API_KEY|WEBHOOK_SECRET|ENCRYPTION_KEY|JWT_SECRET|AUTH_TOKEN|PUBLISHABLE_KEY)/;

function runCheck(id: string, condition: boolean, note: string): HygieneCheck {
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

function matchesRule(rule: InventoryRule, key: string): boolean {
  if (rule.matchType === "exact") {
    return key === rule.matchValue;
  }

  if (rule.matchType === "prefix") {
    return key.startsWith(rule.matchValue);
  }

  try {
    return new RegExp(rule.matchValue).test(key);
  } catch {
    return false;
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await readFile(path, "utf8");
    return true;
  } catch {
    return false;
  }
}

async function discoverRuntimeSecretKeys(): Promise<string[]> {
  const source = await readFile("src/env.ts", "utf8");
  const interfaceMatch = source.match(/export interface Env\s*\{([\s\S]*?)\n\}/);
  if (!interfaceMatch || !interfaceMatch[1]) {
    return [];
  }

  const keys: string[] = [];
  const pattern = /^\s*([A-Z][A-Z0-9_]+)\??:\s*[^;]+;/gm;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(interfaceMatch[1])) !== null) {
    const key = match[1];
    if (!key) continue;
    if (!RUNTIME_SECRET_PATTERN.test(key)) continue;
    keys.push(key);
  }

  return [...new Set(keys)].sort((a, b) => a.localeCompare(b));
}

async function discoverWorkflowSecrets(): Promise<string[]> {
  const files = (await readdir(".github/workflows")).filter((file) => file.endsWith(".yml"));
  const found = new Set<string>();

  for (const file of files) {
    const source = await readFile(`.github/workflows/${file}`, "utf8");
    const pattern = /secrets\.([A-Z0-9_]+)/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      const key = match[1];
      if (!key) continue;
      found.add(key);
    }
  }

  return [...found].sort((a, b) => a.localeCompare(b));
}

async function discoverEnvExampleKeys(): Promise<string[]> {
  const source = await readFile(".env.example", "utf8");
  const keys: string[] = [];
  const pattern = /^([A-Z0-9_]+)=/gm;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const key = match[1];
    if (!key) continue;
    keys.push(key);
  }

  return [...new Set(keys)].sort((a, b) => a.localeCompare(b));
}

async function loadInventory(path: string): Promise<SecretsInventoryFile> {
  const source = await readFile(path, "utf8");
  const parsed = JSON.parse(source) as Partial<SecretsInventoryFile>;

  if (parsed.version !== "v1") {
    throw new Error("Secrets inventory version must be v1.");
  }
  if (!Array.isArray(parsed.rules)) {
    throw new Error("Secrets inventory rules must be an array.");
  }

  return {
    version: "v1",
    rules: parsed.rules as InventoryRule[],
  };
}

async function evaluateChecks(inventoryPath: string): Promise<{
  checks: HygieneCheck[];
  runtimeDiscovered: string[];
  ciDiscovered: string[];
  runtimeUnmatched: string[];
  ciUnmatched: string[];
  envExampleMissing: string[];
}> {
  const checks: HygieneCheck[] = [];
  const inventory = await loadInventory(inventoryPath);
  const runtimeDiscovered = await discoverRuntimeSecretKeys();
  const ciDiscovered = await discoverWorkflowSecrets();
  const envExampleKeys = await discoverEnvExampleKeys();

  checks.push(
    runCheck(
      "inventory-rules-present",
      inventory.rules.length > 0,
      "Secrets key inventory must define at least one rule.",
    ),
  );

  const ruleIds = new Set<string>();
  for (const rule of inventory.rules) {
    const prefix = `rule-${rule.id || "missing"}`;
    const idPresent = rule.id.trim().length > 0;
    checks.push(runCheck(`${prefix}:id-present`, idPresent, "Rule id must be non-empty."));

    const unique = idPresent && !ruleIds.has(rule.id);
    checks.push(runCheck(`${prefix}:id-unique`, unique, "Rule id must be unique."));
    if (idPresent) ruleIds.add(rule.id);

    const runbookExists = await pathExists(rule.runbookPath);
    checks.push(
      runCheck(
        `${prefix}:runbook-exists`,
        runbookExists,
        `Runbook path must exist: ${rule.runbookPath}`,
      ),
    );

    const cadenceValid = Number.isFinite(rule.rotation.cadenceDays) && rule.rotation.cadenceDays > 0;
    checks.push(
      runCheck(
        `${prefix}:rotation-cadence-valid`,
        cadenceValid,
        "Rotation cadence must be a positive number of days.",
      ),
    );

    const lastValid = isIsoDate(rule.rotation.lastRotatedOn);
    const nextValid = isIsoDate(rule.rotation.nextRotationBy);
    checks.push(
      runCheck(
        `${prefix}:rotation-dates-format`,
        lastValid && nextValid,
        "Rotation dates must use YYYY-MM-DD format.",
      ),
    );

    if (lastValid && nextValid && cadenceValid) {
      const last = parseDate(rule.rotation.lastRotatedOn);
      const next = parseDate(rule.rotation.nextRotationBy);
      const now = new Date();
      const maxNext = new Date(last.getTime() + rule.rotation.cadenceDays * 86_400_000 + 86_400_000);

      checks.push(
        runCheck(
          `${prefix}:rotation-order`,
          next.getTime() >= last.getTime(),
          "nextRotationBy must be on or after lastRotatedOn.",
        ),
      );

      checks.push(
        runCheck(
          `${prefix}:rotation-window`,
          next.getTime() <= maxNext.getTime(),
          "nextRotationBy must be within cadenceDays window of lastRotatedOn.",
        ),
      );

      checks.push(
        runCheck(
          `${prefix}:rotation-not-overdue`,
          next.getTime() >= now.getTime(),
          `Secret rotation window must not be overdue for rule ${rule.id}.`,
        ),
      );
    }
  }

  const runtimeUnmatched = runtimeDiscovered.filter(
    (key) => !inventory.rules.some((rule) => rule.surface === "runtime_env" && matchesRule(rule, key)),
  );
  checks.push(
    runCheck(
      "runtime-coverage",
      runtimeUnmatched.length === 0,
      runtimeUnmatched.length === 0
        ? `All runtime secret keys are covered (${runtimeDiscovered.length}).`
        : `Missing runtime secret coverage: ${runtimeUnmatched.join(", ")}`,
    ),
  );

  const ciUnmatched = ciDiscovered.filter(
    (key) =>
      !inventory.rules.some((rule) => rule.surface === "github_actions_secret" && matchesRule(rule, key)),
  );
  checks.push(
    runCheck(
      "ci-coverage",
      ciUnmatched.length === 0,
      ciUnmatched.length === 0
        ? `All workflow secret keys are covered (${ciDiscovered.length}).`
        : `Missing workflow secret coverage: ${ciUnmatched.join(", ")}`,
    ),
  );

  const envExampleMissing = runtimeDiscovered.filter((key) => !envExampleKeys.includes(key));
  checks.push(
    runCheck(
      "env-example-runtime-secret-coverage",
      envExampleMissing.length === 0,
      envExampleMissing.length === 0
        ? ".env.example contains all runtime secret-like env keys."
        : `.env.example is missing runtime keys: ${envExampleMissing.join(", ")}`,
    ),
  );

  return {
    checks,
    runtimeDiscovered,
    ciDiscovered,
    runtimeUnmatched,
    ciUnmatched,
    envExampleMissing,
  };
}

async function writeReport(report: SecretsHygieneReport) {
  const jsonPath =
    process.env.SMOKE_SECRETS_HYGIENE_JSON_PATH ??
    "output/smoke/secrets-hygiene-report.json";
  const mdPath =
    process.env.SMOKE_SECRETS_HYGIENE_MD_PATH ??
    "output/smoke/secrets-hygiene-report.md";

  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(mdPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# Secrets Rotation Hygiene Smoke Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Inventory path: ${report.inventoryPath}`,
    `- Runtime coverage: ${report.metrics.runtimeCovered}/${report.metrics.runtimeDiscovered}`,
    `- CI coverage: ${report.metrics.ciCovered}/${report.metrics.ciDiscovered}`,
    `- .env.example runtime secret coverage: ${report.metrics.envExampleCoveragePercent.toFixed(2)}%`,
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

  if (report.coverage.runtimeUnmatched.length > 0 || report.coverage.ciUnmatched.length > 0) {
    lines.push("## Unmatched Keys");
    lines.push("");
    if (report.coverage.runtimeUnmatched.length > 0) {
      lines.push(`- Runtime unmatched: ${report.coverage.runtimeUnmatched.join(", ")}`);
    }
    if (report.coverage.ciUnmatched.length > 0) {
      lines.push(`- CI unmatched: ${report.coverage.ciUnmatched.join(", ")}`);
    }
    lines.push("");
  }

  await writeFile(mdPath, `${lines.join("\n")}\n`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const inventoryPath =
    process.env.SMOKE_SECRETS_INVENTORY_PATH ??
    "docs/policies/secrets-key-inventory-v1.json";

  const evaluation = await evaluateChecks(inventoryPath);
  const failedChecks = evaluation.checks.filter((check) => check.status === "fail").length;

  const runtimeCovered = evaluation.runtimeDiscovered.length - evaluation.runtimeUnmatched.length;
  const ciCovered = evaluation.ciDiscovered.length - evaluation.ciUnmatched.length;

  const report: SecretsHygieneReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: failedChecks > 0 ? "failed" : "passed",
    reportVersion: "v1",
    inventoryPath,
    checks: evaluation.checks,
    metrics: {
      totalChecks: evaluation.checks.length,
      failedChecks,
      runtimeDiscovered: evaluation.runtimeDiscovered.length,
      runtimeCovered,
      ciDiscovered: evaluation.ciDiscovered.length,
      ciCovered,
      envExampleCoveragePercent:
        evaluation.runtimeDiscovered.length === 0
          ? 100
          : ((evaluation.runtimeDiscovered.length - evaluation.envExampleMissing.length) /
              evaluation.runtimeDiscovered.length) *
            100,
    },
    coverage: {
      runtimeUnmatched: evaluation.runtimeUnmatched,
      ciUnmatched: evaluation.ciUnmatched,
      envExampleMissing: evaluation.envExampleMissing,
    },
  };

  await writeReport(report);
  if (report.status === "failed") {
    console.error(`Secrets hygiene smoke failed: ${failedChecks} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log("Secrets hygiene smoke passed.");
}

main().catch((error) => {
  console.error(
    `Secrets hygiene smoke crashed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
