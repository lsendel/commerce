import { eq, and } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import type { ReviewRepository } from "../../infrastructure/repositories/review.repository";
import { orders, orderItems, productVariants, productReviews } from "../../infrastructure/db/schema";
import { ValidationError } from "../../shared/errors";
import type { ReviewStatus } from "../../domain/catalog/review.entity";

interface SubmitReviewInput {
  productId: string;
  userId: string;
  rating: number;
  title?: string | null;
  content?: string | null;
}

export class SubmitReviewUseCase {
  constructor(
    private reviewRepo: ReviewRepository,
    private db: Database,
  ) {}

  async execute(input: SubmitReviewInput) {
    // 1. Validate rating 1-5
    if (input.rating < 1 || input.rating > 5 || !Number.isInteger(input.rating)) {
      throw new ValidationError("Rating must be an integer between 1 and 5");
    }

    // 2. Check for duplicate review (user + product)
    const existingReview = await this.db
      .select({ id: productReviews.id })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.userId, input.userId),
          eq(productReviews.productId, input.productId),
        ),
      )
      .limit(1);

    if (existingReview[0]) {
      throw new ValidationError("You have already reviewed this product");
    }

    // 3. Check if user purchased this product (verified purchase flag)
    const isVerifiedPurchase = await this.checkVerifiedPurchase(
      input.userId,
      input.productId,
    );

    // 4. Content filter: check for excessive caps, URLs
    const contentText = [input.title ?? "", input.content ?? ""].join(" ");
    const isSuspicious = this.isContentSuspicious(contentText);

    // 5. Set status: approved if clean, flagged if suspicious
    const status: ReviewStatus = isSuspicious ? "flagged" : "approved";

    // 6. Insert review
    const review = await this.reviewRepo.create({
      productId: input.productId,
      userId: input.userId,
      rating: input.rating,
      title: input.title ?? null,
      content: input.content ?? null,
      isVerifiedPurchase,
      status,
    });

    return review;
  }

  private async checkVerifiedPurchase(
    userId: string,
    productId: string,
  ): Promise<boolean> {
    // Join orders -> orderItems -> productVariants to see if user has bought this product
    const rows = await this.db
      .select({ id: orderItems.id })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .innerJoin(
        productVariants,
        eq(orderItems.variantId, productVariants.id),
      )
      .where(
        and(
          eq(orders.userId, userId),
          eq(productVariants.productId, productId),
          eq(orders.status, "delivered"),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }

  private isContentSuspicious(text: string): boolean {
    if (!text || text.trim().length === 0) return false;

    // Check for excessive caps (>50% uppercase letters)
    const letters = text.replace(/[^a-zA-Z]/g, "");
    if (letters.length > 5) {
      const upperCount = letters.replace(/[^A-Z]/g, "").length;
      if (upperCount / letters.length > 0.5) {
        return true;
      }
    }

    // Check for URLs (http/www patterns)
    const urlPattern = /https?:\/\/|www\./i;
    if (urlPattern.test(text)) {
      return true;
    }

    return false;
  }
}
