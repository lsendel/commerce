import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const featureDisabledSchema = z.object({
  error: z.string(),
  code: z.literal("FEATURE_DISABLED"),
});

const supportDeflectionSchema = z.object({
  intent: z.enum([
    "order_tracking",
    "returns_exchange",
    "subscription_billing",
    "address_update",
    "coupon_help",
    "account_access",
    "general",
  ]),
  confidence: z.number(),
  deflected: z.boolean(),
  response: z.string(),
  suggestedActions: z.array(
    z.object({
      label: z.string(),
      url: z.string(),
    }),
  ),
  escalation: z.object({
    recommended: z.boolean(),
    channel: z.literal("email"),
    reason: z.string().nullable(),
  }),
  warnings: z.array(z.string()),
});

export const supportContract = c.router({
  deflect: {
    method: "POST",
    path: "/api/support/deflect",
    body: z.object({
      message: z.string().min(5).max(1200),
    }),
    responses: {
      200: supportDeflectionSchema,
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  feedback: {
    method: "POST",
    path: "/api/support/deflect/feedback",
    body: z.object({
      resolved: z.boolean(),
      intent: z.enum([
        "order_tracking",
        "returns_exchange",
        "subscription_billing",
        "address_update",
        "coupon_help",
        "account_access",
        "general",
      ]).optional(),
      confidence: z.number().optional(),
      deflected: z.boolean().optional(),
      reason: z.string().optional(),
    }),
    responses: {
      200: z.object({ success: z.boolean() }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
});
