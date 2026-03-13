import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { createStripeClient } from "../../infrastructure/stripe/stripe.client";
import { CartRepository } from "../../infrastructure/repositories/cart.repository";
import { OrderRepository } from "../../infrastructure/repositories/order.repository";
import { CreateCheckoutUseCase } from "../../application/checkout/create-checkout.usecase";
import { createCheckoutSchema } from "../../shared/validators";
import { requireAuth } from "../../middleware/auth.middleware";
import { cartSession } from "../../middleware/cart-session.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";
import { resolveFeatureFlags } from "../../shared/feature-flags";
import { resolveRequestIdempotencyKey } from "../../shared/idempotency";

const checkout = new Hono<{ Bindings: Env }>();

async function resolveCheckoutIdempotencyKey(params: {
  c: any;
  userId: string;
  sessionId: string;
  payload: unknown;
}) {
  const key = await resolveRequestIdempotencyKey({
    providedKey: params.c.req.header("Idempotency-Key"),
    namespace: "checkout.create",
    userId: params.userId,
    resourceId: params.sessionId,
    payload: params.payload,
  });
  params.c.header("Idempotency-Key", key);
  return key;
}

function isCheckoutTransientFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true;

  const candidate = error as {
    statusCode?: number;
    type?: string;
    code?: string;
  };
  const statusCode = candidate.statusCode;
  if (typeof statusCode === "number" && [408, 409, 425, 429, 500, 502, 503, 504].includes(statusCode)) {
    return true;
  }

  const type = String(candidate.type ?? "").toLowerCase();
  if (type === "api_error" || type === "api_connection_error" || type === "rate_limit_error") {
    return true;
  }

  const code = String(candidate.code ?? "").toLowerCase();
  return code === "lock_timeout";
}

// Rate limit checkout creation
checkout.use("/checkout", rateLimit({ windowMs: 60_000, max: 10 }));

// POST /checkout — create a Stripe Checkout Session
checkout.post(
  "/checkout",
  cartSession(),
  requireAuth(),
  zValidator("json", createCheckoutSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);
    const cartRepo = new CartRepository(db, c.get("storeId") as string);

    const useCase = new CreateCheckoutUseCase(cartRepo, db, stripe);

    const body = c.req.valid("json");
    const sessionId = c.get("cartSessionId");
    const userId = c.get("userId");
    const user = c.get("user");

    const appUrl = c.env.APP_URL;
    const featureFlags = resolveFeatureFlags(c.env.FEATURE_FLAGS);

    try {
      const idempotencyKey = await resolveCheckoutIdempotencyKey({
        c,
        userId,
        sessionId,
        payload: body,
      });
      const result = await useCase.execute({
        sessionId,
        userId,
        userEmail: user.email,
        successUrl: body.successUrl ?? `${appUrl}/checkout/success`,
        cancelUrl: body.cancelUrl ?? `${appUrl}/cart`,
        shippingAddress: body.shippingAddress,
        couponCode: body.couponCode,
        storeId: c.get("storeId") as string,
        carrierFallbackRouting: featureFlags.carrier_fallback_routing,
        idempotencyKey,
      });

      return c.json(result, 200);
    } catch (error: any) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      if (error.code === "VALIDATION_ERROR") {
        return c.json({ error: error.message }, 400);
      }
      if (error.code === "AUTH_ERROR") {
        return c.json({ error: error.message }, 401);
      }
      if (isCheckoutTransientFailure(error)) {
        c.header("Retry-After", "3");
        return c.json(
          {
            error: "Checkout is temporarily unavailable. Retry with the same cart.",
            recovery: {
              retryable: true,
              suggestedAction: "retry_checkout",
            },
          },
          503,
        );
      }
      throw error;
    }
  },
);

// GET /checkout/success — handle success redirect, return order info
checkout.get("/checkout/success", requireAuth(), async (c) => {
  const stripeSessionId = c.req.query("session_id");
  if (!stripeSessionId) {
    return c.json({ error: "Missing session_id parameter" }, 400);
  }

  const db = createDb(c.env.DATABASE_URL);
  const orderRepo = new OrderRepository(db, c.get("storeId") as string);

  const order = await orderRepo.findByStripeSessionId(stripeSessionId);
  if (!order) {
    return c.json({ error: "Order not found for this session" }, 404);
  }

  return c.json(
    {
      orderId: order.id,
      status: order.status ?? "pending",
      subtotal: Number(order.subtotal ?? 0),
      discount: Number(order.discount ?? 0),
      shipping: Number(order.shippingCost ?? 0),
      tax: Number(order.tax ?? 0),
      total: Number(order.total),
    },
    200,
  );
});

export { checkout as checkoutRoutes };
