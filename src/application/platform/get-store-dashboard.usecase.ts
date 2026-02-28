import type { StoreRepository } from "../../infrastructure/repositories/store.repository";
import { NotFoundError } from "../../shared/errors";

export class GetStoreDashboardUseCase {
  constructor(private storeRepo: StoreRepository) {}

  async execute(storeId: string) {
    const store = await this.storeRepo.findById(storeId);
    if (!store) {
      throw new NotFoundError("Store", storeId);
    }

    const [members, domains, billing, pendingInvitations] = await Promise.all([
      this.storeRepo.findMembersWithUsers(storeId),
      this.storeRepo.findDomains(storeId),
      this.storeRepo.getBilling(storeId),
      this.storeRepo.findPendingInvitations(storeId),
    ]);

    return { store, members, domains, billing, pendingInvitations };
  }
}
