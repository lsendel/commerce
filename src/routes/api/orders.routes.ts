import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { OrderRepository } from "../../infrastructure/repositories/order.repository";
import { CartRepository } from "../../infrastructure/repositories/cart.repository";
import { InventoryRepository } from "../../infrastructure/repositories/inventory.repository";
import { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { GetOrdersUseCase } from "../../application/checkout/get-orders.usecase";
import { GetCartUseCase } from "../../application/cart/get-cart.usecase";
import { AddToCartUseCase } from "../../application/cart/add-to-cart.usecase";
import { TrackEventUseCase } from "../../application/analytics/track-event.usecase";
import { paginationSchema } from "../../shared/validators";
import { requireAuth } from "../../middleware/auth.middleware";
import { cartSession } from "../../middleware/cart-session.middleware";

const orders = new Hono<{ Bindings: Env }>();

// GET /orders — list user orders with pagination
orders.get(
  "/orders",
  requireAuth(),
  zValidator("query", paginationSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const orderRepo = new OrderRepository(db, c.get("storeId") as string);
    const useCase = new GetOrdersUseCase(orderRepo);

    const userId = c.get("userId");
    const { page, limit } = c.req.valid("query");

    const result = await useCase.list(userId, { page, limit });
    return c.json(result, 200);
  },
);

// GET /orders/:id — get order detail
orders.get("/orders/:id", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const orderRepo = new OrderRepository(db, c.get("storeId") as string);
  const useCase = new GetOrdersUseCase(orderRepo);

  const userId = c.get("userId");
  const orderId = c.req.param("id");

  const order = await useCase.getById(orderId, userId);
  return c.json(order, 200);
});

// POST /orders/:id/reorder — add previous order items back into cart
orders.post("/orders/:id/reorder", cartSession(), requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const userId = c.get("userId");
  const sessionId = c.get("cartSessionId");
  const orderId = c.req.param("id");

  const orderRepo = new OrderRepository(db, storeId);
  const order = await orderRepo.findById(orderId, userId);
  if (!order) {
    return c.json({ error: "Order not found" }, 404);
  }

  const cartRepo = new CartRepository(db, storeId);
  const inventoryRepo = new InventoryRepository(db, storeId);
  const addToCartUseCase = new AddToCartUseCase(cartRepo, db, inventoryRepo);

  let addedLineCount = 0;
  let skippedLineCount = 0;
  const skipped: string[] = [];

  for (const item of order.items ?? []) {
    const variantId = item.variantId as string | null;
    if (!variantId) {
      skippedLineCount++;
      skipped.push(`Skipped "${item.productName}" because variant is unavailable.`);
      continue;
    }

    try {
      await addToCartUseCase.execute(
        sessionId,
        { variantId, quantity: item.quantity ?? 1 },
        userId,
      );
      addedLineCount++;
    } catch (error) {
      skippedLineCount++;
      const message =
        error instanceof Error ? error.message : "Could not reorder this item.";
      skipped.push(`Skipped "${item.productName}": ${message}`);
    }
  }

  const cart = await new GetCartUseCase(cartRepo, db).execute(sessionId, userId);
  const analyticsRepo = new AnalyticsRepository(db, storeId);
  await new TrackEventUseCase(analyticsRepo).execute({
    userId,
    sessionId,
    eventType: "reorder_to_cart",
    properties: {
      orderId,
      addedLineCount,
      skippedLineCount,
      skipped,
    },
    pageUrl: null,
    referrer: null,
    userAgent: null,
    ip: undefined,
  });

  return c.json(
    {
      orderId,
      addedLineCount,
      skippedLineCount,
      skipped,
      cart,
    },
    200,
  );
});

export { orders as orderRoutes };
