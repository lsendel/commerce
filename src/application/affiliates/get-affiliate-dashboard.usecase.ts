import type { AffiliateRepository } from "../../infrastructure/repositories/affiliate.repository";

export class GetAffiliateDashboardUseCase {
  constructor(private repo: AffiliateRepository) {}

  async execute(userId: string) {
    const affiliate = await this.repo.findByUserId(userId);
    if (!affiliate) return null;

    const [conversions, links, payouts] = await Promise.all([
      this.repo.findConversions(affiliate.id, 1, 10),
      this.repo.findLinks(affiliate.id),
      this.repo.findPayouts(affiliate.id),
    ]);

    const totalPaid = payouts
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      affiliate,
      recentConversions: conversions,
      links,
      payouts,
      totalPaid,
    };
  }
}
