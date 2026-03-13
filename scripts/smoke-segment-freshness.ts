import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { desc, eq, sql } from "drizzle-orm";
import { createDb } from "../src/infrastructure/db/client";
import {
  customerSegmentMemberships,
  customerSegments,
  stores,
} from "../src/infrastructure/db/schema";

type ReportStatus = "passed" | "passed_with_warnings" | "failed";
type FreshnessStatus = "fresh" | "stale" | "never_refreshed" | "drift";

interface SegmentFreshnessRow {
  storeId: string;
  storeSlug: string;
  segmentId: string;
  segmentName: string;
  memberCount: number;
  membershipCount: number;
  membershipDelta: number;
  lastRefreshedAt: string | null;
  ageHours: number | null;
  freshnessStatus: FreshnessStatus;
}

interface SegmentFreshnessReport {
  startedAt: string;
  finishedAt: string;
  status: ReportStatus;
  thresholdHours: number;
  generatedLive: boolean;
  totals: {
    stores: number;
    segments: number;
    freshSegments: number;
    staleSegments: number;
    neverRefreshedSegments: number;
    driftSegments: number;
  };
  rows: SegmentFreshnessRow[];
  warnings: string[];
}

function classifyFreshness(args: {
  lastRefreshedAt: Date | null;
  memberCount: number;
  membershipCount: number;
  thresholdHours: number;
  nowMs: number;
}): { freshnessStatus: FreshnessStatus; ageHours: number | null; membershipDelta: number } {
  const membershipDelta = args.membershipCount - args.memberCount;
  const refreshedAtMs = args.lastRefreshedAt ? args.lastRefreshedAt.getTime() : null;
  const ageHours = refreshedAtMs !== null
    ? Math.max(0, Math.round(((args.nowMs - refreshedAtMs) / 36e5) * 100) / 100)
    : null;

  if (!args.lastRefreshedAt) {
    return { freshnessStatus: "never_refreshed", ageHours, membershipDelta };
  }
  if (membershipDelta !== 0) {
    return { freshnessStatus: "drift", ageHours, membershipDelta };
  }
  if (ageHours !== null && ageHours > args.thresholdHours) {
    return { freshnessStatus: "stale", ageHours, membershipDelta };
  }
  return { freshnessStatus: "fresh", ageHours, membershipDelta };
}

