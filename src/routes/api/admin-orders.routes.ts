import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { OrderRepository } from "../../infrastructure/repositories/order.repository";
import { createStripeClient } from "../../infrastructure/stripe/stripe.client";
import { requireAuth } from "../../middleware/auth.middleware";

const adminOrders = new Hono<{ Bindings: Env }>();

const orderListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// GET /orders — admin order list
adminOrders.get(
  "/orders",
  requireAuth(),
  zValidator("query", orderListSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const orderRepo = new OrderRepository(db, storeId);

    const filters = c.req.valid("query");
    const result = await orderRepo.findByStore(filters);

    return c.json(result, 200);
  },
);

// GET /orders/:id — admin order detail
adminOrders.get("/orders/:id", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const orderRepo = new OrderRepository(db, storeId);
  const orderId = c.req.param("id");

  const order = await orderRepo.findById(orderId);
  if (!order) {
    return c.json({ error: "Order not found" }, 404);
  }

  return c.json(order, 200);
});

const refundSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().max(500).optional(),
});

// POST /orders/:id/refund — issue a full or partial refund
adminOrders.post(
  "/orders/:id/refund",
  requireAuth(),
  zValidator("json", refundSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const orderRepo = new OrderRepository(db, storeId);
    const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);
    const orderId = c.req.param("id");
    const body = c.req.valid("json");

    const order = await orderRepo.findById(orderId);
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    if (!order.stripePaymentIntentId) {
      return c.json({ error: "No payment intent found for this order" }, 400);
    }

    const refundParams: Record<string, unknown> = {
      payment_intent: order.stripePaymentIntentId,
    };
    if (body.amount) {
      refundParams.amount = Math.round(body.amount * 100);
    }
    if (body.reason) {
      refundParams.metadata = { reason: body.reason };
    }

    const refund = await stripe.refunds.create(refundParams as any);

    if (!body.amount || body.amount >= Number(order.total)) {
      await orderRepo.updateStatus(orderId, "refunded");
    }

    return c.json({ refundId: refund.id, status: refund.status }, 200);
  },
);

const noteSchema = z.object({
  text: z.string().min(1).max(2000),
});

// POST /orders/:id/notes — add an internal note
adminOrders.post(
  "/orders/:id/notes",
  requireAuth(),
  zValidator("json", noteSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const orderRepo = new OrderRepository(db, storeId);
    const orderId = c.req.param("id");
    const user = c.get("user");
    const body = c.req.valid("json");

    const notes = await orderRepo.addNote(orderId, user.name || user.email, body.text);
    return c.json({ notes }, 200);
  },
);

export { adminOrders as adminOrderRoutes };
