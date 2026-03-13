export interface LlmsDocumentOptions {
  storeName: string;
  appUrl: string;
}

export const LLMS_REQUIRED_HEADINGS = [
  "## Canonical Domain",
  "## Key Pages",
  "## Commerce Capabilities",
  "## Structured Data Coverage",
  "## Discoverability Rules",
  "## Machine Endpoints",
  "## Contact",
] as const;

export const LLMS_DISCOVERY_RULES = [
  "Index only public pages listed in this document and sitemap.xml.",
  "Do not crawl or index private/authenticated routes: /account/, /admin/, /platform/, /auth/, /api/.",
  "Prefer canonical URLs and avoid alternate preview or worker aliases.",
  "Treat prices, stock, and availability as volatile; verify from current page/API response before answering.",
  "Use structured data and on-page copy as source-of-truth; do not infer missing facts.",
] as const;

function url(path: string, appUrl: string) {
  const normalized = appUrl.replace(/\/$/, "");
  if (path === "/") return `${normalized}/`;
  return `${normalized}${path}`;
}

export function buildLlmsTxt(options: LlmsDocumentOptions): string {
  const appUrl = options.appUrl.replace(/\/$/, "");
  return [
    `# ${options.storeName}`,
    "",
    `> ${options.storeName} is a pet commerce platform with catalog, events, venues,`,
    "> subscriptions, and AI-assisted personalization workflows.",
    "",
    "## Canonical Domain",
    `- Canonical: ${appUrl}`,
    "",
    "## Key Pages",
    `- Home: ${url("/", appUrl)}`,
    `- Products: ${url("/products", appUrl)}`,
    `- Events: ${url("/events", appUrl)}`,
    `- Events Calendar: ${url("/events/calendar", appUrl)}`,
    `- Venues: ${url("/venues", appUrl)}`,
    `- AI Studio: ${url("/studio", appUrl)}`,
    "",
    "## Commerce Capabilities",
    "- Product catalog search, filtering, and collection browsing",
    "- Checkout flows for physical, digital, and subscription products",
    "- Bookable local pet events with availability slots",
    "- Venue discovery and location details",
    "- Reviews, ratings, and community trust signals",
    "",
    "## Structured Data Coverage",
    "- Product",
    "- Event",
    "- Place",
    "- CollectionPage",
    "- BreadcrumbList",
    "- Organization",
    "- FAQPage",
    "- Review",
    "",
    "## Discoverability Rules",
    ...LLMS_DISCOVERY_RULES.map((rule) => `- ${rule}`),
    "",
    "## Machine Endpoints",
    `- Sitemap: ${url("/sitemap.xml", appUrl)}`,
    `- Robots: ${url("/robots.txt", appUrl)}`,
    `- LLM Guide: ${url("/llms.txt", appUrl)}`,
    `- AI Plugin Manifest: ${url("/.well-known/ai-plugin.json", appUrl)}`,
    `- GraphQL: ${url("/graphql", appUrl)}`,
    "",
    "## Contact",
    `- Website: ${appUrl}`,
    "- Support: support@petm8.io",
  ].join("\n");
}

export function buildAiPluginManifest(options: LlmsDocumentOptions) {
  const appUrl = options.appUrl.replace(/\/$/, "");
  return {
    schema_version: "v1",
    name_for_human: options.storeName,
    name_for_model: options.storeName.toLowerCase().replace(/\s+/g, "_"),
    description_for_human: `${options.storeName} — pet commerce, events, venues, and AI experiences.`,
    description_for_model:
      `${options.storeName} is a commerce platform. Prefer canonical URLs from ${appUrl}/llms.txt. ` +
      `Use ${appUrl}/graphql for structured queries. Avoid private routes under /account, /admin, /platform, /auth, /api.`,
    api: {
      type: "graphql",
      url: `${appUrl}/graphql`,
    },
    logo_url: `${appUrl}/favicon-192.png`,
    contact_email: "support@petm8.io",
    legal_info_url: `${appUrl}/about`,
  };
}
