import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { CartRepository } from "../../infrastructure/repositories/cart.repository";
import { GetCartUseCase } from "../../application/cart/get-cart.usecase";
import { AddToCartUseCase } from "../../application/cart/add-to-cart.usecase";
import { UpdateCartItemUseCase } from "../../application/cart/update-cart-item.usecase";
import { RemoveFromCartUseCase } from "../../application/cart/remove-from-cart.usecase";
import { addToCartSchema, updateCartItemSchema } from "../../shared/validators";
import { cartSession } from "../../middleware/cart-session.middleware";
import { optionalAuth } from "../../middleware/auth.middleware";

const cart = new Hono<{ Bindings: Env }>();

// All cart routes need a session ID and optional auth
cart.use("/cart", cartSession());
cart.use("/cart/*", cartSession());
cart.use("/cart", optionalAuth());
cart.use("/cart/*", optionalAuth());

// GET /cart — get current cart with items
cart.get("/cart", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const repo = new CartRepository(db, c.get("storeId") as string);
  const useCase = new GetCartUseCase(repo);

  const sessionId = c.get("cartSessionId");
  const userId = c.get("userId");

  const result = await useCase.execute(sessionId, userId);
  return c.json(result, 200);
});

// POST /cart/items — add item to cart
cart.post(
  "/cart/items",
  zValidator("json", addToCartSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const repo = new CartRepository(db, c.get("storeId") as string);
    const useCase = new AddToCartUseCase(repo, db);

    const sessionId = c.get("cartSessionId");
    const userId = c.get("userId");
    const body = c.req.valid("json");

    const result = await useCase.execute(sessionId, body, userId);
    return c.json(result, 200);
  },
);

// PATCH /cart/items/:id — update item quantity
cart.patch(
  "/cart/items/:id",
  zValidator("json", updateCartItemSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const repo = new CartRepository(db, c.get("storeId") as string);
    const useCase = new UpdateCartItemUseCase(repo);

    const sessionId = c.get("cartSessionId");
    const userId = c.get("userId");
    const itemId = c.req.param("id");
    const { quantity } = c.req.valid("json");

    const result = await useCase.execute(sessionId, itemId, quantity, userId);
    return c.json(result, 200);
  },
);

// DELETE /cart/items/:id — remove item from cart
cart.delete("/cart/items/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const repo = new CartRepository(db, c.get("storeId") as string);
  const useCase = new RemoveFromCartUseCase(repo);

  const sessionId = c.get("cartSessionId");
  const userId = c.get("userId");
  const itemId = c.req.param("id");

  const result = await useCase.execute(sessionId, itemId, userId);
  return c.json(result, 200);
});

export { cart as cartRoutes };
