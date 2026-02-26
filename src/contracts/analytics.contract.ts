import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const trackEventSchema = z.object({
  eventType: z.string().min(1).max(100),
  sessionId: z.string().max(200).optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  pageUrl: z.string().max(2000).optional(),
  referrer: z.string().max(2000).optional(),
});

const dashboardQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

export const analyticsContract = c.router({
  trackEvent: {
    method: "POST",
    path: "/api/analytics/events",
    body: trackEventSchema,
    responses: {
      201: z.object({ id: z.string(), eventType: z.string() }),
      400: z.object({ error: z.string() }),
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
});
