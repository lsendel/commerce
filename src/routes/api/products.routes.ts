import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { ProductRepository } from "../../infrastructure/repositories/product.repository";
import { ListProductsUseCase } from "../../application/catalog/list-products.usecase";
import { GetProductUseCase } from "../../application/catalog/get-product.usecase";
import {
  ListCollectionsUseCase,
  GetCollectionUseCase,
} from "../../application/catalog/list-collections.usecase";
import {
  paginationSchema,
  productFilterSchema,
} from "../../shared/validators";
import { optionalAuth, requireAuth } from "../../middleware/auth.middleware";
import { cacheResponse } from "../../middleware/cache.middleware";
import { ExportProductsCsvUseCase } from "../../application/catalog/export-products-csv.usecase";

const catalog = new Hono<{ Bindings: Env }>();

// All catalog routes use optional auth (product pages work without login)
catalog.use("/*", optionalAuth());

// GET /products - list with filtering, sorting, pagination (cache 5min)
catalog.get(
  "/products",
  cacheResponse({ ttl: 300, tags: ["products:list"] }),
  zValidator("query", paginationSchema.merge(productFilterSchema)),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const repo = new ProductRepository(db, c.get("storeId") as string);
    const useCase = new ListProductsUseCase(repo);

    const query = c.req.valid("query");
    const result = await useCase.execute({
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

    return c.json(result, 200);
  },
);

// GET /products/export/csv - export all products as CSV
catalog.get("/products/export/csv", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const useCase = new ExportProductsCsvUseCase(db, storeId);
  const csv = await useCase.execute();

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=products.csv",
    },
  });
});

// GET /products/:slug - single product by slug (cache 1h)
catalog.get("/products/:slug", cacheResponse({
  ttl: 3600,
  dynamicTags: (c) => [`product:${c.req.param("slug")}`],
}), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const repo = new ProductRepository(db, c.get("storeId") as string);
  const useCase = new GetProductUseCase(repo);

  const slug = c.req.param("slug");
  const product = await useCase.execute(slug);

  return c.json(product, 200);
});

// GET /collections - list all collections (cache 1h)
catalog.get(
  "/collections",
  cacheResponse({ ttl: 3600, tags: ["collections:list"] }),
  zValidator("query", paginationSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const repo = new ProductRepository(db, c.get("storeId") as string);
    const useCase = new ListCollectionsUseCase(repo);

    const allCollections = await useCase.execute();
    const query = c.req.valid("query");
    const page = query.page;
    const limit = query.limit;
    const offset = (page - 1) * limit;
    const paged = allCollections.slice(offset, offset + limit);

    return c.json(
      {
        collections: paged,
        total: allCollections.length,
        page,
        limit,
      },
      200,
    );
  },
);

// GET /collections/:slug - collection with products (cache 1h)
catalog.get(
  "/collections/:slug",
  cacheResponse({
    ttl: 3600,
    dynamicTags: (c) => [`collection:${c.req.param("slug")}`],
  }),
  zValidator("query", paginationSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const repo = new ProductRepository(db, c.get("storeId") as string);
    const useCase = new GetCollectionUseCase(repo);

    const slug = c.req.param("slug");
    const query = c.req.valid("query");
    const result = await useCase.execute(slug, {
      page: query.page,
      limit: query.limit,
    });

    return c.json(result, 200);
  },
);

export { catalog as productRoutes };
