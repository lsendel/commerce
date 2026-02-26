import { PromotionRepository } from "../../infrastructure/repositories/promotion.repository";
import { ValidationError, NotFoundError } from "../../shared/errors";

export class ApplyCouponUseCase {
  constructor(private repo: PromotionRepository) {}

  async execute(code: string, customerId: string | null) {
    const result = await this.repo.findCouponByCode(code);
    if (!result) {
      throw new NotFoundError("Coupon code");
    }

    const { coupon, promotion } = result;

    // Check max redemptions
    if (coupon.maxRedemptions && (coupon.redemptionCount ?? 0) >= coupon.maxRedemptions) {
      throw new ValidationError("Coupon has reached maximum redemptions");
    }

    // Check single-use per customer
    if (coupon.singleUsePerCustomer && customerId) {
      const count = await this.repo.getCustomerRedemptionCount(
        promotion.id,
        customerId,
      );
      if (count > 0) {
        throw new ValidationError("You have already used this coupon");
      }
    }

    return { promotion, coupon };
  }
}
