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

const checkout = new Hono<{ Bindings: Env }>();

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

    const result = await useCase.execute({
      sessionId,
      userId,
      userEmail: user.email,
      successUrl: body.successUrl ?? `${appUrl}/checkout/success`,
      cancelUrl: body.cancelUrl ?? `${appUrl}/cart`,
    });

    return c.json({ url: result.url }, 200);
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
      total: Number(order.total),
    },
    200,
  );
});

export { checkout as checkoutRoutes };
