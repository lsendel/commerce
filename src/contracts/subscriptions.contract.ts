import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  createSubscriptionSchema,
  idParamSchema,
} from "../shared/validators";

const c = initContract();

const subscriptionSchema = z.object({
  id: z.string(),
  planId: z.string(),
  planName: z.string(),
  status: z.enum([
    "active",
    "past_due",
    "canceled",
    "incomplete",
    "trialing",
  ]),
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
  cancelAtPeriodEnd: z.boolean(),
  stripeSubscriptionId: z.string().nullable(),
  createdAt: z.string(),
});

export const subscriptionsContract = c.router({
  create: {
    method: "POST",
    path: "/api/subscriptions",
    body: createSubscriptionSchema,
    responses: {
      201: z.object({
        subscription: subscriptionSchema,
        checkoutUrl: z.string().nullable(),
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
  portal: {
    method: "POST",
    path: "/api/subscriptions/portal",
    body: z.object({}),
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
      200: z.object({ subscription: subscriptionSchema }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
});
