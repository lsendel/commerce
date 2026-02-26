import type { InventoryRepository } from "../../infrastructure/repositories/inventory.repository";

export class ReleaseInventoryUseCase {
  constructor(private repo: InventoryRepository) {}

  async execute(cartItemId: string) {
    const reservation = await this.repo.findByCartItem(cartItemId);
    if (!reservation) return null;
    return this.repo.release(reservation.id);
  }
}
