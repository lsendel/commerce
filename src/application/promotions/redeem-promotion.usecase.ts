import { PromotionRepository } from "../../infrastructure/repositories/promotion.repository";

export class RedeemPromotionUseCase {
  constructor(private repo: PromotionRepository) {}

  async execute(data: {
    promotionId: string;
    couponCodeId?: string;
    orderId: string;
    customerId: string;
    discountAmount: number;
  }) {
    return this.repo.recordRedemption(data);
  }
}
