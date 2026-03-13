import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { TrackEventUseCase } from "../../application/analytics/track-event.usecase";
import { requireAuth } from "../../middleware/auth.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";
import { eq, and, inArray } from "drizzle-orm";
import { CreateProductFromArtUseCase } from "../../application/catalog/create-product-from-art.usecase";
import { ManageProductUseCase } from "../../application/catalog/manage-product.usecase";
import { BuildArtProductDraftUseCase } from "../../application/catalog/build-art-product-draft.usecase";
import {
  AiMerchandisingCopilotUseCase,
  type MerchandisingCopilotResult,
} from "../../application/catalog/ai-merchandising-copilot.usecase";
import { GenerateMockupUseCase } from "../../application/fulfillment/generate-mockup.usecase";
import { ProductRepository } from "../../infrastructure/repositories/product.repository";
import { AiJobRepository } from "../../infrastructure/repositories/ai-job.repository";
import { PrintfulRepository } from "../../infrastructure/repositories/printful.repository";
import {
  fulfillmentProviders,
  fulfillmentRequests,
  productVariants,
  providerProductMappings,
  printfulSyncProducts,
  printfulSyncVariants,
} from "../../infrastructure/db/schema";
import { canCancel } from "../../domain/fulfillment/fulfillment-status.vo";
import { resolveFeatureFlags } from "../../shared/feature-flags";
import { executeCacheInvalidation } from "../../infrastructure/cache/invalidation-executor";

const adminProducts = new Hono<{ Bindings: Env }>();
const merchandisingCopilotSchema = z.object({
  brief: z.string().min(10).max(1200),
  productType: z.enum(["physical", "digital", "subscription", "bookable"]),
  audience: z.string().min(2).max(120).optional(),
  tone: z.enum(["playful", "premium", "clinical", "minimal", "warm"]).optional(),
  keyFeatures: z.array(z.string().min(1).max(120)).max(10).optional(),
});
const artDraftPipelineSchema = z.object({
  artJobId: z.string().uuid(),
  productType: z.enum(["physical", "digital"]).optional(),
  providerId: z.string().uuid().optional(),
});

function checkMerchandisingCopilotFeature(c: any) {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags.ai_merchandising_copilot) {
    return c.json(
      { error: "AI merchandising copilot is currently disabled", code: "FEATURE_DISABLED" },
      403,
    );
  }
  return null;
}

function checkArtPipelineFeature(c: any) {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags.ai_studio_product_pipeline) {
    return c.json(
      { error: "AI studio-to-product pipeline is currently disabled", code: "FEATURE_DISABLED" },
      403,
    );
  }
  return null;
}

function toCopilotResponse(copilot: MerchandisingCopilotResult) {
  return {
    ...copilot,
    applyPatch: {
      name: copilot.name,
      description: copilot.description,
      seoTitle: copilot.seoTitle,
      seoDescription: copilot.seoDescription,
      slug: copilot.slugSuggestion,
    },
  };
}

async function invalidateProductCache(input: {
  db: ReturnType<typeof createDb>;
  storeId: string;
  productId?: string | null;
  productSlug?: string | null;
  productType?: string | null;
}) {
  const productRepo = new ProductRepository(input.db, input.storeId);
  const lookupProduct =
    input.productId && (!input.productSlug || !input.productType)
      ? await productRepo.findById(input.productId)
      : null;

  const productId = input.productId ?? lookupProduct?.id ?? null;
  const productSlug = input.productSlug ?? lookupProduct?.slug ?? null;
  const productType = input.productType ?? lookupProduct?.type ?? null;

  const resources: Array<{
    type: "product" | "event";
    id?: string | null;
    slug?: string | null;
  }> = [
    {
      type: "product",
      id: productId,
      slug: productSlug,
    },
  ];

  if (productType === "bookable") {
    resources.push({
      type: "event",
      id: productId,
      slug: productSlug,
    });
  }

  await executeCacheInvalidation({
    storeId: input.storeId,
    resources,
    resolvers: {
      resolveProductSlugById: async (id) => {
        const product = await productRepo.findById(id);
        return product?.slug ?? null;
      },
      resolveEventSlugById: async (id) => {
        const product = await productRepo.findById(id);
        if (!product || product.type !== "bookable") return null;
        return product.slug ?? null;
      },
    },
  });
}

