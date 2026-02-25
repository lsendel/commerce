import type { AffiliateRepository } from "../../infrastructure/repositories/affiliate.repository";
import { ConflictError } from "../../shared/errors";

export class RegisterAffiliateUseCase {
  constructor(private affiliateRepo: AffiliateRepository) {}

  async execute(userId: string, customSlug?: string) {
    const existing = await this.affiliateRepo.findByUserId(userId);
    if (existing) {
      throw new ConflictError("User is already registered as an affiliate");
    }

    const referralCode = customSlug ?? crypto.randomUUID().slice(0, 8);

    return this.affiliateRepo.create({
      userId,
      referralCode,
      customSlug,
      commissionRate: "0.10",
    });
  }
}
