import type { InventoryRepository } from "../../infrastructure/repositories/inventory.repository";

export class CommitInventoryUseCase {
  constructor(private repo: InventoryRepository) {}

  async execute(cartItemId: string) {
    const reservation = await this.repo.findByCartItem(cartItemId);
    if (!reservation) return null;
    return this.repo.commit(reservation.id);
  }
}
