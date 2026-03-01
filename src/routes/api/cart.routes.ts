import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { CartRepository } from "../../infrastructure/repositories/cart.repository";
import { ProductRepository } from "../../infrastructure/repositories/product.repository";
import { GetCartUseCase } from "../../application/cart/get-cart.usecase";
import { GetUpsellRecommendationsUseCase } from "../../application/cart/get-upsell-recommendations.usecase";
import { AddToCartUseCase } from "../../application/cart/add-to-cart.usecase";
import { UpdateCartItemUseCase } from "../../application/cart/update-cart-item.usecase";
import { RemoveFromCartUseCase } from "../../application/cart/remove-from-cart.usecase";
import { RemoveCouponUseCase } from "../../application/cart/remove-coupon.usecase";
import { ValidateCartUseCase } from "../../application/cart/validate-cart.usecase";
import { addToCartSchema, updateCartItemSchema } from "../../shared/validators";
import { cartSession } from "../../middleware/cart-session.middleware";
import { optionalAuth } from "../../middleware/auth.middleware";
import { InventoryRepository } from "../../infrastructure/repositories/inventory.repository";
import { PromotionRepository } from "../../infrastructure/repositories/promotion.repository";
import { ApplyCouponUseCase } from "../../application/promotions/apply-coupon.usecase";
import { applyCouponSchema } from "../../contracts/promotions.contract";
import { resolveFeatureFlags } from "../../shared/feature-flags";

const cart = new Hono<{ Bindings: Env }>();
const upsellQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(12).optional(),
});

// All cart routes need a session ID and optional auth
cart.use("/cart", cartSession());
cart.use("/cart/*", cartSession());
cart.use("/cart", optionalAuth());
cart.use("/cart/*", optionalAuth());

function checkUpsellFeature(c: any) {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags.intelligent_upsell_rules) {
    return c.json(
      { error: "Intelligent upsell rules are currently disabled", code: "FEATURE_DISABLED" },
      403,
    );
  }
  return null;
}

// GET /cart — get current cart with items, totals, and warnings
cart.get("/cart", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const repo = new CartRepository(db, c.get("storeId") as string);
  const useCase = new GetCartUseCase(repo, db);

  const sessionId = c.get("cartSessionId");
  const userId = c.get("userId");

  const result = await useCase.execute(sessionId, userId);
  return c.json(result, 200);
});

// GET /cart/upsell-recommendations — contextual upsell candidates for current cart
cart.get(
  "/cart/upsell-recommendations",
  zValidator("query", upsellQuerySchema),
  async (c) => {
    const featureError = checkUpsellFeature(c);
    if (featureError) return featureError;

    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const cartRepo = new CartRepository(db, storeId);
    const productRepo = new ProductRepository(db, storeId);
    const useCase = new GetUpsellRecommendationsUseCase(cartRepo, productRepo, db);

    const sessionId = c.get("cartSessionId");
    const userId = c.get("userId");
    const query = c.req.valid("query");

    const recommendations = await useCase.execute({
      sessionId,
      userId,
      limit: query.limit,
    });

    return c.json({ recommendations }, 200);
  },
);

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

    try {
      await useCase.execute(sessionId, body, userId);
      const cartSnapshot = await new GetCartUseCase(repo, db).execute(sessionId, userId);
      return c.json(cartSnapshot, 200);
    } catch (error: any) {
      if (error.code === "NOT_FOUND") {
        return c.json({ error: error.message }, 404);
      }
      if (error.code === "VALIDATION_ERROR") {
        return c.json({ error: error.message }, 400);
      }
      if (error.code === "FORBIDDEN") {
        return c.json({ error: error.message }, 403);
      }
      if (error.code === "AUTH_ERROR") {
        return c.json({ error: error.message }, 401);
      }
      throw error;
    }
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

    await useCase.execute(sessionId, itemId, quantity, userId);
    const cartSnapshot = await new GetCartUseCase(repo, db).execute(sessionId, userId);
    return c.json(cartSnapshot, 200);
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

  await useCase.execute(sessionId, itemId, userId);
  const cartSnapshot = await new GetCartUseCase(repo, db).execute(sessionId, userId);
  return c.json(cartSnapshot, 200);
});

// POST /cart/apply-coupon — apply coupon to cart
cart.post(
  "/cart/apply-coupon",
  zValidator("json", applyCouponSchema),
  async (c) => {
    const { code } = c.req.valid("json");
    const storeId = c.get("storeId") as string;
    const userId = c.get("userId") ?? null;
    const sessionId = c.get("cartSessionId");
    const db = createDb(c.env.DATABASE_URL);
    const promoRepo = new PromotionRepository(db, storeId);
    const cartRepo = new CartRepository(db, storeId);
    const useCase = new ApplyCouponUseCase(promoRepo, db);

    // Find the cart to pass its ID for coupon persistence
    const cartObj = await cartRepo.findOrCreateCart(sessionId, userId ?? undefined);

    try {
      const result = await useCase.execute(code, userId, cartObj.id);
      return c.json({ promotion: result.promotion, coupon: result.coupon, discount: result.discount });
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
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const repo = new CartRepository(db, storeId);
  const useCase = new RemoveCouponUseCase(repo, db);

  const sessionId = c.get("cartSessionId");
  const userId = c.get("userId");

  const result = await useCase.execute(sessionId, userId);
  return c.json(result, 200);
});

// POST /cart/validate — validate cart for checkout readiness
cart.post("/cart/validate", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const repo = new CartRepository(db, storeId);
  const useCase = new ValidateCartUseCase(repo, db);

  const sessionId = c.get("cartSessionId");
  const userId = c.get("userId");

  const result = await useCase.execute(sessionId, userId);
  return c.json(result, 200);
});

export { cart as cartRoutes };
