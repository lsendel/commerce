import type { StoreRepository } from "../../infrastructure/repositories/store.repository";
import { NotFoundError } from "../../shared/errors";

interface UpdateStoreInput {
  storeId: string;
  name?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export class UpdateStoreUseCase {
  constructor(private storeRepo: StoreRepository) {}

  async execute(input: UpdateStoreInput) {
    const store = await this.storeRepo.findById(input.storeId);
    if (!store) {
      throw new NotFoundError("Store", input.storeId);
    }

    return this.storeRepo.update(input.storeId, {
      ...(input.name && { name: input.name }),
      ...(input.logo && { logo: input.logo }),
      ...(input.primaryColor && { primaryColor: input.primaryColor }),
      ...(input.secondaryColor && { secondaryColor: input.secondaryColor }),
    });
  }
}