async function getVariantResponse(
  db: ReturnType<typeof createDb>,
  variantId: string,
) {
  const variantRows = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  const variant = variantRows[0];
  if (!variant) return null;

  const mappingRows = await db
    .select()
    .from(providerProductMappings)
    .where(eq(providerProductMappings.variantId, variantId))
    .limit(1);

  const mapping = mappingRows[0] ?? null;
  return {
    ...variant,
    providerId: mapping?.providerId ?? null,
    externalProductId: mapping?.externalProductId ?? null,
    externalVariantId: mapping?.externalVariantId ?? null,
    costPrice: mapping?.costPrice ?? null,
  };
}

async function cleanupOrphanPrintfulProductSync(input: {
  db: ReturnType<typeof createDb>;
  storeId: string;
  productId: string;
}) {
  const variantRows = await input.db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.productId, input.productId));

  const variantIds = variantRows.map((row) => row.id);
  if (variantIds.length === 0) {
    await input.db
      .delete(printfulSyncProducts)
      .where(
        and(
          eq(printfulSyncProducts.storeId, input.storeId),
          eq(printfulSyncProducts.productId, input.productId),
        ),
      );
    return;
  }

  const syncVariantRows = await input.db
    .select({ id: printfulSyncVariants.id })
    .from(printfulSyncVariants)
    .where(inArray(printfulSyncVariants.variantId, variantIds))
    .limit(1);

  if (syncVariantRows.length === 0) {
    await input.db
      .delete(printfulSyncProducts)
      .where(
        and(
          eq(printfulSyncProducts.storeId, input.storeId),
          eq(printfulSyncProducts.productId, input.productId),
        ),
      );
  }
}

