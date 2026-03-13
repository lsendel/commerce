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
import { GetCostObservabilityUseCase } from "../../application/analytics/get-cost-observability.usecase";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { buildAnalyticsDeliveryKey, delayMs } from "../../shared/analytics-delivery";
import {
  ANALYTICS_EVENT_TAXONOMY_VERSION,
  resolveAnalyticsEventType,
} from "../../shared/analytics-taxonomy";
import {
  YOLO_WEEKLY_FLAG_MATRIX,
  resolveFeatureFlags,
} from "../../shared/feature-flags";

const analytics = new Hono<{ Bindings: Env }>();
const MAX_DELIVERY_ATTEMPTS = 3;
const DELIVERY_RETRY_BACKOFF_MS = [0, 35, 120];
const DELIVERY_DEDUPE_WINDOW_SECONDS = 120;
const RECOMMENDATION_APPLIED_EVENT_TYPE = "admin_recommendation_default_applied";

const recommendationApplyBodySchema = z.object({
  actionId: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(160),
  detail: z.string().trim().max(600).optional(),
  href: z.string().trim().min(1).max(500).startsWith("/"),
  payload: z.record(z.string(), z.unknown()).optional(),
  context: z.object({
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }).optional(),
});

const recommendationHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toIsoDateTime(value: unknown): string {
  const parsed = new Date(value as string | number | Date);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return new Date().toISOString();
}

// ── POST /analytics/events — track event (public for client-side tracking) ──

const trackEventBodySchema = z.object({
  eventType: z.string().min(1).max(100).optional(),
  eventName: z.string().min(1).max(100).optional(),
  eventId: z.string().max(200).optional(),
  sessionId: z.string().max(200).optional(),
  dedupeKey: z.string().max(220).optional(),
  source: z.string().max(100).optional(),
  occurredAt: z.string().datetime().optional(),
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
    const eventResolution = resolveAnalyticsEventType(
      body.eventType ?? body.eventName ?? "",
    );
    if (!eventResolution.accepted) {
      return c.json(
        {
          error: eventResolution.reason ?? "Unknown analytics event type.",
          code: "UNKNOWN_EVENT_TYPE",
          eventType: eventResolution.eventType,
          taxonomyVersion: ANALYTICS_EVENT_TAXONOMY_VERSION,
        },
        400,
      );
    }

    const eventType = eventResolution.eventType;
    const baseProperties = body.properties ?? body.payload ?? {};
    const sessionId =
      body.sessionId ??
      c.req.header("x-session-id") ??
      null;
    const eventOccurredAt = body.occurredAt ?? new Date().toISOString();
    const deliveryKey = buildAnalyticsDeliveryKey({
      eventType,
      sessionId,
      pageUrl: body.pageUrl ?? null,
      dedupeKey: body.dedupeKey ?? null,
      eventId: body.eventId ?? null,
      properties: baseProperties,
    });
    const properties = {
      ...baseProperties,
      source: body.source ?? "web",
      eventOccurredAt,
      eventCategory: eventResolution.category,
      taxonomyVersion: ANALYTICS_EVENT_TAXONOMY_VERSION,
      deliveryKey,
    };

    // Extract IP and User-Agent from request headers
    const ip =
      c.req.header("cf-connecting-ip") ??
      c.req.header("x-forwarded-for") ??
      undefined;
    const userAgent = c.req.header("user-agent") ?? undefined;

    const duplicate = await analyticsRepo.findRecentEventByDeliveryKey({
      eventType,
      deliveryKey,
      sessionId,
      withinSeconds: DELIVERY_DEDUPE_WINDOW_SECONDS,
    });
    if (duplicate) {
      return c.json(
        {
          id: duplicate.id ?? "",
          eventType,
          deduped: true,
          delivery: {
            key: deliveryKey,
            retries: 0,
            attempts: 1,
            taxonomyVersion: ANALYTICS_EVENT_TAXONOMY_VERSION,
            category: eventResolution.category,
          },
        },
        200,
      );
    }

    let event: Awaited<ReturnType<typeof useCase.execute>> | null = null;
    let attempts = 0;
    let retries = 0;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < MAX_DELIVERY_ATTEMPTS; attempt++) {
      attempts = attempt + 1;
      try {
        event = await useCase.execute({
          eventType,
          sessionId,
          properties,
          pageUrl: body.pageUrl ?? null,
          referrer: body.referrer ?? null,
          userAgent: userAgent ?? null,
          ip,
        });
        break;
      } catch (error) {
        lastError = error;
        if (attempt >= MAX_DELIVERY_ATTEMPTS - 1) {
          throw error;
        }
        retries++;
        await delayMs(DELIVERY_RETRY_BACKOFF_MS[attempt + 1] ?? 80);
      }
    }

    if (!event && lastError) {
      throw lastError;
    }

    return c.json(
      {
        id: event?.id ?? "",
        eventType,
        deduped: false,
        delivery: {
          key: deliveryKey,
          retries,
          attempts,
          taxonomyVersion: ANALYTICS_EVENT_TAXONOMY_VERSION,
          category: eventResolution.category,
        },
      },
      201,
    );
  },
);

