import type { ReviewRepository } from "../../infrastructure/repositories/review.repository";

export class ListReviewsUseCase {
  constructor(private reviewRepo: ReviewRepository) {}

  async execute(productId: string, page = 1, limit = 20) {
    const [reviewsResult, ratingResult] = await Promise.all([
      this.reviewRepo.findByProduct(productId, page, limit),
      this.reviewRepo.getAverageRating(productId),
    ]);

    return {
      ...reviewsResult,
      averageRating: ratingResult.average,
      totalReviews: ratingResult.count,
    };
  }
}
