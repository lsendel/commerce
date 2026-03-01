import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  createSubscriptionSchema,
  idParamSchema,
} from "../shared/validators";

const c = initContract();

const subscriptionStatusSchema = z.enum([
  "active",
  "past_due",
  "cancelled",
  "trialing",
  "paused",
]);

const featureDisabledSchema = z.object({
  error: z.string(),
  code: z.literal("FEATURE_DISABLED"),
});

const subscriptionSchema = z.object({
  id: z.string(),
  planId: z.string(),
  planName: z.string(),
  billingPeriod: z.string().nullable().optional(),
  status: subscriptionStatusSchema,
  currentPeriodStart: z.string().nullable(),
  currentPeriodEnd: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  stripeSubscriptionId: z.string().nullable(),
  mixConfiguration: z.record(z.any()).nullable().optional(),
  createdAt: z.string().nullable(),
});

const bundleSelectionSchema = z.object({
  planId: z.string().uuid(),
  quantity: z.number().int().min(1).max(12),
});

const bundleQuoteLineSchema = z.object({
  planId: z.string(),
  planName: z.string(),
  stripePriceId: z.string(),
  quantity: z.number().int().min(1),
  unitAmountCents: z.number().int().nonnegative(),
  lineAmountCents: z.number().int().nonnegative(),
  interval: z.enum(["month", "year"]),
});

const bundleQuoteSchema = z.object({
  currency: z.literal("usd"),
  billingCadence: z.enum(["month", "year"]),
  lines: z.array(bundleQuoteLineSchema),
  subtotalCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
});

export const subscriptionsContract = c.router({
  create: {
    method: "POST",
    path: "/api/subscriptions",
    body: createSubscriptionSchema,
    responses: {
      201: z.object({
        checkoutUrl: z.string(),
      }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
    },
  },
  list: {
    method: "GET",
    path: "/api/subscriptions",
    responses: {
      200: z.object({
        subscriptions: z.array(subscriptionSchema),
      }),
      401: z.object({ error: z.string() }),
    },
  },
  builderOptions: {
    method: "GET",
    path: "/api/subscriptions/builder/options",
    responses: {
      200: z.object({
        plans: z.array(
          z.object({
            id: z.string(),
            productId: z.string(),
            name: z.string(),
            slug: z.string(),
            description: z.string().nullable(),
            billingPeriod: z.string(),
            billingInterval: z.number().int(),
            trialDays: z.number().int(),
            interval: z.enum(["month", "year"]),
            amount: z.string(),
            unitAmountCents: z.number().int().nonnegative(),
            stripePriceId: z.string().nullable(),
            features: z.array(z.string()),
          }),
        ),
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  builderQuote: {
    method: "POST",
    path: "/api/subscriptions/builder/quote",
    body: z.object({
      selections: z.array(bundleSelectionSchema).min(1).max(8),
    }),
    responses: {
      200: bundleQuoteSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  builderCheckout: {
    method: "POST",
    path: "/api/subscriptions/builder/checkout",
    body: z.object({
      selections: z.array(bundleSelectionSchema).min(1).max(8),
    }),
    responses: {
      201: z.object({
        checkoutUrl: z.string(),
        quote: bundleQuoteSchema,
      }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  portal: {
    method: "POST",
    path: "/api/subscriptions/portal",
    body: z.object({}).optional(),
    responses: {
      200: z.object({ url: z.string() }),
      401: z.object({ error: z.string() }),
    },
  },
  cancel: {
    method: "DELETE",
    path: "/api/subscriptions/:id",
    pathParams: idParamSchema,
    body: z.object({}),
    responses: {
      200: z.object({
        subscription: z.object({
          id: z.string(),
          status: subscriptionStatusSchema,
          cancelAtPeriodEnd: z.boolean(),
          currentPeriodEnd: z.string().nullable(),
        }),
      }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
  changePlan: {
    method: "PATCH",
    path: "/api/subscriptions/:id/change-plan",
    pathParams: idParamSchema,
    body: z.object({
      newPlanId: z.string().uuid(),
    }),
    responses: {
      200: z.object({
        subscription: z.object({
          id: z.string(),
          planId: z.string(),
        }).passthrough(),
      }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
  resume: {
    method: "POST",
    path: "/api/subscriptions/:id/resume",
    pathParams: idParamSchema,
    body: z.object({}).optional(),
    responses: {
      200: z.object({
        subscription: z.object({
          id: z.string(),
          status: subscriptionStatusSchema,
        }).passthrough(),
      }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
});