analytics.post(
  "/analytics/recommendations/apply",
  requireAuth(),
  requireRole("admin"),
  zValidator("json", recommendationApplyBodySchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const userId = c.get("userId") as string | undefined;
    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const body = c.req.valid("json");
    const appliedAt = new Date().toISOString();

    const event = await analyticsRepo.trackEvent({
      userId: userId ?? null,
      eventType: RECOMMENDATION_APPLIED_EVENT_TYPE,
      properties: {
        actionId: body.actionId,
        title: body.title,
        detail: body.detail ?? null,
        href: body.href,
        payload: body.payload ?? {},
        context: body.context ?? {},
        source: "admin_analytics_recommendations",
        appliedAt,
      },
      pageUrl: c.req.header("referer") ?? "/admin/analytics",
      userAgent: c.req.header("user-agent") ?? null,
    });

    return c.json(
      {
        ok: true,
        eventId: event?.id ?? null,
        eventType: RECOMMENDATION_APPLIED_EVENT_TYPE,
        appliedAt,
        href: body.href,
      },
      201,
    );
  },
);

analytics.get(
  "/analytics/recommendations/history",
  requireAuth(),
  requireRole("admin"),
  zValidator("query", recommendationHistoryQuerySchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const { limit } = c.req.valid("query");
    const rows = await analyticsRepo.listRecentEventsByTypes(
      [RECOMMENDATION_APPLIED_EVENT_TYPE],
      limit ?? 8,
    );

    const history = rows.map((row) => {
      const properties =
        row.properties && typeof row.properties === "object"
          ? row.properties as Record<string, unknown>
          : {};
      const actionId = readString(properties.actionId) ?? "unknown";
      const title = readString(properties.title) ?? "Applied recommendation";
      const detail = readString(properties.detail);
      const href = readString(properties.href) ?? "/admin/analytics";
      const appliedAt =
        readString(properties.appliedAt) ??
        toIsoDateTime(row.createdAt);

      return {
        id: row.id,
        eventType: row.eventType,
        actionId,
        title,
        detail,
        href,
        appliedAt: toIsoDateTime(appliedAt),
      };
    });

    return c.json({ history }, 200);
  },
);

// ── GET /analytics/dashboard — dashboard metrics (admin only) ───────────────

const dashboardQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const costObservabilityQuerySchema = z.object({
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
  "/analytics/cost-observability",
  requireAuth(),
  requireRole("admin"),
  zValidator("query", costObservabilityQuerySchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const { from, to } = c.req.valid("query");
    const useCase = new GetCostObservabilityUseCase(analyticsRepo, storeId);
    const payload = await useCase.execute(from, to);
    return c.json(payload, 200);
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
