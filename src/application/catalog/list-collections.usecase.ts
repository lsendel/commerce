import type { ProductRepository } from "../../infrastructure/repositories/product.repository";
import { NotFoundError } from "../../shared/errors";

export class ListCollectionsUseCase {
  constructor(private repo: ProductRepository) {}

  async execute() {
    return this.repo.findCollections();
  }
}

export class GetCollectionUseCase {
  constructor(private repo: ProductRepository) {}

  async execute(
    slug: string,
    pagination?: { page?: number; limit?: number },
  ) {
    const result = await this.repo.findCollectionBySlug(slug, pagination);
    if (!result) {
      throw new NotFoundError("Collection", slug);
    }
    return result;
  }
}
