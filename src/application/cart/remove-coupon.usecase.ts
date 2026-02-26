import { eq } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import type { CartRepository } from "../../infrastructure/repositories/cart.repository";
import { carts } from "../../infrastructure/db/schema";
import { recalculate } from "../../domain/cart/cart-total.vo";

export class RemoveCouponUseCase {
  constructor(
    private repo: CartRepository,
    private db: Database,
  ) {}

  async execute(sessionId: string, userId?: string) {
    const cart = await this.repo.findOrCreateCart(sessionId, userId);

    // Clear the coupon from the cart
    await this.db
      .update(carts)
      .set({ couponCodeId: null, updatedAt: new Date() })
      .where(eq(carts.id, cart.id));

    // Return updated cart with recalculated totals
    const cartWithItems = await this.repo.findCartWithItems(cart.id);
    const result = cartWithItems ?? { id: cart.id, items: [], subtotal: 0 };

    const lineItems = result.items.map((i: any) => ({
      quantity: i.quantity,
      price: typeof i.variant?.price === "number" ? i.variant.price : Number(i.variant?.price ?? 0),
    }));

    const totals = recalculate(lineItems);

    return { ...result, totals, coupon: null };
  }
}
