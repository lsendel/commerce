import type {
  IntegrationProvider,
  IntegrationStatus,
} from "../../domain/platform/integration.entity";
import type {
  IntegrationRepository,
  IntegrationSecretRepository,
} from "../../infrastructure/repositories/integration.repository";
import { encryptSecret } from "../../infrastructure/crypto/secrets.service";

interface UpsertInput {
  provider: IntegrationProvider;
  storeId?: string | null;
  enabled: boolean;
  config: Record<string, unknown>;
  secrets: Record<string, string>; // key → plaintext value
}

export class UpsertIntegrationUseCase {
  constructor(
    private integrationRepo: IntegrationRepository,
    private secretRepo: IntegrationSecretRepository,
  ) {}

  async execute(input: UpsertInput, encryptionKey: string) {
    const integration = await this.integrationRepo.upsert({
      storeId: input.storeId ?? null,
      provider: input.provider,
      enabled: input.enabled,
      config: input.config,
      status: "pending_verification" as IntegrationStatus,
      statusMessage: null,
      lastVerifiedAt: null,
      lastSyncAt: null,
    });

    for (const [key, plaintext] of Object.entries(input.secrets)) {
      if (!plaintext) continue;
      const encrypted = await encryptSecret(plaintext, encryptionKey);
      await this.secretRepo.upsert({
        integrationId: integration.id,
        key,
        encryptedValue: encrypted.encryptedValue,
        iv: encrypted.iv,
      });
    }

    return integration;
  }
}
