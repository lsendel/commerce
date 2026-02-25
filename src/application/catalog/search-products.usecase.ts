import type { ProductRepository } from "../../infrastructure/repositories/product.repository";

export class SearchProductsUseCase {
  constructor(private repo: ProductRepository) {}

  async execute(query: string, options?: { page?: number; limit?: number }) {
    return this.repo.findAll({
      search: query,
      page: options?.page,
      limit: options?.limit,
    });
  }
}
