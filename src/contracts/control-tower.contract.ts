import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const featureDisabledSchema = z.object({
  error: z.string(),
  code: z.literal("FEATURE_DISABLED"),
});

const controlTowerSummarySchema = z.object({
  snapshotAt: z.string(),
  range: z.object({
    dateFrom: z.string(),
    dateTo: z.string(),
    previousFrom: z.string(),
    previousTo: z.string(),
  }),
  kpis: z.object({
    revenue: z.number(),
    orders: z.number(),
    averageOrderValue: z.number(),
    conversionRate: z.number(),
    visitors: z.number(),
    pageViews: z.number(),
  }),
  growth: z.object({
    revenueDeltaPercent: z.number(),
    ordersDeltaPercent: z.number(),
    conversionDeltaPercent: z.number(),
  }),
  readiness: z.object({
    conversionDropPercent: z.number(),
    fulfillmentFailureRatePercent: z.number(),
    p1Over60IncidentCount: z.number(),
    baselineWindowDays: z.number(),
  }),
  fulfillment: z.object({
    totalRequestsLast7d: z.number(),
    failedRequestsLast7d: z.number(),
    failureRatePercentLast7d: z.number(),
  }),
  policy: z.object({
    violationsLast7d: z.number(),
    errorViolationsLast7d: z.number(),
    violationsByDomain: z.array(
      z.object({
        domain: z.string(),
        total: z.number(),
        errors: z.number(),
        warnings: z.number(),
      }),
    ),
  }),
  featureRollout: z.object({
    enabledCount: z.number(),
    totalCount: z.number(),
    completionPercent: z.number(),
    items: z.array(
      z.object({
        featureId: z.number(),
        week: z.number(),
        key: z.string(),
        description: z.string(),
        enabled: z.boolean(),
      }),
    ),
  }),
  risk: z.object({
    level: z.enum(["low", "medium", "high"]),
    blockers: z.array(z.string()),
  }),
});

export const controlTowerContract = c.router({
  getSummary: {
    method: "GET",
    path: "/api/admin/control-tower/summary",
    query: z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }),
    responses: {
      200: z.object({ summary: controlTowerSummarySchema }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
});
