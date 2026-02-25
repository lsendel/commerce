export type IntegrationProvider =
  | "stripe"
  | "printful"
  | "gemini"
  | "resend"
  | "gooten"
  | "prodigi"
  | "shapeways";

export type IntegrationStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "pending_verification";

export interface PlatformIntegration {
  id: string;
  storeId: string | null;
  provider: IntegrationProvider;
  enabled: boolean;
  config: Record<string, unknown>;
  status: IntegrationStatus;
  statusMessage: string | null;
  lastVerifiedAt: Date | null;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationSecret {
  id: string;
  integrationId: string;
  key: string;
  encryptedValue: string;
  iv: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Map of provider → env var names for env-first resolution */
export const PROVIDER_ENV_MAP: Record<
  IntegrationProvider,
  Record<string, string>
> = {
  stripe: {
    api_key: "STRIPE_SECRET_KEY",
    webhook_secret: "STRIPE_WEBHOOK_SECRET",
    publishable_key: "STRIPE_PUBLISHABLE_KEY",
  },
  printful: {
    api_key: "PRINTFUL_API_KEY",
    webhook_secret: "PRINTFUL_WEBHOOK_SECRET",
  },
  gemini: {
    api_key: "GEMINI_API_KEY",
  },
  resend: {
    api_key: "RESEND_API_KEY",
  },
  gooten: {},
  prodigi: {},
  shapeways: {},
};
