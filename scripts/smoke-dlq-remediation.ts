import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  type DeadLetterAction,
  resolveDeadLetterDecision,
} from "../src/queues/dlq-remediation";
import { getKnownAnalyticsEventTypes } from "../src/shared/analytics-taxonomy";
import type { QueueWorkflowName } from "../src/queues/orchestration-policy";

type CheckStatus = "pass" | "fail";
type ReportStatus = "passed" | "failed";

interface DlqQueuePolicy {
  id: string;
  queue: QueueWorkflowName;
  maxAutoRequeues: number;
  allowedActions: DeadLetterAction[];
  sourcePaths: string[];
  requiredSnippets: string[];
  metricTargets: {
    autoRemediationRateMinPercent: number;
    manualReviewRateMaxPercent: number;
  };
}

interface DlqSimulationCase {
  id: string;
  queue: QueueWorkflowName;
  retryable: boolean;
  reason: string;
  payload: unknown;
  expectedAction: DeadLetterAction;
  expectedAutoRemediate: boolean;
}

interface DlqPolicyFile {
  version: "v1";
  owner: string;
  reviewCadenceDays: number;
  lastReviewedOn: string;
  nextReviewBy: string;
  requiredEventTypes: string[];
  queues: DlqQueuePolicy[];
  simulationCases: DlqSimulationCase[];
}

interface DlqCheck {
  id: string;
  status: CheckStatus;
  note: string;
}

interface SimulationResult {
  id: string;
  queue: QueueWorkflowName;
  expectedAction: DeadLetterAction;
  actualAction: DeadLetterAction;
  expectedAutoRemediate: boolean;
  actualAutoRemediate: boolean;
  status: CheckStatus;
}

interface QueueMetrics {
  queue: QueueWorkflowName;
  totalCases: number;
  autoRemediationCases: number;
  manualReviewCases: number;
  autoRemediationRatePercent: number;
  manualReviewRatePercent: number;
}

interface DlqRemediationReport {
  startedAt: string;
  finishedAt: string;
  status: ReportStatus;
  reportVersion: "v1";
  policyPath: string;
  checks: DlqCheck[];
  simulationResults: SimulationResult[];
  queueMetrics: QueueMetrics[];
  metrics: {
    totalChecks: number;
    failedChecks: number;
    queueCount: number;
    simulationCount: number;
    simulationPassing: number;
  };
}

const REQUIRED_QUEUES: QueueWorkflowName[] = [
  "ai-generation",
  "order-fulfillment",
  "notifications",
];

function runCheck(id: string, condition: boolean, note: string): DlqCheck {
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

async function loadPolicy(path: string): Promise<DlqPolicyFile> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as Partial<DlqPolicyFile>;

  if (parsed.version !== "v1") {
    throw new Error("DLQ auto-remediation policy version must be v1.");
  }
  if (!Array.isArray(parsed.queues) || !Array.isArray(parsed.simulationCases)) {
    throw new Error("DLQ policy must define queues and simulationCases arrays.");
  }

  return parsed as DlqPolicyFile;
}