async function syncVariantProviderState(input: {
  db: ReturnType<typeof createDb>;
  storeId: string;
  productId: string;
  variantId: string;
  providerId?: string;
  externalProductId?: string;
  externalVariantId?: string;
  costPrice?: string;
  clearProviderMapping?: boolean;
}) {
  const {
    db,
    storeId,
    productId,
    variantId,
    providerId,
    externalProductId,
    externalVariantId,
    costPrice,
    clearProviderMapping,
  } = input;

  const normalizedExternalProductId = externalProductId?.trim() || undefined;
  const normalizedExternalVariantId = externalVariantId?.trim() || undefined;
  const shouldClear = Boolean(clearProviderMapping || !providerId);
  let provider:
    | typeof fulfillmentProviders.$inferSelect
    | undefined;
  let printfulProductId: number | null = null;
  let printfulVariantId: number | null = null;

  if (!shouldClear) {
    const providerRows = await db
      .select()
      .from(fulfillmentProviders)
      .where(
        and(
          eq(fulfillmentProviders.id, providerId!),
          eq(fulfillmentProviders.storeId, storeId),
          eq(fulfillmentProviders.isActive, true),
        ),
      )
      .limit(1);

    provider = providerRows[0];
    if (!provider) {
      throw new Error("Selected fulfillment provider was not found.");
    }

    if (!normalizedExternalVariantId) {
      throw new Error("Provider variant ID is required when a fulfillment provider is selected.");
    }

    if (provider.type === "printful") {
      printfulProductId = parsePositiveInteger(normalizedExternalProductId);
      printfulVariantId = parsePositiveInteger(normalizedExternalVariantId);

      if (!printfulProductId) {
        throw new Error("Printful product ID is required to generate mockups and submit fulfillment.");
      }
      if (!printfulVariantId) {
        throw new Error("Printful variant ID must be a numeric sync variant id.");
      }

      const conflictingProductLink = await db
        .select()
        .from(printfulSyncProducts)
        .where(
          and(
            eq(printfulSyncProducts.storeId, storeId),
            eq(printfulSyncProducts.printfulId, printfulProductId),
          ),
        )
        .limit(1);

      if (
        conflictingProductLink[0] &&
        conflictingProductLink[0].productId !== productId
      ) {
        throw new Error(
          `Printful product ${printfulProductId} is already linked to another product in this store.`,
        );
      }

      const conflictingVariantLink = await db
        .select()
        .from(printfulSyncVariants)
        .where(eq(printfulSyncVariants.printfulId, printfulVariantId))
        .limit(1);

      if (
        conflictingVariantLink[0] &&
        conflictingVariantLink[0].variantId !== variantId
      ) {
        throw new Error(
          `Printful variant ${printfulVariantId} is already linked to another variant in this store.`,
        );
      }
    }
  }

  await db
    .update(productVariants)
    .set({
      fulfillmentProvider: shouldClear ? null : provider?.type,
    })
    .where(eq(productVariants.id, variantId));

  await db
    .delete(providerProductMappings)
    .where(eq(providerProductMappings.variantId, variantId));

  if (shouldClear) {
    await db
      .delete(printfulSyncVariants)
      .where(eq(printfulSyncVariants.variantId, variantId));
    await cleanupOrphanPrintfulProductSync({ db, storeId, productId });
    return;
  }

  await db.insert(providerProductMappings).values({
    variantId,
    providerId: providerId!,
    externalProductId: normalizedExternalProductId ?? null,
    externalVariantId: normalizedExternalVariantId,
    costPrice: costPrice ?? null,
  });

  await db
    .delete(printfulSyncVariants)
    .where(eq(printfulSyncVariants.variantId, variantId));

  if (provider?.type !== "printful") {
    await cleanupOrphanPrintfulProductSync({ db, storeId, productId });
    return;
  }

  await db
    .delete(printfulSyncProducts)
    .where(
      and(
        eq(printfulSyncProducts.storeId, storeId),
        eq(printfulSyncProducts.productId, productId),
      ),
    );

  const printfulRepo = new PrintfulRepository(db, storeId);
  await printfulRepo.upsertSyncProduct({
    printfulId: printfulProductId!,
    productId,
    externalId: String(printfulProductId!),
  });
  await printfulRepo.upsertSyncVariant({
    printfulId: printfulVariantId!,
    variantId,
    printfulProductId: printfulProductId!,
  });
}

