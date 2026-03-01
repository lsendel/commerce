import type { IntegrationProvider, IntegrationStatus } from "../../domain/platform/integration.entity";
import type {
  IntegrationRepository,
  IntegrationSecretRepository,
} from "../../infrastructure/repositories/integration.repository";
import { ListIntegrationsUseCase } from "./list-integrations.usecase";
import { NotFoundError, ValidationError } from "../../shared/errors";

export interface MarketplaceAppDefinition {
  provider: IntegrationProvider;
  name: string;
  vendor: string;
  kind: "first_party" | "partner";
  category: "payments" | "fulfillment" | "ai" | "messaging";
  description: string;
  docsUrl: string;
  setupComplexity: "low" | "medium" | "high";
  requiredSecrets: string[];
}

export interface MarketplaceAppView extends MarketplaceAppDefinition {
  installed: boolean;
  source: "store_override" | "platform" | "none";
  enabled: boolean;
  status: IntegrationStatus | "not_installed";
  statusMessage: string | null;
  lastVerifiedAt: string | null;
  lastSyncAt: string | null;
  hasSecretsConfigured: boolean;
}

const APP_CATALOG: MarketplaceAppDefinition[] = [
  {
    provider: "stripe",
    name: "Stripe",
    vendor: "Stripe",
    kind: "first_party",
    category: "payments",
    description: "Payments, checkout sessions, and billing portal integration.",
    docsUrl: "https://docs.stripe.com",
    setupComplexity: "medium",
    requiredSecrets: ["api_key", "publishable_key", "webhook_secret"],
  },
  {
    provider: "printful",
    name: "Printful",
    vendor: "Printful",
    kind: "partner",
    category: "fulfillment",
    description: "On-demand print fulfillment routing and catalog sync workflows.",
    docsUrl: "https://www.printful.com/api",
    setupComplexity: "medium",
    requiredSecrets: ["api_key", "webhook_secret"],
  },
  {
    provider: "gooten",
    name: "Gooten",
    vendor: "Gooten",
    kind: "partner",
    category: "fulfillment",
    description: "Alternative print partner for redundancy and routing flexibility.",
    docsUrl: "https://www.gooten.com/api",
    setupComplexity: "high",
    requiredSecrets: ["api_key"],
  },
  {
    provider: "prodigi",
    name: "Prodigi",
    vendor: "Prodigi",
    kind: "partner",
    category: "fulfillment",
    description: "Global print partner with broad product coverage.",
    docsUrl: "https://www.prodigi.com/print-api/docs/",
    setupComplexity: "high",
    requiredSecrets: ["api_key"],
  },
  {
    provider: "shapeways",
    name: "Shapeways",
    vendor: "Shapeways",
    kind: "partner",
    category: "fulfillment",
    description: "3D manufacturing provider for specialized product lines.",
    docsUrl: "https://developers.shapeways.com",
    setupComplexity: "high",
    requiredSecrets: ["api_key"],
  },
  {
    provider: "gemini",
    name: "Google Gemini",
    vendor: "Google",
    kind: "first_party",
    category: "ai",
    description: "AI generation and assistant capabilities for operator workflows.",
    docsUrl: "https://ai.google.dev/gemini-api/docs",
    setupComplexity: "low",
    requiredSecrets: ["api_key"],
  },
  {
    provider: "resend",
    name: "Resend",
    vendor: "Resend",
    kind: "first_party",
    category: "messaging",
    description: "Transactional and lifecycle email delivery infrastructure.",
    docsUrl: "https://resend.com/docs",
    setupComplexity: "low",
    requiredSecrets: ["api_key"],
  },
];

export class IntegrationMarketplaceUseCase {
  constructor(
    private readonly integrationRepo: IntegrationRepository,
    private readonly secretRepo: IntegrationSecretRepository,
    private readonly listIntegrationsUseCase: ListIntegrationsUseCase,
  ) {}

  async listApps(storeId: string): Promise<MarketplaceAppView[]> {
    const integrations = await this.listIntegrationsUseCase.listForStore(storeId);
    const integrationMap = new Map(integrations.map((integration) => [integration.provider, integration]));

    return APP_CATALOG.map((app) => {
      const integration = integrationMap.get(app.provider);
      const source = integration ? integration.source : "none";
      const hasSecretsConfigured = integration
        ? Object.keys(integration.secrets ?? {}).length > 0
        : false;

      return {
        ...app,
        installed: Boolean(integration),
        source,
        enabled: integration?.enabled ?? false,
        status: integration?.status ?? "not_installed",
        statusMessage: integration?.statusMessage ?? null,
        lastVerifiedAt: integration?.lastVerifiedAt
          ? new Date(integration.lastVerifiedAt).toISOString()
          : null,
        lastSyncAt: integration?.lastSyncAt
          ? new Date(integration.lastSyncAt).toISOString()
          : null,
        hasSecretsConfigured,
      };
    });
  }

  async installForStore(storeId: string, provider: IntegrationProvider): Promise<MarketplaceAppView> {
    this.ensureCatalogProvider(provider);

    const existingStoreIntegration = await this.integrationRepo.findByProvider(provider, storeId);
    if (!existingStoreIntegration) {
      await this.integrationRepo.upsert({
        storeId,
        provider,
        enabled: false,
        config: {},
        status: "disconnected",
        statusMessage: "Installed from marketplace. Configure credentials and enable when ready.",
        lastVerifiedAt: null,
        lastSyncAt: null,
      });
    }

    const apps = await this.listApps(storeId);
    const app = apps.find((item) => item.provider === provider);
    if (!app) {
      throw new NotFoundError("Marketplace app", provider);
    }

    return app;
  }

  async uninstallStoreOverride(storeId: string, provider: IntegrationProvider): Promise<void> {
    this.ensureCatalogProvider(provider);

    const integration = await this.integrationRepo.findByProvider(provider, storeId);
    if (!integration) {
      throw new NotFoundError("Store integration", provider);
    }

    await this.secretRepo.deleteByIntegration(integration.id);
    await this.integrationRepo.delete(provider, storeId);
  }

  private ensureCatalogProvider(provider: IntegrationProvider) {
    const exists = APP_CATALOG.some((app) => app.provider === provider);
    if (!exists) {
      throw new ValidationError(`Provider is not available in marketplace: ${provider}`);
    }
  }
}
