import type { StoreRepository } from "../../infrastructure/repositories/store.repository";
import { ConflictError } from "../../shared/errors";

interface CreateStoreInput {
  name: string;
  slug: string;
  subdomain: string;
  ownerId: string;
  planId?: string;
}

export class CreateStoreUseCase {
  constructor(private storeRepo: StoreRepository) {}

  async execute(input: CreateStoreInput) {
    const existing = await this.storeRepo.findBySlug(input.slug);
    if (existing) {
      throw new ConflictError(`Store with slug "${input.slug}" already exists`);
    }

    const existingSub = await this.storeRepo.findBySubdomain(input.subdomain);
    if (existingSub) {
      throw new ConflictError(`Subdomain "${input.subdomain}" is taken`);
    }

    const store = await this.storeRepo.create({
      name: input.name,
      slug: input.slug,
      subdomain: input.subdomain,
      planId: input.planId,
    });

    if (!store) {
      throw new Error("Failed to create store");
    }

    await this.storeRepo.addMember(store.id, input.ownerId, "owner");

    return store;
  }
}
