import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  getRecommendationRankingModelVersion,
  rankUpsellCandidates,
  type RecommendationCandidate,
} from "../src/infrastructure/marketing/recommendation-ranking";

type CheckStatus = "pass" | "fail";
type ReportStatus = "passed" | "failed";

interface QualityCheck {
  id: string;
  status: CheckStatus;
  note: string;
}

interface RecommendationQualityReport {
  startedAt: string;
  finishedAt: string;
  status: ReportStatus;
  reportVersion: "v1";
  modelVersion: string;
  checks: QualityCheck[];
  metrics: {
    totalChecks: number;
    failedChecks: number;
    fallbackCoverageChecks: number;
  };
}

function runCheck(id: string, condition: boolean, note: string): QualityCheck {
  return {
    id,
    status: condition ? "pass" : "fail",
    note,
  };
}

function evaluateQualityChecks(): QualityCheck[] {
  const checks: QualityCheck[] = [];

  const mixedCandidates: RecommendationCandidate[] = [
    {
      productId: "related-1",
      source: "related",
      price: 28,
      compareAtPrice: 35,
      inventoryQuantity: 20,
      sharedCollectionCount: 2,
      reasons: ["co_purchase_signal"],
    },
    {
      productId: "catalog-1",
      source: "catalog",
      price: 29,
      inventoryQuantity: 18,
      reasons: ["catalog_fallback"],
    },
  ];
  const mixedRanked = rankUpsellCandidates(mixedCandidates, {
    cartAveragePrice: 30,
    limit: 3,
  });
  checks.push(
    runCheck(
      "related-priority",
      mixedRanked[0]?.productId === "related-1",
      "Related signal should outrank plain catalog fallback when price fit is similar.",
    ),
  );
  checks.push(
    runCheck(
      "reason-co-purchase",
      mixedRanked[0]?.reasons.includes("co_purchase_signal") ?? false,
      "Top recommendation should preserve co_purchase_signal reason.",
    ),
  );

  const lowStockCandidates: RecommendationCandidate[] = [
    {
      productId: "in-stock",
      source: "related",
      price: 30,
      inventoryQuantity: 14,
      reasons: ["co_purchase_signal"],
    },
    {
      productId: "out-of-stock",
      source: "related",
      price: 30,
      inventoryQuantity: 0,
      reasons: ["co_purchase_signal"],
    },
  ];
  const lowStockRanked = rankUpsellCandidates(lowStockCandidates, {
    cartAveragePrice: 30,
    limit: 2,
  });
  checks.push(
    runCheck(
      "inventory-penalty",
      lowStockRanked[0]?.productId === "in-stock",
      "In-stock candidate should outrank low-stock risk candidate.",
    ),
  );

  const priceFitCandidates: RecommendationCandidate[] = [
    {
      productId: "price-fit",
      source: "catalog",
      price: 32,
      inventoryQuantity: 8,
      reasons: ["catalog_fallback"],
    },
    {
      productId: "too-expensive",
      source: "catalog",
      price: 90,
      inventoryQuantity: 8,
      reasons: ["catalog_fallback"],
    },
  ];
  const priceFitRanked = rankUpsellCandidates(priceFitCandidates, {
    cartAveragePrice: 35,
    limit: 2,
  });
  checks.push(
    runCheck(
      "price-fit-priority",
      priceFitRanked[0]?.productId === "price-fit",
      "Price-fit candidate should outrank extreme price outlier candidate.",
    ),
  );

  const fallbackCandidates: RecommendationCandidate[] = [
    {
      productId: "fallback-only",
      source: "catalog",
      price: 26,
      inventoryQuantity: 7,
      reasons: ["catalog_fallback"],
    },
  ];
  const fallbackRanked = rankUpsellCandidates(fallbackCandidates, {
    cartAveragePrice: 25,
    limit: 1,
  });
  checks.push(
    runCheck(
      "fallback-reason",
      fallbackRanked[0]?.reasons.includes("catalog_fallback") ?? false,
      "Fallback candidate must include catalog_fallback reason.",
    ),
  );

  checks.push(
    runCheck(
      "model-version-tag",
      fallbackRanked[0]?.reasons.includes(getRecommendationRankingModelVersion()) ?? false,
      "Ranked output must include model version reason tag for traceability.",
    ),
  );

  return checks;
}

async function writeReport(report: RecommendationQualityReport) {
  const reportJsonPath =
    process.env.SMOKE_RECOMMENDATION_JSON_PATH ?? "output/smoke/recommendation-quality-report.json";
  const reportMdPath =
    process.env.SMOKE_RECOMMENDATION_MD_PATH ?? "output/smoke/recommendation-quality-report.md";

  await mkdir(dirname(reportJsonPath), { recursive: true });
  await mkdir(dirname(reportMdPath), { recursive: true });
  await writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# Recommendation Quality Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Model version: ${report.modelVersion}`,
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
  const checks = evaluateQualityChecks();
  const failedChecks = checks.filter((check) => check.status === "fail").length;
  const report: RecommendationQualityReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: failedChecks > 0 ? "failed" : "passed",
    reportVersion: "v1",
    modelVersion: getRecommendationRankingModelVersion(),
    checks,
    metrics: {
      totalChecks: checks.length,
      failedChecks,
      fallbackCoverageChecks: checks.filter((check) => check.id.includes("fallback")).length,
    },
  };

  await writeReport(report);
  if (report.status === "failed") {
    console.error(`Recommendation quality smoke failed: ${failedChecks} check(s) failed.`);
    process.exitCode = 1;
    return;
  }
  console.log("Recommendation quality smoke passed.");
}

main().catch((error) => {
  console.error(
    `Recommendation quality smoke crashed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
