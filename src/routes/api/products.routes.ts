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
import { optionalAuth } from "../../middleware/auth.middleware";

const catalog = new Hono<{ Bindings: Env }>();

// All catalog routes use optional auth (product pages work without login)
catalog.use("/*", optionalAuth());

// GET /products - list with filtering, sorting, pagination
catalog.get(
  "/products",
  zValidator("query", paginationSchema.merge(productFilterSchema)),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const repo = new ProductRepository(db);
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

// GET /products/:slug - single product by slug
catalog.get("/products/:slug", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const repo = new ProductRepository(db);
  const useCase = new GetProductUseCase(repo);

  const slug = c.req.param("slug");
  const product = await useCase.execute(slug);

  return c.json(product, 200);
});

// GET /collections - list all collections
catalog.get(
  "/collections",
  zValidator("query", paginationSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const repo = new ProductRepository(db);
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

// GET /collections/:slug - collection with products
catalog.get(
  "/collections/:slug",
  zValidator("query", paginationSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const repo = new ProductRepository(db);
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
