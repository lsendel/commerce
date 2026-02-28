import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { TrackEventUseCase } from "../../application/analytics/track-event.usecase";
import { GetDashboardMetricsUseCase } from "../../application/analytics/get-dashboard-metrics.usecase";
import { GetConversionFunnelUseCase } from "../../application/analytics/get-conversion-funnel.usecase";
import { GetTopProductsUseCase } from "../../application/analytics/get-top-products.usecase";
import { GetRevenueMetricsUseCase } from "../../application/analytics/get-revenue-metrics.usecase";
import { GetBaselineReadinessUseCase } from "../../application/analytics/get-baseline-readiness.usecase";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { normalizeAnalyticsEventType } from "../../shared/analytics-taxonomy";
import {
  YOLO_WEEKLY_FLAG_MATRIX,
  resolveFeatureFlags,
} from "../../shared/feature-flags";

const analytics = new Hono<{ Bindings: Env }>();

// ── POST /analytics/events — track event (public for client-side tracking) ──

const trackEventBodySchema = z.object({
  eventType: z.string().min(1).max(100).optional(),
  eventName: z.string().min(1).max(100).optional(),
  sessionId: z.string().max(200).optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  pageUrl: z.string().max(2000).optional(),
  referrer: z.string().max(2000).optional(),
}).refine((body) => Boolean(body.eventType || body.eventName), {
  message: "eventType is required",
  path: ["eventType"],
});

analytics.post(
  "/analytics/events",
  zValidator("json", trackEventBodySchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const useCase = new TrackEventUseCase(analyticsRepo);

    const body = c.req.valid("json");
    const normalizedEventType = normalizeAnalyticsEventType(
      body.eventType ?? body.eventName ?? "",
    );
    const properties = body.properties ?? body.payload ?? {};
    const sessionId =
      body.sessionId ??
      c.req.header("x-session-id") ??
      null;

    // Extract IP and User-Agent from request headers
    const ip =
      c.req.header("cf-connecting-ip") ??
      c.req.header("x-forwarded-for") ??
      undefined;
    const userAgent = c.req.header("user-agent") ?? undefined;

    const event = await useCase.execute({
      eventType: normalizedEventType,
      sessionId,
      properties,
      pageUrl: body.pageUrl ?? null,
      referrer: body.referrer ?? null,
      userAgent: userAgent ?? null,
      ip,
    });

    return c.json(
      { id: event?.id ?? "", eventType: normalizedEventType },
      201,
    );
  },
);

// ── GET /analytics/dashboard — dashboard metrics (admin only) ───────────────

const dashboardQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const readinessQuerySchema = z.object({
  days: z.coerce.number().int().min(3).max(30).optional(),
});

analytics.get(
  "/analytics/readiness",
  requireAuth(),
  requireRole("admin"),
  zValidator("query", readinessQuerySchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const useCase = new GetBaselineReadinessUseCase(analyticsRepo);
    const { days } = c.req.valid("query");
    const readiness = await useCase.execute(days ?? 7);
    const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);

    return c.json(
      {
        ...readiness,
        featureFlags: {
          enabled: flags,
          matrix: YOLO_WEEKLY_FLAG_MATRIX,
        },
      },
      200,
    );
  },
);

analytics.get(
  "/analytics/dashboard",
  requireAuth(),
  requireRole("admin"),
  zValidator("query", dashboardQuerySchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const useCase = new GetDashboardMetricsUseCase(analyticsRepo);

    const { from, to } = c.req.valid("query");
    const metrics = await useCase.execute(from, to);

    return c.json(metrics, 200);
  },
);

// ── GET /analytics/funnel — conversion funnel (admin) ─────────────────────
analytics.get(
  "/analytics/funnel",
  requireAuth(),
  requireRole("admin"),
  zValidator("query", dashboardQuerySchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const { from, to } = c.req.valid("query");
    const useCase = new GetConversionFunnelUseCase(db, storeId);
    const funnel = await useCase.execute(from, to);
    return c.json({ funnel }, 200);
  },
);

// ── GET /analytics/top-products — top products (admin) ────────────────────
analytics.get(
  "/analytics/top-products",
  requireAuth(),
  requireRole("admin"),
  zValidator("query", dashboardQuerySchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const { from, to } = c.req.valid("query");
    const useCase = new GetTopProductsUseCase(db, storeId);
    const topProducts = await useCase.execute(from, to);
    return c.json({ topProducts }, 200);
  },
);

// ── GET /analytics/revenue — revenue metrics (admin) ──────────────────────
analytics.get(
  "/analytics/revenue",
  requireAuth(),
  requireRole("admin"),
  zValidator("query", dashboardQuerySchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const { from, to } = c.req.valid("query");
    const useCase = new GetRevenueMetricsUseCase(analyticsRepo);
    const revenue = await useCase.execute(from, to);
    return c.json({ revenue }, 200);
  },
);

export { analytics as analyticsRoutes };
