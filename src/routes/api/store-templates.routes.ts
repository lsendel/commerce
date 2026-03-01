import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { StoreTemplateRepository } from "../../infrastructure/repositories/store-template.repository";
import { StoreCloneTemplateUseCase } from "../../application/platform/store-clone-template.usecase";
import { requireAuth } from "../../middleware/auth.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";
import { resolveFeatureFlags } from "../../shared/feature-flags";
import { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { TrackEventUseCase } from "../../application/analytics/track-event.usecase";

const storeTemplateRoutes = new Hono<{ Bindings: Env }>();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const createTemplateSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
});

const cloneSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  subdomain: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/).optional(),
  copySettings: z.boolean().optional(),
  copyProducts: z.boolean().optional(),
  copyCollections: z.boolean().optional(),
});

function checkStoreCloneTemplateFeature(c: any) {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags.store_clone_templates) {
    return c.json(
      {
        error: "Store clone templates are currently disabled",
        code: "FEATURE_DISABLED",
      },
      403,
    );
  }
  return null;
}

function createDependencies(c: any) {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;

  const repository = new StoreTemplateRepository(db, storeId);
  const useCase = new StoreCloneTemplateUseCase(db, storeId, repository);

  const analyticsRepo = new AnalyticsRepository(db, storeId);
  const trackEvent = new TrackEventUseCase(analyticsRepo);

  return {
    storeId,
    useCase,
    trackEvent,
  };
}

storeTemplateRoutes.use("/store-templates/*", requireAuth());
storeTemplateRoutes.use("/store-templates", rateLimit({ windowMs: 60_000, max: 80 }));
storeTemplateRoutes.use("/store-templates/:id/clone", rateLimit({ windowMs: 60_000, max: 20 }));
storeTemplateRoutes.use("/store-templates/:id", rateLimit({ windowMs: 60_000, max: 40 }));

storeTemplateRoutes.get(
  "/store-templates",
  zValidator("query", listQuerySchema),
  async (c) => {
    const featureError = checkStoreCloneTemplateFeature(c);
    if (featureError) return featureError;

    const { useCase } = createDependencies(c);
    const { limit } = c.req.valid("query");
    const templates = await useCase.listTemplates(limit ?? 100);

    return c.json({ templates }, 200);
  },
);

storeTemplateRoutes.post(
  "/store-templates",
  zValidator("json", createTemplateSchema),
  async (c) => {
    const featureError = checkStoreCloneTemplateFeature(c);
    if (featureError) return featureError;

    const body = c.req.valid("json");
    const userId = c.get("userId") as string;
    const { storeId, useCase, trackEvent } = createDependencies(c);

    const template = await useCase.createTemplate({
      name: body.name,
      description: body.description,
      userId,
    });

    await trackEvent.execute({
      eventType: "store_template_created",
      userId,
      properties: {
        storeId,
        templateId: template.id,
        productCount: template.productCount,
        collectionCount: template.collectionCount,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json({ template }, 201);
  },
);

storeTemplateRoutes.post(
  "/store-templates/:id/clone",
  zValidator("param", idParamSchema),
  zValidator("json", cloneSchema),
  async (c) => {
    const featureError = checkStoreCloneTemplateFeature(c);
    if (featureError) return featureError;

    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const userId = c.get("userId") as string;

    const { storeId, useCase, trackEvent } = createDependencies(c);

    const clone = await useCase.cloneFromTemplate(id, {
      ...body,
      ownerUserId: userId,
    });

    await trackEvent.execute({
      eventType: "store_template_clone_created",
      userId,
      properties: {
        storeId,
        templateId: id,
        cloneStoreId: clone.store.id,
        cloneStoreSlug: clone.store.slug,
        copied: clone.copied,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json({ clone }, 201);
  },
);

storeTemplateRoutes.delete(
  "/store-templates/:id",
  zValidator("param", idParamSchema),
  async (c) => {
    const featureError = checkStoreCloneTemplateFeature(c);
    if (featureError) return featureError;

    const { id } = c.req.valid("param");
    const userId = c.get("userId") as string;
    const { storeId, useCase, trackEvent } = createDependencies(c);

    await useCase.deleteTemplate(id);

    await trackEvent.execute({
      eventType: "store_template_deleted",
      userId,
      properties: {
        storeId,
        templateId: id,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json({ success: true }, 200);
  },
);

export { storeTemplateRoutes };
