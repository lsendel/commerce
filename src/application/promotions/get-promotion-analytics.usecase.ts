import { PromotionRepository } from "../../infrastructure/repositories/promotion.repository";

export class GetPromotionAnalyticsUseCase {
  constructor(private repo: PromotionRepository) {}

  async execute() {
    const analytics = await this.repo.getRedemptionAnalytics();
    return analytics.map((row) => ({
      promotionId: row.promotionId,
      totalRedemptions: Number(row.totalRedemptions),
      totalDiscount: parseFloat(row.totalDiscount ?? "0"),
      uniqueCustomers: Number(row.uniqueCustomers),
    }));
  }
}
