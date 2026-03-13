import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type SmokeStatus = "passed" | "failed" | "skipped";

type SeoCheckSection = "robots" | "sitemap" | "metadata" | "canonical" | "structured-data";

interface SeoCheckResult {
  id: string;
  section: SeoCheckSection;
  target: string;
  ok: boolean;
  statusCode: number | null;
  note: string;
}

interface SeoAuditReport {
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
  checks: SeoCheckResult[];
}

interface HttpTextResponse {
  status: number;
  contentType: string;
  body: string;
}

interface PageCheckTarget {
  id: string;
  path: string;
  requireJsonLd: boolean;
}

function isEnabled(value: string | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function normalizeBaseUrl(raw: string): string {
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function tryParseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function extractTagAttribute(tag: string, attribute: string): string | null {
  const regex = new RegExp(`${attribute}\\s*=\\s*["']([^"']+)["']`, "i");
  const match = tag.match(regex);
  return match?.[1] ?? null;
}

function extractCanonicalHref(html: string): string | null {
  const linkTags = [...html.matchAll(/<link\b[^>]*>/gi)];
  for (const match of linkTags) {
    const tag = match[0];
    const rel = extractTagAttribute(tag, "rel");
    if (!rel) continue;
    if (!rel.toLowerCase().split(/\s+/).includes("canonical")) continue;
    const href = extractTagAttribute(tag, "href");
    if (href) return href;
  }
  return null;
}

function extractMetaContent(html: string, name: string): string | null {
  const metaTags = [...html.matchAll(/<meta\b[^>]*>/gi)];
  for (const match of metaTags) {
    const tag = match[0];
    const attrName = extractTagAttribute(tag, "name");
    if (!attrName || attrName.toLowerCase() !== name.toLowerCase()) continue;
    const content = extractTagAttribute(tag, "content");
    if (content != null) return content;
  }
  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  const title = match[1]?.replace(/\s+/g, " ").trim() ?? "";
  return title.length > 0 ? title : null;
}

function extractJsonLdPayloads(html: string): { payloads: unknown[]; parseErrors: string[] } {
  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const payloads: unknown[] = [];
  const parseErrors: string[] = [];
  scripts.forEach((script, index) => {
    const raw = script[1]?.trim() ?? "";
    if (!raw) return;
    try {
      payloads.push(JSON.parse(raw));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      parseErrors.push(`script#${index + 1}: ${message}`);
    }
  });
  return { payloads, parseErrors };
}

function hasSchemaOrgContext(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const context = record["@context"];
  if (typeof context === "string" && context.includes("schema.org")) {
    return true;
  }
  if (Array.isArray(context) && context.some((entry) => typeof entry === "string" && entry.includes("schema.org"))) {
    return true;
  }
  if (Array.isArray(record["@graph"])) {
    return (record["@graph"] as unknown[]).some((node) => hasSchemaOrgContext(node));
  }
  return false;
}

function collectJsonLdTypes(value: unknown, collector: Set<string>) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectJsonLdTypes(entry, collector));
    return;
  }
  const record = value as Record<string, unknown>;
  const typeValue = record["@type"];
  if (typeof typeValue === "string" && typeValue.trim()) {
    collector.add(typeValue.trim());
  } else if (Array.isArray(typeValue)) {
    typeValue.forEach((entry) => {
      if (typeof entry === "string" && entry.trim()) collector.add(entry.trim());
    });
  }
  Object.values(record).forEach((entry) => collectJsonLdTypes(entry, collector));
}

async function fetchText(baseUrl: string, path: string): Promise<HttpTextResponse> {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "follow" });
  return {
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    body: await response.text(),
  };
}

function normalizeCanonical(href: string): string | null {
  try {
    const url = new URL(href);
    const cleanPath = normalizePath(url.pathname);
    return `${url.origin}${cleanPath}${url.search}`;
  } catch {
    return null;
  }
}

