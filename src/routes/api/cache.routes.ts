import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { ProductRepository } from "../../infrastructure/repositories/product.repository";
import { type CacheInvalidationResource } from "../../infrastructure/cache/invalidation-plan";
import { executeCacheInvalidation } from "../../infrastructure/cache/invalidation-executor";

const cacheRoutes = new Hono<{ Bindings: Env }>();

const resourceTypeEnum = z.enum([
  "product",
  "collection",
  "event",
  "currency_rates",
  "products_listing",
  "collections_listing",
  "events_listing",
]);

const cacheInvalidationResourceSchema = z.object({
  type: resourceTypeEnum,
  id: z.string().optional(),
  slug: z.string().optional(),
});

const cacheInvalidationBodySchema = z.object({
  type: resourceTypeEnum.optional(),
  id: z.string().optional(),
  slug: z.string().optional(),
  resources: z.array(cacheInvalidationResourceSchema).min(1).optional(),
  dryRun: z.boolean().optional(),
  reason: z.string().max(300).optional(),
});

function normalizeResources(payload: z.infer<typeof cacheInvalidationBodySchema>): CacheInvalidationResource[] {
  if (payload.resources && payload.resources.length > 0) {
    return payload.resources.map((resource) => ({
      type: resource.type,
      id: resource.id ?? null,
      slug: resource.slug ?? null,
    }));
  }

  if (payload.type) {
    return [
      {
        type: payload.type,
        id: payload.id ?? null,
        slug: payload.slug ?? null,
      },
    ];
  }

  return [];
}

/**
 * POST /webhooks/cache-invalidate
 *
 * Purges cached responses for high-traffic surfaces.
 *
 * Supports:
 *  - legacy single-resource payloads (`type`, `id`, `slug`),
 *  - batched payloads (`resources: [{ type, id?, slug? }, ...]`),
 *  - dry-run mode (`dryRun: true`) that returns plan without executing purge.
 *
 * Secured via `X-Webhook-Secret` header matching env.CACHE_WEBHOOK_SECRET.
 */
cacheRoutes.post(
  "/webhooks/cache-invalidate",
  async (c) => {
  // ── Auth ────────────────────────────────────────────────
  const secret = c.env.CACHE_WEBHOOK_SECRET;
  if (!secret) {
    return c.json({ error: "Cache webhook secret not configured" }, 503);
  }

  const provided = c.req.header("X-Webhook-Secret") ?? "";
  if (!provided || provided !== secret) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsedBody = cacheInvalidationBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return c.json(
      {
        error: "Invalid cache invalidation payload",
        details: parsedBody.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      400,
    );
  }

  const body = parsedBody.data;
  const resources = normalizeResources(body);
  if (resources.length === 0) {
    return c.json({ error: "Payload must include either type or resources[]." }, 400);
  }

  const storeId = c.get("storeId") as string;
  const db = createDb(c.env.DATABASE_URL);
  const productRepo = new ProductRepository(db, storeId);
  const execution = await executeCacheInvalidation({
    storeId,
    resources,
    dryRun: body.dryRun ?? false,
    resolvers: {
      resolveProductSlugById: async (id) => {
        const product = await productRepo.findById(id);
        return product?.slug ?? null;
      },
      resolveCollectionSlugById: async (id) => {
        const collections = await productRepo.findCollections();
        const collection = collections.find((row) => row.id === id);
        return collection?.slug ?? null;
      },
      resolveEventSlugById: async (id) => {
        const product = await productRepo.findById(id);
        if (!product || product.type !== "bookable") return null;
        return product.slug ?? null;
      },
    },
  });

  return c.json({
    ok: true,
    dryRun: execution.dryRun,
    reason: body.reason ?? null,
    resources,
    tagsInvalidated: execution.tags,
    directKeysPurged: execution.directKeysPurged,
    directKeysPlanned: execution.directKeys.length,
    unresolved: execution.unresolved,
    touchedSurfaces: execution.touchedSurfaces,
  });
},
);

export { cacheRoutes };