async function evaluateChecks(policyPath: string): Promise<{
  checks: DlqCheck[];
  simulationResults: SimulationResult[];
  queueMetrics: QueueMetrics[];
}> {
  const policy = await loadPolicy(policyPath);
  const checks: DlqCheck[] = [];

  checks.push(
    runCheck(
      "policy-owner-present",
      policy.owner.trim().length > 0,
      "Policy owner must be defined.",
    ),
  );
  checks.push(
    runCheck(
      "queues-present",
      policy.queues.length > 0,
      "Policy must define at least one queue policy.",
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
      "required-queue-coverage",
      includesAll(policy.queues.map((entry) => entry.queue), REQUIRED_QUEUES),
      `Policy must cover required queues: ${REQUIRED_QUEUES.join(", ")}`,
    ),
  );

  const knownEventTypes = getKnownAnalyticsEventTypes();
  checks.push(
    runCheck(
      "required-event-types-covered",
      includesAll(knownEventTypes, policy.requiredEventTypes),
      "Required DLQ event types must exist in analytics taxonomy.",
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
        "DLQ policy review date must not be overdue.",
      ),
    );
  }

  const sourceCache = new Map<string, string>();
  async function getSource(path: string): Promise<string> {
    if (sourceCache.has(path)) return sourceCache.get(path) ?? "";
    const source = await readFile(path, "utf8");
    sourceCache.set(path, source);
    return source;
  }

  const queueByName = new Map<QueueWorkflowName, DlqQueuePolicy>();
  for (const queuePolicy of policy.queues) {
    queueByName.set(queuePolicy.queue, queuePolicy);
    const prefix = `queue-${queuePolicy.queue}`;

    checks.push(
      runCheck(
        `${prefix}-allowed-actions-present`,
        Array.isArray(queuePolicy.allowedActions) && queuePolicy.allowedActions.length > 0,
        "Queue policy must declare allowedActions.",
      ),
    );
    checks.push(
      runCheck(
        `${prefix}-source-paths-present`,
        Array.isArray(queuePolicy.sourcePaths) && queuePolicy.sourcePaths.length > 0,
        "Queue policy must declare sourcePaths.",
      ),
    );
    checks.push(
      runCheck(
        `${prefix}-required-snippets-present`,
        Array.isArray(queuePolicy.requiredSnippets) && queuePolicy.requiredSnippets.length > 0,
        "Queue policy must declare requiredSnippets.",
      ),
    );
    checks.push(
      runCheck(
        `${prefix}-max-auto-requeues-valid`,
        Number.isFinite(queuePolicy.maxAutoRequeues) && queuePolicy.maxAutoRequeues >= 0,
        "Queue maxAutoRequeues must be non-negative.",
      ),
    );
    checks.push(
      runCheck(
        `${prefix}-metric-targets-valid`,
        Number.isFinite(queuePolicy.metricTargets.autoRemediationRateMinPercent) &&
          Number.isFinite(queuePolicy.metricTargets.manualReviewRateMaxPercent),
        "Queue metricTargets must be numeric.",
      ),
    );

    for (const [index, path] of queuePolicy.sourcePaths.entries()) {
      const exists = await pathExists(path);
      checks.push(
        runCheck(
          `${prefix}-source-${index + 1}`,
          exists,
          `Source path must exist: ${path}`,
        ),
      );
    }

    const aggregatedSource = (
      await Promise.all(
        queuePolicy.sourcePaths.map(async (path) => ((await pathExists(path)) ? getSource(path) : "")),
      )
    ).join("\n\n");

    for (const [index, snippet] of queuePolicy.requiredSnippets.entries()) {
      checks.push(
        runCheck(
          `${prefix}-snippet-${index + 1}`,
          aggregatedSource.includes(snippet),
          `Required snippet must be present for queue ${queuePolicy.queue}: ${snippet}`,
        ),
      );
    }
  }

  const simulationResults: SimulationResult[] = [];
  for (const simulation of policy.simulationCases) {
    const queuePolicy = queueByName.get(simulation.queue);
    if (!queuePolicy) {
      simulationResults.push({
        id: simulation.id,
        queue: simulation.queue,
        expectedAction: simulation.expectedAction,
        actualAction: "manual_review",
        expectedAutoRemediate: simulation.expectedAutoRemediate,
        actualAutoRemediate: false,
        status: "fail",
      });
      checks.push(
        runCheck(
          `simulation-${simulation.id}-queue-policy-present`,
          false,
          `Simulation queue policy missing for ${simulation.queue}`,
        ),
      );
      continue;
    }

    const decision = resolveDeadLetterDecision({
      queue: simulation.queue,
      payload: simulation.payload,
      retryable: simulation.retryable,
      reason: simulation.reason,
      maxAutoRequeues: queuePolicy.maxAutoRequeues,
    });

    const actionMatches = decision.action === simulation.expectedAction;
    const autoMatches = decision.autoRemediate === simulation.expectedAutoRemediate;

    checks.push(
      runCheck(
        `simulation-${simulation.id}-action`,
        actionMatches,
        `Expected action ${simulation.expectedAction}, got ${decision.action}`,
      ),
    );
    checks.push(
      runCheck(
        `simulation-${simulation.id}-auto-remediate`,
        autoMatches,
        `Expected autoRemediate=${simulation.expectedAutoRemediate}, got ${decision.autoRemediate}`,
      ),
    );

    simulationResults.push({
      id: simulation.id,
      queue: simulation.queue,
      expectedAction: simulation.expectedAction,
      actualAction: decision.action,
      expectedAutoRemediate: simulation.expectedAutoRemediate,
      actualAutoRemediate: decision.autoRemediate,
      status: actionMatches && autoMatches ? "pass" : "fail",
    });
  }

  const queueMetrics: QueueMetrics[] = REQUIRED_QUEUES.map((queue) => {
    const queueCases = simulationResults.filter((result) => result.queue === queue);
    const totalCases = queueCases.length;
    const autoRemediationCases = queueCases.filter((result) => result.actualAutoRemediate).length;
    const manualReviewCases = queueCases.filter((result) => result.actualAction === "manual_review").length;

    const autoRemediationRatePercent =
      totalCases > 0 ? Math.round((autoRemediationCases / totalCases) * 100) : 0;
    const manualReviewRatePercent =
      totalCases > 0 ? Math.round((manualReviewCases / totalCases) * 100) : 0;

    return {
      queue,
      totalCases,
      autoRemediationCases,
      manualReviewCases,
      autoRemediationRatePercent,
      manualReviewRatePercent,
    };
  });

  for (const metric of queueMetrics) {
    const queuePolicy = queueByName.get(metric.queue);
    if (!queuePolicy) continue;

    checks.push(
      runCheck(
        `metrics-${metric.queue}-auto-rate-min`,
        metric.autoRemediationRatePercent >= queuePolicy.metricTargets.autoRemediationRateMinPercent,
        `Auto-remediation rate ${metric.autoRemediationRatePercent}% must be >= ${queuePolicy.metricTargets.autoRemediationRateMinPercent}%`,
      ),
    );

    checks.push(
      runCheck(
        `metrics-${metric.queue}-manual-rate-max`,
        metric.manualReviewRatePercent <= queuePolicy.metricTargets.manualReviewRateMaxPercent,
        `Manual-review rate ${metric.manualReviewRatePercent}% must be <= ${queuePolicy.metricTargets.manualReviewRateMaxPercent}%`,
      ),
    );
  }

  checks.push(
    runCheck(
      "runbook-exists",
      await pathExists("docs/runbooks/dlq-auto-remediation-playbook.md"),
      "Runbook must exist: docs/runbooks/dlq-auto-remediation-playbook.md",
    ),
  );
  checks.push(
    runCheck(
      "policy-md-exists",
      await pathExists("docs/policies/dlq-auto-remediation-v1.md"),
      "Policy markdown must exist: docs/policies/dlq-auto-remediation-v1.md",
    ),
  );

  return {
    checks,
    simulationResults,
    queueMetrics,
  };
}

