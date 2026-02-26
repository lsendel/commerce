import type { AffiliateRepository } from "../../infrastructure/repositories/affiliate.repository";
import { ConflictError } from "../../shared/errors";

interface RegisterAffiliateInput {
  userId: string;
  customSlug?: string;
  parentCode?: string;
}

export class RegisterAffiliateUseCase {
  constructor(private affiliateRepo: AffiliateRepository) {}

  async execute(input: RegisterAffiliateInput) {
    const existing = await this.affiliateRepo.findByUserId(input.userId);
    if (existing) {
      throw new ConflictError("User is already registered as an affiliate");
    }

    const referralCode =
      input.customSlug ?? crypto.randomUUID().slice(0, 8).toUpperCase();

    let parentAffiliateId: string | undefined;
    if (input.parentCode) {
      const parent = await this.affiliateRepo.findByReferralCode(input.parentCode);
      if (parent) parentAffiliateId = parent.id;
    }

    const tiers = await this.affiliateRepo.findTiers();
    const defaultTier = tiers.find((t) => t.level === 1);

    return this.affiliateRepo.create({
      userId: input.userId,
      referralCode,
      commissionRate: defaultTier?.commissionRate ?? "5",
      parentAffiliateId,
      tierId: defaultTier?.id,
      customSlug: input.customSlug,
    });
  }
}
