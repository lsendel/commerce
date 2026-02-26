/**
 * SEO meta tag helpers.
 */

/**
 * Truncate description at a sentence boundary, respecting maxLength.
 */
export function generateMetaDescription(content: string, maxLength = 160): string {
  if (!content) return "";
  const trimmed = content.trim();
  if (trimmed.length <= maxLength) return trimmed;

  // Try to break at sentence boundary
  const truncated = trimmed.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(".");
  const lastExcl = truncated.lastIndexOf("!");
  const lastQuestion = truncated.lastIndexOf("?");
  const lastSentence = Math.max(lastPeriod, lastExcl, lastQuestion);

  if (lastSentence > maxLength * 0.4) {
    return truncated.slice(0, lastSentence + 1);
  }

  // Fall back to word boundary
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + "...";
  }

  return truncated + "...";
}

/**
 * Generate page title in format: "Page | Store"
 */
export function generateMetaTitle(pageTitle: string, storeName: string): string {
  return `${pageTitle} | ${storeName}`;
}

/**
 * Generate canonical URL.
 */
export function generateCanonical(path: string, baseUrl: string): string {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

/**
 * Generate rel=prev/next links for paginated pages.
 */
export function generatePaginationLinks(
  page: number,
  totalPages: number,
  baseUrl: string,
): { prev?: string; next?: string } {
  const result: { prev?: string; next?: string } = {};

  const buildUrl = (p: number): string => {
    const url = new URL(baseUrl, "http://localhost");
    url.searchParams.set("page", String(p));
    return `${url.pathname}${url.search}`;
  };

  if (page > 1) {
    result.prev = buildUrl(page - 1);
  }
  if (page < totalPages) {
    result.next = buildUrl(page + 1);
  }

  return result;
}

/**
 * Auto-generate SEO title/description from product/page name when marketer
 * hasn't set custom SEO values.
 */
export function autoGenerateSEO(
  name: string,
  description?: string,
): { title: string; description: string } {
  const title = name;
  const desc = description
    ? generateMetaDescription(description)
    : `Shop ${name} — premium pet products, personalized designs, and more.`;
  return { title, description: desc };
}
