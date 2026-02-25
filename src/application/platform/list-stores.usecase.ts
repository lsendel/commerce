import type { StoreRepository } from "../../infrastructure/repositories/store.repository";

export class ListStoresUseCase {
  constructor(private storeRepo: StoreRepository) {}

  async listAll(page: number, limit: number) {
    return this.storeRepo.listAll(page, limit);
  }
}
