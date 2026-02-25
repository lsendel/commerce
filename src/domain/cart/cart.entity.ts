import type { CartItem } from "./cart-item.entity";

export interface Cart {
  id: string;
  userId: string | null;
  sessionId: string;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export function createCart(
  params: Omit<Cart, "items" | "createdAt" | "updatedAt" | "userId"> & {
    userId?: string | null;
    items?: CartItem[];
  }
): Cart {
  const now = new Date();
  return {
    ...params,
    userId: params.userId ?? null,
    items: params.items ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Calculates the total price of all items in the cart.
 * Requires each item to have its variant loaded.
 * Returns the total in dollars.
 */
export function calculateTotal(cart: Cart): number {
  const total = cart.items.reduce((sum, item) => {
    if (!item.variant) {
      return sum;
    }
    return sum + item.variant.price * item.quantity;
  }, 0);

  return Math.round(total * 100) / 100;
}
