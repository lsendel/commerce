import type { CartRepository } from "../../infrastructure/repositories/cart.repository";
import { NotFoundError } from "../../shared/errors";

export class RemoveFromCartUseCase {
  constructor(private repo: CartRepository) {}

  async execute(sessionId: string, itemId: string, userId?: string) {
    const cart = await this.repo.findOrCreateCart(sessionId, userId);

    const removed = await this.repo.removeItem(itemId, cart.id);
    if (!removed) {
      throw new NotFoundError("Cart item", itemId);
    }

    const cartWithItems = await this.repo.findCartWithItems(cart.id);
    return cartWithItems ?? { id: cart.id, items: [], subtotal: 0 };
  }
}
