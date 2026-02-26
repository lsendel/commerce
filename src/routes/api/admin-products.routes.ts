import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { eq, and } from "drizzle-orm";
import { CreateProductFromArtUseCase } from "../../application/catalog/create-product-from-art.usecase";
import { ManageProductUseCase } from "../../application/catalog/manage-product.usecase";
import { GenerateMockupUseCase } from "../../application/fulfillment/generate-mockup.usecase";
import { ProductRepository } from "../../infrastructure/repositories/product.repository";
import { AiJobRepository } from "../../infrastructure/repositories/ai-job.repository";
import { fulfillmentRequests } from "../../infrastructure/db/schema";

const adminProducts = new Hono<{ Bindings: Env }>();

// ─── GET /products — Admin list with status filter, search, pagination ──────

adminProducts.get("/products", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const repo = new ProductRepository(db, storeId);

  const result = await repo.findAll({
    page: Number(c.req.query("page")) || 1,
    limit: Number(c.req.query("limit")) || 20,
    status: c.req.query("status") || undefined,
    type: c.req.query("type") || undefined,
    search: c.req.query("search") || undefined,
    sort: c.req.query("sort") || "newest",
  });

  return c.json(result);
});

// ─── PATCH /products/:id — Update product ───────────────────────────────────

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  descriptionHtml: z.string().optional(),
  type: z.enum(["physical", "digital", "subscription", "bookable"]).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  availableForSale: z.boolean().optional(),
  featuredImageUrl: z.string().url().optional().nullable(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  slug: z.string().optional(),
});

adminProducts.patch(
  "/products/:id",
  requireAuth(),
  zValidator("json", updateProductSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const useCase = new ManageProductUseCase(db, storeId);
    const result = await useCase.update(c.req.param("id"), c.req.valid("json"));
    return c.json(result.product);
  },
);

// ─── DELETE /products/:id — Archive product ─────────────────────────────────

adminProducts.delete("/products/:id", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const useCase = new ManageProductUseCase(db, storeId);
  const product = await useCase.archive(c.req.param("id"));
  return c.json(product);
});

// ─── POST /products/:id/variants — Add variant ─────────────────────────────

const addVariantSchema = z.object({
  title: z.string().min(1),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  sku: z.string().optional(),
  compareAtPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  inventoryQuantity: z.number().int().min(0).optional(),
  options: z.record(z.string()).optional(),
  availableForSale: z.boolean().optional(),
  fulfillmentProvider: z.enum(["printful", "gooten", "prodigi", "shapeways"]).optional(),
  estimatedProductionDays: z.number().int().positive().optional(),
});

adminProducts.post(
  "/products/:id/variants",
  requireAuth(),
  zValidator("json", addVariantSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const useCase = new ManageProductUseCase(db, storeId);
    const variant = await useCase.addVariant(c.req.param("id"), c.req.valid("json"));
    return c.json(variant, 201);
  },
);

// ─── PATCH /products/:id/variants/:variantId — Update variant ───────────────

adminProducts.patch(
  "/products/:id/variants/:variantId",
  requireAuth(),
  zValidator("json", addVariantSchema.partial()),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const useCase = new ManageProductUseCase(db, storeId);
    const variant = await useCase.updateVariant(c.req.param("variantId"), c.req.valid("json"));
    return c.json(variant);
  },
);

// ─── POST /products/:id/images — Manage images ─────────────────────────────

const manageImagesSchema = z.object({
  images: z.array(z.object({
    url: z.string().url(),
    altText: z.string().optional(),
  })),
});

adminProducts.post(
  "/products/:id/images",
  requireAuth(),
  zValidator("json", manageImagesSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const useCase = new ManageProductUseCase(db, storeId);
    await useCase.updateImages(c.req.param("id"), c.req.valid("json").images);
    return c.json({ success: true });
  },
);

// ─── POST /products/from-art — Create product from completed art job ─────