function parsePositiveInteger(value?: string) {
  if (!value) return null;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

adminProducts.use(
  "/products/from-art/copilot-draft",
  rateLimit({ windowMs: 60_000, max: 20 }),
);
adminProducts.use(
  "/products/from-art",
  rateLimit({ windowMs: 60_000, max: 30 }),
);

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

// ─── POST /products/copilot/draft — AI draft product copy ───────────────────
adminProducts.post(
  "/products/copilot/draft",
  requireAuth(),
  zValidator("json", merchandisingCopilotSchema),
  async (c) => {
    const featureError = checkMerchandisingCopilotFeature(c);
    if (featureError) return featureError;

    const body = c.req.valid("json");
    const useCase = new AiMerchandisingCopilotUseCase(c.env.GEMINI_API_KEY);
    const copilot = await useCase.execute({
      mode: "draft",
      productType: body.productType,
      brief: body.brief,
      audience: body.audience,
      tone: body.tone,
      keyFeatures: body.keyFeatures,
    });

    return c.json({ copilot: toCopilotResponse(copilot) }, 200);
  },
);

// ─── POST /products/:id/copilot/enrich — AI enrich existing SKU copy ───────
adminProducts.post(
  "/products/:id/copilot/enrich",
  requireAuth(),
  zValidator("json", merchandisingCopilotSchema),
  async (c) => {
    const featureError = checkMerchandisingCopilotFeature(c);
    if (featureError) return featureError;

    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const productId = c.req.param("id");
    const body = c.req.valid("json");

    const productRepo = new ProductRepository(db, storeId);
    const existing = await productRepo.findById(productId);
    if (!existing) {
      return c.json({ error: "Product not found" }, 404);
    }

    const useCase = new AiMerchandisingCopilotUseCase(c.env.GEMINI_API_KEY);
    const copilot = await useCase.execute({
      mode: "enrich",
      productType: body.productType,
      brief: body.brief,
      audience: body.audience,
      tone: body.tone,
      keyFeatures: body.keyFeatures,
      existing: {
        name: existing.name,
        description: existing.description,
        seoTitle: existing.seoTitle,
        seoDescription: existing.seoDescription,
        type: existing.type,
      },
    });

    return c.json({ copilot: toCopilotResponse(copilot) }, 200);
  },
);

// ─── POST /products/from-art/copilot-draft — build AI product draft payload ─
adminProducts.post(
  "/products/from-art/copilot-draft",
  requireAuth(),
  zValidator("json", artDraftPipelineSchema),
  async (c) => {
    const featureError = checkArtPipelineFeature(c);
    if (featureError) return featureError;

    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const userId = c.get("userId");
    const body = c.req.valid("json");

    let providerType:
      | "printful"
      | "gooten"
      | "prodigi"
      | "shapeways"
      | undefined;
    if (body.providerId) {
      const providerRows = await db
        .select()
        .from(fulfillmentProviders)
        .where(
          and(
            eq(fulfillmentProviders.id, body.providerId),
            eq(fulfillmentProviders.storeId, storeId),
            eq(fulfillmentProviders.isActive, true),
          ),
        )
        .limit(1);
      providerType = providerRows[0]?.type as
        | "printful"
        | "gooten"
        | "prodigi"
        | "shapeways"
        | undefined;
    }

    const aiJobRepo = new AiJobRepository(db, storeId);
    const merchCopilot = new AiMerchandisingCopilotUseCase(c.env.GEMINI_API_KEY);
    const useCase = new BuildArtProductDraftUseCase(aiJobRepo, merchCopilot);
    const draft = await useCase.execute({
      userId,
      artJobId: body.artJobId,
      productType: body.productType,
      providerType,
    });

    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const trackEvent = new TrackEventUseCase(analyticsRepo);
    await trackEvent.execute({
      eventType: "studio_pipeline_draft_generated",
      userId,
      properties: {
        artJobId: body.artJobId,
        productType: draft.type,
        variantCount: draft.variants.length,
        providerType: providerType ?? null,
        warningCount: draft.warnings.length,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json({ draft }, 200);
  },
);

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
    await invalidateProductCache({
      db,
      storeId,
      productId: result.product?.id ?? c.req.param("id"),
      productSlug: result.product?.slug ?? null,
      productType: result.product?.type ?? null,
    });
    return c.json(result.product);
  },
);

// ─── DELETE /products/:id — Archive product ─────────────────────────────────

adminProducts.delete("/products/:id", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const useCase = new ManageProductUseCase(db, storeId);
  const product = await useCase.archive(c.req.param("id"));
  await invalidateProductCache({
    db,
    storeId,
    productId: product?.id ?? c.req.param("id"),
    productSlug: product?.slug ?? null,
    productType: product?.type ?? null,
  });
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
  providerId: z.string().uuid().optional(),
  externalProductId: z.string().optional(),
  externalVariantId: z.string().optional(),
  costPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  clearProviderMapping: z.boolean().optional(),
});

adminProducts.post(
  "/products/:id/variants",
  requireAuth(),
  zValidator("json", addVariantSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const productId = c.req.param("id");
    const body = c.req.valid("json");
    const useCase = new ManageProductUseCase(db, storeId);
    const variant = await useCase.addVariant(productId, body);
    await syncVariantProviderState({
      db,
      storeId,
      productId,
      variantId: variant.id,
      providerId: body.providerId,
      externalProductId: body.externalProductId,
      externalVariantId: body.externalVariantId,
      costPrice: body.costPrice,
      clearProviderMapping: body.clearProviderMapping,
    });
    await invalidateProductCache({ db, storeId, productId });
    return c.json((await getVariantResponse(db, variant.id)) ?? variant, 201);
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
    const productId = c.req.param("id");
    const variantId = c.req.param("variantId");
    const body = c.req.valid("json");
    const useCase = new ManageProductUseCase(db, storeId);
    const variant = await useCase.updateVariant(variantId, body);
    const shouldSyncMapping =
      "providerId" in body ||
      "externalProductId" in body ||
      "externalVariantId" in body ||
      "costPrice" in body ||
      "clearProviderMapping" in body;
    if (shouldSyncMapping) {
      await syncVariantProviderState({
        db,
        storeId,
        productId,
        variantId,
        providerId: body.providerId,
        externalProductId: body.externalProductId,
        externalVariantId: body.externalVariantId,
        costPrice: body.costPrice,
        clearProviderMapping: body.clearProviderMapping,
      });
    }
    await invalidateProductCache({ db, storeId, productId });
    return c.json((await getVariantResponse(db, variant.id)) ?? variant);
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
    await invalidateProductCache({ db, storeId, productId: c.req.param("id") });
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
    const featureError = checkArtPipelineFeature(c);
    if (featureError) return featureError;

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
    await invalidateProductCache({
      db,
      storeId,
      productId: result.product?.id ?? null,
      productSlug: result.product?.slug ?? null,
      productType: result.product?.type ?? null,
    });

    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const trackEvent = new TrackEventUseCase(analyticsRepo);
    await trackEvent.execute({
      eventType: "studio_pipeline_product_created",
      userId,
      properties: {
        artJobId: body.artJobId,
        productId: result.product.id,
        productType: body.type,
        availableForSale: body.availableForSale ?? true,
        variantCount: body.variants.length,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
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
      printfulProductId: z.number().int().positive().optional(),
      waitAndApply: z.boolean().optional(),
      timeoutMs: z.number().int().min(5_000).max(300_000).optional(),
      pollIntervalMs: z.number().int().min(500).max(10_000).optional(),
    }),
  ),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const productId = c.req.param("id");
    const { imageUrl, printfulProductId, waitAndApply, timeoutMs, pollIntervalMs } =
      c.req.valid("json");

    const useCase = new GenerateMockupUseCase();
    const result = waitAndApply
      ? await useCase.executeAndApply({
          apiKey: c.env.PRINTFUL_API_KEY,
          db,
          productId,
          imageUrl,
          printfulProductId,
          timeoutMs,
          pollIntervalMs,
        })
      : await useCase.execute({
          apiKey: c.env.PRINTFUL_API_KEY,
          db,
          productId,
          imageUrl,
          printfulProductId,
        });

    await invalidateProductCache({
      db,
      storeId: c.get("storeId") as string,
      productId,
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

// ─── POST /fulfillment/:id/cancel — Cancel a fulfillment request ────────────

adminProducts.post(
  "/fulfillment/:id/cancel",
  requireAuth(),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const requestId = c.req.param("id");

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

    const currentStatus = (request.status ?? "pending") as Parameters<typeof canCancel>[0];
    if (!canCancel(currentStatus)) {
      return c.json(
        { error: `Cannot cancel request in ${request.status} status` },
        400,
      );
    }

    const nextStatus = request.status === "pending" ? "cancelled" : "cancel_requested";
    await db
      .update(fulfillmentRequests)
      .set({
        status: nextStatus,
        updatedAt: new Date(),
        completedAt: nextStatus === "cancelled" ? new Date() : request.completedAt,
      })
      .where(eq(fulfillmentRequests.id, requestId));

    return c.json({
      success: true,
      status: nextStatus,
      message:
        nextStatus === "cancelled"
          ? "Fulfillment request cancelled"
          : "Cancellation requested from provider",
    });
  },
);

export { adminProducts as adminProductRoutes };
