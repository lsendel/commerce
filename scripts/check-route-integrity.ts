import { readFile } from "node:fs/promises";
import { join } from "node:path";

interface HrefMatch {
  href: string;
  line: number;
}

interface InvalidHref extends HrefMatch {
  file: string;
}

const INDEX_FILE = "src/index.tsx";
const NAV_FILES = [
  "src/components/layout/nav.tsx",
  "src/components/layout/header.tsx",
  "src/components/layout/footer.tsx",
  "src/components/layout/admin-sidebar.tsx",
  "src/components/layout/admin-topbar.tsx",
];

const HREF_PATTERNS = [
  /href:\s*["'`]([^"'`]+)["'`]/g,
  /href=\s*["'`]([^"'`]+)["'`]/g,
];

function toLineNumber(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

function normalizePath(pathname: string): string {
  const withoutHash = pathname.split("#")[0] ?? "";
  const [withoutQuery] = withoutHash.split("?");
  if (!withoutQuery) return "/";
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery;
}

function shouldSkipHref(rawHref: string): boolean {
  return (
    !rawHref.startsWith("/") ||
    rawHref.startsWith("/api/") ||
    rawHref.startsWith("/styles/") ||
    rawHref.startsWith("/scripts/") ||
    rawHref.includes("${")
  );
}

function extractHrefs(source: string): HrefMatch[] {
  const found = new Map<string, HrefMatch>();

  for (const pattern of HREF_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      const href = match[1];
      if (!href || shouldSkipHref(href)) continue;
      const key = `${href}:${match.index}`;
      if (!found.has(key)) {
        found.set(key, {
          href: normalizePath(href),
          line: toLineNumber(source, match.index),
        });
      }
    }
  }

  return [...found.values()];
}

function buildRouteRegex(routePattern: string): RegExp {
  const escaped = routePattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/:[a-zA-Z0-9_]+/g, "[^/]+");
  return new RegExp(`^${escaped}$`);
}

function extractPageRoutes(source: string): Set<string> {
  const routes = new Set<string>();
  const routePattern = /app\.get\(\s*["'`]([^"'`]+)["'`]/g;
  const childAppRoutes = new Map<string, Set<string>>();
  const childRoutePattern = /([a-zA-Z0-9_]+)\.get\(\s*["'`]([^"'`]+)["'`]/g;
  const mountPattern = /app\.route\(\s*["'`]([^"'`]+)["'`]\s*,\s*([a-zA-Z0-9_]+)\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = routePattern.exec(source)) !== null) {
    const route = match[1];
    if (!route || !route.startsWith("/")) continue;
    routes.add(normalizePath(route));
  }

  while ((match = childRoutePattern.exec(source)) !== null) {
    const appName = match[1];
    const route = match[2];
    if (!appName || !route || !route.startsWith("/")) continue;
    if (!childAppRoutes.has(appName)) {
      childAppRoutes.set(appName, new Set<string>());
    }
    childAppRoutes.get(appName)?.add(normalizePath(route));
  }

  while ((match = mountPattern.exec(source)) !== null) {
    const basePath = normalizePath(match[1] ?? "");
    const appName = match[2];
    if (!basePath || !appName) continue;

    const mountedRoutes = childAppRoutes.get(appName);
    if (!mountedRoutes) continue;

    for (const mountedRoute of mountedRoutes) {
      if (mountedRoute === "/") {
        routes.add(basePath);
        continue;
      }
      routes.add(normalizePath(basePath + mountedRoute));
    }
  }

  return routes;
}

function pathMatchesRoute(pathname: string, routes: Set<string>, dynamicMatchers: RegExp[]): boolean {
  if (routes.has(pathname)) return true;
  return dynamicMatchers.some((matcher) => matcher.test(pathname));
}

async function main() {
  const cwd = process.cwd();
  const indexSource = await readFile(join(cwd, INDEX_FILE), "utf8");
  const routes = extractPageRoutes(indexSource);
  const dynamicMatchers = [...routes]
    .filter((route) => route.includes(":") || route.includes("*"))
    .map((route) => buildRouteRegex(route));

  const invalidLinks: InvalidHref[] = [];

  for (const file of NAV_FILES) {
    const source = await readFile(join(cwd, file), "utf8");
    const hrefs = extractHrefs(source);
    for (const entry of hrefs) {
      if (!pathMatchesRoute(entry.href, routes, dynamicMatchers)) {
        invalidLinks.push({ file, href: entry.href, line: entry.line });
      }
    }
  }

  if (invalidLinks.length === 0) {
    console.log(`Route integrity check passed (${NAV_FILES.length} files scanned).`);
    return;
  }

  console.error("Route integrity check failed. Broken internal links:");
  for (const broken of invalidLinks) {
    console.error(`- ${broken.file}:${broken.line} -> ${broken.href}`);
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error("Route integrity check could not run:", error);
  process.exitCode = 1;
});
