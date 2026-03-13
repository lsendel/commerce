import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  buildDefaultExperimentRegistry,
  evaluateExperimentGuardrails,
  validateExperimentRegistry,
  type ExperimentRegistryEntry,
  type MetricObservation,
} from "../src/infrastructure/growth/experiment-registry";

type ReportStatus = "passed" | "passed_with_warnings" | "failed";

interface ExperimentResult {
  experimentId: string;
  name: string;
  owner: string;
  registryValid: boolean;
  registryErrors: string[];
  guardrailStatus: "pass" | "warn" | "fail";
  guardrails: ReturnType<typeof evaluateExperimentGuardrails>["checks"];
}

interface GrowthExperimentOsReport {
  startedAt: string;
  finishedAt: string;
  status: ReportStatus;
  reportVersion: "v1";
  totals: {
    experiments: number;
    passed: number;
    warnings: number;
    failed: number;
    invalidDefinitions: number;
  };
  experimentResults: ExperimentResult[];
}

function buildSampleObservations(
  experiment: ExperimentRegistryEntry,
): MetricObservation[] {
  if (experiment.experimentId === "wk45-pricing-holdout-geo") {
    return [
      { metric: "conversion_rate", baselineValue: 3.1, currentValue: 3.04, sampleSize: 1300 },
      { metric: "revenue_per_session", baselineValue: 2.85, currentValue: 2.94, sampleSize: 1300 },
      { metric: "refund_rate", baselineValue: 1.4, currentValue: 1.49, sampleSize: 600 },
    ];
  }

  if (experiment.experimentId === "wk45-lp-intent-copy") {
    return [
      { metric: "conversion_rate", baselineValue: 2.6, currentValue: 2.52, sampleSize: 780 },
      { metric: "average_order_value", baselineValue: 42.5, currentValue: 42.3, sampleSize: 780 },
    ];
  }

  return [
    { metric: "order_rate", baselineValue: 1.8, currentValue: 1.84, sampleSize: 420 },
    { metric: "refund_rate", baselineValue: 1.3, currentValue: 1.35, sampleSize: 420 },
  ];
}

async function writeReport(report: GrowthExperimentOsReport, registry: ExperimentRegistryEntry[]) {
  const reportJsonPath =
    process.env.SMOKE_GROWTH_EXPERIMENTS_JSON_PATH ??
    "output/smoke/growth-experiment-os-report.json";
  const reportMdPath =
    process.env.SMOKE_GROWTH_EXPERIMENTS_MD_PATH ??
    "output/smoke/growth-experiment-os-report.md";
  const registryJsonPath =
    process.env.EXPERIMENT_REGISTRY_JSON_PATH ??
    "output/experiments/experiment-registry.json";

  await mkdir(dirname(reportJsonPath), { recursive: true });
  await mkdir(dirname(reportMdPath), { recursive: true });
  await mkdir(dirname(registryJsonPath), { recursive: true });

  await writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(registryJsonPath, `${JSON.stringify({ registry }, null, 2)}\n`);

  const lines: string[] = [
    "# Growth Experiment OS Smoke Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Experiments: ${report.totals.experiments}`,
    `- Passed: ${report.totals.passed}`,
    `- Warnings: ${report.totals.warnings}`,
    `- Failed: ${report.totals.failed}`,
    `- Invalid definitions: ${report.totals.invalidDefinitions}`,
    "",
    `- Registry snapshot: ${registryJsonPath}`,
    "",
    "| Experiment | Owner | Registry | Guardrail Status |",
    "| --- | --- | --- | --- |",
    ...report.experimentResults.map((result) =>
      `| ${result.experimentId} | ${result.owner} | ${result.registryValid ? "valid" : "invalid"} | ${result.guardrailStatus} |`,
    ),
    "",
  ];

  for (const result of report.experimentResults) {
    lines.push(`## ${result.experimentId}: ${result.name}`);
    lines.push("");
    if (result.registryErrors.length > 0) {
      lines.push("Registry errors:");
      lines.push("");
      for (const error of result.registryErrors) {
        lines.push(`- ${error}`);
      }
      lines.push("");
    }

    lines.push("| Metric | Direction | Baseline | Current | Sample | Delta % | Breach % | Status | Action | Note |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const check of result.guardrails) {
      lines.push(
        `| ${check.metric} | ${check.direction} | ${check.baselineValue} | ${check.currentValue} | ${check.sampleSize} | ${check.deltaPercent} | ${check.breachPercent} | ${check.status} | ${check.action} | ${check.note.replace(/\|/g, "\\|")} |`,
      );
    }
    lines.push("");
  }

  await writeFile(reportMdPath, `${lines.join("\n")}\n`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const registry = buildDefaultExperimentRegistry();
  const validation = validateExperimentRegistry(registry);
  const validationByExperimentId = new Map(
    validation.map((item) => [item.experimentId, item]),
  );

  const experimentResults: ExperimentResult[] = [];
  for (const experiment of registry) {
    const observations = buildSampleObservations(experiment);
    const evaluation = evaluateExperimentGuardrails(experiment, observations);
    const experimentValidation = validationByExperimentId.get(experiment.experimentId);

    experimentResults.push({
      experimentId: experiment.experimentId,
      name: experiment.name,
      owner: experiment.owner,
      registryValid: experimentValidation?.ok ?? false,
      registryErrors: experimentValidation?.errors ?? ["Missing registry validation result."],
      guardrailStatus: evaluation.status,
      guardrails: evaluation.checks,
    });
  }

  const failed = experimentResults.filter((result) =>
    !result.registryValid || result.guardrailStatus === "fail"
  ).length;
  const warnings = experimentResults.filter((result) =>
    result.registryValid && result.guardrailStatus === "warn"
  ).length;
  const passed = experimentResults.length - failed - warnings;
  const invalidDefinitions = experimentResults.filter((result) => !result.registryValid).length;

  const report: GrowthExperimentOsReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: failed > 0 ? "failed" : warnings > 0 ? "passed_with_warnings" : "passed",
    reportVersion: "v1",
    totals: {
      experiments: experimentResults.length,
      passed,
      warnings,
      failed,
      invalidDefinitions,
    },
    experimentResults,
  };

  await writeReport(report, registry);
  if (report.status === "failed") {
    console.error(`Growth experiment OS smoke failed: ${failed} experiment(s) failed.`);
    process.exitCode = 1;
    return;
  }
  if (report.status === "passed_with_warnings") {
    console.log(`Growth experiment OS smoke passed with warnings: ${warnings} experiment(s) warned.`);
    return;
  }
  console.log("Growth experiment OS smoke passed.");
}

main().catch((error) => {
  console.error(
    `Growth experiment OS smoke crashed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
