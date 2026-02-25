import type { StoreRepository } from "../../infrastructure/repositories/store.repository";

export class VerifyDomainUseCase {
  constructor(private storeRepo: StoreRepository) {}

  async addDomain(storeId: string, domain: string) {
    const token = crypto.randomUUID();
    return this.storeRepo.addDomain(storeId, domain, token);
  }

  async verify(storeId: string, domain: string) {
    const domainRecord = await this.storeRepo.findDomainByDomain(domain);
    if (!domainRecord || domainRecord.storeId !== storeId) {
      throw new Error(`Domain "${domain}" not found for this store`);
    }

    // In production: verify DNS TXT record contains the token
    // For now, mark as verified
    return this.storeRepo.verifyDomain(domainRecord.id);
  }
}
