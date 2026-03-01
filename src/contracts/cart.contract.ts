import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  addToCartSchema,
  updateCartItemSchema,
  idParamSchema,
} from "../shared/validators";

const c = initContract();
const featureDisabledSchema = z.object({
  error: z.string(),
  code: z.literal("FEATURE_DISABLED"),
});

const cartTotalsSchema = z.object({
  subtotal: z.number(),
  discount: z.number(),
  shippingEstimate: z.number(),
  taxEstimate: z.number(),
  total: z.number(),
});

const cartItemSchema = z.object({
  id: z.string(),
  variantId: z.string(),
  quantity: z.number(),
  variant: z.object({
    title: z.string(),
    price: z.number(),
    product: z.object({
      name: z.string(),
      slug: z.string(),
      featuredImageUrl: z.string().nullable(),
    }),
  }),
  bookingAvailabilityId: z.string().nullable().optional(),
  personTypeQuantities: z
    .record(z.string(), z.number())
    .nullable()
    .optional(),
});

const cartSchema = z.object({
  id: z.string(),
  items: z.array(cartItemSchema),
  subtotal: z.number(),
  totals: cartTotalsSchema,
  warnings: z.array(z.string()),
});

const cartValidationSchema = z.object({
  valid: z.boolean(),
  problems: z.array(
    z.object({
      itemId: z.string(),
      type: z.enum([
        "out_of_stock",
        "low_stock",
        "unavailable",
        "price_changed",
        "expired_slot",
      ]),
      message: z.string(),
    }),
  ),
});

const upsellRecommendationSchema = z.object({
  productId: z.string(),
  name: z.string(),
  slug: z.string(),
  imageUrl: z.string().nullable(),
  variantId: z.string(),
  price: z.number(),
  score: z.number(),
  reasons: z.array(z.string()),
});

export const cartContract = c.router({
  get: {
    method: "GET",
    path: "/api/cart",
    responses: {
      200: cartSchema,
      401: z.object({ error: z.string() }),
    },
  },
  upsellRecommendations: {
    method: "GET",
    path: "/api/cart/upsell-recommendations",
    query: z.object({
      limit: z.number().int().min(1).max(12).optional(),
    }).optional(),
    responses: {
      200: z.object({
        recommendations: z.array(upsellRecommendationSchema),
      }),
      403: featureDisabledSchema,
    },
  },
  addItem: {
    method: "POST",
    path: "/api/cart/items",
    body: addToCartSchema,
    responses: {
      200: cartSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
  updateItem: {
    method: "PATCH",
    path: "/api/cart/items/:id",
    pathParams: idParamSchema,
    body: updateCartItemSchema,
    responses: {
      200: cartSchema,
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
  removeItem: {
    method: "DELETE",
    path: "/api/cart/items/:id",
    pathParams: idParamSchema,
    body: z.object({}),
    responses: {
      200: cartSchema,
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
  validate: {
    method: "POST",
    path: "/api/cart/validate",
    body: z.object({}).optional(),
    responses: {
      200: cartValidationSchema,
    },
  },
});
