import type { ReviewRepository } from "../../infrastructure/repositories/review.repository";
import { ValidationError } from "../../shared/errors";

export class RespondToReviewUseCase {
  constructor(private reviewRepo: ReviewRepository) {}

  async execute(reviewId: string, responseText: string) {
    if (!responseText.trim()) {
      throw new ValidationError("Response text is required");
    }

    const review = await this.reviewRepo.findById(reviewId);
    if (!review) {
      throw new ValidationError("Review not found");
    }

    return this.reviewRepo.addResponse(reviewId, responseText.trim());
  }
}
