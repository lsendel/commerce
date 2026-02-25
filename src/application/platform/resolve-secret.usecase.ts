import type { IntegrationProvider } from "../../domain/platform/integration.entity";
import { PROVIDER_ENV_MAP } from "../../domain/platform/integration.entity";
import type { IntegrationRepository, IntegrationSecretRepository } from "../../infrastructure/repositories/integration.repository";
import { decryptSecret } from "../../infrastructure/crypto/secrets.service";
import type { Env } from "../../env";

export class ResolveSecretUseCase {
  constructor(
    private integrationRepo: IntegrationRepository,
    private secretRepo: IntegrationSecretRepository,
  ) {}

  /**
   * Resolve a secret for a given provider and key.
   * Order: env var → DB store override → DB platform global → null
   */
  async execute(
    provider: IntegrationProvider,
    key: string,
    env: Env,
    storeId?: string,
  ): Promise<string | null> {
    // 1. Check env var first (cheapest, no I/O)
    const envVarName = PROVIDER_ENV_MAP[provider]?.[key];
    if (envVarName) {
      const envValue = (env as unknown as Record<string, unknown>)[envVarName];
      if (typeof envValue === "string" && envValue.length > 0) {
        return envValue;
      }
    }

    // 2. Check DB store override (if storeId provided)
    if (storeId) {
      const storeValue = await this.resolveFromDb(
        provider,
        key,
        storeId,
        env,
      );
      if (storeValue) return storeValue;
    }

    // 3. Check DB platform global (storeId = null)
    const globalValue = await this.resolveFromDb(provider, key, null, env);
    if (globalValue) return globalValue;

    return null;
  }

  private async resolveFromDb(
    provider: IntegrationProvider,
    key: string,
    storeId: string | null,
    env: Env,
  ): Promise<string | null> {
    if (!env.ENCRYPTION_KEY) return null;

    const integration = await this.integrationRepo.findByProvider(
      provider,
      storeId,
    );
    if (!integration || !integration.enabled) return null;

    const secret = await this.secretRepo.findByIntegrationAndKey(
      integration.id,
      key,
    );
    if (!secret) return null;

    return decryptSecret(secret.encryptedValue, secret.iv, env.ENCRYPTION_KEY);
  }
}
