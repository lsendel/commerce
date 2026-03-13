import type { Env } from "../../env";
import type { IntegrationProvider } from "../../domain/platform/integration.entity";
import type {
  IntegrationRepository,
  IntegrationSecretRepository,
} from "../../infrastructure/repositories/integration.repository";
import { ValidationError } from "../../shared/errors";
import { ListIntegrationsUseCase } from "./list-integrations.usecase";
import {
  type PartnerProvider,
  type MarketplaceAppView,
  IntegrationMarketplaceUseCase,
  isPartnerProvider,
} from "./integration-marketplace.usecase";
import { UpsertIntegrationUseCase } from "./upsert-integration.usecase";
import { VerifyIntegrationUseCase } from "./verify-integration.usecase";

export type PartnerCapability =
  | "catalog_sync"
  | "order_submission"
  | "order_tracking"
  | "webhook_events";

export interface PartnerContractCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: "error" | "warn";
  detail: string;
}

export interface PartnerOnboardingStep {
  id: string;
  label: string;
  completed: boolean;
  blocked: boolean;
  detail: string;
}

export interface PartnerContractVerification {
  verified: boolean;
  scorePercent: number;
  checks: PartnerContractCheck[];
}

export interface PartnerOnboardingStatus {
  provider: PartnerProvider;
  appName: string;
  docsUrl: string;
  installed: boolean;
  source: "store_override" | "platform" | "none";
  status:
    | "connected"
    | "disconnected"
    | "error"
    | "pending_verification"
    | "not_installed";
  statusMessage: string | null;
  requiredSecrets: string[];
  configuredSecrets: string[];
  missingSecrets: string[];
  contactEmail: string | null;
  callbackUrl: string | null;
  webhookUrl: string | null;
  requestedCapabilities: PartnerCapability[];
  onboardingCompletedAt: string | null;
  steps: PartnerOnboardingStep[];
  progressPercent: number;
  contractVerification: PartnerContractVerification;
  recommendedNextAction: string;
}

interface CompletePartnerOnboardingInput {
  storeId: string;
  provider: PartnerProvider;
  enabled: boolean;
  contactEmail: string;
  callbackUrl?: string | null;
  webhookUrl?: string | null;
  requestedCapabilities: PartnerCapability[];
  secrets: Record<string, string>;
  notes?: string;
}

const DEFAULT_PARTNER_CAPABILITIES: PartnerCapability[] = [
  "catalog_sync",
  "order_submission",
  "order_tracking",
  "webhook_events",
];

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toPartnerCapabilities(value: unknown): PartnerCapability[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<PartnerCapability>(DEFAULT_PARTNER_CAPABILITIES);
  const normalized = value
    .map((item) => (typeof item === "string" ? item : ""))
    .filter((item): item is PartnerCapability => allowed.has(item as PartnerCapability));
  return [...new Set(normalized)];
}

function resolveRecommendedAction(input: {
  source: PartnerOnboardingStatus["source"];
  missingSecrets: string[];
  status: PartnerOnboardingStatus["status"];
  contractVerified: boolean;
}): string {
  if (input.source !== "store_override") {
    return "Install partner app override from marketplace before onboarding.";
  }
  if (input.missingSecrets.length > 0) {
    return `Configure missing credentials: ${input.missingSecrets.join(", ")}.`;
  }
  if (input.status !== "connected") {
    return "Run provider verification and resolve any connectivity errors.";
  }
  if (!input.contractVerified) {
    return "Resolve contract verification warnings before launch.";
  }
  return "Onboarding complete. Partner integration is ready for production traffic.";
}

export class PartnerOnboardingUseCase {
  private readonly listUseCase: ListIntegrationsUseCase;
  private readonly marketplaceUseCase: IntegrationMarketplaceUseCase;
  private readonly upsertUseCase: UpsertIntegrationUseCase;
  private readonly verifyUseCase: VerifyIntegrationUseCase;

  constructor(
    private readonly integrationRepo: IntegrationRepository,
    private readonly secretRepo: IntegrationSecretRepository,
  ) {
    this.listUseCase = new ListIntegrationsUseCase(integrationRepo, secretRepo);
    this.marketplaceUseCase = new IntegrationMarketplaceUseCase(
      integrationRepo,
      secretRepo,
      this.listUseCase,
    );
    this.upsertUseCase = new UpsertIntegrationUseCase(integrationRepo, secretRepo);
    this.verifyUseCase = new VerifyIntegrationUseCase(integrationRepo, secretRepo);
  }

