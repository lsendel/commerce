import type { StoreRepository } from "../../infrastructure/repositories/store.repository";
import { NotFoundError } from "../../shared/errors";

export class GetStoreDashboardUseCase {
  constructor(private storeRepo: StoreRepository) {}

  async execute(storeId: string) {
    const store = await this.storeRepo.findById(storeId);
    if (!store) {
      throw new NotFoundError("Store", storeId);
    }

    const members = await this.storeRepo.findMembers(storeId);
    const domains = await this.storeRepo.findDomains(storeId);
    const billing = await this.storeRepo.getBilling(storeId);

    return { store, members, domains, billing };
  }
}
