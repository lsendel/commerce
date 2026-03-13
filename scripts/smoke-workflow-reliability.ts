import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  QUEUE_WORKFLOW_POLICIES,
  computeRetryBackoffMs,
  isRetryableWorkflowError,
  resolveQueueMessageAttempt,
} from "../src/queues/orchestration-policy";

type CheckStatus = "pass" | "fail";
type ReportStatus = "passed" | "failed";
type WorkflowKind = "queue_consumer" | "orchestration_runtime" | "orchestration_api";

type QueueRef = "ai-generation" | "order-fulfillment" | "notifications" | "all";

interface WorkflowScorecardEntry {
  id: string;
  label: string;
  kind: WorkflowKind;
  queue: QueueRef;
  sourcePaths: string[];
  timeoutMs: number;
  maxAttempts: number;
  compensationPlan: string;
  retrySignals: string[];
  requiredSnippets: string[];
  sloTargets: {
    successRatePercent: number;
    errorBudgetPercent: number;
    p95LatencyMs: number;
  };
}

interface ScorecardDimension {
  id: string;
  description: string;
}

interface WorkflowReliabilityPolicy {
  version: "v1";
  owner: string;
  reviewCadenceDays: number;
  lastReviewedOn: string;
  nextReviewBy: string;
  workflows: WorkflowScorecardEntry[];
  scorecardDimensions: ScorecardDimension[];
}

interface ReliabilityCheck {
  id: string;
  status: CheckStatus;
  note: string;
}

interface WorkflowStatus {
  workflowId: string;
  label: string;
  status: CheckStatus;
  checkCount: number;
  failedChecks: number;
}

interface WorkflowReliabilityReport {
  startedAt: string;
  finishedAt: string;
  status: ReportStatus;
  reportVersion: "v1";
  policyPath: string;
  checks: ReliabilityCheck[];
  workflows: WorkflowStatus[];
  scorecard: {
    reliabilityScorePercent: number;
    dimensionsCovered: number;
  };
  metrics: {
    totalChecks: number;
    failedChecks: number;
    workflowCount: number;
    workflowsPassing: number;
  };
}

const REQUIRED_WORKFLOW_IDS = [
  "ai-generation-consumer",
  "order-fulfillment-consumer",
  "notifications-consumer",
  "queue-handler-fallback",
  "workflow-builder-dispatch",
];

const REQUIRED_DIMENSIONS = [
  "timeout-coverage",
  "retry-budget-enforcement",
  "compensation-path-coverage",
  "enqueue-dedup-guardrails",
];

function runCheck(id: string, condition: boolean, note: string): ReliabilityCheck {
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

async function loadPolicy(path: string): Promise<WorkflowReliabilityPolicy> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as Partial<WorkflowReliabilityPolicy>;

  if (parsed.version !== "v1") {
    throw new Error("Workflow reliability scorecard version must be v1.");
  }
  if (!Array.isArray(parsed.workflows) || !Array.isArray(parsed.scorecardDimensions)) {
    throw new Error("Workflow reliability scorecard must define workflows and scorecardDimensions arrays.");
  }

  return parsed as WorkflowReliabilityPolicy;
}

function toQueuePolicyName(queue: QueueRef): keyof typeof QUEUE_WORKFLOW_POLICIES | null {
  if (queue === "all") return null;
  return queue;
}