const createFromArtSchema = z.object({
  artJobId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  descriptionHtml: z.string().optional(),
  type: z.enum(["physical", "digital"]),
  availableForSale: z.boolean().optional(),
  featuredImageUrl: z.string().url().optional(),
  variants: z
    .array(
      z.object({
        title: z.string().min(1),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/),
        sku: z.string().optional(),
        compareAtPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        options: z.record(z.string()).optional(),
        digitalAssetKey: z.string().optional(),
        fulfillmentProvider: z.enum(["printful", "gooten", "prodigi", "shapeways"]).optional(),
        estimatedProductionDays: z.number().int().positive().optional(),
        providerId: z.string().uuid().optional(),
        externalProductId: z.string().optional(),
        externalVariantId: z.string().optional(),
        costPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
      }),
    )
    .min(1),
  placements: z
    .array(
      z.object({
        area: z.string(),
        imageUrl: z.string().url(),
        x: z.number().int().optional(),
        y: z.number().int().optional(),
        scale: z.string().optional(),
        rotation: z.number().int().min(0).max(360).optional(),
        printAreaId: z.string().optional(),
        providerMeta: z.record(z.unknown()).optional(),
      }),
    )
    .optional(),
  imageUrls: z.array(z.string().url()).optional(),
});

adminProducts.post(
  "/products/from-art",
  requireAuth(),
  zValidator("json", createFromArtSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const userId = c.get("userId");
    const body = c.req.valid("json");

    const aiJobRepo = new AiJobRepository(db, storeId);
    const useCase = new CreateProductFromArtUseCase(db, aiJobRepo);

    const result = await useCase.execute({
      userId,
      storeId,
      ...body,
    });

    return c.json(result, 201);
  },
);

// ─── POST /products/:id/mockup — Generate mockup for a product ──────────

adminProducts.post(
  "/products/:id/mockup",
  requireAuth(),
  zValidator(
    "json",
    z.object({
      imageUrl: z.string().url(),
      waitAndApply: z.boolean().optional(),
      timeoutMs: z.number().int().min(5_000).max(300_000).optional(),
      pollIntervalMs: z.number().int().min(500).max(10_000).optional(),
    }),
  ),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const productId = c.req.param("id");
    const { imageUrl, waitAndApply, timeoutMs, pollIntervalMs } =
      c.req.valid("json");

    const useCase = new GenerateMockupUseCase();
    const result = waitAndApply
      ? await useCase.executeAndApply({
          apiKey: c.env.PRINTFUL_API_KEY,
          db,
          productId,
          imageUrl,
          timeoutMs,
          pollIntervalMs,
        })
      : await useCase.execute({
          apiKey: c.env.PRINTFUL_API_KEY,
          db,
          productId,
          imageUrl,
        });

    return c.json(result, 201);
  },
);

// ─── POST /fulfillment/:id/retry — Retry a failed fulfillment request ─────

adminProducts.post(
  "/fulfillment/:id/retry",
  requireAuth(),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const requestId = c.req.param("id");

    // Load and verify the request
    const rows = await db
      .select()
      .from(fulfillmentRequests)
      .where(
        and(
          eq(fulfillmentRequests.id, requestId),
          eq(fulfillmentRequests.storeId, storeId),
        ),
      )
      .limit(1);

    const request = rows[0];
    if (!request) {
      return c.json({ error: "Fulfillment request not found" }, 404);
    }

    if (request.status !== "failed" && request.status !== "cancelled") {
      return c.json(
        { error: `Cannot retry request in ${request.status} status` },
        400,
      );
    }

    // Reset to pending and clear error
    await db
      .update(fulfillmentRequests)
      .set({
        status: "pending",
        errorMessage: null,
        externalId: null,
        updatedAt: new Date(),
      })
      .where(eq(fulfillmentRequests.id, requestId));

    // Re-enqueue for processing
    await c.env.FULFILLMENT_QUEUE.send({
      type: "fulfillment.submit",
      fulfillmentRequestId: requestId,
      provider: request.provider,
      storeId,
    });

    return c.json({ success: true, message: "Request re-queued for processing" });
  },
);

export { adminProducts as adminProductRoutes };
