import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { sql } from "drizzle-orm";
import { createDb } from "../src/infrastructure/db/client";
import { users } from "../src/infrastructure/db/schema";

type ReportStatus = "passed" | "passed_with_warnings" | "failed";

interface DuplicateIdentityRow {
  key: string;
  count: number;
  userIds: string[];
}

interface IdentityResolutionReport {
  startedAt: string;
  finishedAt: string;
  status: ReportStatus;
  generatedLive: boolean;
  metrics: {
    totalUsers: number;
    duplicateNormalizedEmails: number;
    duplicateGoogleSubs: number;
    duplicateAppleSubs: number;
    duplicateMetaSubs: number;
    unverifiedUsers: number;
  };
  duplicates: {
    normalizedEmails: DuplicateIdentityRow[];
    googleSubs: DuplicateIdentityRow[];
    appleSubs: DuplicateIdentityRow[];
    metaSubs: DuplicateIdentityRow[];
  };
  warnings: string[];
}

function asStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((value) => String(value));
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return trimmed
        .slice(1, -1)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    }
    return [trimmed];
  }
  return [];
}

function buildMarkdown(report: IdentityResolutionReport): string {
  const lines: string[] = [
    "# Identity Resolution Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Live DB mode: ${report.generatedLive}`,
    "",
    `- Total users: ${report.metrics.totalUsers}`,
    `- Duplicate normalized emails: ${report.metrics.duplicateNormalizedEmails}`,
    `- Duplicate Google subs: ${report.metrics.duplicateGoogleSubs}`,
    `- Duplicate Apple subs: ${report.metrics.duplicateAppleSubs}`,
    `- Duplicate Meta subs: ${report.metrics.duplicateMetaSubs}`,
    `- Unverified users: ${report.metrics.unverifiedUsers}`,
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

  const sections: Array<{
    title: string;
    rows: DuplicateIdentityRow[];
  }> = [
    { title: "Duplicate Normalized Emails", rows: report.duplicates.normalizedEmails },
    { title: "Duplicate Google Subs", rows: report.duplicates.googleSubs },
    { title: "Duplicate Apple Subs", rows: report.duplicates.appleSubs },
    { title: "Duplicate Meta Subs", rows: report.duplicates.metaSubs },
  ];

  for (const section of sections) {
    lines.push(`## ${section.title}`);
    lines.push("");
    if (section.rows.length === 0) {
      lines.push("- (none)");
      lines.push("");
      continue;
    }
    lines.push("| Key | Count | User IDs |");
    lines.push("| --- | --- | --- |");
    for (const row of section.rows) {
      lines.push(`| ${row.key} | ${row.count} | ${row.userIds.join(", ")} |`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function findDuplicates(db: ReturnType<typeof createDb>, columnName: "google_sub" | "apple_sub" | "meta_sub") {
  const rows = await db.execute(sql`
    select
      ${sql.raw(columnName)} as key,
      count(*)::int as count,
      array_agg(id::text order by id) as user_ids
    from users
    where ${sql.raw(columnName)} is not null
    group by ${sql.raw(columnName)}
    having count(*) > 1
    order by count(*) desc
  `);

  return (rows as unknown as Array<Record<string, unknown>>).map((row) => ({
    key: String(row.key ?? ""),
    count: Number(row.count ?? 0),
    userIds: asStringArray(row.user_ids),
  }));
}

async function main() {
  const startedAt = new Date().toISOString();
  const reportJsonPath =
    process.env.SMOKE_IDENTITY_RESOLUTION_JSON_PATH ?? "output/smoke/identity-resolution-report.json";
  const reportMdPath =
    process.env.SMOKE_IDENTITY_RESOLUTION_MD_PATH ?? "output/smoke/identity-resolution-report.md";

  const warnings: string[] = [];
  let generatedLive = false;
  let totalUsers = 0;
  let unverifiedUsers = 0;
  let normalizedEmails: DuplicateIdentityRow[] = [];
  let googleSubs: DuplicateIdentityRow[] = [];
  let appleSubs: DuplicateIdentityRow[] = [];
  let metaSubs: DuplicateIdentityRow[] = [];

  if (!process.env.DATABASE_URL) {
    warnings.push("DATABASE_URL not set; identity resolution live checks were skipped.");
  } else {
    generatedLive = true;
    const db = createDb(process.env.DATABASE_URL);
    const totals = await db.select({
      totalUsers: sql<number>`count(*)`,
      unverifiedUsers: sql<number>`count(*) filter (where ${users.emailVerifiedAt} is null)`,
    }).from(users);
    totalUsers = Number(totals[0]?.totalUsers ?? 0);
    unverifiedUsers = Number(totals[0]?.unverifiedUsers ?? 0);

    const normalizedEmailRows = await db.execute(sql`
      select
        lower(email) as key,
        count(*)::int as count,
        array_agg(id::text order by id) as user_ids
      from users
      group by lower(email)
      having count(*) > 1
      order by count(*) desc
    `);
    normalizedEmails = (normalizedEmailRows as unknown as Array<Record<string, unknown>>).map((row) => ({
      key: String(row.key ?? ""),
      count: Number(row.count ?? 0),
      userIds: asStringArray(row.user_ids),
    }));
    googleSubs = await findDuplicates(db, "google_sub");
    appleSubs = await findDuplicates(db, "apple_sub");
    metaSubs = await findDuplicates(db, "meta_sub");
  }

  const metrics = {
    totalUsers,
    duplicateNormalizedEmails: normalizedEmails.length,
    duplicateGoogleSubs: googleSubs.length,
    duplicateAppleSubs: appleSubs.length,
    duplicateMetaSubs: metaSubs.length,
    unverifiedUsers,
  };

  const hasCriticalDuplicates =
    metrics.duplicateNormalizedEmails > 0
    || metrics.duplicateGoogleSubs > 0
    || metrics.duplicateAppleSubs > 0
    || metrics.duplicateMetaSubs > 0;
  const status: ReportStatus = hasCriticalDuplicates
    ? "failed"
    : warnings.length > 0
      ? "passed_with_warnings"
      : "passed";

  const report: IdentityResolutionReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status,
    generatedLive,
    metrics,
    duplicates: {
      normalizedEmails,
      googleSubs,
      appleSubs,
      metaSubs,
    },
    warnings,
  };

  await mkdir(dirname(reportJsonPath), { recursive: true });
  await mkdir(dirname(reportMdPath), { recursive: true });
  await writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(reportMdPath, buildMarkdown(report));

  if (status === "failed") {
    console.error("Identity resolution smoke failed: duplicate identity mappings were found.");
    process.exitCode = 1;
    return;
  }
  if (status === "passed_with_warnings") {
    console.log("Identity resolution smoke passed with warnings.");
    return;
  }
  console.log("Identity resolution smoke passed.");
}

main().catch((error) => {
  console.error(
    `Identity resolution smoke crashed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
