import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  buildDefaultLandingPageInputs,
  evaluateLandingPageQuality,
  generateLandingPage,
  renderLandingPageMarkdown,
  type LandingPageInput,
} from "../src/infrastructure/marketing/landing-page-pipeline";

type PipelineStatus = "passed" | "failed";

interface PageResult {
  slug: string;
  status: PipelineStatus;
  outputJsonPath: string;
  outputMarkdownPath: string;
  checks: Array<{ id: string; ok: boolean; note: string }>;
}

interface LandingPagePipelineReport {
  startedAt: string;
  finishedAt: string;
  status: PipelineStatus;
  pagesGenerated: number;
  pagesPassed: number;
  pagesFailed: number;
  reportVersion: "v1";
  pageResults: PageResult[];
}

async function resolveInputs(): Promise<LandingPageInput[]> {
  const inputPath = process.env.LP_PIPELINE_INPUT_PATH?.trim();
  if (!inputPath) {
    return buildDefaultLandingPageInputs();
  }
  const raw = await readFile(inputPath, "utf8");
  const parsed = JSON.parse(raw) as LandingPageInput[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("LP_PIPELINE_INPUT_PATH must point to a non-empty JSON array.");
  }
  return parsed;
}

async function main() {
  const startedAt = new Date().toISOString();
  const outputDir = process.env.LP_PIPELINE_OUTPUT_DIR?.trim() || "output/landing-pages";
  const reportJsonPath = process.env.LP_PIPELINE_REPORT_JSON_PATH?.trim() || "output/smoke/landing-page-pipeline-report.json";
  const reportMdPath = process.env.LP_PIPELINE_REPORT_MD_PATH?.trim() || "output/smoke/landing-page-pipeline-report.md";

  const inputs = await resolveInputs();
  await mkdir(outputDir, { recursive: true });
  await mkdir(dirname(reportJsonPath), { recursive: true });
  await mkdir(dirname(reportMdPath), { recursive: true });

  const pageResults: PageResult[] = [];
  for (const input of inputs) {
    const page = generateLandingPage(input);
    const quality = evaluateLandingPageQuality(page, input);

    const pageJsonPath = `${outputDir}/${page.slug}.json`;
    const pageMarkdownPath = `${outputDir}/${page.slug}.md`;
    await writeFile(pageJsonPath, `${JSON.stringify(page, null, 2)}\n`);
    await writeFile(pageMarkdownPath, renderLandingPageMarkdown(page));

    pageResults.push({
      slug: page.slug,
      status: quality.status,
      outputJsonPath: pageJsonPath,
      outputMarkdownPath: pageMarkdownPath,
      checks: quality.checks,
    });
  }

  const pagesPassed = pageResults.filter((result) => result.status === "passed").length;
  const pagesFailed = pageResults.length - pagesPassed;
  const report: LandingPagePipelineReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: pagesFailed > 0 ? "failed" : "passed",
    pagesGenerated: pageResults.length,
    pagesPassed,
    pagesFailed,
    reportVersion: "v1",
    pageResults,
  };

  await writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# Landing Page Pipeline Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Pages generated: ${report.pagesGenerated}`,
    `- Passed: ${report.pagesPassed}`,
    `- Failed: ${report.pagesFailed}`,
    "",
    "| Slug | Status | JSON | Markdown |",
    "| --- | --- | --- | --- |",
    ...report.pageResults.map((result) =>
      `| ${result.slug} | ${result.status} | ${result.outputJsonPath} | ${result.outputMarkdownPath} |`,
    ),
    "",
  ];

  for (const result of report.pageResults) {
    lines.push(`## Checks: ${result.slug}`);
    lines.push("");
    lines.push("| Check | Result | Note |");
    lines.push("| --- | --- | --- |");
    result.checks.forEach((check) => {
      lines.push(`| ${check.id} | ${check.ok ? "pass" : "fail"} | ${check.note.replace(/\|/g, "\\|")} |`);
    });
    lines.push("");
  }

  await writeFile(reportMdPath, `${lines.join("\n")}\n`);
  if (report.status === "failed") {
    console.error(`Landing page pipeline failed: ${pagesFailed} page(s) failed quality gates.`);
    process.exitCode = 1;
    return;
  }
  console.log("Landing page pipeline passed.");
}

main().catch((error) => {
  console.error(`Landing page pipeline crashed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