function addCheck(
  checks: SeoCheckResult[],
  check: Omit<SeoCheckResult, "ok"> & { ok: boolean },
) {
  checks.push(check);
}

async function runChecks(baseUrl: string): Promise<SeoCheckResult[]> {
  const checks: SeoCheckResult[] = [];

  const robots = await fetchText(baseUrl, "/robots.txt");
  addCheck(checks, {
    id: "robots-status",
    section: "robots",
    target: "/robots.txt",
    ok: robots.status === 200,
    statusCode: robots.status,
    note: robots.status === 200 ? "ok" : "Expected HTTP 200.",
  });
  addCheck(checks, {
    id: "robots-content-type",
    section: "robots",
    target: "/robots.txt",
    ok: robots.contentType.toLowerCase().includes("text/plain"),
    statusCode: robots.status,
    note: robots.contentType || "Missing Content-Type.",
  });

  const requiredRobotsRules = [
    "User-agent: *",
    "Disallow: /api/",
    "Disallow: /admin/",
    "Disallow: /platform/",
    "Disallow: /account/",
    "Disallow: /auth/",
  ];
  for (const rule of requiredRobotsRules) {
    addCheck(checks, {
      id: `robots-rule-${rule.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      section: "robots",
      target: "/robots.txt",
      ok: robots.body.includes(rule),
      statusCode: robots.status,
      note: `Expect "${rule}"`,
    });
  }
  const robotsSitemapMatch = robots.body.match(/^Sitemap:\s*(\S+)\s*$/im);
  const robotsSitemapUrl = robotsSitemapMatch?.[1] ?? null;
  const robotsSitemapParsed = robotsSitemapUrl ? tryParseUrl(robotsSitemapUrl) : null;
  addCheck(checks, {
    id: "robots-sitemap-directive",
    section: "robots",
    target: "/robots.txt",
    ok: Boolean(robotsSitemapParsed && normalizePath(robotsSitemapParsed.pathname) === "/sitemap.xml"),
    statusCode: robots.status,
    note: robotsSitemapUrl ?? "Missing Sitemap directive.",
  });

  const sitemap = await fetchText(baseUrl, "/sitemap.xml");
  addCheck(checks, {
    id: "sitemap-status",
    section: "sitemap",
    target: "/sitemap.xml",
    ok: sitemap.status === 200,
    statusCode: sitemap.status,
    note: sitemap.status === 200 ? "ok" : "Expected HTTP 200.",
  });
  addCheck(checks, {
    id: "sitemap-content-type",
    section: "sitemap",
    target: "/sitemap.xml",
    ok: sitemap.contentType.toLowerCase().includes("xml"),
    statusCode: sitemap.status,
    note: sitemap.contentType || "Missing Content-Type.",
  });

  const sitemapLocs = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1]?.trim() ?? "");
  const uniqueLocs = new Set(sitemapLocs);
  const parsedSitemapUrls = sitemapLocs.map((loc) => tryParseUrl(loc)).filter((url): url is URL => Boolean(url));
  const sitemapPaths = new Set(parsedSitemapUrls.map((url) => normalizePath(url.pathname)));
  addCheck(checks, {
    id: "sitemap-has-urls",
    section: "sitemap",
    target: "/sitemap.xml",
    ok: sitemapLocs.length > 0,
    statusCode: sitemap.status,
    note: `Found ${sitemapLocs.length} URL entries.`,
  });
  addCheck(checks, {
    id: "sitemap-no-duplicates",
    section: "sitemap",
    target: "/sitemap.xml",
    ok: sitemapLocs.length === uniqueLocs.size,
    statusCode: sitemap.status,
    note: `Entries=${sitemapLocs.length}, unique=${uniqueLocs.size}.`,
  });

  const requiredSitemapPaths = ["/", "/products", "/events", "/venues"];
  for (const path of requiredSitemapPaths) {
    addCheck(checks, {
      id: `sitemap-contains-${path.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      section: "sitemap",
      target: "/sitemap.xml",
      ok: sitemapPaths.has(path),
      statusCode: sitemap.status,
      note: `Expect path "${path}"`,
    });
  }

  const disallowedSitemapFragments = ["/api/", "/admin/", "/platform/", "/account/", "/auth/"];
  for (const fragment of disallowedSitemapFragments) {
    const found = parsedSitemapUrls.find((url) => url.pathname.includes(fragment));
    addCheck(checks, {
      id: `sitemap-excludes-${fragment.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      section: "sitemap",
      target: "/sitemap.xml",
      ok: !found,
      statusCode: sitemap.status,
      note: found ? `Found disallowed URL: ${found.href}` : "ok",
    });
  }

  const staticTargets: PageCheckTarget[] = [
    { id: "home", path: "/", requireJsonLd: true },
    { id: "products", path: "/products", requireJsonLd: false },
    { id: "events", path: "/events", requireJsonLd: false },
    { id: "venues", path: "/venues", requireJsonLd: false },
  ];
  const dynamicProduct = parsedSitemapUrls.find((url) => /^\/products\/[^/]+$/.test(url.pathname));
  const dynamicEvent = parsedSitemapUrls.find((url) => /^\/events\/(?!calendar$)[^/]+$/.test(url.pathname));

  const dynamicTargets: PageCheckTarget[] = [];
  if (dynamicProduct) {
    dynamicTargets.push({
      id: "product-detail",
      path: dynamicProduct.pathname,
      requireJsonLd: true,
    });
  }
  if (dynamicEvent) {
    dynamicTargets.push({
      id: "event-detail",
      path: dynamicEvent.pathname,
      requireJsonLd: true,
    });
  }

  const pageTargets = [...staticTargets, ...dynamicTargets];
  const canonicalOrigins = new Set<string>();
  const strictCanonicalOrigin = isEnabled(process.env.SMOKE_SEO_STRICT_CANONICAL_ORIGIN);
  for (const target of pageTargets) {
    const response = await fetchText(baseUrl, target.path);
    addCheck(checks, {
      id: `${target.id}-status`,
      section: "metadata",
      target: target.path,
      ok: response.status === 200,
      statusCode: response.status,
      note: response.status === 200 ? "ok" : "Expected HTTP 200.",
    });
    addCheck(checks, {
      id: `${target.id}-content-type`,
      section: "metadata",
      target: target.path,
      ok: response.contentType.toLowerCase().includes("text/html"),
      statusCode: response.status,
      note: response.contentType || "Missing Content-Type.",
    });

    const title = extractTitle(response.body);
    addCheck(checks, {
      id: `${target.id}-title`,
      section: "metadata",
      target: target.path,
      ok: Boolean(title && title.length >= 5),
      statusCode: response.status,
      note: title ? `Title length=${title.length}` : "Missing <title>.",
    });

    const description = extractMetaContent(response.body, "description");
    addCheck(checks, {
      id: `${target.id}-description`,
      section: "metadata",
      target: target.path,
      ok: Boolean(description && description.length >= 40 && description.length <= 320),
      statusCode: response.status,
      note: description ? `Description length=${description.length}` : "Missing meta description.",
    });

    const robotsMeta = extractMetaContent(response.body, "robots");
    addCheck(checks, {
      id: `${target.id}-robots-meta`,
      section: "metadata",
      target: target.path,
      ok: Boolean(robotsMeta && robotsMeta.toLowerCase().includes("index")),
      statusCode: response.status,
      note: robotsMeta ? `robots=${robotsMeta}` : "Missing robots meta tag.",
    });

    const canonical = extractCanonicalHref(response.body);
    const normalizedCanonical = canonical ? normalizeCanonical(canonical) : null;
    const canonicalParsed = canonical ? tryParseUrl(canonical) : null;
    if (canonicalParsed) canonicalOrigins.add(canonicalParsed.origin);
    addCheck(checks, {
      id: `${target.id}-canonical-present`,
      section: "canonical",
      target: target.path,
      ok: Boolean(canonical),
      statusCode: response.status,
      note: canonical ?? "Missing canonical link.",
    });
    addCheck(checks, {
      id: `${target.id}-canonical-absolute`,
      section: "canonical",
      target: target.path,
      ok: Boolean(canonicalParsed),
      statusCode: response.status,
      note: normalizedCanonical ?? "Invalid canonical URL.",
    });
    addCheck(checks, {
      id: `${target.id}-canonical-path-match`,
      section: "canonical",
      target: target.path,
      ok: Boolean(
        canonicalParsed && normalizePath(canonicalParsed.pathname) === normalizePath(target.path),
      ),
      statusCode: response.status,
      note: normalizedCanonical ?? "Invalid canonical URL.",
    });

    const { payloads, parseErrors } = extractJsonLdPayloads(response.body);
    addCheck(checks, {
      id: `${target.id}-jsonld-valid`,
      section: "structured-data",
      target: target.path,
      ok: parseErrors.length === 0,
      statusCode: response.status,
      note: parseErrors.length > 0 ? parseErrors.join("; ") : `payloads=${payloads.length}`,
    });

    const schemaPayloads = payloads.filter((payload) => hasSchemaOrgContext(payload));
    const types = new Set<string>();
    schemaPayloads.forEach((payload) => collectJsonLdTypes(payload, types));

    if (target.requireJsonLd) {
      addCheck(checks, {
        id: `${target.id}-jsonld-required`,
        section: "structured-data",
        target: target.path,
        ok: schemaPayloads.length > 0,
        statusCode: response.status,
        note: `schemaPayloads=${schemaPayloads.length}`,
      });
      addCheck(checks, {
        id: `${target.id}-jsonld-has-types`,
        section: "structured-data",
        target: target.path,
        ok: types.size > 0,
        statusCode: response.status,
        note: `types=${[...types].sort().join(", ") || "none"}`,
      });
    }
  }

  addCheck(checks, {
    id: "canonical-origin-consistency",
    section: "canonical",
    target: "all-pages",
    ok: strictCanonicalOrigin ? canonicalOrigins.size <= 1 : true,
    statusCode: null,
    note: canonicalOrigins.size > 1
      ? strictCanonicalOrigin
        ? `Origins=${[...canonicalOrigins].join(", ")}`
        : `Origins vary (${[...canonicalOrigins].join(", ")}); strict mode disabled`
      : "ok",
  });

  return checks;
}

async function writeReport(report: SeoAuditReport) {
  const jsonPath = process.env.SMOKE_SEO_JSON_PATH ?? "output/smoke/seo-audit-report.json";
  const mdPath = process.env.SMOKE_SEO_MD_PATH ?? "output/smoke/seo-audit-report.md";
  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(mdPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# Technical SEO Smoke Audit Report",
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
      `| ${check.id} | ${check.section} | ${check.target} | ${check.statusCode ?? ""} | ${check.ok ? "pass" : "fail"} | ${check.note.replace(/\|/g, "\\|")} |`
    ),
    "",
  ];

  await writeFile(mdPath, `${lines.join("\n")}`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const baseUrl = normalizeBaseUrl(process.env.SMOKE_BASE_URL ?? "https://petm8.io");
  const skipHttpChecks = isEnabled(process.env.SMOKE_SEO_SKIP_HTTP);

  let checks: SeoCheckResult[] = [];
  let status: SmokeStatus = "passed";

  if (skipHttpChecks) {
    status = "skipped";
  } else {
    checks = await runChecks(baseUrl);
    const failed = checks.filter((check) => !check.ok).length;
    status = failed > 0 ? "failed" : "passed";
  }

  const report: SeoAuditReport = {
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
    console.error(`SEO smoke audit failed: ${report.metrics.failedChecks} check(s).`);
    process.exitCode = 1;
    return;
  }
  console.log(`SEO smoke audit ${status}.`);
}

main().catch((error) => {
  console.error(`SEO smoke audit crashed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
