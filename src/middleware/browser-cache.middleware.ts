import type { Context, Next } from "hono";
import type { Env } from "../env";

/**
 * Browser-caching middleware (Phase E4).
 *
 * Sets appropriate Cache-Control, Vary, and ETag headers depending on
 * the request path:
 *
 *  - Static assets (/scripts/*, /styles/*, /fonts/*):
 *      Cache-Control: public, max-age=31536000, immutable
 *
 *  - HTML pages (non-API, non-static):
 *      Cache-Control: public, max-age=0, must-revalidate
 *      + ETag from body hash + If-None-Match → 304
 *
 *  - API responses (/api/*):
 *      Cache-Control: private, no-cache
 *      (unless the route-level cacheResponse middleware already set headers)
 */
export function browserCaching() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    await next();

    const path = new URL(c.req.url).pathname;

    // ── Static assets (versioned / fingerprinted) ───────────
    if (
      path.startsWith("/scripts/") ||
      path.startsWith("/styles/") ||
      path.startsWith("/fonts/")
    ) {
      c.res.headers.set(
        "Cache-Control",
        "public, max-age=31536000, immutable",
      );
      c.res.headers.set("Vary", "Accept-Encoding");
      return;
    }

    // ── API responses ───────────────────────────────────────
    if (path.startsWith("/api/") || path.startsWith("/graphql")) {
      // Don't override if cacheResponse middleware already set headers
      if (!c.res.headers.has("X-Cache")) {
        c.res.headers.set("Cache-Control", "private, no-cache");
        c.res.headers.set("Vary", "Accept-Encoding, Cookie");
      }
      return;
    }

    // ── HTML pages ──────────────────────────────────────────
    const contentType = c.res.headers.get("Content-Type") ?? "";
    if (contentType.includes("text/html")) {
      c.res.headers.set("Vary", "Accept-Encoding, Cookie");

      // Generate ETag from response body hash
      try {
        const cloned = c.res.clone();
        const body = await cloned.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest("SHA-256", body);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const etag = `"${hashHex.substring(0, 32)}"`;

        c.res.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
        c.res.headers.set("ETag", etag);

        // Handle If-None-Match → 304 Not Modified
        const ifNoneMatch = c.req.header("If-None-Match");
        if (ifNoneMatch && ifNoneMatch === etag) {
          c.res = new Response(null, {
            status: 304,
            headers: {
              ETag: etag,
              "Cache-Control": "public, max-age=0, must-revalidate",
              Vary: "Accept-Encoding, Cookie",
            },
          });
        }
      } catch {
        // ETag generation failure is non-fatal — just skip it
        c.res.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
      }
    }
  };
}
