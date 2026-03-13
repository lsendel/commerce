import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { LLMS_DISCOVERY_RULES, LLMS_REQUIRED_HEADINGS } from "../src/infrastructure/seo/llm-surface";

type SmokeStatus = "passed" | "failed" | "skipped";

type LlmCheckSection = "llms" | "ai-plugin" | "consistency";

interface LlmCheckResult {
  id: string;
  section: LlmCheckSection;
  target: string;
  ok: boolean;
  statusCode: number | null;
  note: string;
}

interface LlmSurfaceReport {
  startedAt: string;
  finishedAt: string;
  status: SmokeStatus;
  baseUrl: string;
  skipHttpChecks: boolean;
  metrics: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    skippedChecks: number;
  };
  checks: LlmCheckResult[];
}

interface HttpTextResponse {
  status: number;
  contentType: string;
  body: string;
}

function isEnabled(value: string | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function normalizeBaseUrl(raw: string): string {
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function addCheck(
  checks: LlmCheckResult[],
  check: Omit<LlmCheckResult, "ok"> & { ok: boolean },
) {
  checks.push(check);
}

async function fetchText(baseUrl: string, path: string): Promise<HttpTextResponse> {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "follow" });
  return {
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    body: await response.text(),
  };
}

function extractUrls(text: string) {
  return [...text.matchAll(/https?:\/\/[^\s)]+/g)].map((match) => match[0]);
}

function tryParseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function hasLinePrefix(text: string, prefix: string) {
  return text.split("\n").some((line) => line.trim().startsWith(prefix));
}

