import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { ProductRepository } from "../../infrastructure/repositories/product.repository";
import { HeadlessApiPackRepository } from "../../infrastructure/repositories/headless-api-pack.repository";
import { HeadlessApiPackUseCase } from "../../application/platform/headless-api-pack.usecase";
import { resolveFeatureFlags } from "../../shared/feature-flags";
import { NotFoundError } from "../../shared/errors";

const headlessChannelRoutes = new Hono<{ Bindings: Env }>();

const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  type: z.enum(["physical", "digital", "subscription", "bookable"]).optional(),
  collection: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  available: z.coerce.boolean().optional(),
  sort: z
    .enum(["newest", "price_asc", "price_desc", "name"])
    .optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

function checkHeadlessChannelFeature(c: any) {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags.headless_api_packs) {
    return c.json(
      {
        error: "Headless API channel is currently disabled",
        code: "FEATURE_DISABLED",
      },
      403,
    );
  }
  return null;
}

function getApiKeyFromRequest(c: any): string {
  const direct = c.req.header("x-api-key");
  if (direct?.trim()) return direct.trim();

  const auth = c.req.header("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  return "";
}

async function authorizeHeadlessRequest(
  c: any,
  requiredScope: "catalog:read" | "products:read" | "collections:read",
) {
  const apiKey = getApiKeyFromRequest(c);
  if (!apiKey) {
    return c.json({ error: "Missing API key" }, 401);
  }

  const db = createDb(c.env.DATABASE_URL);
  const authRepo = new HeadlessApiPackRepository(db);
  const authUseCase = new HeadlessApiPackUseCase(authRepo);

  try {
    const authorization = await authUseCase.authorizeKey(apiKey, requiredScope);
    c.header("X-Headless-Key", authorization.keyPrefix);
    c.header("X-Headless-Rate-Limit", String(authorization.rateLimitPerMinute));
    return authorization;
  } catch (error: any) {
    return c.json({ error: error?.message ?? "Unauthorized" }, 401);
  }
}

headlessChannelRoutes.get(
  "/catalog/products",
  zValidator("query", listProductsQuerySchema),
  async (c) => {
    const featureError = checkHeadlessChannelFeature(c);
    if (featureError) return featureError;

    const authorization = await authorizeHeadlessRequest(c, "products:read");
    if (authorization instanceof Response) return authorization;

    const db = createDb(c.env.DATABASE_URL);
    const repo = new ProductRepository(db, authorization.storeId);
    const query = c.req.valid("query");

    const result = await repo.findAll({
      page: query.page,
      limit: query.limit,
      type: query.type,
      collection: query.collection,
      search: query.search,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      available: query.available,
      sort: query.sort,
    });

    return c.json(
      {
        ...result,
        channel: {
          packId: authorization.packId,
          keyPrefix: authorization.keyPrefix,
          storeId: authorization.storeId,
        },
      },
      200,
    );
  },
);

headlessChannelRoutes.get("/catalog/products/:slug", async (c) => {
  const featureError = checkHeadlessChannelFeature(c);
  if (featureError) return featureError;

  const authorization = await authorizeHeadlessRequest(c, "products:read");
  if (authorization instanceof Response) return authorization;

  const db = createDb(c.env.DATABASE_URL);
  const repo = new ProductRepository(db, authorization.storeId);
  const slug = c.req.param("slug");

  const product = await repo.findBySlug(slug);
  if (!product) {
    return c.json({ error: `Product not found: ${slug}` }, 404);
  }

  return c.json(
    {
      product,
      channel: {
        packId: authorization.packId,
        keyPrefix: authorization.keyPrefix,
        storeId: authorization.storeId,
      },
    },
    200,
  );
});

headlessChannelRoutes.get(
  "/catalog/collections",
  zValidator("query", paginationSchema),
  async (c) => {
    const featureError = checkHeadlessChannelFeature(c);
    if (featureError) return featureError;

    const authorization = await authorizeHeadlessRequest(c, "collections:read");
    if (authorization instanceof Response) return authorization;

    const db = createDb(c.env.DATABASE_URL);
    const repo = new ProductRepository(db, authorization.storeId);

    const query = c.req.valid("query");
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const collections = await repo.findCollections();
    const offset = (page - 1) * limit;

    return c.json(
      {
        collections: collections.slice(offset, offset + limit),
        total: collections.length,
        page,
        limit,
        channel: {
          packId: authorization.packId,
          keyPrefix: authorization.keyPrefix,
          storeId: authorization.storeId,
        },
      },
      200,
    );
  },
);

headlessChannelRoutes.get(
  "/catalog/collections/:slug",
  zValidator("query", paginationSchema),
  async (c) => {
    const featureError = checkHeadlessChannelFeature(c);
    if (featureError) return featureError;

    const authorization = await authorizeHeadlessRequest(c, "collections:read");
    if (authorization instanceof Response) return authorization;

    const db = createDb(c.env.DATABASE_URL);
    const repo = new ProductRepository(db, authorization.storeId);

    const slug = c.req.param("slug");
    const query = c.req.valid("query");

    try {
      const result = await repo.findCollectionBySlug(slug, {
        page: query.page,
        limit: query.limit,
      });

      if (!result) {
        throw new NotFoundError("Collection", slug);
      }

      return c.json(
        {
          ...result,
          channel: {
            packId: authorization.packId,
            keyPrefix: authorization.keyPrefix,
            storeId: authorization.storeId,
          },
        },
        200,
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  },
);

export { headlessChannelRoutes };
