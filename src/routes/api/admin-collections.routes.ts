import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { ProductRepository } from "../../infrastructure/repositories/product.repository";
import { ManageCollectionUseCase } from "../../application/catalog/manage-collection.usecase";

const adminCollections = new Hono<{ Bindings: Env }>();

// ─── GET / — List collections ───────────────────────────────────────────────

adminCollections.get("/", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const repo = new ProductRepository(db, storeId);
  const collections = await repo.findCollections();
  return c.json(collections);
});

// ─── POST / — Create collection ─────────────────────────────────────────────

const createCollectionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
});

adminCollections.post(
  "/",
  requireAuth(),
  zValidator("json", createCollectionSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const useCase = new ManageCollectionUseCase(db, storeId);
    const collection = await useCase.create(c.req.valid("json"));
    return c.json(collection, 201);
  },
);

// ─── PATCH /:id — Update collection ─────────────────────────────────────────

adminCollections.patch(
  "/:id",
  requireAuth(),
  zValidator("json", createCollectionSchema.partial()),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const useCase = new ManageCollectionUseCase(db, storeId);
    const result = await useCase.update(c.req.param("id"), c.req.valid("json"));
    return c.json(result.collection);
  },
);

// ─── DELETE /:id — Delete collection ─────────────────────────────────────────

adminCollections.delete("/:id", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const useCase = new ManageCollectionUseCase(db, storeId);
  await useCase.remove(c.req.param("id"));
  return c.json({ success: true });
});

// ─── POST /:id/products — Add products to collection ────────────────────────

const addProductsSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
});

adminCollections.post(
  "/:id/products",
  requireAuth(),
  zValidator("json", addProductsSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const useCase = new ManageCollectionUseCase(db, storeId);
    await useCase.addProducts(c.req.param("id"), c.req.valid("json").productIds);
    return c.json({ success: true });
  },
);

// ─── DELETE /:id/products — Remove products from collection ─────────────────

adminCollections.delete(
  "/:id/products",
  requireAuth(),
  zValidator("json", addProductsSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const useCase = new ManageCollectionUseCase(db, storeId);
    await useCase.removeProducts(c.req.param("id"), c.req.valid("json").productIds);
    return c.json({ success: true });
  },
);

export { adminCollections as adminCollectionRoutes };
