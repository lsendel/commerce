import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { TrackEventUseCase } from "../../application/analytics/track-event.usecase";
import { GetDashboardMetricsUseCase } from "../../application/analytics/get-dashboard-metrics.usecase";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";

const analytics = new Hono<{ Bindings: Env }>();

// ── POST /analytics/events — track event (public for client-side tracking) ──

const trackEventBodySchema = z.object({
  eventType: z.string().min(1).max(100),
  sessionId: z.string().max(200).optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  pageUrl: z.string().max(2000).optional(),
  referrer: z.string().max(2000).optional(),
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

    // Extract IP and User-Agent from request headers
    const ip =
      c.req.header("cf-connecting-ip") ??
      c.req.header("x-forwarded-for") ??
      undefined;
    const userAgent = c.req.header("user-agent") ?? undefined;

    const event = await useCase.execute({
      eventType: body.eventType,
      sessionId: body.sessionId ?? null,
      properties: body.properties ?? {},
      pageUrl: body.pageUrl ?? null,
      referrer: body.referrer ?? null,
      userAgent: userAgent ?? null,
      ip,
    });

    return c.json(
      { id: event?.id ?? "", eventType: body.eventType },
      201,
    );
  },
);

// ── GET /analytics/dashboard — dashboard metrics (admin only) ───────────────

const dashboardQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

analytics.get(
  "/analytics/dashboard",
  requireAuth(),
  requireRole("super_admin"),
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

export { analytics as analyticsRoutes };
