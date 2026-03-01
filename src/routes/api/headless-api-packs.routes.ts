import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { HeadlessApiPackRepository } from "../../infrastructure/repositories/headless-api-pack.repository";
import { HeadlessApiPackUseCase } from "../../application/platform/headless-api-pack.usecase";
import { requireAuth } from "../../middleware/auth.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";
import { resolveFeatureFlags } from "../../shared/feature-flags";
import { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { TrackEventUseCase } from "../../application/analytics/track-event.usecase";

const headlessApiPackRoutes = new Hono<{ Bindings: Env }>();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const createPackSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  scopes: z.array(z.enum(["catalog:read", "products:read", "collections:read"])).optional(),
  rateLimitPerMinute: z.number().int().min(10).max(10_000).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

function checkHeadlessPacksFeature(c: any) {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags.headless_api_packs) {
    return c.json(
      {
        error: "Headless API packs are currently disabled",
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

  const repository = new HeadlessApiPackRepository(db, storeId);
  const useCase = new HeadlessApiPackUseCase(repository);

  const analyticsRepo = new AnalyticsRepository(db, storeId);
  const trackEvent = new TrackEventUseCase(analyticsRepo);

  return {
    storeId,
    useCase,
    trackEvent,
  };
}

headlessApiPackRoutes.use("/headless/packs/*", requireAuth());
headlessApiPackRoutes.use("/headless/packs", rateLimit({ windowMs: 60_000, max: 80 }));
headlessApiPackRoutes.use(
  "/headless/packs/:id/revoke",
  rateLimit({ windowMs: 60_000, max: 30 }),
);

headlessApiPackRoutes.get(
  "/headless/packs",
  zValidator("query", listQuerySchema),
  async (c) => {
    const featureError = checkHeadlessPacksFeature(c);
    if (featureError) return featureError;

    const { useCase } = createDependencies(c);
    const { limit } = c.req.valid("query");
    const packs = await useCase.listPacks(limit ?? 100);

    return c.json({ packs }, 200);
  },
);

headlessApiPackRoutes.post(
  "/headless/packs",
  zValidator("json", createPackSchema),
  async (c) => {
    const featureError = checkHeadlessPacksFeature(c);
    if (featureError) return featureError;

    const body = c.req.valid("json");
    const userId = c.get("userId") as string;
    const { storeId, useCase, trackEvent } = createDependencies(c);

    const result = await useCase.createPack({
      name: body.name,
      description: body.description,
      scopes: body.scopes,
      rateLimitPerMinute: body.rateLimitPerMinute,
      userId,
    });

    await trackEvent.execute({
      eventType: "headless_api_pack_created",
      userId,
      properties: {
        storeId,
        packId: result.pack.id,
        scopes: result.pack.scopes,
        rateLimitPerMinute: result.pack.rateLimitPerMinute,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json(result, 201);
  },
);

headlessApiPackRoutes.post(
  "/headless/packs/:id/revoke",
  zValidator("param", idParamSchema),
  async (c) => {
    const featureError = checkHeadlessPacksFeature(c);
    if (featureError) return featureError;

    const { id } = c.req.valid("param");
    const userId = c.get("userId") as string;
    const { storeId, useCase, trackEvent } = createDependencies(c);

    const pack = await useCase.revokePack(id, userId);

    await trackEvent.execute({
      eventType: "headless_api_pack_revoked",
      userId,
      properties: {
        storeId,
        packId: pack.id,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json({ pack }, 200);
  },
);

export { headlessApiPackRoutes };
