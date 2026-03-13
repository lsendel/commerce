import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { buildAnalyticsDeliveryKey, delayMs } from "../src/shared/analytics-delivery";
import {
  ANALYTICS_EVENT_TAXONOMY_VERSION,
  resolveAnalyticsEventType,
} from "../src/shared/analytics-taxonomy";

type ReplayStatus = "passed" | "passed_with_warnings" | "failed";
type EventReplayResultStatus = "dry_run" | "replayed" | "deduped" | "failed" | "skipped_invalid";

interface ReplayEventInput {
  eventType?: string;
  eventName?: string;
  eventId?: string;
  sessionId?: string;
  dedupeKey?: string;
  source?: string;
  occurredAt?: string;
  properties?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  pageUrl?: string;
  referrer?: string;
}

interface ReplayResult {
  index: number;
  status: EventReplayResultStatus;
  eventType: string;
  deliveryKey: string;
  attempts: number;
  httpStatus: number | null;
  responseId: string | null;
  note: string;
}

interface ReplayReport {
  startedAt: string;
  finishedAt: string;
  status: ReplayStatus;
  taxonomyVersion: string;
  dryRun: boolean;
  baseUrl: string;
  totals: {
    total: number;
    replayed: number;
    deduped: number;
    dryRun: number;
    skippedInvalid: number;
    failed: number;
  };
  results: ReplayResult[];
}

