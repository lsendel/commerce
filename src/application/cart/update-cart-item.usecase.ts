import type { CartRepository } from "../../infrastructure/repositories/cart.repository";
import { NotFoundError } from "../../shared/errors";

export class UpdateCartItemUseCase {
  constructor(private repo: CartRepository) {}

  async execute(
    sessionId: string,
    itemId: string,
    quantity: number,
    userId?: string,
  ) {
    const cart = await this.repo.findOrCreateCart(sessionId, userId);

    const result = await this.repo.updateItemQuantity(
      itemId,
      cart.id,
      quantity,
    );

    // If quantity > 0 and no row was updated, the item doesn't belong to this cart
    if (!result && quantity > 0) {
      throw new NotFoundError("Cart item", itemId);
    }

    const cartWithItems = await this.repo.findCartWithItems(cart.id);
    return cartWithItems ?? { id: cart.id, items: [], subtotal: 0 };
  }
}
