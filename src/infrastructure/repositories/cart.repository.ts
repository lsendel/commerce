import { eq, and, sql, inArray } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  carts,
  cartItems,
  productVariants,
  products,
} from "../db/schema";

export class CartRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  /**
   * Find an existing cart by sessionId or create a new one.
   * If userId is provided and the cart exists without a user, associate it.
   */
  async findOrCreateCart(sessionId: string, userId?: string) {
    // Look for existing cart by sessionId
    const existing = await this.db
      .select()
      .from(carts)
      .where(eq(carts.sessionId, sessionId))
      .limit(1);

    if (existing.length > 0) {
      const cart = existing[0];
      if (!cart) throw new Error("Unexpected empty cart row");
      // If user just logged in, associate the anonymous cart with their account
      if (userId && !cart.userId) {
        const updated = await this.db
          .update(carts)
          .set({ userId, updatedAt: new Date() })
          .where(eq(carts.id, cart.id))
          .returning();
        const updatedCart = updated[0];
        if (!updatedCart) throw new Error("Failed to update cart");
        return updatedCart;
      }
      return cart;
    }

    // Create a new cart
    const created = await this.db
      .insert(carts)
      .values({ sessionId, userId: userId ?? null, storeId: this.storeId })
      .returning();

    const newCart = created[0];
    if (!newCart) throw new Error("Failed to create cart");
    return newCart;
  }

  /**
   * Get a cart with all its items enriched with variant + product data.
   */
  async findCartWithItems(cartId: string) {
    // Fetch cart
    const cartRows = await this.db
      .select()
      .from(carts)
      .where(eq(carts.id, cartId))
      .limit(1);

    const cart = cartRows[0];
    if (!cart) return null;

    // Fetch cart items
    const items = await this.db
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, cartId));

    if (items.length === 0) {
      return {
        id: cart.id,
        items: [],
        subtotal: 0,
      };
    }

    // Get unique variant IDs and fetch variants
    const variantIds = [...new Set(items.map((i) => i.variantId))];
    const variantRows = await this.db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.id, variantIds));

    // Get unique product IDs from variants and fetch products
    const productIds = [...new Set(variantRows.map((v) => v.productId))];
    const productRows = await this.db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    // Build lookup maps
    const variantMap = new Map(variantRows.map((v) => [v.id, v]));
    const productMap = new Map(productRows.map((p) => [p.id, p]));

    let subtotal = 0;
    const enrichedItems = items.map((item) => {
      const variant = variantMap.get(item.variantId);
      const product = variant ? productMap.get(variant.productId) : null;
      const price = variant ? Number(variant.price) : 0;
      subtotal += price * item.quantity;

      return {
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        variant: {
          id: variant?.id ?? "",
          title: variant?.title ?? "",
          price,
          compareAtPrice: variant?.compareAtPrice ? Number(variant.compareAtPrice) : null,
          inventoryQuantity: variant?.inventoryQuantity ?? 0,
          estimatedProductionDays: variant?.estimatedProductionDays ?? null,
          product: {
            name: product?.name ?? "",
            slug: product?.slug ?? "",
            type: (product?.type as "physical" | "digital" | "subscription" | "bookable") ?? "physical",
            featuredImageUrl: product?.featuredImageUrl ?? null,
          },
        },
        bookingAvailabilityId: item.bookingAvailabilityId ?? null,
        personTypeQuantities:
          (item.personTypeQuantities as Record<string, number>) ?? null,
      };
    });

    return {
      id: cart.id,
      items: enrichedItems,
      subtotal: Math.round(subtotal * 100) / 100,
    };
  }

  /**
   * Add an item to the cart. If the same variantId + bookingAvailabilityId
   * combination already exists, increment the quantity instead.
   */
  async addItem(
    cartId: string,
    data: {
      variantId: string;
      quantity: number;
      bookingAvailabilityId?: string;
      personTypeQuantities?: Record<string, number>;
    },
  ) {
    // Check for existing item with same variant + booking availability
    const conditions = [
      eq(cartItems.cartId, cartId),
      eq(cartItems.variantId, data.variantId),
    ];

    if (data.bookingAvailabilityId) {
      conditions.push(
        eq(cartItems.bookingAvailabilityId, data.bookingAvailabilityId),
      );
    }

    const existing = await this.db
      .select()
      .from(cartItems)
      .where(and(...conditions))
      .limit(1);

    const existingItem = existing[0];
    if (existingItem && !data.bookingAvailabilityId) {
      // Increment quantity for non-booking items
      const updated = await this.db
        .update(cartItems)
        .set({
          quantity: sql`${cartItems.quantity} + ${data.quantity}`,
        })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
      return updated[0] ?? null;
    }

    if (existingItem && data.bookingAvailabilityId) {
      // Increment quantity for same booking slot
      const updated = await this.db
        .update(cartItems)
        .set({
          quantity: sql`${cartItems.quantity} + ${data.quantity}`,
          personTypeQuantities: data.personTypeQuantities ?? existingItem.personTypeQuantities,
        })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
      return updated[0] ?? null;
    }

    // Insert new item
    const inserted = await this.db
      .insert(cartItems)
      .values({
        cartId,
        variantId: data.variantId,
        quantity: data.quantity,
        bookingAvailabilityId: data.bookingAvailabilityId ?? null,
        personTypeQuantities: data.personTypeQuantities ?? null,
      })
      .returning();

    return inserted[0];
  }

  /**
   * Update an item's quantity. If quantity is 0, delete the item.
   */
  async updateItemQuantity(itemId: string, cartId: string, quantity: number) {
    if (quantity === 0) {
      return this.removeItem(itemId, cartId);
    }

    const updated = await this.db
      .update(cartItems)
      .set({ quantity })
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
      .returning();

    return updated[0] ?? null;
  }

  /**
   * Remove a single item from the cart.
   */
  async removeItem(itemId: string, cartId: string) {
    const deleted = await this.db
      .delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
      .returning();

    return deleted[0] ?? null;
  }

  /**
   * Delete all items from a cart.
   */
  async clearCart(cartId: string) {
    await this.db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  }

  /**
   * Merge an anonymous session cart into an authenticated user's cart.
   * Used when a user logs in after adding items anonymously.
   */
  async mergeCart(fromSessionId: string, toUserId: string) {
    // Find the anonymous cart
    const anonCarts = await this.db
      .select()
      .from(carts)
      .where(eq(carts.sessionId, fromSessionId))
      .limit(1);

    const anonCart = anonCarts[0];
    if (!anonCart) return;

    // Find or create the user's cart
    const userCarts = await this.db
      .select()
      .from(carts)
      .where(eq(carts.userId, toUserId))
      .limit(1);

    const userCart = userCarts[0];
    if (!userCart) {
      // No user cart exists — just associate the anonymous cart
      await this.db
        .update(carts)
        .set({ userId: toUserId, updatedAt: new Date() })
        .where(eq(carts.id, anonCart.id));
      return;
    }

    // If the anonymous cart IS the user cart, nothing to do
    if (anonCart.id === userCart.id) return;

    // Get items from both carts
    const [anonItems, userItems] = await Promise.all([
      this.db
        .select()
        .from(cartItems)
        .where(eq(cartItems.cartId, anonCart.id)),
      this.db
        .select()
        .from(cartItems)
        .where(eq(cartItems.cartId, userCart.id)),
    ]);

    // Build a lookup of existing user cart items by variantId+bookingAvailabilityId
    const userItemKey = (variantId: string, baId: string | null) =>
      `${variantId}::${baId ?? ""}`;
    const userItemMap = new Map(
      userItems.map((i) => [
        userItemKey(i.variantId, i.bookingAvailabilityId),
        i,
      ]),
    );

    // Merge anonymous items into user cart
    for (const item of anonItems) {
      const key = userItemKey(item.variantId, item.bookingAvailabilityId);
      const existing = userItemMap.get(key);

      if (existing) {
        // Increment quantity
        await this.db
          .update(cartItems)
          .set({
            quantity: sql`${cartItems.quantity} + ${item.quantity}`,
          })
          .where(eq(cartItems.id, existing.id));
      } else {
        // Move item to user cart
        await this.db
          .update(cartItems)
          .set({ cartId: userCart.id })
          .where(eq(cartItems.id, item.id));
      }
    }

    // Clean up: delete remaining anonymous cart items and the cart itself
    await this.db
      .delete(cartItems)
      .where(eq(cartItems.cartId, anonCart.id));
    await this.db.delete(carts).where(eq(carts.id, anonCart.id));

    // Update timestamp
    await this.db
      .update(carts)
      .set({ updatedAt: new Date() })
      .where(eq(carts.id, userCart.id));
  }
}
