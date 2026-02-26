import type { ReviewRepository } from "../../infrastructure/repositories/review.repository";
import { NotFoundError, ValidationError } from "../../shared/errors";

export class ModerateReviewUseCase {
  constructor(private reviewRepo: ReviewRepository) {}

  async execute(reviewId: string, action: "approved" | "rejected") {
    if (action !== "approved" && action !== "rejected") {
      throw new ValidationError("Action must be 'approved' or 'rejected'");
    }

    const review = await this.reviewRepo.moderate(reviewId, action);
    if (!review) {
      throw new NotFoundError("Review", reviewId);
    }

    return review;
  }
}
