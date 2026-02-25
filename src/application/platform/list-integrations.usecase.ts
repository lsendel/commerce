import type { PlatformIntegration } from "../../domain/platform/integration.entity";
import type {
  IntegrationRepository,
  IntegrationSecretRepository,
} from "../../infrastructure/repositories/integration.repository";

export interface IntegrationView extends PlatformIntegration {
  secrets: Record<string, string>; // key → masked value (last 4 chars)
  source: "platform" | "store_override";
}

export class ListIntegrationsUseCase {
  constructor(
    private integrationRepo: IntegrationRepository,
    private secretRepo: IntegrationSecretRepository,
  ) {}

  async listPlatform(): Promise<IntegrationView[]> {
    const integrations = await this.integrationRepo.findAllByStore(null);
    return this.enrichWithMaskedSecrets(integrations, "platform");
  }

  async listForStore(storeId: string): Promise<IntegrationView[]> {
    const storeIntegrations =
      await this.integrationRepo.findAllByStore(storeId);
    const platformGlobals = await this.integrationRepo.findAllByStore(null);

    const result: IntegrationView[] = [];
    const storeProviders = new Set(storeIntegrations.map((i) => i.provider));

    // Store overrides first
    const storeViews = await this.enrichWithMaskedSecrets(
      storeIntegrations,
      "store_override",
    );
    result.push(...storeViews);

    // Platform globals for providers the store hasn't overridden
    for (const integration of platformGlobals) {
      if (!storeProviders.has(integration.provider)) {
        const views = await this.enrichWithMaskedSecrets(
          [integration],
          "platform",
        );
        result.push(...views);
      }
    }

    return result;
  }

  private async enrichWithMaskedSecrets(
    integrations: PlatformIntegration[],
    source: "platform" | "store_override",
  ): Promise<IntegrationView[]> {
    const views: IntegrationView[] = [];

    for (const integration of integrations) {
      const secrets = await this.secretRepo.findAllByIntegration(
        integration.id,
      );
      const maskedSecrets: Record<string, string> = {};

      for (const secret of secrets) {
        const lastFour = secret.encryptedValue.slice(-4);
        maskedSecrets[secret.key] = `\u2022\u2022\u2022\u2022${lastFour}`;
      }

      views.push({ ...integration, secrets: maskedSecrets, source });
    }

    return views;
  }
}
