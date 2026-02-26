import type { Context, Next } from "hono";
import type { Env } from "../env";
import {
  buildCacheKey,
  getCached,
  setCached,
} from "../infrastructure/cache/cache";

interface CacheOptions {
  /** TTL in seconds */
  ttl: number;
  /** Static tags applied to every cached response on this route */
  tags?: string[];
  /**
   * Optional function that derives dynamic tags from the Hono context.
   * Called after the handler runs, receives the context and the response body
   * parsed as JSON (if applicable). Return additional tags to merge with
   * the static ones.
   */
  dynamicTags?: (c: Context<{ Bindings: Env }>, body?: any) => string[];
}

/**
 * Hono middleware that wraps GET route handlers with Cloudflare Cache API
 * caching and tag-based invalidation support.
 *
 * Usage:
 * ```ts
 * catalog.get("/products", cacheResponse({ ttl: 300, tags: ["products:list"] }), handler);
 * ```
 */
export function cacheResponse(options: CacheOptions) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Only cache GET requests
    if (c.req.method !== "GET") {
      await next();
      return;
    }

    const storeId = (c.get("storeId") as string) ?? "default";
    const url = new URL(c.req.url);
    const queryParams: Record<string, string> = {};
    url.searchParams.forEach((v, k) => {
      queryParams[k] = v;
    });

    const cacheKey = buildCacheKey(storeId, url.pathname, queryParams);

    // ── Try cache hit ──────────────────────────────────────
    const cached = await getCached(cacheKey);
    if (cached) {
      const resp = new Response(cached.body, {
        status: cached.status,
        headers: new Headers(cached.headers),
      });
      resp.headers.set("X-Cache", "HIT");
      return resp;
    }

    // ── Cache miss — run handler ───────────────────────────
    await next();

    // Only cache successful JSON/HTML responses
    const res = c.res;
    if (!res || res.status < 200 || res.status >= 300) return;

    const contentType = res.headers.get("Content-Type") ?? "";
    const isJson = contentType.includes("application/json");
    const isHtml = contentType.includes("text/html");
    if (!isJson && !isHtml) return;

    // Compute tags
    let tags = options.tags ? [...options.tags] : [];
    if (options.dynamicTags) {
      try {
        if (isJson) {
          const cloned = res.clone();
          const body = await cloned.json();
          tags = tags.concat(options.dynamicTags(c, body));
        } else {
          tags = tags.concat(options.dynamicTags(c));
        }
      } catch {
        // dynamic tag extraction failure is non-fatal
      }
    }

    // Store in cache (non-blocking)
    const responseToCache = res.clone();
    const newHeaders = new Headers(res.headers);
    newHeaders.set("X-Cache", "MISS");
    c.res = new Response(res.body, {
      status: res.status,
      headers: newHeaders,
    });

    // Fire-and-forget cache write
    try {
      await setCached(cacheKey, responseToCache, tags, options.ttl);
    } catch {
      // cache write failures are non-fatal
    }
  };
}
