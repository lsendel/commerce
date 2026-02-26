import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { CreateProductFromArtUseCase } from "../../application/catalog/create-product-from-art.usecase";
import { GenerateMockupUseCase } from "../../application/fulfillment/generate-mockup.usecase";
import { AiJobRepository } from "../../infrastructure/repositories/ai-job.repository";

const adminProducts = new Hono<{ Bindings: Env }>();

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
        fulfillmentProvider: z.string().optional(),
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

export { adminProducts as adminProductRoutes };
