import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { OrderRepository } from "../../infrastructure/repositories/order.repository";
import { CancelOrderUseCase } from "../../application/checkout/cancel-order.usecase";

const cancellations = new Hono<{ Bindings: Env }>();

cancellations.post(
  "/orders/:orderId/cancel",
  requireAuth(),
  zValidator(
    "json",
    z
      .object({
        reason: z.string().max(500).optional(),
      })
      .optional(),
  ),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const userId = c.get("userId");
    const orderId = c.req.param("orderId");
    const body = c.req.valid("json");

    const orderRepo = new OrderRepository(db, storeId);
    const useCase = new CancelOrderUseCase(orderRepo, db, storeId);

    const result = await useCase.execute({
      orderId,
      userId,
      reason: body?.reason,
      env: c.env,
    });

    return c.json(result, result.success ? 200 : 207);
  },
);

export { cancellations as cancellationRoutes };
