import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { OrderRepository } from "../../infrastructure/repositories/order.repository";
import { GetOrdersUseCase } from "../../application/checkout/get-orders.usecase";
import { paginationSchema } from "../../shared/validators";
import { requireAuth } from "../../middleware/auth.middleware";

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

export { orders as orderRoutes };