async function runChecks(baseUrl: string): Promise<LlmCheckResult[]> {
  const checks: LlmCheckResult[] = [];
  const llms = await fetchText(baseUrl, "/llms.txt");
  addCheck(checks, {
    id: "llms-status",
    section: "llms",
    target: "/llms.txt",
    ok: llms.status === 200,
    statusCode: llms.status,
    note: llms.status === 200 ? "ok" : "Expected HTTP 200.",
  });
  addCheck(checks, {
    id: "llms-content-type",
    section: "llms",
    target: "/llms.txt",
    ok: llms.contentType.toLowerCase().includes("text/plain"),
    statusCode: llms.status,
    note: llms.contentType || "Missing Content-Type.",
  });
  addCheck(checks, {
    id: "llms-min-lines",
    section: "llms",
    target: "/llms.txt",
    ok: llms.body.split("\n").length >= 25,
    statusCode: llms.status,
    note: `lineCount=${llms.body.split("\n").length}`,
  });

  for (const heading of LLMS_REQUIRED_HEADINGS) {
    addCheck(checks, {
      id: `llms-heading-${heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      section: "llms",
      target: "/llms.txt",
      ok: llms.body.includes(heading),
      statusCode: llms.status,
      note: `Expect heading "${heading}"`,
    });
  }

  for (const rule of LLMS_DISCOVERY_RULES) {
    addCheck(checks, {
      id: `llms-rule-${rule.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 56)}`,
      section: "llms",
      target: "/llms.txt",
      ok: llms.body.includes(rule),
      statusCode: llms.status,
      note: `Expect rule "${rule}"`,
    });
  }

  addCheck(checks, {
    id: "llms-canonical-line",
    section: "llms",
    target: "/llms.txt",
    ok: hasLinePrefix(llms.body, "- Canonical: "),
    statusCode: llms.status,
    note: "Expect '- Canonical: <url>' line.",
  });

  const llmsUrls = extractUrls(llms.body).map((value) => tryParseUrl(value)).filter((value): value is URL => Boolean(value));
  const llmsPaths = new Set(llmsUrls.map((value) => value.pathname));
  ["/products", "/events", "/venues"].forEach((path) => {
    addCheck(checks, {
      id: `llms-key-page-${path.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      section: "llms",
      target: "/llms.txt",
      ok: llmsPaths.has(path),
      statusCode: llms.status,
      note: `Expect key page URL for ${path}`,
    });
  });

  ["/sitemap.xml", "/robots.txt", "/llms.txt", "/.well-known/ai-plugin.json", "/graphql"].forEach((path) => {
    addCheck(checks, {
      id: `llms-machine-endpoint-${path.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      section: "llms",
      target: "/llms.txt",
      ok: llmsPaths.has(path),
      statusCode: llms.status,
      note: `Expect machine endpoint URL for ${path}`,
    });
  });

  const aiPlugin = await fetchText(baseUrl, "/.well-known/ai-plugin.json");
  addCheck(checks, {
    id: "ai-plugin-status",
    section: "ai-plugin",
    target: "/.well-known/ai-plugin.json",
    ok: aiPlugin.status === 200,
    statusCode: aiPlugin.status,
    note: aiPlugin.status === 200 ? "ok" : "Expected HTTP 200.",
  });
  addCheck(checks, {
    id: "ai-plugin-content-type",
    section: "ai-plugin",
    target: "/.well-known/ai-plugin.json",
    ok: aiPlugin.contentType.toLowerCase().includes("application/json"),
    statusCode: aiPlugin.status,
    note: aiPlugin.contentType || "Missing Content-Type.",
  });

  let pluginPayload: Record<string, unknown> | null = null;
  try {
    pluginPayload = JSON.parse(aiPlugin.body) as Record<string, unknown>;
    addCheck(checks, {
      id: "ai-plugin-json-valid",
      section: "ai-plugin",
      target: "/.well-known/ai-plugin.json",
      ok: true,
      statusCode: aiPlugin.status,
      note: "ok",
    });
  } catch (error) {
    addCheck(checks, {
      id: "ai-plugin-json-valid",
      section: "ai-plugin",
      target: "/.well-known/ai-plugin.json",
      ok: false,
      statusCode: aiPlugin.status,
      note: error instanceof Error ? error.message : String(error),
    });
  }

  const requiredFields = [
    "schema_version",
    "name_for_human",
    "name_for_model",
    "description_for_human",
    "description_for_model",
    "logo_url",
    "contact_email",
    "legal_info_url",
  ];

  requiredFields.forEach((field) => {
    const value = pluginPayload?.[field];
    addCheck(checks, {
      id: `ai-plugin-field-${field}`,
      section: "ai-plugin",
      target: "/.well-known/ai-plugin.json",
      ok: typeof value === "string" && value.trim().length > 0,
      statusCode: aiPlugin.status,
      note: typeof value === "string" ? value : `Missing field ${field}`,
    });
  });

  const api = pluginPayload?.api as Record<string, unknown> | undefined;
  addCheck(checks, {
    id: "ai-plugin-api-type",
    section: "ai-plugin",
    target: "/.well-known/ai-plugin.json",
    ok: api?.type === "graphql",
    statusCode: aiPlugin.status,
    note: typeof api?.type === "string" ? api.type : "Missing api.type",
  });
  const apiUrl = typeof api?.url === "string" ? tryParseUrl(api.url) : null;
  addCheck(checks, {
    id: "ai-plugin-api-url",
    section: "ai-plugin",
    target: "/.well-known/ai-plugin.json",
    ok: Boolean(apiUrl && apiUrl.pathname === "/graphql"),
    statusCode: aiPlugin.status,
    note: apiUrl?.toString() ?? "Missing/invalid api.url",
  });

  const legalInfoUrl = typeof pluginPayload?.legal_info_url === "string"
    ? tryParseUrl(pluginPayload.legal_info_url)
    : null;
  addCheck(checks, {
    id: "ai-plugin-legal-info-url",
    section: "ai-plugin",
    target: "/.well-known/ai-plugin.json",
    ok: Boolean(legalInfoUrl && legalInfoUrl.pathname === "/about"),
    statusCode: aiPlugin.status,
    note: legalInfoUrl?.toString() ?? "Missing/invalid legal_info_url",
  });

  addCheck(checks, {
    id: "consistency-llms-mentions-ai-plugin",
    section: "consistency",
    target: "llms+ai-plugin",
    ok: llmsPaths.has("/.well-known/ai-plugin.json"),
    statusCode: null,
    note: "llms.txt should include AI plugin manifest endpoint.",
  });
  addCheck(checks, {
    id: "consistency-llms-mentions-graphql",
    section: "consistency",
    target: "llms+ai-plugin",
    ok: llmsPaths.has("/graphql"),
    statusCode: null,
    note: "llms.txt should include GraphQL endpoint.",
  });

  if (apiUrl) {
    addCheck(checks, {
      id: "consistency-plugin-api-in-llms",
      section: "consistency",
      target: "llms+ai-plugin",
      ok: llmsPaths.has(apiUrl.pathname),
      statusCode: null,
      note: `Expect llms.txt to include ${apiUrl.pathname}.`,
    });
  }

  return checks;
}

async function writeReport(report: LlmSurfaceReport) {
  const jsonPath = process.env.SMOKE_LLM_JSON_PATH ?? "output/smoke/llm-surface-report.json";
  const mdPath = process.env.SMOKE_LLM_MD_PATH ?? "output/smoke/llm-surface-report.md";
  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(mdPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# LLM Surface Smoke Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Base URL: ${report.baseUrl}`,
    `- Skip HTTP checks: ${report.skipHttpChecks}`,
    `- Metrics: total=${report.metrics.totalChecks}, passed=${report.metrics.passedChecks}, failed=${report.metrics.failedChecks}, skipped=${report.metrics.skippedChecks}`,
    "",
    "| ID | Section | Target | HTTP | Result | Note |",
    "| --- | --- | --- | --- | --- | --- |",
    ...report.checks.map((check) =>
      `| ${check.id} | ${check.section} | ${check.target} | ${check.statusCode ?? ""} | ${check.ok ? "pass" : "fail"} | ${check.note.replace(/\|/g, "\\|")} |`,
    ),
    "",
  ];

  await writeFile(mdPath, `${lines.join("\n")}\n`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const baseUrl = normalizeBaseUrl(process.env.SMOKE_BASE_URL ?? "https://petm8.io");
  const skipHttpChecks = isEnabled(process.env.SMOKE_LLM_SKIP_HTTP);

  let checks: LlmCheckResult[] = [];
  let status: SmokeStatus = "passed";
  if (skipHttpChecks) {
    status = "skipped";
  } else {
    checks = await runChecks(baseUrl);
    status = checks.some((check) => !check.ok) ? "failed" : "passed";
  }

  const report: LlmSurfaceReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status,
    baseUrl,
    skipHttpChecks,
    metrics: {
      totalChecks: checks.length,
      passedChecks: checks.filter((check) => check.ok).length,
      failedChecks: checks.filter((check) => !check.ok).length,
      skippedChecks: skipHttpChecks ? 1 : 0,
    },
    checks,
  };

  await writeReport(report);
  if (status === "failed") {
    console.error(`LLM surface smoke failed: ${report.metrics.failedChecks} check(s).`);
    process.exitCode = 1;
    return;
  }
  console.log(`LLM surface smoke ${status}.`);
}

main().catch((error) => {
  console.error(`LLM surface smoke crashed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
