import { eq } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import { PromotionRepository } from "../../infrastructure/repositories/promotion.repository";
import { carts } from "../../infrastructure/db/schema";
import { ValidationError, NotFoundError } from "../../shared/errors";

export class ApplyCouponUseCase {
  constructor(
    private repo: PromotionRepository,
    private db?: Database,
  ) {}

  async execute(code: string, customerId: string | null, cartId?: string) {
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

    // Persist coupon on cart
    if (cartId && this.db) {
      await this.db
        .update(carts)
        .set({ couponCodeId: coupon.id, updatedAt: new Date() })
        .where(eq(carts.id, cartId));
    }

    // Extract discount info from strategy
    const params = (promotion.strategyParams ?? {}) as Record<string, unknown>;
    const discountValue = params.value ? Number(params.value) : params.amount ? Number(params.amount) : 0;

    return {
      promotion,
      coupon,
      discount: {
        type: promotion.strategyType as string,
        value: discountValue,
      },
    };
  }
}
