import type { ProductRepository } from "../../infrastructure/repositories/product.repository";
import { NotFoundError } from "../../shared/errors";

export class GetProductUseCase {
  constructor(private repo: ProductRepository) {}

  async execute(slug: string) {
    const product = await this.repo.findBySlug(slug);
    if (!product) {
      throw new NotFoundError("Product", slug);
    }
    return product;
  }
}
