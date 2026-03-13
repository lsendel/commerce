import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { analyticsContract } from "../src/contracts/analytics.contract";
import {
  ANALYTICS_EVENT_TAXONOMY_VERSION,
  getKnownAnalyticsEventTypes,
  normalizeAnalyticsEventType,
  resolveAnalyticsEventType,
} from "../src/shared/analytics-taxonomy";

type CheckStatus = "pass" | "fail";
type ReportStatus = "passed" | "failed";

interface ContractCheck {
  id: string;
  status: CheckStatus;
  note: string;
}

interface EventContractReport {
  startedAt: string;
  finishedAt: string;
  status: ReportStatus;
  reportVersion: "v1";
  taxonomyVersion: string;
  metrics: {
    knownTaxonomyEvents: number;
    discoveredLiteralEvents: number;
    unknownLiteralEvents: number;
  };
  checks: ContractCheck[];
  discoveredEvents: string[];
  unknownEvents: string[];
}

const EVENT_TYPE_LITERAL_REGEX = /eventType:\s*["']([a-z0-9_.:-]+)["']/gi;
const TRACK_CALL_LITERAL_REGEX = /petm8Track\(\s*["']([a-z0-9_.:-]+)["']/gi;
const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js"]);

async function listFilesRecursive(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(fullPath));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!SCAN_EXTENSIONS.has(extname(entry.name))) continue;
    files.push(fullPath);
  }
  return files;
}

function collectMatches(content: string, regex: RegExp): string[] {
  const matches: string[] = [];
  regex.lastIndex = 0;
  let current: RegExpExecArray | null;
  while ((current = regex.exec(content)) !== null) {
    const value = (current[1] ?? "").trim().toLowerCase();
    if (!value) continue;
    matches.push(value);
  }
  return matches;
}

async function discoverLiteralEvents(): Promise<string[]> {
  const roots = ["src", "public/scripts"];
  const discovered = new Set<string>();

  for (const root of roots) {
    const files = await listFilesRecursive(root);
    for (const file of files) {
      const content = await readFile(file, "utf8");
      const eventTypeMatches = collectMatches(content, EVENT_TYPE_LITERAL_REGEX);
      const trackCallMatches = collectMatches(content, TRACK_CALL_LITERAL_REGEX);
      for (const literal of [...eventTypeMatches, ...trackCallMatches]) {
        discovered.add(normalizeAnalyticsEventType(literal));
      }
    }
  }

  return [...discovered].sort();
}

function buildChecks(discoveredEvents: string[]): ContractCheck[] {
  const checks: ContractCheck[] = [];

  checks.push({
    id: "contract-track-eventname",
    status: analyticsContract.trackEvent.body.safeParse({ eventName: "begin_checkout" }).success ? "pass" : "fail",
    note: "trackEvent contract accepts eventName alias payloads.",
  });
  checks.push({
    id: "contract-track-payload-fallback",
    status: analyticsContract.trackEvent.body.safeParse({
      eventType: "page_view",
      payload: { path: "/" },
    }).success
      ? "pass"
      : "fail",
    note: "trackEvent contract accepts payload fallback body.",
  });
  checks.push({
    id: "contract-track-dedupe-key",
    status: analyticsContract.trackEvent.body.safeParse({
      eventType: "page_view",
      dedupeKey: "wk46-test-key",
    }).success
      ? "pass"
      : "fail",
    note: "trackEvent contract accepts dedupe key field.",
  });
  checks.push({
    id: "contract-response-201-delivery",
    status: analyticsContract.trackEvent.responses[201].safeParse({
      id: "evt_123",
      eventType: "page_view",
      deduped: false,
      delivery: {
        key: "k",
        retries: 0,
        attempts: 1,
        taxonomyVersion: ANALYTICS_EVENT_TAXONOMY_VERSION,
        category: "coreJourney",
      },
    }).success
      ? "pass"
      : "fail",
    note: "trackEvent 201 response includes delivery metadata.",
  });
  checks.push({
    id: "contract-response-200-delivery",
    status: analyticsContract.trackEvent.responses[200].safeParse({
      id: "evt_123",
      eventType: "page_view",
      deduped: true,
      delivery: {
        key: "k",
        retries: 0,
        attempts: 1,
        taxonomyVersion: ANALYTICS_EVENT_TAXONOMY_VERSION,
        category: "coreJourney",
      },
    }).success
      ? "pass"
      : "fail",
    note: "trackEvent 200 dedupe response includes delivery metadata.",
  });
  checks.push({
    id: "taxonomy-rejects-unknown",
    status: resolveAnalyticsEventType("week46_unknown_event").accepted ? "fail" : "pass",
    note: "taxonomy rejects unknown events.",
  });
  checks.push({
    id: "taxonomy-discovered-literals",
    status: discoveredEvents
      .filter((eventType) => eventType !== "unknown")
      .every((eventType) => resolveAnalyticsEventType(eventType).accepted)
      ? "pass"
      : "fail",
    note: "all discovered literal event names are represented in taxonomy.",
  });

  return checks;
}

