import { PromotionRepository } from "../../infrastructure/repositories/promotion.repository";
import { NotFoundError, ValidationError } from "../../shared/errors";

export class ManageCouponCodesUseCase {
  constructor(private repo: PromotionRepository) {}

  async createCode(promotionId: string, code: string, maxRedemptions?: number) {
    const promotion = await this.repo.findById(promotionId);
    if (!promotion) throw new NotFoundError("Promotion", promotionId);
    if (promotion.type !== "coupon") {
      throw new ValidationError("Coupon codes can only be added to coupon-type promotions");
    }

    return this.repo.createCouponCode(promotionId, code, maxRedemptions);
  }
}
