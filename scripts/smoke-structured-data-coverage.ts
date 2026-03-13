import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  buildCollectionPage,
  buildItemList,
  buildOrganization,
  buildPlace,
  buildWebPage,
  buildWebSite,
} from "../src/infrastructure/seo/json-ld";

type SmokeStatus = "passed" | "failed" | "skipped";
type CheckSection = "schema-tests" | "live-coverage";

interface StructuredDataCheck {
  id: string;
  section: CheckSection;
  target: string;
  ok: boolean;
  statusCode: number | null;
  note: string;
}

interface CoverageRow {
  path: string;
  expectedTypes: string[];
  discoveredTypes: string[];
  payloadCount: number;
}

interface StructuredDataReport {
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
  checks: StructuredDataCheck[];
  coverage: CoverageRow[];
}

interface HttpTextResponse {
  status: number;
  contentType: string;
  body: string;
}

interface PageExpectation {
  id: string;
  path: string;
  expectedTypes: string[];
}

function isEnabled(value: string | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function normalizeBaseUrl(raw: string): string {
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function addCheck(checks: StructuredDataCheck[], check: StructuredDataCheck) {
  checks.push(check);
}

function hasSchemaContext(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  const context = record["@context"];
  if (typeof context === "string" && context.includes("schema.org")) return true;
  if (Array.isArray(context) && context.some((item) => typeof item === "string" && item.includes("schema.org"))) return true;
  return false;
}

function collectTypes(payload: unknown, collector: Set<string>) {
  if (!payload || typeof payload !== "object") return;
  if (Array.isArray(payload)) {
    payload.forEach((value) => collectTypes(value, collector));
    return;
  }
  const record = payload as Record<string, unknown>;
  const typeValue = record["@type"];
  if (typeof typeValue === "string" && typeValue.trim()) {
    collector.add(typeValue.trim());
  } else if (Array.isArray(typeValue)) {
    typeValue.forEach((value) => {
      if (typeof value === "string" && value.trim()) collector.add(value.trim());
    });
  }
  Object.values(record).forEach((value) => collectTypes(value, collector));
}

function extractJsonLdPayloads(html: string) {
  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const payloads: unknown[] = [];
  const parseErrors: string[] = [];
  scripts.forEach((script, index) => {
    const content = script[1]?.trim() ?? "";
    if (!content) return;
    try {
      payloads.push(JSON.parse(content));
    } catch (error) {
      parseErrors.push(`script#${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  return { payloads, parseErrors };
}

async function fetchText(baseUrl: string, path: string): Promise<HttpTextResponse> {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "follow" });
  return {
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    body: await response.text(),
  };
}

function runSchemaTests(baseUrl: string): StructuredDataCheck[] {
  const checks: StructuredDataCheck[] = [];
  const org = buildOrganization({
    name: "petm8",
    url: baseUrl,
    email: "support@petm8.io",
  });
  addCheck(checks, {
    id: "schema-organization-type",
    section: "schema-tests",
    target: "buildOrganization",
    ok: org["@type"] === "Organization" && org["@context"] === "https://schema.org",
    statusCode: null,
    note: `type=${String(org["@type"] ?? "")}`,
  });

  const website = buildWebSite({
    name: "petm8",
    url: baseUrl,
    description: "Pet commerce platform",
  });
  addCheck(checks, {
    id: "schema-website-search-action",
    section: "schema-tests",
    target: "buildWebSite",
    ok: website["@type"] === "WebSite" && typeof (website.potentialAction as any)?.target?.urlTemplate === "string",
    statusCode: null,
    note: `urlTemplate=${String((website.potentialAction as any)?.target?.urlTemplate ?? "")}`,
  });

  const collection = buildCollectionPage(
    {
      name: "Product Catalog",
      description: "Catalog",
      url: `${baseUrl}/products`,
    },
    10,
  );
  addCheck(checks, {
    id: "schema-collection-page-shape",
    section: "schema-tests",
    target: "buildCollectionPage",
    ok: collection["@type"] === "CollectionPage" && collection.numberOfItems === 10,
    statusCode: null,
    note: `numberOfItems=${String(collection.numberOfItems ?? "")}`,
  });

  const itemList = buildItemList({
    name: "Products",
    url: `${baseUrl}/products`,
    items: [
      { name: "Item A", url: `${baseUrl}/products/a` },
      { name: "Item B", url: `${baseUrl}/products/b` },
    ],
  });
  const itemListElements = (itemList.itemListElement as unknown[]) ?? [];
  addCheck(checks, {
    id: "schema-item-list-elements",
    section: "schema-tests",
    target: "buildItemList",
    ok: itemList["@type"] === "ItemList" && itemListElements.length === 2,
    statusCode: null,
    note: `itemListElementCount=${itemListElements.length}`,
  });

  const aboutPage = buildWebPage({
    type: "AboutPage",
    name: "About",
    url: `${baseUrl}/about`,
    description: "About page",
  });
  addCheck(checks, {
    id: "schema-web-page-type",
    section: "schema-tests",
    target: "buildWebPage",
    ok: aboutPage["@type"] === "AboutPage" && aboutPage.url === `${baseUrl}/about`,
    statusCode: null,
    note: `type=${String(aboutPage["@type"] ?? "")}`,
  });

  const place = buildPlace({
    name: "Venue",
    address: "123 Pet St",
    city: "Austin",
    state: "TX",
    zipCode: "78701",
    country: "US",
    url: `${baseUrl}/venues/sample`,
  });
  addCheck(checks, {
    id: "schema-place-address",
    section: "schema-tests",
    target: "buildPlace",
    ok: place["@type"] === "Place" && typeof (place.address as any)?.streetAddress === "string",
    statusCode: null,
    note: `streetAddress=${String((place.address as any)?.streetAddress ?? "")}`,
  });

  return checks;
}

function parseSitemapPaths(xml: string): string[] {
  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1]?.trim() ?? "");
  return locations
    .map((location) => {
      try {
        return new URL(location).pathname;
      } catch {
        return "";
      }
    })
    .filter((path) => Boolean(path));
}

async function runLiveCoverage(baseUrl: string) {
  const checks: StructuredDataCheck[] = [];
  const coverage: CoverageRow[] = [];

  const sitemap = await fetchText(baseUrl, "/sitemap.xml");
  addCheck(checks, {
    id: "coverage-sitemap-status",
    section: "live-coverage",
    target: "/sitemap.xml",
    ok: sitemap.status === 200,
    statusCode: sitemap.status,
    note: sitemap.status === 200 ? "ok" : "Expected HTTP 200.",
  });

  const sitemapPaths = parseSitemapPaths(sitemap.body);
  const productDetailPath = sitemapPaths.find((path) => /^\/products\/[^/]+$/.test(path));
  const eventDetailPath = sitemapPaths.find((path) => /^\/events\/(?!calendar$)[^/]+$/.test(path));
  const venueDetailPath = sitemapPaths.find((path) => /^\/venues\/[^/]+$/.test(path));

  const pages: PageExpectation[] = [
    { id: "home", path: "/", expectedTypes: ["Organization", "WebSite"] },
    { id: "products", path: "/products", expectedTypes: ["CollectionPage", "ItemList"] },
    { id: "events", path: "/events", expectedTypes: ["CollectionPage", "ItemList"] },
    { id: "events-calendar", path: "/events/calendar", expectedTypes: ["CollectionPage"] },
    { id: "venues", path: "/venues", expectedTypes: ["CollectionPage", "ItemList"] },
    { id: "about", path: "/about", expectedTypes: ["AboutPage"] },
    { id: "contact", path: "/contact", expectedTypes: ["ContactPage"] },
  ];
  if (productDetailPath) pages.push({ id: "product-detail", path: productDetailPath, expectedTypes: ["Product", "BreadcrumbList"] });
  if (eventDetailPath) pages.push({ id: "event-detail", path: eventDetailPath, expectedTypes: ["Event"] });
  if (venueDetailPath) pages.push({ id: "venue-detail", path: venueDetailPath, expectedTypes: ["Place"] });

  for (const page of pages) {
    const response = await fetchText(baseUrl, page.path);
    addCheck(checks, {
      id: `${page.id}-status`,
      section: "live-coverage",
      target: page.path,
      ok: response.status === 200,
      statusCode: response.status,
      note: response.status === 200 ? "ok" : "Expected HTTP 200.",
    });
    const { payloads, parseErrors } = extractJsonLdPayloads(response.body);
    addCheck(checks, {
      id: `${page.id}-jsonld-parse`,
      section: "live-coverage",
      target: page.path,
      ok: parseErrors.length === 0,
      statusCode: response.status,
      note: parseErrors.length > 0 ? parseErrors.join("; ") : `payloads=${payloads.length}`,
    });

    const schemaPayloads = payloads.filter((payload) => hasSchemaContext(payload));
    const discoveredTypes = new Set<string>();
    schemaPayloads.forEach((payload) => collectTypes(payload, discoveredTypes));

    addCheck(checks, {
      id: `${page.id}-jsonld-present`,
      section: "live-coverage",
      target: page.path,
      ok: schemaPayloads.length > 0,
      statusCode: response.status,
      note: `schemaPayloads=${schemaPayloads.length}`,
    });

    for (const expectedType of page.expectedTypes) {
      addCheck(checks, {
        id: `${page.id}-type-${expectedType.toLowerCase()}`,
        section: "live-coverage",
        target: page.path,
        ok: discoveredTypes.has(expectedType),
        statusCode: response.status,
        note: `discovered=${[...discoveredTypes].sort().join(", ") || "none"}`,
      });
    }

    coverage.push({
      path: page.path,
      expectedTypes: page.expectedTypes,
      discoveredTypes: [...discoveredTypes].sort(),
      payloadCount: schemaPayloads.length,
    });
  }

  return { checks, coverage };
}

async function writeReport(report: StructuredDataReport) {
  const jsonPath = process.env.SMOKE_STRUCTURED_DATA_JSON_PATH ?? "output/smoke/structured-data-coverage-report.json";
  const mdPath = process.env.SMOKE_STRUCTURED_DATA_MD_PATH ?? "output/smoke/structured-data-coverage-report.md";
  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(mdPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# Structured Data Coverage Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Base URL: ${report.baseUrl}`,
    `- Skip HTTP checks: ${report.skipHttpChecks}`,
    `- Metrics: total=${report.metrics.totalChecks}, passed=${report.metrics.passedChecks}, failed=${report.metrics.failedChecks}, skipped=${report.metrics.skippedChecks}`,
    "",
    "## Checks",
    "",
    "| ID | Section | Target | HTTP | Result | Note |",
    "| --- | --- | --- | --- | --- | --- |",
    ...report.checks.map((check) =>
      `| ${check.id} | ${check.section} | ${check.target} | ${check.statusCode ?? ""} | ${check.ok ? "pass" : "fail"} | ${check.note.replace(/\|/g, "\\|")} |`,
    ),
    "",
    "## Coverage",
    "",
    "| Path | Expected Types | Discovered Types | Payloads |",
    "| --- | --- | --- | --- |",
    ...report.coverage.map((row) =>
      `| ${row.path} | ${row.expectedTypes.join(", ")} | ${row.discoveredTypes.join(", ") || "none"} | ${row.payloadCount} |`,
    ),
    "",
  ];

  await writeFile(mdPath, `${lines.join("\n")}\n`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const baseUrl = normalizeBaseUrl(process.env.SMOKE_BASE_URL ?? "https://petm8.io");
  const skipHttpChecks = isEnabled(process.env.SMOKE_STRUCTURED_DATA_SKIP_HTTP);

  const checks = runSchemaTests(baseUrl);
  const coverage: CoverageRow[] = [];
  if (!skipHttpChecks) {
    const live = await runLiveCoverage(baseUrl);
    checks.push(...live.checks);
    coverage.push(...live.coverage);
  }

  const report: StructuredDataReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: checks.some((check) => !check.ok) ? "failed" : skipHttpChecks ? "skipped" : "passed",
    baseUrl,
    skipHttpChecks,
    metrics: {
      totalChecks: checks.length,
      passedChecks: checks.filter((check) => check.ok).length,
      failedChecks: checks.filter((check) => !check.ok).length,
      skippedChecks: skipHttpChecks ? 1 : 0,
    },
    checks,
    coverage,
  };

  await writeReport(report);
  if (report.status === "failed") {
    console.error(`Structured-data smoke failed: ${report.metrics.failedChecks} check(s).`);
    process.exitCode = 1;
    return;
  }
  console.log(`Structured-data smoke ${report.status}.`);
}

main().catch((error) => {
  console.error(`Structured-data smoke crashed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
