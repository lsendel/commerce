import type { ReviewRepository } from "../../infrastructure/repositories/review.repository";

export class ListReviewsUseCase {
  constructor(private reviewRepo: ReviewRepository) {}

  async execute(productId: string, page = 1, limit = 20) {
    const [reviewsResult, ratingResult, starDistribution] = await Promise.all([
      this.reviewRepo.findByProduct(productId, page, limit),
      this.reviewRepo.getAverageRating(productId),
      this.reviewRepo.getStarDistribution(productId),
    ]);

    return {
      ...reviewsResult,
      averageRating: ratingResult.average,
      totalReviews: ratingResult.count,
      starDistribution,
    };
  }
}
