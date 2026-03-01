import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { TrackEventUseCase } from "../../application/analytics/track-event.usecase";
import { HandleFulfillmentExceptionsUseCase } from "../../application/fulfillment/handle-fulfillment-exceptions.usecase";
import { requireAuth } from "../../middleware/auth.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";
import { resolveFeatureFlags } from "../../shared/feature-flags";

const fulfillmentExceptionRoutes = new Hono<{ Bindings: Env }>();

const exceptionQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  pendingOlderThanMinutes: z.coerce.number().int().min(1).max(720).optional(),
  submittedOlderThanMinutes: z.coerce.number().int().min(1).max(1440).optional(),
  processingOlderThanMinutes: z.coerce.number().int().min(1).max(2880).optional(),
  cancelRequestedOlderThanMinutes: z.coerce.number().int().min(1).max(4320).optional(),
});

const autoResolveSchema = z.object({
  dryRun: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  pendingOlderThanMinutes: z.number().int().min(1).max(720).optional(),
  submittedOlderThanMinutes: z.number().int().min(1).max(1440).optional(),
  processingOlderThanMinutes: z.number().int().min(1).max(2880).optional(),
  cancelRequestedOlderThanMinutes: z.number().int().min(1).max(4320).optional(),
});

function checkFulfillmentExceptionFeature(c: any) {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags.ai_fulfillment_exception_handler) {
    return c.json(
      {
        error: "AI fulfillment exception handler is currently disabled",
        code: "FEATURE_DISABLED",
      },
      403,
    );
  }
  return null;
}

fulfillmentExceptionRoutes.use("/ops/fulfillment-exceptions/*", requireAuth());
fulfillmentExceptionRoutes.use(
  "/ops/fulfillment-exceptions",
  rateLimit({ windowMs: 60_000, max: 60 }),
);
fulfillmentExceptionRoutes.use(
  "/ops/fulfillment-exceptions/auto-resolve",
  rateLimit({ windowMs: 60_000, max: 20 }),
);

fulfillmentExceptionRoutes.get(
  "/ops/fulfillment-exceptions",
  zValidator("query", exceptionQuerySchema),
  async (c) => {
    const featureError = checkFulfillmentExceptionFeature(c);
    if (featureError) return featureError;

    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const userId = c.get("userId") as string;
    const query = c.req.valid("query");

    const useCase = new HandleFulfillmentExceptionsUseCase(db, storeId, c.env.FULFILLMENT_QUEUE as any);
    const exceptions = await useCase.scan(query);
    const autoResolvableCount = exceptions.filter((item) => item.autoResolvable).length;

    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const trackEvent = new TrackEventUseCase(analyticsRepo);
    await trackEvent.execute({
      eventType: "fulfillment_exception_scan_requested",
      userId,
      properties: {
        scannedCount: exceptions.length,
        autoResolvableCount,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json(
      {
        exceptions,
        summary: {
          scannedCount: exceptions.length,
          autoResolvableCount,
        },
      },
      200,
    );
  },
);

fulfillmentExceptionRoutes.post(
  "/ops/fulfillment-exceptions/auto-resolve",
  zValidator("json", autoResolveSchema),
  async (c) => {
    const featureError = checkFulfillmentExceptionFeature(c);
    if (featureError) return featureError;

    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const userId = c.get("userId") as string;
    const body = c.req.valid("json");

    const useCase = new HandleFulfillmentExceptionsUseCase(db, storeId, c.env.FULFILLMENT_QUEUE as any);
    const result = await useCase.autoResolve(body);

    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const trackEvent = new TrackEventUseCase(analyticsRepo);
    await trackEvent.execute({
      eventType: "fulfillment_exception_auto_resolve_executed",
      userId,
      properties: {
        dryRun: result.dryRun,
        scannedCount: result.scannedCount,
        eligibleCount: result.eligibleCount,
        resolvedCount: result.resolvedCount,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json(result, 200);
  },
);

export { fulfillmentExceptionRoutes };
