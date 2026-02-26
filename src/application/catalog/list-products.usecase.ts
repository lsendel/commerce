import type { ProductRepository } from "../../infrastructure/repositories/product.repository";

export class ListProductsUseCase {
  constructor(private repo: ProductRepository) {}

  async execute(filters: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    collection?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    available?: boolean;
    sort?: string;
  }) {
    return this.repo.findAll(filters);
  }
}
