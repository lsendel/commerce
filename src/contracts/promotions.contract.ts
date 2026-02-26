import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const createPromotionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(["coupon", "automatic", "flash_sale"]),
  strategyType: z.enum([
    "percentage_off",
    "fixed_amount",
    "free_shipping",
    "bogo",
    "buy_x_get_y",
    "tiered",
    "bundle",
  ]),
  strategyParams: z.record(z.unknown()),
  conditions: z.record(z.unknown()),
  priority: z.number().int().min(0).optional(),
  stackable: z.boolean().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  usageLimit: z.number().int().positive().optional(),
});

export const updatePromotionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["active", "scheduled", "expired", "disabled"]).optional(),
  priority: z.number().int().min(0).optional(),
  stackable: z.boolean().optional(),
  strategyType: z
    .enum([
      "percentage_off",
      "fixed_amount",
      "free_shipping",
      "bogo",
      "buy_x_get_y",
      "tiered",
      "bundle",
    ])
    .optional(),
  strategyParams: z.record(z.unknown()).optional(),
  conditions: z.record(z.unknown()).optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
});

export const createCouponCodeSchema = z.object({
  code: z.string().min(2).max(50),
  maxRedemptions: z.number().int().positive().optional(),
});

export const applyCouponSchema = z.object({
  code: z.string().min(1),
});

export const createSegmentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  rules: z.record(z.unknown()),
});

export const updateSegmentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  rules: z.record(z.unknown()).optional(),
});

export const promotionsContract = c.router({
  createPromotion: {
    method: "POST",
    path: "/api/promotions",
    body: createPromotionSchema,
    responses: { 201: c.type<{ promotion: any }>() },
  },
  listPromotions: {
    method: "GET",
    path: "/api/promotions",
    responses: { 200: c.type<{ promotions: any[] }>() },
  },
  updatePromotion: {
    method: "PATCH",
    path: "/api/promotions/:id",
    body: updatePromotionSchema,
    responses: { 200: c.type<{ promotion: any }>() },
  },
  disablePromotion: {
    method: "DELETE",
    path: "/api/promotions/:id",
    body: z.object({}),
    responses: { 200: c.type<{ promotion: any }>() },
  },
  createCouponCode: {
    method: "POST",
    path: "/api/promotions/:id/codes",
    body: createCouponCodeSchema,
    responses: { 201: c.type<{ coupon: any }>() },
  },
  applyCoupon: {
    method: "POST",
    path: "/api/cart/apply-coupon",
    body: applyCouponSchema,
    responses: { 200: c.type<{ promotion: any; coupon: any }>() },
  },
  removeCoupon: {
    method: "DELETE",
    path: "/api/cart/remove-coupon",
    body: z.object({}),
    responses: { 200: c.type<{ message: string }>() },
  },
  getAnalytics: {
    method: "GET",
    path: "/api/promotions/analytics",
    responses: {
      200: c.type<{
        analytics: Array<{
          promotionId: string;
          totalRedemptions: number;
          totalDiscount: number;
          uniqueCustomers: number;
        }>;
      }>(),
    },
  },
  listSegments: {
    method: "GET",
    path: "/api/promotions/segments",
    responses: { 200: c.type<{ segments: any[] }>() },
  },
  createSegment: {
    method: "POST",
    path: "/api/promotions/segments",
    body: createSegmentSchema,
    responses: { 201: c.type<{ segment: any }>() },
  },
  updateSegment: {
    method: "PATCH",
    path: "/api/promotions/segments/:id",
    body: updateSegmentSchema,
    responses: { 200: c.type<{ segment: any }>() },
  },
});