  async listPartnerOnboarding(storeId: string): Promise<PartnerOnboardingStatus[]> {
    const apps = await this.marketplaceUseCase.listApps(storeId);
    const partners = apps.filter((app) => app.kind === "partner");
    const results: PartnerOnboardingStatus[] = [];
    for (const app of partners) {
      if (!isPartnerProvider(app.provider)) continue;
      results.push(buildPartnerOnboardingStatus(app));
    }
    return results;
  }

  async getPartnerOnboarding(
    storeId: string,
    provider: IntegrationProvider,
  ): Promise<PartnerOnboardingStatus> {
    if (!isPartnerProvider(provider)) {
      throw new ValidationError(`Provider is not a partner onboarding target: ${provider}`);
    }

    const apps = await this.marketplaceUseCase.listApps(storeId);
    const app = apps.find((item) => item.provider === provider);
    if (!app) {
      throw new ValidationError(`Provider is not available in marketplace catalog: ${provider}`);
    }
    return buildPartnerOnboardingStatus(app);
  }

  async verifyPartnerContract(
    storeId: string,
    provider: IntegrationProvider,
  ): Promise<PartnerContractVerification> {
    const onboarding = await this.getPartnerOnboarding(storeId, provider);
    return onboarding.contractVerification;
  }

  async completePartnerOnboarding(
    input: CompletePartnerOnboardingInput,
    env: Env,
  ): Promise<{
    onboarding: PartnerOnboardingStatus;
    verification: { success: boolean; message: string; details?: Record<string, unknown> };
  }> {
    if (!env.ENCRYPTION_KEY) {
      throw new ValidationError("ENCRYPTION_KEY not configured");
    }

    const existing = await this.integrationRepo.findByProvider(input.provider, input.storeId);
    const existingConfig = toRecord(existing?.config ?? {});
    const existingOnboarding = toRecord(existingConfig.onboarding);

    const onboardingConfig = {
      ...existingOnboarding,
      contactEmail: input.contactEmail,
      callbackUrl: input.callbackUrl ?? null,
      webhookUrl: input.webhookUrl ?? null,
      requestedCapabilities:
        input.requestedCapabilities.length > 0
          ? input.requestedCapabilities
          : DEFAULT_PARTNER_CAPABILITIES,
      notes: input.notes?.trim() ?? null,
      termsAcceptedAt: new Date().toISOString(),
      onboardingCompletedAt: new Date().toISOString(),
    };

    await this.upsertUseCase.execute(
      {
        provider: input.provider,
        storeId: input.storeId,
        enabled: input.enabled,
        config: {
          ...existingConfig,
          onboarding: onboardingConfig,
        },
        secrets: input.secrets,
      },
      env.ENCRYPTION_KEY,
    );

    const verification = await this.verifyUseCase.execute(input.provider, env, input.storeId);
    const onboarding = await this.getPartnerOnboarding(input.storeId, input.provider);

    return { onboarding, verification };
  }
}

