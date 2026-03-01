import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import {
  IntegrationRepository,
  IntegrationSecretRepository,
} from "../../infrastructure/repositories/integration.repository";
import { requireAuth } from "../../middleware/auth.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";
import { resolveFeatureFlags } from "../../shared/feature-flags";
import { ListIntegrationsUseCase } from "../../application/platform/list-integrations.usecase";
import { IntegrationMarketplaceUseCase } from "../../application/platform/integration-marketplace.usecase";
import { TrackEventUseCase } from "../../application/analytics/track-event.usecase";
import { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { VerifyIntegrationUseCase } from "../../application/platform/verify-integration.usecase";

const integrationMarketplaceRoutes = new Hono<{ Bindings: Env }>();

const providerSchema = z.object({
  provider: z.enum([
    "stripe",
    "printful",
    "gooten",
    "prodigi",
    "shapeways",
    "gemini",
    "resend",
  ]),
});

function checkMarketplaceFeature(c: any) {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags.integration_marketplace) {
    return c.json(
      {
        error: "Integration marketplace is currently disabled",
        code: "FEATURE_DISABLED",
      },
      403,
    );
  }
  return null;
}

function buildDependencies(c: any) {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;

  const integrationRepo = new IntegrationRepository(db);
  const secretRepo = new IntegrationSecretRepository(db);
  const listUseCase = new ListIntegrationsUseCase(integrationRepo, secretRepo);
  const marketplaceUseCase = new IntegrationMarketplaceUseCase(
    integrationRepo,
    secretRepo,
    listUseCase,
  );
  const verifyUseCase = new VerifyIntegrationUseCase(integrationRepo, secretRepo);

  const analyticsRepo = new AnalyticsRepository(db, storeId);
  const trackEvent = new TrackEventUseCase(analyticsRepo);

  return {
    storeId,
    marketplaceUseCase,
    verifyUseCase,
    trackEvent,
  };
}

integrationMarketplaceRoutes.use("/integration-marketplace/*", requireAuth());
integrationMarketplaceRoutes.use(
  "/integration-marketplace/apps",
  rateLimit({ windowMs: 60_000, max: 80 }),
);
integrationMarketplaceRoutes.use(
  "/integration-marketplace/apps/:provider/install",
  rateLimit({ windowMs: 60_000, max: 30 }),
);
integrationMarketplaceRoutes.use(
  "/integration-marketplace/apps/:provider/uninstall",
  rateLimit({ windowMs: 60_000, max: 30 }),
);
integrationMarketplaceRoutes.use(
  "/integration-marketplace/apps/:provider/verify",
  rateLimit({ windowMs: 60_000, max: 30 }),
);

integrationMarketplaceRoutes.get("/integration-marketplace/apps", async (c) => {
  const featureError = checkMarketplaceFeature(c);
  if (featureError) return featureError;

  const { storeId, marketplaceUseCase } = buildDependencies(c);
  const apps = await marketplaceUseCase.listApps(storeId);

  return c.json({ apps }, 200);
});

integrationMarketplaceRoutes.post(
  "/integration-marketplace/apps/:provider/install",
  zValidator("param", providerSchema),
  async (c) => {
    const featureError = checkMarketplaceFeature(c);
    if (featureError) return featureError;

    const { provider } = c.req.valid("param");
    const userId = c.get("userId") as string;
    const { storeId, marketplaceUseCase, trackEvent } = buildDependencies(c);

    const app = await marketplaceUseCase.installForStore(storeId, provider);

    await trackEvent.execute({
      eventType: "integration_marketplace_app_installed",
      userId,
      properties: {
        provider,
        storeId,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json({ app }, 201);
  },
);

integrationMarketplaceRoutes.post(
  "/integration-marketplace/apps/:provider/uninstall",
  zValidator("param", providerSchema),
  async (c) => {
    const featureError = checkMarketplaceFeature(c);
    if (featureError) return featureError;

    const { provider } = c.req.valid("param");
    const userId = c.get("userId") as string;
    const { storeId, marketplaceUseCase, trackEvent } = buildDependencies(c);

    await marketplaceUseCase.uninstallStoreOverride(storeId, provider);

    await trackEvent.execute({
      eventType: "integration_marketplace_app_uninstalled",
      userId,
      properties: {
        provider,
        storeId,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json({ success: true }, 200);
  },
);

integrationMarketplaceRoutes.post(
  "/integration-marketplace/apps/:provider/verify",
  zValidator("param", providerSchema),
  async (c) => {
    const featureError = checkMarketplaceFeature(c);
    if (featureError) return featureError;

    const { provider } = c.req.valid("param");
    const userId = c.get("userId") as string;
    const { storeId, marketplaceUseCase, verifyUseCase, trackEvent } = buildDependencies(c);

    const result = await verifyUseCase.execute(provider, c.env, storeId);
    const apps = await marketplaceUseCase.listApps(storeId);
    const app = apps.find((item) => item.provider === provider) ?? null;

    await trackEvent.execute({
      eventType: result.success
        ? "integration_marketplace_app_verified"
        : "integration_marketplace_app_verification_failed",
      userId,
      properties: {
        provider,
        storeId,
        message: result.message,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json({
      success: result.success,
      message: result.message,
      details: result.details ?? null,
      app,
    }, 200);
  },
);

export { integrationMarketplaceRoutes };