function isTruthy(value: string | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function normalizeBaseUrl(raw: string): string {
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function buildSampleEvents(): ReplayEventInput[] {
  return [
    {
      eventType: "page_view",
      sessionId: "wk46-replay-session",
      pageUrl: "https://petm8.io/products",
      properties: { path: "/products" },
      source: "replay_tool",
    },
    {
      eventType: "add_to_cart",
      sessionId: "wk46-replay-session",
      pageUrl: "https://petm8.io/products/premium-harness",
      properties: { productId: "sample-product", variantId: "sample-variant" },
      source: "replay_tool",
    },
    {
      eventType: "checkout_started",
      sessionId: "wk46-replay-session",
      pageUrl: "https://petm8.io/cart",
      properties: { cartId: "sample-cart" },
      source: "replay_tool",
    },
  ];
}

async function loadReplayInputs(inputPath: string): Promise<ReplayEventInput[]> {
  try {
    const raw = await readFile(inputPath, "utf8");
    const parsed = JSON.parse(raw) as ReplayEventInput[];
    if (!Array.isArray(parsed)) {
      throw new Error("Replay input must be a JSON array.");
    }
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("ENOENT")) {
      throw error;
    }

    const sample = buildSampleEvents();
    await mkdir(dirname(inputPath), { recursive: true });
    await writeFile(inputPath, `${JSON.stringify(sample, null, 2)}\n`);
    return sample;
  }
}

async function writeReport(report: ReplayReport) {
  const reportJsonPath =
    process.env.REPLAY_EVENTS_REPORT_JSON_PATH ?? "output/replay/event-replay-report.json";
  const reportMdPath =
    process.env.REPLAY_EVENTS_REPORT_MD_PATH ?? "output/replay/event-replay-report.md";

  await mkdir(dirname(reportJsonPath), { recursive: true });
  await mkdir(dirname(reportMdPath), { recursive: true });
  await writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# Analytics Event Replay Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Taxonomy version: ${report.taxonomyVersion}`,
    `- Dry run: ${report.dryRun}`,
    `- Base URL: ${report.baseUrl}`,
    "",
    `- Total: ${report.totals.total}`,
    `- Replayed: ${report.totals.replayed}`,
    `- Deduped: ${report.totals.deduped}`,
    `- Dry-run simulated: ${report.totals.dryRun}`,
    `- Skipped invalid: ${report.totals.skippedInvalid}`,
    `- Failed: ${report.totals.failed}`,
    "",
    "| # | Event Type | Status | Attempts | HTTP | Delivery Key | Note |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...report.results.map((result) =>
      `| ${result.index} | ${result.eventType} | ${result.status} | ${result.attempts} | ${result.httpStatus ?? ""} | ${result.deliveryKey} | ${result.note.replace(/\|/g, "\\|")} |`,
    ),
    "",
  ];

  await writeFile(reportMdPath, `${lines.join("\n")}\n`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const inputPath =
    process.env.REPLAY_EVENTS_INPUT_PATH ?? "output/replay/event-replay-input.sample.json";
  const baseUrl = normalizeBaseUrl(process.env.REPLAY_BASE_URL ?? "http://127.0.0.1:8787");
  const dryRun = isTruthy(process.env.REPLAY_DRY_RUN ?? "true");
  const maxAttempts = Math.max(1, Math.min(Number(process.env.REPLAY_ATTEMPTS ?? "3"), 5));
  const retryDelayMs = Math.max(0, Math.min(Number(process.env.REPLAY_DELAY_MS ?? "120"), 5000));
  const inputs = await loadReplayInputs(inputPath);

  const results: ReplayResult[] = [];
  for (let index = 0; index < inputs.length; index++) {
    const input = inputs[index] ?? {};
    const resolved = resolveAnalyticsEventType(input.eventType ?? input.eventName ?? "");
    const normalizedEventType = resolved.eventType;
    const baseProperties = input.properties ?? input.payload ?? {};
    const deliveryKey = buildAnalyticsDeliveryKey({
      eventType: normalizedEventType,
      sessionId: input.sessionId ?? null,
      pageUrl: input.pageUrl ?? null,
      dedupeKey: input.dedupeKey ?? null,
      eventId: input.eventId ?? null,
      properties: baseProperties,
    });

    if (!resolved.accepted) {
      results.push({
        index,
        status: "skipped_invalid",
        eventType: normalizedEventType,
        deliveryKey,
        attempts: 0,
        httpStatus: null,
        responseId: null,
        note: resolved.reason ?? "Unknown event type.",
      });
      continue;
    }

    const body = {
      eventType: normalizedEventType,
      eventId: input.eventId,
      sessionId: input.sessionId,
      dedupeKey: input.dedupeKey ?? deliveryKey,
      source: input.source ?? "replay_tool",
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      properties: baseProperties,
      pageUrl: input.pageUrl,
      referrer: input.referrer,
    };

    if (dryRun) {
      results.push({
        index,
        status: "dry_run",
        eventType: normalizedEventType,
        deliveryKey,
        attempts: 0,
        httpStatus: null,
        responseId: null,
        note: "Dry-run mode; event not sent.",
      });
      continue;
    }

    let lastStatus: number | null = null;
    let responseId: string | null = null;
    let replayStatus: EventReplayResultStatus = "failed";
    let note = "Delivery failed.";
    let attempts = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      attempts = attempt + 1;
      try {
        const response = await fetch(`${baseUrl}/api/analytics/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        lastStatus = response.status;
        const payload = await response.json().catch(() => null) as {
          id?: string;
          deduped?: boolean;
          error?: string;
        } | null;
        responseId = payload?.id ?? null;

        if (response.ok) {
          replayStatus = payload?.deduped ? "deduped" : "replayed";
          note = payload?.deduped
            ? "Duplicate delivery acknowledged by API."
            : "Event replayed successfully.";
          break;
        }

        note = payload?.error ?? `HTTP ${response.status}`;
      } catch (error) {
        note = error instanceof Error ? error.message : String(error);
      }

      if (attempt < maxAttempts - 1) {
        await delayMs(retryDelayMs * (attempt + 1));
      }
    }

    results.push({
      index,
      status: replayStatus,
      eventType: normalizedEventType,
      deliveryKey,
      attempts,
      httpStatus: lastStatus,
      responseId,
      note,
    });
  }

  const totals = {
    total: results.length,
    replayed: results.filter((result) => result.status === "replayed").length,
    deduped: results.filter((result) => result.status === "deduped").length,
    dryRun: results.filter((result) => result.status === "dry_run").length,
    skippedInvalid: results.filter((result) => result.status === "skipped_invalid").length,
    failed: results.filter((result) => result.status === "failed").length,
  };
  const status: ReplayStatus = totals.failed > 0
    ? "failed"
    : totals.skippedInvalid > 0
      ? "passed_with_warnings"
      : "passed";

  const report: ReplayReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status,
    taxonomyVersion: ANALYTICS_EVENT_TAXONOMY_VERSION,
    dryRun,
    baseUrl,
    totals,
    results,
  };

  await writeReport(report);
  if (status === "failed") {
    console.error(`Analytics replay failed: ${totals.failed} event(s) failed.`);
    process.exitCode = 1;
    return;
  }
  if (status === "passed_with_warnings") {
    console.log("Analytics replay finished with warnings.");
    return;
  }
  console.log("Analytics replay finished successfully.");
}

main().catch((error) => {
  console.error(
    `Analytics replay crashed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
