import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const registerAffiliateSchema = z.object({
  customSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  parentCode: z.string().optional(),
});

export const createLinkSchema = z.object({
  targetUrl: z.string().url(),
});

const featureDisabledSchema = z.object({
  error: z.string(),
  code: z.literal("FEATURE_DISABLED"),
});

const errorSchema = z.object({
  error: z.string(),
});

export const affiliatesContract = c.router({
  register: {
    method: "POST",
    path: "/api/affiliates/register",
    body: registerAffiliateSchema,
    responses: {
      201: c.type<{ affiliate: any }>(),
      401: errorSchema,
      409: errorSchema,
    },
  },
  getDashboard: {
    method: "GET",
    path: "/api/affiliates/dashboard",
    responses: {
      200: c.type<{
        affiliate: any;
        recentConversions: any[];
        recentClicks: number;
      }>(),
      401: errorSchema,
      404: errorSchema,
    },
  },
  createLink: {
    method: "POST",
    path: "/api/affiliates/links",
    body: createLinkSchema,
    responses: {
      201: c.type<{ link: any }>(),
      401: errorSchema,
      404: errorSchema,
    },
  },
  getLinks: {
    method: "GET",
    path: "/api/affiliates/links",
    responses: {
      200: c.type<{ links: any[] }>(),
      401: errorSchema,
      404: errorSchema,
    },
  },
  getConversions: {
    method: "GET",
    path: "/api/affiliates/conversions",
    query: z.object({ page: z.coerce.number().optional() }),
    responses: {
      200: c.type<{ conversions: any[] }>(),
      401: errorSchema,
      404: errorSchema,
    },
  },
  getPayouts: {
    method: "GET",
    path: "/api/affiliates/payouts",
    responses: {
      200: c.type<{ payouts: any[] }>(),
      401: errorSchema,
      404: errorSchema,
    },
  },
  getMissions: {
    method: "GET",
    path: "/api/affiliates/missions",
    responses: {
      200: z.object({
        windowStart: z.string(),
        snapshot: z.object({
          clicks: z.number(),
          conversions: z.number(),
          revenue: z.number(),
          commission: z.number(),
        }),
        missions: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
            metric: z.enum(["clicks", "conversions", "revenue"]),
            target: z.number(),
            current: z.number(),
            progressPercent: z.number(),
            completed: z.boolean(),
            rewardLabel: z.string(),
          }),
        ),
        completedCount: z.number(),
        totalCount: z.number(),
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: errorSchema,
    },
  },
  getCreatorStorefront: {
    method: "GET",
    path: "/api/affiliates/storefront/:slug",
    pathParams: z.object({ slug: z.string().min(2) }),
    responses: {
      200: z.object({
        creator: z.object({
          id: z.string(),
          name: z.string(),
          customSlug: z.string().nullable(),
          referralCode: z.string(),
          commissionRate: z.string(),
          totalEarnings: z.string(),
          totalClicks: z.number(),
          totalConversions: z.number(),
          createdAt: z.string().nullable(),
        }),
        featuredLinks: z.array(
          z.object({
            id: z.string(),
            shortCode: z.string(),
            clickCount: z.number(),
            targetUrl: z.string(),
            referralUrl: z.string(),
          }),
        ),
        featuredProducts: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            slug: z.string(),
            featuredImageUrl: z.string().nullable(),
            price: z.string(),
            referralUrl: z.string(),
          }),
        ),
      }),
      403: featureDisabledSchema,
      404: errorSchema,
    },
  },
  // Admin endpoints
  listPending: {
    method: "GET",
    path: "/api/affiliates/admin/pending",
    responses: {
      200: c.type<{ affiliates: any[] }>(),
      401: errorSchema,
      403: errorSchema,
    },
  },
  approve: {
    method: "PATCH",
    path: "/api/affiliates/admin/:id/approve",
    body: z.object({}),
    responses: {
      200: c.type<{ affiliate: any }>(),
      401: errorSchema,
      403: errorSchema,
      404: errorSchema,
    },
  },
  suspend: {
    method: "PATCH",
    path: "/api/affiliates/admin/:id/suspend",
    body: z.object({}),
    responses: {
      200: c.type<{ affiliate: any }>(),
      401: errorSchema,
      403: errorSchema,
      404: errorSchema,
    },
  },
  processPayouts: {
    method: "POST",
    path: "/api/affiliates/admin/payouts",
    body: z.object({}),
    responses: {
      200: c.type<{ processed: number }>(),
      401: errorSchema,
      403: errorSchema,
    },
  },
});
