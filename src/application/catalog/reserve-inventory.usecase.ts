import type { InventoryRepository } from "../../infrastructure/repositories/inventory.repository";
import { ValidationError } from "../../shared/errors";

export class ReserveInventoryUseCase {
  constructor(
    private repo: InventoryRepository,
  ) {}

  async execute(variantId: string, cartItemId: string, quantity: number) {
    if (quantity <= 0) {
      throw new ValidationError("Quantity must be positive");
    }

    const reservation = await this.repo.reserve(variantId, cartItemId, quantity);
    if (!reservation) {
      throw new ValidationError("Insufficient inventory for this item");
    }

    return reservation;
  }
}
