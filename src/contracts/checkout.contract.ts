import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { createCheckoutSchema } from "../shared/validators";

const c = initContract();

const deliveryPromiseSchema = z.object({
  minDays: z.number().int().min(1),
  maxDays: z.number().int().min(1),
  label: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  source: z.enum(["production+shipping", "production-only"]),
});

const checkoutRecoverySchema = z.object({
  retryable: z.boolean(),
  suggestedAction: z.enum(["retry_checkout", "verify_cart", "contact_support"]),
});

export const checkoutContract = c.router({
  create: {
    method: "POST",
    path: "/api/checkout",
    body: createCheckoutSchema,
    responses: {
      200: z.object({
        url: z.string(),
        subtotal: z.number(),
        discount: z.number(),
        shipping: z.number(),
        tax: z.number(),
        total: z.number(),
        deliveryPromise: deliveryPromiseSchema.nullable(),
        appliedCouponCode: z.string().nullable().optional(),
        warnings: z.array(z.string()).optional(),
      }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
      503: z.object({
        error: z.string(),
        recovery: checkoutRecoverySchema,
      }),
    },
  },
  success: {
    method: "GET",
    path: "/api/checkout/success",
    query: z.object({
      session_id: z.string(),
    }),
    responses: {
      200: z.object({
        orderId: z.string(),
        status: z.string(),
        subtotal: z.number(),
        discount: z.number(),
        shipping: z.number(),
        tax: z.number(),
        total: z.number(),
      }),
      400: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
});
