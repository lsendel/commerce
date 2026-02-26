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
import { InventoryRepository } from "../../infrastructure/repositories/inventory.repository";
import { PromotionRepository } from "../../infrastructure/repositories/promotion.repository";
import { ApplyCouponUseCase } from "../../application/promotions/apply-coupon.usecase";
import { applyCouponSchema } from "../../contracts/promotions.contract";

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
    const inventoryRepo = new InventoryRepository(db, c.get("storeId") as string);
    const useCase = new AddToCartUseCase(repo, db, inventoryRepo);

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
  const inventoryRepo = new InventoryRepository(db, c.get("storeId") as string);
  const useCase = new RemoveFromCartUseCase(repo, inventoryRepo);

  const sessionId = c.get("cartSessionId");
  const userId = c.get("userId");
  const itemId = c.req.param("id");

  const result = await useCase.execute(sessionId, itemId, userId);
  return c.json(result, 200);
});

// POST /cart/apply-coupon — apply coupon to cart
cart.post(
  "/cart/apply-coupon",
  zValidator("json", applyCouponSchema),
  async (c) => {
    const { code } = c.req.valid("json");
    const storeId = c.get("storeId") as string;
    const userId = c.get("userId") ?? null;
    const db = createDb(c.env.DATABASE_URL);
    const promoRepo = new PromotionRepository(db, storeId);
    const useCase = new ApplyCouponUseCase(promoRepo);

    try {
      const result = await useCase.execute(code, userId);
      return c.json({ promotion: result.promotion, coupon: result.coupon });
    } catch (error: any) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      if (error.code === "VALIDATION_ERROR") {
        return c.json({ error: error.message }, 400);
      }
      throw error;
    }
  },
);

// DELETE /cart/remove-coupon — remove coupon from cart
cart.delete("/cart/remove-coupon", async (c) => {
  return c.json({ message: "Coupon removed" });
});

export { cart as cartRoutes };
