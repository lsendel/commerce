import type { AffiliateRepository } from "../../infrastructure/repositories/affiliate.repository";

export class ManageLinksUseCase {
  constructor(private affiliateRepo: AffiliateRepository) {}

  async createLink(affiliateId: string, targetUrl: string) {
    const shortCode = crypto.randomUUID().slice(0, 8);
    return this.affiliateRepo.createLink({
      affiliateId,
      targetUrl,
      shortCode,
    });
  }

  async listLinks(affiliateId: string) {
    return this.affiliateRepo.findLinks(affiliateId);
  }
}
