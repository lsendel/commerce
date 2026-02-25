import type { AffiliateRepository } from "../../infrastructure/repositories/affiliate.repository";
import { NotFoundError } from "../../shared/errors";

export class GetAffiliateDashboardUseCase {
  constructor(private affiliateRepo: AffiliateRepository) {}

  async execute(userId: string) {
    const affiliate = await this.affiliateRepo.findByUserId(userId);
    if (!affiliate) {
      throw new NotFoundError("Affiliate", userId);
    }

    const links = await this.affiliateRepo.findLinks(affiliate.id);
    const conversions = await this.affiliateRepo.findConversions(affiliate.id);
    const payouts = await this.affiliateRepo.findPayouts(affiliate.id);

    return {
      affiliate,
      links,
      conversions,
      payouts,
      summary: {
        totalEarnings: affiliate.totalEarnings,
        totalClicks: affiliate.totalClicks,
        totalConversions: affiliate.totalConversions,
      },
    };
  }
}
