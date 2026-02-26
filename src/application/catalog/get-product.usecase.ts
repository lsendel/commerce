import type { ProductRepository } from "../../infrastructure/repositories/product.repository";
import type { ReviewRepository } from "../../infrastructure/repositories/review.repository";
import { NotFoundError } from "../../shared/errors";

export class GetProductUseCase {
  constructor(
    private repo: ProductRepository,
    private reviewRepo?: ReviewRepository,
  ) {}

  async execute(slug: string) {
    const product = await this.repo.findBySlug(slug);
    if (!product) {
      throw new NotFoundError("Product", slug);
    }

    // Include review summary and related products
    const [reviewSummary, relatedProducts] = await Promise.all([
      this.reviewRepo
        ? this.reviewRepo.getAverageRating(product.id)
        : Promise.resolve({ average: 0, count: 0 }),
      this.repo.findRelatedProducts(product.id, 4),
    ]);

    return {
      ...product,
      reviewSummary,
      relatedProducts,
    };
  }
}