export function buildPartnerOnboardingStatus(app: MarketplaceAppView): PartnerOnboardingStatus {
  const integrationConfig = toRecord(app.config);
  const onboardingConfig = toRecord(integrationConfig.onboarding);

  const configuredSecrets = [...app.configuredSecretKeys];
  const missingSecrets = app.requiredSecrets.filter(
    (key) => !configuredSecrets.includes(key),
  );
  const contactEmail = toString(onboardingConfig.contactEmail);
  const callbackUrl = toString(onboardingConfig.callbackUrl);
  const webhookUrl = toString(onboardingConfig.webhookUrl);
  const requestedCapabilities = toPartnerCapabilities(onboardingConfig.requestedCapabilities);
  const onboardingCompletedAt = toString(onboardingConfig.onboardingCompletedAt);
  const termsAcceptedAt = toString(onboardingConfig.termsAcceptedAt);

  const checks: PartnerContractCheck[] = [
    {
      id: "provider-partner-catalog",
      label: "Provider is a partner marketplace app",
      passed: app.kind === "partner",
      severity: "error",
      detail: app.kind === "partner" ? "Partner catalog entry exists." : "App is not marked as partner.",
    },
    {
      id: "store-override-installed",
      label: "Store override installed",
      passed: app.source === "store_override",
      severity: "error",
      detail:
        app.source === "store_override"
          ? "Store-level override installed."
          : "Install store-level override from marketplace.",
    },
    {
      id: "required-secrets-configured",
      label: "Required credentials configured",
      passed: missingSecrets.length === 0,
      severity: "error",
      detail:
        missingSecrets.length === 0
          ? "All required secret keys are configured."
          : `Missing keys: ${missingSecrets.join(", ")}`,
    },
    {
      id: "contact-email-present",
      label: "Onboarding contact email provided",
      passed: Boolean(contactEmail),
      severity: "error",
      detail: contactEmail ? `Contact: ${contactEmail}` : "Partner contact email is required.",
    },
    {
      id: "terms-accepted",
      label: "Terms accepted timestamp captured",
      passed: Boolean(termsAcceptedAt),
      severity: "error",
      detail: termsAcceptedAt ? `Accepted at ${termsAcceptedAt}` : "Terms acceptance timestamp missing.",
    },
    {
      id: "capabilities-declared",
      label: "Requested capabilities declared",
      passed: requestedCapabilities.length > 0,
      severity: "warn",
      detail:
        requestedCapabilities.length > 0
          ? `Capabilities: ${requestedCapabilities.join(", ")}`
          : "No capabilities declared; defaults recommended.",
    },
    {
      id: "provider-verification",
      label: "Provider verification connected",
      passed: app.status === "connected",
      severity: "error",
      detail:
        app.status === "connected"
          ? "Verification status is connected."
          : `Current status is ${app.status}.`,
    },
    {
      id: "docs-link-https",
      label: "Documentation URL uses HTTPS",
      passed: /^https:\/\//i.test(app.docsUrl),
      severity: "warn",
      detail: /^https:\/\//i.test(app.docsUrl) ? "Docs URL is secure." : "Docs URL should use HTTPS.",
    },
  ];

  const blockingFailures = checks.filter((check) => check.severity === "error" && !check.passed);
  const contractVerified = blockingFailures.length === 0;
  const passedCount = checks.filter((check) => check.passed).length;
  const scorePercent = Math.round((passedCount / checks.length) * 100);

  const steps: PartnerOnboardingStep[] = [
    {
      id: "install_store_override",
      label: "Install store override",
      completed: app.source === "store_override",
      blocked: false,
      detail:
        app.source === "store_override"
          ? "Store override is installed."
          : "Install the app from marketplace.",
    },
    {
      id: "configure_credentials",
      label: "Configure credentials",
      completed: missingSecrets.length === 0,
      blocked: app.source !== "store_override",
      detail:
        missingSecrets.length === 0
          ? "All required credentials configured."
          : `Missing: ${missingSecrets.join(", ")}`,
    },
    {
      id: "verify_connection",
      label: "Verify provider connection",
      completed: app.status === "connected",
      blocked: app.source !== "store_override" || missingSecrets.length > 0,
      detail:
        app.status === "connected"
          ? "Verification succeeded."
          : app.statusMessage ?? "Run verification after credentials are configured.",
    },
    {
      id: "contract_verification",
      label: "Pass contract verification",
      completed: contractVerified,
      blocked: app.status !== "connected",
      detail: contractVerified
        ? "Contract checks passed."
        : `${blockingFailures.length} blocking check(s) still failing.`,
    },
  ];

  const completedStepCount = steps.filter((step) => step.completed).length;
  const progressPercent = Math.round((completedStepCount / steps.length) * 100);

  return {
    provider: app.provider as PartnerProvider,
    appName: app.name,
    docsUrl: app.docsUrl,
    installed: app.installed,
    source: app.source,
    status: app.status,
    statusMessage: app.statusMessage,
    requiredSecrets: app.requiredSecrets,
    configuredSecrets,
    missingSecrets,
    contactEmail,
    callbackUrl,
    webhookUrl,
    requestedCapabilities,
    onboardingCompletedAt,
    steps,
    progressPercent,
    contractVerification: {
      verified: contractVerified,
      scorePercent,
      checks,
    },
    recommendedNextAction: resolveRecommendedAction({
      source: app.source,
      missingSecrets,
      status: app.status,
      contractVerified,
    }),
  };
}
