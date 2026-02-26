/**
 * Tag-based caching utility using Cloudflare Cache API.
 *
 * Cache keys follow the pattern:
 *   https://cache.internal/${storeId}/${routePattern}/${queryParams}
 *
 * Tag mappings are kept in an in-memory Map. The actual cached
 * responses live in `getDefaultCache()` (Cloudflare Cache API).
 */

// Cloudflare Workers CacheStorage has a `default` property that may not
// be in the standard lib typings.  Cast once to avoid TS2339 everywhere.
function getDefaultCache(): Cache {
  return (caches as any).default as Cache;
}

// ── tag → cache-key index ────────────────────────────────────
const tagIndex = new Map<string, Set<string>>();

function indexTags(key: string, tags: string[]): void {
  for (const tag of tags) {
    let keys = tagIndex.get(tag);
    if (!keys) {
      keys = new Set();
      tagIndex.set(tag, keys);
    }
    keys.add(key);
  }
}

// ── public helpers ───────────────────────────────────────────

/** Build a deterministic cache key URL. */
export function buildCacheKey(
  storeId: string,
  routePattern: string,
  queryParams?: Record<string, string>,
): string {
  const base = `https://cache.internal/${storeId}/${routePattern.replace(/^\//, "")}`;
  if (!queryParams || Object.keys(queryParams).length === 0) return base;
  const sorted = Object.entries(queryParams)
    .filter(([, v]) => v !== undefined && v !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  if (sorted.length === 0) return base;
  const qs = sorted.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  return `${base}?${qs}`;
}

/** Attempt to retrieve a cached Response. Returns `null` on miss. */
export async function getCached(key: string): Promise<Response | null> {
  try {
    const cache = getDefaultCache();
    const match = await cache.match(new Request(key));
    return match ?? null;
  } catch {
    return null;
  }
}

/**
 * Store a Response in the Cloudflare Cache API with an explicit TTL
 * and index it under the supplied tags.
 *
 * The original response is cloned so the caller can still read it.
 */
export async function setCached(
  key: string,
  response: Response,
  tags: string[],
  ttlSeconds: number,
): Promise<void> {
  try {
    const cache = getDefaultCache();
    const cloned = new Response(response.clone().body, {
      status: response.status,
      headers: new Headers(response.headers),
    });
    cloned.headers.set("Cache-Control", `public, max-age=${ttlSeconds}`);
    cloned.headers.set("X-Cache-Tags", tags.join(","));
    await cache.put(new Request(key), cloned);
    indexTags(key, tags);
  } catch {
    // cache put failures are non-fatal
  }
}

/**
 * Purge every cached entry associated with the given tag.
 *
 * Because the tag index is in-memory it only covers keys written
 * during the current Worker invocation. This is fine for
 * write-then-invalidate flows within a single request.
 */
export async function invalidateByTag(tag: string): Promise<void> {
  const keys = tagIndex.get(tag);
  if (!keys) return;
  const cache = getDefaultCache();
  const promises: Promise<boolean>[] = [];
  for (const key of keys) {
    promises.push(cache.delete(new Request(key)));
  }
  await Promise.all(promises);
  tagIndex.delete(tag);
}

/**
 * Purge multiple tags at once.
 */
export async function invalidateByTags(tags: string[]): Promise<void> {
  await Promise.all(tags.map(invalidateByTag));
}
