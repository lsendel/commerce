import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { requireAuth } from "../../middleware/auth.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";
import { resolveFeatureFlags } from "../../shared/feature-flags";
import { AiSupportDeflectionUseCase } from "../../application/support/ai-support-deflection.usecase";
import { TrackEventUseCase } from "../../application/analytics/track-event.usecase";

const supportRoutes = new Hono<{ Bindings: Env }>();

const supportDeflectSchema = z.object({
  message: z.string().min(5).max(1200),
});
const supportDeflectFeedbackSchema = z.object({
  resolved: z.boolean(),
  intent: z
    .enum([
      "order_tracking",
      "returns_exchange",
      "subscription_billing",
      "address_update",
      "coupon_help",
      "account_access",
      "general",
    ])
    .optional(),
  confidence: z.number().min(0).max(1).optional(),
  deflected: z.boolean().optional(),
  reason: z.string().max(280).optional(),
});

function checkSupportDeflectionFeature(c: any) {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags.ai_support_deflection) {
    return c.json(
      { error: "AI support deflection is currently disabled", code: "FEATURE_DISABLED" },
      403,
    );
  }
  return null;
}

supportRoutes.use("/support/deflect", rateLimit({ windowMs: 60_000, max: 20 }));
supportRoutes.use("/support/deflect/feedback", rateLimit({ windowMs: 60_000, max: 40 }));

supportRoutes.post(
  "/support/deflect",
  requireAuth(),
  zValidator("json", supportDeflectSchema),
  async (c) => {
    const featureError = checkSupportDeflectionFeature(c);
    if (featureError) return featureError;

    const body = c.req.valid("json");
    const useCase = new AiSupportDeflectionUseCase(c.env.GEMINI_API_KEY);
    const result = await useCase.execute({ message: body.message });
    const db = createDb(c.env.DATABASE_URL);
    const analyticsRepo = new AnalyticsRepository(db, c.get("storeId") as string);
    const trackEvent = new TrackEventUseCase(analyticsRepo);
    await trackEvent.execute({
      eventType: "support_deflection_requested",
      userId: c.get("userId"),
      properties: {
        intent: result.intent,
        confidence: result.confidence,
        deflected: result.deflected,
        messageLength: body.message.length,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });
    await trackEvent.execute({
      eventType: result.deflected
        ? "support_deflection_resolved"
        : "support_deflection_escalation_recommended",
      userId: c.get("userId"),
      properties: {
        intent: result.intent,
        confidence: result.confidence,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json(result, 200);
  },
);

supportRoutes.post(
  "/support/deflect/feedback",
  requireAuth(),
  zValidator("json", supportDeflectFeedbackSchema),
  async (c) => {
    const featureError = checkSupportDeflectionFeature(c);
    if (featureError) return featureError;

    const body = c.req.valid("json");
    const db = createDb(c.env.DATABASE_URL);
    const analyticsRepo = new AnalyticsRepository(db, c.get("storeId") as string);
    const trackEvent = new TrackEventUseCase(analyticsRepo);
    await trackEvent.execute({
      eventType: "support_deflection_feedback",
      userId: c.get("userId"),
      properties: {
        resolved: body.resolved,
        intent: body.intent ?? null,
        confidence: body.confidence ?? null,
        deflected: body.deflected ?? null,
        reason: body.reason ?? null,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json({ success: true }, 200);
  },
);

export { supportRoutes };
