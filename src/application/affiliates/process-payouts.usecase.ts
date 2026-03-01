import type { AffiliateRepository } from "../../infrastructure/repositories/affiliate.repository";

export class ProcessPayoutsUseCase {
  constructor(private affiliateRepo: AffiliateRepository) {}

  async execute() {
    const approvedConversions = await this.affiliateRepo.findApprovedUnpaidConversions();

    // Group by affiliate
    const byAffiliate = new Map<string, { total: number; conversionIds: string[] }>();
    for (const conv of approvedConversions) {
      const entry = byAffiliate.get(conv.affiliateId) ?? { total: 0, conversionIds: [] };
      entry.total += parseFloat(conv.commissionAmount);
      entry.conversionIds.push(conv.id);
      byAffiliate.set(conv.affiliateId, entry);
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const payouts = [];
    for (const [affiliateId, { total, conversionIds }] of byAffiliate) {
      const payout = await this.affiliateRepo.createPayout({
        affiliateId,
        amount: total.toFixed(2),
        periodStart,
        periodEnd,
      });
      await this.affiliateRepo.markConversionsPaid(conversionIds);
      payouts.push(payout);
    }

    return payouts;
  }
}
