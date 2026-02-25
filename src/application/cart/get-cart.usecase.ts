import type { CartRepository } from "../../infrastructure/repositories/cart.repository";

export class GetCartUseCase {
  constructor(private repo: CartRepository) {}

  async execute(sessionId: string, userId?: string) {
    const cart = await this.repo.findOrCreateCart(sessionId, userId);
    const cartWithItems = await this.repo.findCartWithItems(cart.id);

    // findCartWithItems returns null only if cart doesn't exist,
    // but we just created/found it, so this is a safety fallback
    return cartWithItems ?? { id: cart.id, items: [], subtotal: 0 };
  }
}
