import type { AffiliateRepository } from "../../infrastructure/repositories/affiliate.repository";

interface AttributionInput {
  referralCode: string;
  orderId: string;
  orderTotal: string;
}

export class AttributeConversionUseCase {
  constructor(private affiliateRepo: AffiliateRepository) {}

  async execute(input: AttributionInput) {
    const affiliate = await this.affiliateRepo.findByReferralCode(input.referralCode);
    if (!affiliate || affiliate.status !== "approved") {
      return null;
    }

    const commissionAmount = (
      parseFloat(input.orderTotal) * parseFloat(affiliate.commissionRate)
    ).toFixed(2);

    const conversion = await this.affiliateRepo.createConversion({
      affiliateId: affiliate.id,
      orderId: input.orderId,
      orderTotal: input.orderTotal,
      commissionAmount,
      attributionMethod: "link",
    });

    // Handle tier-2: if affiliate has a parent, create parent conversion
    if (affiliate.parentAffiliateId) {
      const parentAffiliate = await this.affiliateRepo.findById(affiliate.parentAffiliateId);
      if (parentAffiliate && parentAffiliate.status === "approved") {
        const tier = parentAffiliate.tierId
          ? await this.affiliateRepo.findTierById(parentAffiliate.tierId)
          : null;
        if (tier) {
          const parentCommission = (
            parseFloat(input.orderTotal) * parseFloat(tier.bonusRate)
          ).toFixed(2);

          await this.affiliateRepo.createConversion({
            affiliateId: parentAffiliate.id,
            orderId: input.orderId,
            orderTotal: input.orderTotal,
            commissionAmount: parentCommission,
            attributionMethod: "tier",
            parentConversionId: conversion?.id,
          });
        }
      }
    }

    return conversion;
  }
}
