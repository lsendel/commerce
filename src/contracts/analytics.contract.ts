import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const trackEventSchema = z.object({
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

const trackEventResponseSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  deduped: z.boolean(),
  delivery: z.object({
    key: z.string(),
    retries: z.number(),
    attempts: z.number(),
    taxonomyVersion: z.string(),
    category: z.string(),
  }),
});

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

const recommendationApplyResponseSchema = z.object({
  ok: z.boolean(),
  eventId: z.string().nullable(),
  eventType: z.string(),
  appliedAt: z.string(),
  href: z.string(),
});

const recommendationHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

const recommendationHistorySchema = z.object({
  history: z.array(
    z.object({
      id: z.string(),
      eventType: z.string(),
      actionId: z.string(),
      title: z.string(),
      detail: z.string().nullable().optional(),
      href: z.string(),
      appliedAt: z.string(),
    }),
  ),
});

const dailyBreakdownItemSchema = z.object({
  date: z.string(),
  metric: z.string(),
  value: z.number(),
  count: z.number(),
});

const dashboardMetricsSchema = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  totalRevenue: z.number(),
  orderCount: z.number(),
  averageOrderValue: z.number(),
  pageViews: z.number(),
  uniqueVisitors: z.number(),
  addToCartCount: z.number(),
  checkoutStartedCount: z.number(),
  conversionRate: z.number(),
  dailyBreakdown: z.array(dailyBreakdownItemSchema),
});

const readinessWindowSchema = z.object({
  from: z.string(),
  to: z.string(),
  pageViews: z.number(),
  addToCartCount: z.number(),
  checkoutStartedCount: z.number(),
  purchaseCount: z.number(),
  conversionRate: z.number(),
});

const readinessSchema = z.object({
  windowDays: z.number(),
  currentWindow: readinessWindowSchema,
  previousWindow: readinessWindowSchema,
  safetyRails: z.object({
    conversionDropPercent: z.number().nullable(),
    conversionDropThresholdPercent: z.number(),
    conversionDropTriggered: z.boolean(),
    fulfillmentFailureRatePercent: z.number().nullable(),
    fulfillmentFailureThresholdPercent: z.number(),
    fulfillmentFailureTriggered: z.boolean(),
    p1Over60IncidentCount: z.number(),
    p1Over60Triggered: z.boolean(),
  }),
  featureFlags: z.object({
    enabled: z.record(z.string(), z.boolean()),
    matrix: z.array(
      z.object({
        key: z.string(),
        featureId: z.number(),
        week: z.number(),
        description: z.string(),
      }),
    ),
  }),
});

const costDimensionStatusSchema = z.enum(["healthy", "watch", "critical"]);
const costBacklogStatusSchema = z.enum(["candidate", "planned", "in_progress"]);
const costBacklogPrioritySchema = z.enum(["p0", "p1", "p2"]);

const costDimensionRowSchema = z.object({
  key: z.string(),
  label: z.string(),
  team: z.string().optional(),
  events: z.number(),
  orders: z.number(),
  estimatedCostUsd: z.number(),
  attributedRevenueUsd: z.number(),
  costPerOrderUsd: z.number(),
  revenueToCostRatio: z.number(),
  status: costDimensionStatusSchema,
  optimizationHint: z.string(),
});

const costObservabilitySchema = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  summary: z.object({
    totalEstimatedCostUsd: z.number(),
    totalRevenueUsd: z.number(),
    contributionMarginUsd: z.number(),
    blendedCostPerOrderUsd: z.number(),
    blendedRevenueToCostRatio: z.number(),
    totalOrders: z.number(),
  }),
  dimensions: z.object({
    feature: z.array(costDimensionRowSchema),
    team: z.array(costDimensionRowSchema),
    tenant: z.array(costDimensionRowSchema),
  }),
  optimizationBacklog: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      dimension: z.enum(["feature", "team", "tenant"]),
      ownerTeam: z.string(),
      estimatedMonthlySavingsUsd: z.number(),
      status: costBacklogStatusSchema,
      priority: costBacklogPrioritySchema,
      rationale: z.string(),
    }),
  ),
});

export const analyticsContract = c.router({
  trackEvent: {
    method: "POST",
    path: "/api/analytics/events",
    body: trackEventSchema,
    responses: {
      200: trackEventResponseSchema,
      201: trackEventResponseSchema,
      400: z.object({
        error: z.string(),
        code: z.string().optional(),
        eventType: z.string().optional(),
        taxonomyVersion: z.string().optional(),
      }),
    },
  },
  getDashboard: {
    method: "GET",
    path: "/api/analytics/dashboard",
    query: dashboardQuerySchema,
    responses: {
      200: dashboardMetricsSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: z.object({ error: z.string() }),
    },
  },
  getReadiness: {
    method: "GET",
    path: "/api/analytics/readiness",
    query: readinessQuerySchema,
    responses: {
      200: readinessSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: z.object({ error: z.string() }),
    },
  },
  applyRecommendation: {
    method: "POST",
    path: "/api/analytics/recommendations/apply",
    body: recommendationApplyBodySchema,
    responses: {
      201: recommendationApplyResponseSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: z.object({ error: z.string() }),
    },
  },
  getRecommendationHistory: {
    method: "GET",
    path: "/api/analytics/recommendations/history",
    query: recommendationHistoryQuerySchema,
    responses: {
      200: recommendationHistorySchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: z.object({ error: z.string() }),
    },
  },
  getCostObservability: {
    method: "GET",
    path: "/api/analytics/cost-observability",
    query: costObservabilityQuerySchema,
    responses: {
      200: costObservabilitySchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: z.object({ error: z.string() }),
    },
  },
});