async function writeReport(report: DlqRemediationReport) {
  const jsonPath = process.env.SMOKE_DLQ_REMEDIATION_JSON_PATH ?? "output/smoke/dlq-remediation-report.json";
  const mdPath = process.env.SMOKE_DLQ_REMEDIATION_MD_PATH ?? "output/smoke/dlq-remediation-report.md";

  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(mdPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# DLQ Auto-Remediation Smoke Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Policy path: ${report.policyPath}`,
    `- Queue count: ${report.metrics.queueCount}`,
    `- Simulation cases: ${report.metrics.simulationCount}`,
    `- Simulation passing: ${report.metrics.simulationPassing}`,
    `- Total checks: ${report.metrics.totalChecks}`,
    `- Failed checks: ${report.metrics.failedChecks}`,
    "",
    "## Queue Metrics",
    "",
    "| Queue | Cases | Auto | Manual | Auto Rate | Manual Rate |",
    "| --- | --- | --- | --- | --- | --- |",
    ...report.queueMetrics.map(
      (metric) => `| ${metric.queue} | ${metric.totalCases} | ${metric.autoRemediationCases} | ${metric.manualReviewCases} | ${metric.autoRemediationRatePercent}% | ${metric.manualReviewRatePercent}% |`,
    ),
    "",
    "## Simulation Results",
    "",
    "| Case | Queue | Expected Action | Actual Action | Expected Auto | Actual Auto | Status |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...report.simulationResults.map(
      (result) => `| ${result.id} | ${result.queue} | ${result.expectedAction} | ${result.actualAction} | ${result.expectedAutoRemediate} | ${result.actualAutoRemediate} | ${result.status} |`,
    ),
    "",
    "## Checks",
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
  const policyPath = process.env.SMOKE_DLQ_POLICY_PATH ?? "docs/policies/dlq-auto-remediation-v1.json";

  const { checks, simulationResults, queueMetrics } = await evaluateChecks(policyPath);
  const failedChecks = checks.filter((check) => check.status === "fail").length;
  const simulationPassing = simulationResults.filter((result) => result.status === "pass").length;

  const report: DlqRemediationReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: failedChecks > 0 ? "failed" : "passed",
    reportVersion: "v1",
    policyPath,
    checks,
    simulationResults,
    queueMetrics,
    metrics: {
      totalChecks: checks.length,
      failedChecks,
      queueCount: queueMetrics.length,
      simulationCount: simulationResults.length,
      simulationPassing,
    },
  };

  await writeReport(report);

  if (report.status === "failed") {
    console.error(`DLQ auto-remediation smoke failed: ${failedChecks} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log("DLQ auto-remediation smoke passed.");
}

main().catch((error) => {
  console.error(
    `DLQ auto-remediation smoke crashed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
