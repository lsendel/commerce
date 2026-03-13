import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type CheckStatus = "pass" | "fail";
type ReportStatus = "passed" | "failed";
type EvidenceKind = "repo_file" | "generated_artifact";

interface EvidencePath {
  path: string;
  kind: EvidenceKind;
}

interface ControlRecord {
  controlId: string;
  soc2Domain: string;
  objective: string;
  implementationPaths: string[];
  runbookPaths: string[];
  evidencePaths: EvidencePath[];
  commandGates: string[];
}

interface ControlMatrixFile {
  version: "v1";
  controls: ControlRecord[];
}

interface ComplianceCheck {
  id: string;
  status: CheckStatus;
  note: string;
}

interface ComplianceControlReport {
  startedAt: string;
  finishedAt: string;
  status: ReportStatus;
  reportVersion: "v1";
  matrixPath: string;
  checks: ComplianceCheck[];
  metrics: {
    totalChecks: number;
    failedChecks: number;
    controlCount: number;
  };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function runCheck(id: string, condition: boolean, note: string): ComplianceCheck {
  return {
    id,
    status: condition ? "pass" : "fail",
    note,
  };
}

async function loadMatrix(matrixPath: string): Promise<ControlMatrixFile> {
  const raw = await readFile(matrixPath, "utf8");
  const parsed = JSON.parse(raw) as Partial<ControlMatrixFile>;

  if (parsed.version !== "v1") {
    throw new Error("Control matrix version must be v1.");
  }
  if (!Array.isArray(parsed.controls)) {
    throw new Error("Control matrix controls must be an array.");
  }

  return {
    version: "v1",
    controls: parsed.controls as ControlRecord[],
  };
}

async function loadPackageScripts(): Promise<Set<string>> {
  const raw = await readFile("package.json", "utf8");
  const parsed = JSON.parse(raw) as { scripts?: Record<string, string> };
  const scripts = parsed.scripts ?? {};
  return new Set(Object.keys(scripts));
}

async function evaluateChecks(matrixPath: string): Promise<{ checks: ComplianceCheck[]; controlCount: number }> {
  const checks: ComplianceCheck[] = [];
  const matrix = await loadMatrix(matrixPath);
  const packageScripts = await loadPackageScripts();

  checks.push(
    runCheck(
      "matrix-has-controls",
      matrix.controls.length > 0,
      "Control matrix must define at least one control record.",
    ),
  );

  const uniqueControlIds = new Set<string>();
  for (const control of matrix.controls) {
    const controlPrefix = control.controlId || "missing-control-id";

    const hasId = typeof control.controlId === "string" && control.controlId.trim().length > 0;
    checks.push(
      runCheck(
        `${controlPrefix}:id-present`,
        hasId,
        "Control must include a non-empty controlId.",
      ),
    );

    const uniqueId = hasId && !uniqueControlIds.has(control.controlId);
    checks.push(
      runCheck(
        `${controlPrefix}:id-unique`,
        uniqueId,
        "Control IDs must be unique inside the matrix.",
      ),
    );
    if (hasId) {
      uniqueControlIds.add(control.controlId);
    }

    const hasDomain = typeof control.soc2Domain === "string" && control.soc2Domain.trim().length > 0;
    checks.push(
      runCheck(
        `${controlPrefix}:domain-present`,
        hasDomain,
        "Each control must include the SOC2 domain mapping.",
      ),
    );

    const hasObjective = typeof control.objective === "string" && control.objective.trim().length > 0;
    checks.push(
      runCheck(
        `${controlPrefix}:objective-present`,
        hasObjective,
        "Each control must include an objective.",
      ),
    );

    checks.push(
      runCheck(
        `${controlPrefix}:implementation-paths-present`,
        Array.isArray(control.implementationPaths) && control.implementationPaths.length > 0,
        "Each control must map to at least one implementation path.",
      ),
    );
    for (const [index, path] of (control.implementationPaths ?? []).entries()) {
      const exists = await pathExists(path);
      checks.push(
        runCheck(
          `${controlPrefix}:implementation-path-${index + 1}`,
          exists,
          `Implementation path must exist: ${path}`,
        ),
      );
    }

    checks.push(
      runCheck(
        `${controlPrefix}:runbook-paths-present`,
        Array.isArray(control.runbookPaths) && control.runbookPaths.length > 0,
        "Each control must map to at least one runbook path.",
      ),
    );
    for (const [index, path] of (control.runbookPaths ?? []).entries()) {
      const exists = await pathExists(path);
      checks.push(
        runCheck(
          `${controlPrefix}:runbook-path-${index + 1}`,
          exists,
          `Runbook path must exist: ${path}`,
        ),
      );
    }

    checks.push(
      runCheck(
        `${controlPrefix}:evidence-paths-present`,
        Array.isArray(control.evidencePaths) && control.evidencePaths.length > 0,
        "Each control must include at least one evidence path.",
      ),
    );
    for (const [index, evidence] of (control.evidencePaths ?? []).entries()) {
      const evidencePrefix = `${controlPrefix}:evidence-${index + 1}`;
      const kindOk = evidence?.kind === "repo_file" || evidence?.kind === "generated_artifact";
      checks.push(
        runCheck(
          `${evidencePrefix}:kind-valid`,
          kindOk,
          `Evidence kind must be repo_file or generated_artifact: ${evidence?.kind ?? "missing"}`,
        ),
      );

      const path = evidence?.path ?? "";
      const pathPresent = typeof path === "string" && path.trim().length > 0;
      checks.push(
        runCheck(
          `${evidencePrefix}:path-present`,
          pathPresent,
          "Evidence path must be non-empty.",
        ),
      );

      if (evidence?.kind === "repo_file") {
        const exists = pathPresent ? await pathExists(path) : false;
        checks.push(
          runCheck(
            `${evidencePrefix}:repo-file-exists`,
            exists,
            `Repository evidence path must exist: ${path}`,
          ),
        );
      }

      if (evidence?.kind === "generated_artifact") {
        const artifactPathPolicy = pathPresent && path.startsWith("output/smoke/");
        checks.push(
          runCheck(
            `${evidencePrefix}:artifact-path-policy`,
            artifactPathPolicy,
            `Generated artifact paths must live under output/smoke/: ${path}`,
          ),
        );
      }
    }

    checks.push(
      runCheck(
        `${controlPrefix}:command-gates-present`,
        Array.isArray(control.commandGates) && control.commandGates.length > 0,
        "Each control must map to at least one smoke command.",
      ),
    );
    for (const [index, command] of (control.commandGates ?? []).entries()) {
      const exists = packageScripts.has(command);
      checks.push(
        runCheck(
          `${controlPrefix}:command-gate-${index + 1}`,
          exists,
          `Command gate must exist in package.json scripts: ${command}`,
        ),
      );
    }
  }

  return {
    checks,
    controlCount: matrix.controls.length,
  };
}

async function writeReport(report: ComplianceControlReport) {
  const reportJsonPath =
    process.env.SMOKE_COMPLIANCE_CONTROLS_JSON_PATH ??
    "output/smoke/compliance-controls-report.json";
  const reportMdPath =
    process.env.SMOKE_COMPLIANCE_CONTROLS_MD_PATH ??
    "output/smoke/compliance-controls-report.md";

  await mkdir(dirname(reportJsonPath), { recursive: true });
  await mkdir(dirname(reportMdPath), { recursive: true });
  await writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# Compliance Controls Smoke Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Matrix path: ${report.matrixPath}`,
    `- Total controls: ${report.metrics.controlCount}`,
    `- Total checks: ${report.metrics.totalChecks}`,
    `- Failed checks: ${report.metrics.failedChecks}`,
    "",
    "| Check | Status | Note |",
    "| --- | --- | --- |",
    ...report.checks.map(
      (check) =>
        `| ${check.id} | ${check.status} | ${check.note.replace(/\|/g, "\\|")} |`,
    ),
    "",
  ];

  await writeFile(reportMdPath, `${lines.join("\n")}\n`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const matrixPath =
    process.env.SMOKE_COMPLIANCE_MATRIX_PATH ??
    "docs/policies/compliance-control-matrix-v1.json";

  const { checks, controlCount } = await evaluateChecks(matrixPath);
  const failedChecks = checks.filter((check) => check.status === "fail").length;

  const report: ComplianceControlReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: failedChecks > 0 ? "failed" : "passed",
    reportVersion: "v1",
    matrixPath,
    checks,
    metrics: {
      totalChecks: checks.length,
      failedChecks,
      controlCount,
    },
  };

  await writeReport(report);

  if (report.status === "failed") {
    console.error(`Compliance controls smoke failed: ${failedChecks} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log("Compliance controls smoke passed.");
}

main().catch((error) => {
  console.error(
    `Compliance controls smoke crashed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
