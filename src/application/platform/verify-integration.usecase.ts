import type { IntegrationProvider } from "../../domain/platform/integration.entity";
import type { IntegrationRepository, IntegrationSecretRepository } from "../../infrastructure/repositories/integration.repository";
import type { Env } from "../../env";
import { ResolveSecretUseCase } from "./resolve-secret.usecase";

interface VerifyResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

type VerifierFn = (apiKey: string) => Promise<VerifyResult>;

const VERIFIERS: Record<IntegrationProvider, VerifierFn> = {
  stripe: async (apiKey) => {
    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok)
      return {
        success: false,
        message: `Stripe: ${res.status} ${await res.text()}`,
      };
    const data = (await res.json()) as Record<string, unknown>;
    return {
      success: true,
      message: "Stripe connected",
      details: { livemode: data.livemode },
    };
  },

  printful: async (apiKey) => {
    const res = await fetch("https://api.printful.com/store", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok)
      return {
        success: false,
        message: `Printful: ${res.status} ${await res.text()}`,
      };
    const data = (await res.json()) as { result?: { name?: string } };
    return {
      success: true,
      message: "Printful connected",
      details: { storeName: data.result?.name },
    };
  },

  gemini: async (apiKey) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );
    if (!res.ok)
      return {
        success: false,
        message: `Gemini: ${res.status} ${await res.text()}`,
      };
    return { success: true, message: "Gemini connected" };
  },

  resend: async (apiKey) => {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok)
      return {
        success: false,
        message: `Resend: ${res.status} ${await res.text()}`,
      };
    return { success: true, message: "Resend connected" };
  },

  gooten: async (apiKey) => {
    const res = await fetch(
      `https://api.gooten.com/v1/source/partners?recipeid=${apiKey}`,
    );
    if (!res.ok)
      return { success: false, message: `Gooten: ${res.status}` };
    return { success: true, message: "Gooten connected" };
  },

  prodigi: async (apiKey) => {
    const res = await fetch("https://api.prodigi.com/v4.0/orders?limit=1", {
      headers: { "X-API-Key": apiKey },
    });
    if (!res.ok)
      return { success: false, message: `Prodigi: ${res.status}` };
    return { success: true, message: "Prodigi connected" };
  },

  shapeways: async (apiKey) => {
    const res = await fetch("https://api.shapeways.com/oauth2/token_info", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok)
      return { success: false, message: `Shapeways: ${res.status}` };
    return { success: true, message: "Shapeways connected" };
  },
};

export class VerifyIntegrationUseCase {
  constructor(
    private integrationRepo: IntegrationRepository,
    private secretRepo: IntegrationSecretRepository,
  ) {}

  async execute(
    provider: IntegrationProvider,
    env: Env,
    storeId?: string,
  ): Promise<VerifyResult> {
    const resolver = new ResolveSecretUseCase(
      this.integrationRepo,
      this.secretRepo,
    );
    const apiKey = await resolver.execute(provider, "api_key", env, storeId);

    if (!apiKey) {
      return { success: false, message: "No API key configured" };
    }

    const verifier = VERIFIERS[provider];
    try {
      const result = await verifier(apiKey);

      const integration = await this.integrationRepo.findByProvider(
        provider,
        storeId ?? null,
      );
      if (integration) {
        await this.integrationRepo.updateStatus(
          integration.id,
          result.success ? "connected" : "error",
          result.success ? null : result.message,
        );
        if (result.success) {
          await this.integrationRepo.updateLastVerified(integration.id);
        }
      }

      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Verification failed";

      const integration = await this.integrationRepo.findByProvider(
        provider,
        storeId ?? null,
      );
      if (integration) {
        await this.integrationRepo.updateStatus(
          integration.id,
          "error",
          message,
        );
      }

      return { success: false, message };
    }
  }
}
