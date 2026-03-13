import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { buildFulfillmentSlaDashboard } from "../src/application/fulfillment/fulfillment-sla-prediction.usecase";

type CheckStatus = "pass" | "fail";
type ReportStatus = "passed" | "failed";

interface SlaCheck {
  id: string;
  status: CheckStatus;
  note: string;
}

interface FulfillmentSlaSmokeReport {
  startedAt: string;
  finishedAt: string;
  status: ReportStatus;
  reportVersion: "v1";
  checks: SlaCheck[];
  metrics: {
    totalChecks: number;
    failedChecks: number;
  };
}

function runCheck(id: string, condition: boolean, note: string): SlaCheck {
  return {
    id,
    status: condition ? "pass" : "fail",
    note,
  };
}

function evaluateChecks(): SlaCheck[] {
  const now = new Date("2027-02-10T10:00:00.000Z");
  const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000);
  const hoursAgo = (hours: number) => minutesAgo(hours * 60);

  const dashboard = buildFulfillmentSlaDashboard({
    now,
    limit: 20,
    fulfillmentRows: [
      {
        id: "f-1",
        orderId: "o-1",
        provider: "printful",
        status: "failed",
        externalId: null,
        errorMessage: "timeout while contacting provider",
        createdAt: hoursAgo(6),
        updatedAt: hoursAgo(5),
      },
      {
        id: "f-2",
        orderId: "o-2",
        provider: "prodigi",
        status: "processing",
        externalId: "ext-2",
        errorMessage: null,
        createdAt: hoursAgo(30),
        updatedAt: hoursAgo(20),
      },
      {
        id: "f-3",
        orderId: "o-3",
        provider: "gooten",
        status: "submitted",
        externalId: null,
        errorMessage: null,
        createdAt: hoursAgo(4),
        updatedAt: hoursAgo(3),
      },
      {
        id: "f-4",
        orderId: "o-4",
        provider: "printful",
        status: "pending",
        externalId: null,
        errorMessage: null,
        createdAt: minutesAgo(15),
        updatedAt: minutesAgo(10),
      },
    ],
    returnRows: [
      {
        id: "r-1",
        orderId: "o-r1",
        type: "refund",
        status: "submitted",
        reason: "size mismatch",
        instantExchange: false,
        createdAt: hoursAgo(70),
        updatedAt: hoursAgo(50),
      },
      {
        id: "r-2",
        orderId: "o-r2",
        type: "exchange",
        status: "approved",
        reason: "color mismatch",
        instantExchange: true,
        createdAt: hoursAgo(60),
        updatedAt: hoursAgo(35),
      },
    ],
  });

  const failedRetry = dashboard.items.find((item) => item.entityId === "f-1");
  const submittedNoExt = dashboard.items.find((item) => item.entityId === "f-3");
  const returnSubmitted = dashboard.items.find((item) => item.entityId === "r-1");
  const returnApproved = dashboard.items.find((item) => item.entityId === "r-2");

  return [
    runCheck(
      "failed-transient-auto-retry",
      failedRetry?.recommendedAction === "retry"
        && failedRetry?.autoActionEligible === true
        && failedRetry?.riskLevel === "high",
      "Failed transient fulfillment requests are auto-retry high risk.",
    ),
    runCheck(
      "submitted-missing-external-id",
      submittedNoExt?.recommendedAction === "retry"
        && submittedNoExt?.autoActionEligible === true
        && (submittedNoExt?.reasons ?? []).includes("missing_external_provider_reference"),
      "Submitted requests without provider external id are intervention candidates.",
    ),
    runCheck(
      "return-submitted-review-action",
      returnSubmitted?.recommendedAction === "prioritize_return_review"
        && returnSubmitted?.domain === "return_request",
      "Aged submitted returns are classified for prioritized review.",
    ),
    runCheck(
      "return-approved-completion-action",
      returnApproved?.recommendedAction === "prioritize_return_completion",
      "Aged approved returns are classified for prioritized completion.",
    ),
    runCheck(
      "summary-at-risk-coverage",
      dashboard.totals.atRiskCount >= 3
        && dashboard.totals.projectedBreaches24h >= 3
        && dashboard.totals.autoActionEligibleCount >= 2,
      "Dashboard summary reflects at-risk load and auto-action eligibility.",
    ),
  ];
}

async function writeReport(report: FulfillmentSlaSmokeReport) {
  const reportJsonPath =
    process.env.SMOKE_FULFILLMENT_SLA_JSON_PATH ??
    "output/smoke/fulfillment-sla-report.json";
  const reportMdPath =
    process.env.SMOKE_FULFILLMENT_SLA_MD_PATH ??
    "output/smoke/fulfillment-sla-report.md";

  await mkdir(dirname(reportJsonPath), { recursive: true });
  await mkdir(dirname(reportMdPath), { recursive: true });
  await writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# Fulfillment SLA Smoke Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Total checks: ${report.metrics.totalChecks}`,
    `- Failed checks: ${report.metrics.failedChecks}`,
    "",
    "| Check | Status | Note |",
    "| --- | --- | --- |",
    ...report.checks.map((check) => `| ${check.id} | ${check.status} | ${check.note.replace(/\|/g, "\\|")} |`),
    "",
  ];

  await writeFile(reportMdPath, `${lines.join("\n")}\n`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const checks = evaluateChecks();
  const failedChecks = checks.filter((check) => check.status === "fail").length;
  const report: FulfillmentSlaSmokeReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: failedChecks > 0 ? "failed" : "passed",
    reportVersion: "v1",
    checks,
    metrics: {
      totalChecks: checks.length,
      failedChecks,
    },
  };

  await writeReport(report);
  if (report.status === "failed") {
    console.error(`Fulfillment SLA smoke failed: ${failedChecks} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log("Fulfillment SLA smoke passed.");
}

main().catch((error) => {
  console.error(
    `Fulfillment SLA smoke crashed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
