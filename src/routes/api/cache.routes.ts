import { Hono } from "hono";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { ProductRepository } from "../../infrastructure/repositories/product.repository";
import {
  invalidateByTags,
  buildCacheKey,
} from "../../infrastructure/cache/cache";

const cacheRoutes = new Hono<{ Bindings: Env }>();

/**
 * POST /webhooks/cache-invalidate
 *
 * Purges cached responses when products or collections are updated.
 *
 * Body: { type: "product" | "collection", id?: string }
 *   - type "product" + id: resolves product slug, purges product:slug + listing tags
 *   - type "product" (no id): purges products:list + products:detail tags
 *   - type "collection" + id: resolves collection slug, purges listing tags
 *   - type "collection" (no id): purges all listing tags
 *
 * Secured via `X-Webhook-Secret` header matching env.CACHE_WEBHOOK_SECRET.
 */
cacheRoutes.post("/webhooks/cache-invalidate", async (c) => {
  // ── Auth ────────────────────────────────────────────────
  const secret = c.env.CACHE_WEBHOOK_SECRET;
  if (!secret) {
    return c.json({ error: "Cache webhook secret not configured" }, 503);
  }

  const provided = c.req.header("X-Webhook-Secret") ?? "";
  if (!provided || provided !== secret) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // ── Parse body ──────────────────────────────────────────
  let body: { type?: string; id?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { type, id } = body;

  if (!type || !["product", "collection"].includes(type)) {
    return c.json(
      { error: 'Invalid type. Expected "product" or "collection".' },
      400,
    );
  }

  const storeId = c.get("storeId") as string;
  const tagsToInvalidate: string[] = [];
  const directKeys: string[] = [];

  if (type === "product") {
    // Always invalidate listing
    tagsToInvalidate.push("products:list");

    if (id) {
      // Resolve slug from product ID for targeted purge
      const db = createDb(c.env.DATABASE_URL);
      const productRepo = new ProductRepository(db, storeId);
      const product = await productRepo.findById(id);
      if (product?.slug) {
        tagsToInvalidate.push(`product:${product.slug}`);
        // Also purge direct cache key for the detail page
        directKeys.push(
          buildCacheKey(storeId, `/products/${product.slug}`),
        );
      }
    } else {
      // Purge all detail pages
      tagsToInvalidate.push("products:detail");
    }
  } else if (type === "collection") {
    // Collections affect the product listing page
    tagsToInvalidate.push("products:list");

    if (id) {
      // Resolve slug for targeted listing purge
      const db = createDb(c.env.DATABASE_URL);
      const productRepo = new ProductRepository(db, storeId);
      const allCollections = await productRepo.findCollections();
      const collection = allCollections.find((col) => col.id === id);
      if (collection?.slug) {
        directKeys.push(
          buildCacheKey(storeId, "/products", {
            collection: collection.slug,
          }),
        );
      }
    }
  }

  // Invalidate by tags
  await invalidateByTags(tagsToInvalidate);

  // Also purge any direct keys
  if (directKeys.length > 0) {
    try {
      const cache = (caches as any).default as Cache;
      await Promise.all(
        directKeys.map((key) =>
          cache.delete(new Request(key)).catch(() => false),
        ),
      );
    } catch {
      // Cache API not available or error — non-fatal
    }
  }

  return c.json({
    ok: true,
    type,
    id: id ?? null,
    tagsInvalidated: tagsToInvalidate,
    directKeysPurged: directKeys.length,
  });
});

export { cacheRoutes };