async function evaluateChecks(policyPath: string): Promise<{
  checks: ReliabilityCheck[];
  workflows: WorkflowStatus[];
  dimensionsCovered: number;
}> {
  const policy = await loadPolicy(policyPath);
  const checks: ReliabilityCheck[] = [];

  checks.push(
    runCheck(
      "policy-owner-present",
      policy.owner.trim().length > 0,
      "Policy owner must be defined.",
    ),
  );
  checks.push(
    runCheck(
      "workflows-present",
      policy.workflows.length > 0,
      "Policy must define at least one workflow scorecard entry.",
    ),
  );
  checks.push(
    runCheck(
      "dimensions-present",
      policy.scorecardDimensions.length > 0,
      "Policy must define scorecard dimensions.",
    ),
  );
  checks.push(
    runCheck(
      "workflow-id-coverage",
      includesAll(policy.workflows.map((entry) => entry.id), REQUIRED_WORKFLOW_IDS),
      `Policy workflows must include required IDs: ${REQUIRED_WORKFLOW_IDS.join(", ")}`,
    ),
  );
  checks.push(
    runCheck(
      "dimension-id-coverage",
      includesAll(policy.scorecardDimensions.map((dimension) => dimension.id), REQUIRED_DIMENSIONS),
      `Policy dimensions must include required IDs: ${REQUIRED_DIMENSIONS.join(", ")}`,
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
        "Workflow reliability policy review date must not be overdue.",
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

  const workflowStatuses: WorkflowStatus[] = [];

  for (const workflow of policy.workflows) {
    const prefix = `wf-${workflow.id}`;
    const workflowChecks: ReliabilityCheck[] = [];

    workflowChecks.push(
      runCheck(
        `${prefix}-label-present`,
        workflow.label.trim().length > 0,
        "Workflow label must be non-empty.",
      ),
    );

    workflowChecks.push(
      runCheck(
        `${prefix}-source-paths-present`,
        Array.isArray(workflow.sourcePaths) && workflow.sourcePaths.length > 0,
        "Workflow sourcePaths must include at least one path.",
      ),
    );

    workflowChecks.push(
      runCheck(
        `${prefix}-required-snippets-present`,
        Array.isArray(workflow.requiredSnippets) && workflow.requiredSnippets.length > 0,
        "Workflow requiredSnippets must include at least one snippet.",
      ),
    );

    workflowChecks.push(
      runCheck(
        `${prefix}-retry-signals-present`,
        Array.isArray(workflow.retrySignals) && workflow.retrySignals.length > 0,
        "Workflow retrySignals must include at least one signal.",
      ),
    );

    workflowChecks.push(
      runCheck(
        `${prefix}-compensation-present`,
        workflow.compensationPlan.trim().length > 0,
        "Workflow compensationPlan must be non-empty.",
      ),
    );

    if (workflow.kind === "queue_consumer") {
      workflowChecks.push(
        runCheck(
          `${prefix}-timeout-valid`,
          Number.isFinite(workflow.timeoutMs) && workflow.timeoutMs > 0,
          `Queue consumer timeoutMs must be positive: ${workflow.timeoutMs}`,
        ),
      );
      workflowChecks.push(
        runCheck(
          `${prefix}-max-attempts-valid`,
          Number.isFinite(workflow.maxAttempts) && workflow.maxAttempts > 0,
          `Queue consumer maxAttempts must be positive: ${workflow.maxAttempts}`,
        ),
      );

      const queuePolicyName = toQueuePolicyName(workflow.queue);
      if (queuePolicyName) {
        const queuePolicy = QUEUE_WORKFLOW_POLICIES[queuePolicyName];
        workflowChecks.push(
          runCheck(
            `${prefix}-runtime-timeout-aligned`,
            queuePolicy.timeoutMs === workflow.timeoutMs,
            `Policy timeoutMs must align with runtime queue policy for ${workflow.queue}.`,
          ),
        );
        workflowChecks.push(
          runCheck(
            `${prefix}-runtime-attempts-aligned`,
            queuePolicy.maxAttempts === workflow.maxAttempts,
            `Policy maxAttempts must align with runtime queue policy for ${workflow.queue}.`,
          ),
        );
      }
    }

    workflowChecks.push(
      runCheck(
        `${prefix}-slo-success-rate-valid`,
        Number.isFinite(workflow.sloTargets.successRatePercent) &&
          workflow.sloTargets.successRatePercent > 0 &&
          workflow.sloTargets.successRatePercent <= 100,
        "sloTargets.successRatePercent must be in range (0, 100].",
      ),
    );
    workflowChecks.push(
      runCheck(
        `${prefix}-slo-error-budget-valid`,
        Number.isFinite(workflow.sloTargets.errorBudgetPercent) &&
          workflow.sloTargets.errorBudgetPercent >= 0 &&
          workflow.sloTargets.errorBudgetPercent <= 100,
        "sloTargets.errorBudgetPercent must be in range [0, 100].",
      ),
    );

    for (const [index, path] of workflow.sourcePaths.entries()) {
      const exists = await pathExists(path);
      workflowChecks.push(
        runCheck(
          `${prefix}-source-${index + 1}`,
          exists,
          `Source path must exist: ${path}`,
        ),
      );
    }

    const sources: string[] = [];
    for (const path of workflow.sourcePaths) {
      if (await pathExists(path)) {
        sources.push(await getSource(path));
      }
    }
    const aggregateSource = sources.join("\n\n");

    for (const [index, snippet] of workflow.requiredSnippets.entries()) {
      workflowChecks.push(
        runCheck(
          `${prefix}-snippet-${index + 1}`,
          aggregateSource.includes(snippet),
          `Required snippet must be present for ${workflow.id}: ${snippet}`,
        ),
      );
    }

    checks.push(...workflowChecks);
    const failedChecks = workflowChecks.filter((check) => check.status === "fail").length;
    workflowStatuses.push({
      workflowId: workflow.id,
      label: workflow.label,
      status: failedChecks > 0 ? "fail" : "pass",
      checkCount: workflowChecks.length,
      failedChecks,
    });
  }

  // Runtime helper behavior checks for retry/orchestration semantics.
  checks.push(
    runCheck(
      "helper-attempt-default",
      resolveQueueMessageAttempt({} as Message) === 1,
      "resolveQueueMessageAttempt defaults to 1.",
    ),
  );
  checks.push(
    runCheck(
      "helper-attempt-explicit",
      resolveQueueMessageAttempt({ attempts: 3 } as unknown as Message) === 3,
      "resolveQueueMessageAttempt honors attempts metadata.",
    ),
  );
  checks.push(
    runCheck(
      "helper-retryable-timeout",
      isRetryableWorkflowError(new Error("request timeout from provider")),
      "Timeout errors are retryable.",
    ),
  );
  checks.push(
    runCheck(
      "helper-retryable-5xx",
      isRetryableWorkflowError({ status: 503 }),
      "503 errors are retryable.",
    ),
  );
  checks.push(
    runCheck(
      "helper-non-retryable-4xx",
      !isRetryableWorkflowError({ status: 422 }),
      "422 errors are non-retryable.",
    ),
  );

  const notifPolicy = QUEUE_WORKFLOW_POLICIES.notifications;
  const backoff1 = computeRetryBackoffMs(notifPolicy, 1);
  const backoff2 = computeRetryBackoffMs(notifPolicy, 2);
  checks.push(
    runCheck(
      "helper-backoff-positive",
      backoff1 > 0 && backoff2 > 0,
      "Retry backoff must be positive.",
    ),
  );
  checks.push(
    runCheck(
      "helper-backoff-growth",
      backoff2 >= Math.floor(backoff1 * 0.75),
      "Retry backoff should generally increase with attempt number.",
    ),
  );

  checks.push(
    runCheck(
      "runbook-exists",
      await pathExists("docs/runbooks/async-workflow-orchestration.md"),
      "Runbook must exist: docs/runbooks/async-workflow-orchestration.md",
    ),
  );
  checks.push(
    runCheck(
      "policy-md-exists",
      await pathExists("docs/policies/workflow-reliability-scorecard-v1.md"),
      "Policy markdown must exist: docs/policies/workflow-reliability-scorecard-v1.md",
    ),
  );

  return {
    checks,
    workflows: workflowStatuses,
    dimensionsCovered: policy.scorecardDimensions.length,
  };
}

async function writeReport(report: WorkflowReliabilityReport) {
  const jsonPath =
    process.env.SMOKE_WORKFLOW_RELIABILITY_JSON_PATH ??
    "output/smoke/workflow-reliability-report.json";
  const mdPath =
    process.env.SMOKE_WORKFLOW_RELIABILITY_MD_PATH ??
    "output/smoke/workflow-reliability-report.md";

  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(mdPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# Workflow Reliability Smoke Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Policy path: ${report.policyPath}`,
    `- Reliability score: ${report.scorecard.reliabilityScorePercent}%`,
    `- Dimensions covered: ${report.scorecard.dimensionsCovered}`,
    `- Workflow count: ${report.metrics.workflowCount}`,
    `- Workflows passing: ${report.metrics.workflowsPassing}`,
    `- Total checks: ${report.metrics.totalChecks}`,
    `- Failed checks: ${report.metrics.failedChecks}`,
    "",
    "## Workflow Status",
    "",
    "| Workflow | Status | Checks | Failed |",
    "| --- | --- | --- | --- |",
    ...report.workflows.map(
      (workflow) =>
        `| ${workflow.workflowId} | ${workflow.status} | ${workflow.checkCount} | ${workflow.failedChecks} |`,
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
    process.env.SMOKE_WORKFLOW_RELIABILITY_POLICY_PATH ??
    "docs/policies/workflow-reliability-scorecard-v1.json";

  const { checks, workflows, dimensionsCovered } = await evaluateChecks(policyPath);
  const failedChecks = checks.filter((check) => check.status === "fail").length;
  const workflowsPassing = workflows.filter((workflow) => workflow.status === "pass").length;
  const reliabilityScorePercent = checks.length > 0
    ? Math.round(((checks.length - failedChecks) / checks.length) * 100)
    : 0;

  const report: WorkflowReliabilityReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: failedChecks > 0 ? "failed" : "passed",
    reportVersion: "v1",
    policyPath,
    checks,
    workflows,
    scorecard: {
      reliabilityScorePercent,
      dimensionsCovered,
    },
    metrics: {
      totalChecks: checks.length,
      failedChecks,
      workflowCount: workflows.length,
      workflowsPassing,
    },
  };

  await writeReport(report);

  if (report.status === "failed") {
    console.error(`Workflow reliability smoke failed: ${failedChecks} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log("Workflow reliability smoke passed.");
}

main().catch((error) => {
  console.error(
    `Workflow reliability smoke crashed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