function buildMarkdown(report: SegmentFreshnessReport): string {
  const lines: string[] = [
    "# Segment Freshness Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Threshold hours: ${report.thresholdHours}`,
    `- Live DB mode: ${report.generatedLive}`,
    "",
    `- Stores: ${report.totals.stores}`,
    `- Segments: ${report.totals.segments}`,
    `- Fresh: ${report.totals.freshSegments}`,
    `- Stale: ${report.totals.staleSegments}`,
    `- Never refreshed: ${report.totals.neverRefreshedSegments}`,
    `- Drift: ${report.totals.driftSegments}`,
    "",
  ];

  if (report.warnings.length > 0) {
    lines.push("## Warnings");
    lines.push("");
    for (const warning of report.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
  }

  lines.push("| Store | Segment | Status | Member Count | Membership Count | Delta | Last Refreshed | Age (hours) |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const row of report.rows) {
    lines.push(
      `| ${row.storeSlug} | ${row.segmentName} | ${row.freshnessStatus} | ${row.memberCount} | ${row.membershipCount} | ${row.membershipDelta} | ${row.lastRefreshedAt ?? ""} | ${row.ageHours ?? ""} |`,
    );
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const startedAt = new Date().toISOString();
  const thresholdHours = Math.max(
    1,
    Math.min(Number(process.env.SMOKE_SEGMENT_THRESHOLD_HOURS ?? "8"), 168),
  );
  const reportJsonPath =
    process.env.SMOKE_SEGMENT_FRESHNESS_JSON_PATH ?? "output/smoke/segment-freshness-report.json";
  const reportMdPath =
    process.env.SMOKE_SEGMENT_FRESHNESS_MD_PATH ?? "output/smoke/segment-freshness-report.md";
  const warnings: string[] = [];

  let rows: SegmentFreshnessRow[] = [];
  let generatedLive = false;
  let storeCount = 0;

  if (!process.env.DATABASE_URL) {
    warnings.push("DATABASE_URL not set; segment freshness live checks were skipped.");
  } else {
    generatedLive = true;
    const db = createDb(process.env.DATABASE_URL);
    const storeRows = await db.select({ id: stores.id, slug: stores.slug }).from(stores);
    storeCount = storeRows.length;
    const storeSlugById = new Map(storeRows.map((row) => [row.id, row.slug]));
    const membershipCountExpr = sql<number>`count(${customerSegmentMemberships.customerId})`;
    const nowMs = Date.now();

    const segmentRows = await db
      .select({
        storeId: customerSegments.storeId,
        segmentId: customerSegments.id,
        segmentName: customerSegments.name,
        memberCount: customerSegments.memberCount,
        membershipCount: membershipCountExpr,
        lastRefreshedAt: customerSegments.lastRefreshedAt,
        createdAt: customerSegments.createdAt,
      })
      .from(customerSegments)
      .leftJoin(
        customerSegmentMemberships,
        eq(customerSegmentMemberships.segmentId, customerSegments.id),
      )
      .groupBy(
        customerSegments.storeId,
        customerSegments.id,
        customerSegments.name,
        customerSegments.memberCount,
        customerSegments.lastRefreshedAt,
        customerSegments.createdAt,
      )
      .orderBy(desc(customerSegments.createdAt));

    rows = segmentRows.map((row) => {
      const memberCount = Number(row.memberCount ?? 0);
      const membershipCount = Number(row.membershipCount ?? 0);
      const freshness = classifyFreshness({
        lastRefreshedAt: row.lastRefreshedAt ?? null,
        memberCount,
        membershipCount,
        thresholdHours,
        nowMs,
      });

      return {
        storeId: row.storeId,
        storeSlug: storeSlugById.get(row.storeId) ?? row.storeId,
        segmentId: row.segmentId,
        segmentName: row.segmentName,
        memberCount,
        membershipCount,
        membershipDelta: freshness.membershipDelta,
        lastRefreshedAt: row.lastRefreshedAt ? row.lastRefreshedAt.toISOString() : null,
        ageHours: freshness.ageHours,
        freshnessStatus: freshness.freshnessStatus,
      };
    });
  }

  const totals = {
    stores: generatedLive ? storeCount : 0,
    segments: rows.length,
    freshSegments: rows.filter((row) => row.freshnessStatus === "fresh").length,
    staleSegments: rows.filter((row) => row.freshnessStatus === "stale").length,
    neverRefreshedSegments: rows.filter((row) => row.freshnessStatus === "never_refreshed").length,
    driftSegments: rows.filter((row) => row.freshnessStatus === "drift").length,
  };

  const status: ReportStatus = totals.driftSegments > 0
    ? "failed"
    : totals.staleSegments > 0 || totals.neverRefreshedSegments > 0 || warnings.length > 0
      ? "passed_with_warnings"
      : "passed";

  const report: SegmentFreshnessReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status,
    thresholdHours,
    generatedLive,
    totals,
    rows,
    warnings,
  };

  await mkdir(dirname(reportJsonPath), { recursive: true });
  await mkdir(dirname(reportMdPath), { recursive: true });
  await writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(reportMdPath, buildMarkdown(report));

  if (status === "failed") {
    console.error(
      `Segment freshness smoke failed: ${totals.driftSegments} segment(s) have membership drift.`,
    );
    process.exitCode = 1;
    return;
  }
  if (status === "passed_with_warnings") {
    console.log("Segment freshness smoke passed with warnings.");
    return;
  }
  console.log("Segment freshness smoke passed.");
}

main().catch((error) => {
  console.error(
    `Segment freshness smoke crashed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