async function writeReport(report: EventContractReport) {
  const reportJsonPath =
    process.env.SMOKE_EVENT_PIPELINE_JSON_PATH ?? "output/smoke/event-pipeline-contract-report.json";
  const reportMdPath =
    process.env.SMOKE_EVENT_PIPELINE_MD_PATH ?? "output/smoke/event-pipeline-contract-report.md";

  await mkdir(dirname(reportJsonPath), { recursive: true });
  await mkdir(dirname(reportMdPath), { recursive: true });

  await writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# Event Pipeline Contract Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Taxonomy version: ${report.taxonomyVersion}`,
    `- Known taxonomy events: ${report.metrics.knownTaxonomyEvents}`,
    `- Discovered literal events: ${report.metrics.discoveredLiteralEvents}`,
    `- Unknown literal events: ${report.metrics.unknownLiteralEvents}`,
    "",
    "## Checks",
    "",
    "| Check | Status | Note |",
    "| --- | --- | --- |",
    ...report.checks.map((check) =>
      `| ${check.id} | ${check.status} | ${check.note.replace(/\|/g, "\\|")} |`,
    ),
    "",
    "## Discovered Events",
    "",
    ...report.discoveredEvents.map((eventType) => `- ${eventType}`),
    "",
    "## Unknown Events",
    "",
    ...(report.unknownEvents.length > 0 ? report.unknownEvents.map((eventType) => `- ${eventType}`) : ["- (none)"]),
    "",
  ];

  await writeFile(reportMdPath, `${lines.join("\n")}\n`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const discoveredEvents = await discoverLiteralEvents();
  const checks = buildChecks(discoveredEvents);
  const knownEvents = new Set(getKnownAnalyticsEventTypes());
  const unknownEvents = discoveredEvents
    .filter((eventType) => eventType !== "unknown")
    .filter((eventType) => !knownEvents.has(eventType))
    .sort();
  const failedChecks = checks.filter((check) => check.status === "fail").length;

  const report: EventContractReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: failedChecks > 0 || unknownEvents.length > 0 ? "failed" : "passed",
    reportVersion: "v1",
    taxonomyVersion: ANALYTICS_EVENT_TAXONOMY_VERSION,
    metrics: {
      knownTaxonomyEvents: knownEvents.size,
      discoveredLiteralEvents: discoveredEvents.length,
      unknownLiteralEvents: unknownEvents.length,
    },
    checks,
    discoveredEvents,
    unknownEvents,
  };

  await writeReport(report);
  if (report.status === "failed") {
    console.error(
      `Event pipeline contract smoke failed: ${failedChecks} check(s), ${unknownEvents.length} unknown event(s).`,
    );
    process.exitCode = 1;
    return;
  }
  console.log("Event pipeline contract smoke passed.");
}

main().catch((error) => {
  console.error(
    `Event pipeline contract smoke crashed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
