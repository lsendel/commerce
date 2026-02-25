import type { IntegrationProvider } from "../../domain/platform/integration.entity";
import type { IntegrationRepository } from "../../infrastructure/repositories/integration.repository";

export class DeleteIntegrationUseCase {
  constructor(private integrationRepo: IntegrationRepository) {}

  async execute(provider: IntegrationProvider, storeId?: string | null) {
    // Secrets are cascade-deleted via FK
    await this.integrationRepo.delete(provider, storeId);
  }
}
