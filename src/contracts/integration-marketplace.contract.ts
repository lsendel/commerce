import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const featureDisabledSchema = z.object({
  error: z.string(),
  code: z.literal("FEATURE_DISABLED"),
});

const appSchema = z.object({
  provider: z.enum([
    "stripe",
    "printful",
    "gooten",
    "prodigi",
    "shapeways",
    "gemini",
    "resend",
  ]),
  name: z.string(),
  vendor: z.string(),
  kind: z.enum(["first_party", "partner"]),
  category: z.enum(["payments", "fulfillment", "ai", "messaging"]),
  description: z.string(),
  docsUrl: z.string(),
  setupComplexity: z.enum(["low", "medium", "high"]),
  requiredSecrets: z.array(z.string()),
  installed: z.boolean(),
  source: z.enum(["store_override", "platform", "none"]),
  enabled: z.boolean(),
  status: z.enum([
    "connected",
    "disconnected",
    "error",
    "pending_verification",
    "not_installed",
  ]),
  statusMessage: z.string().nullable(),
  lastVerifiedAt: z.string().nullable(),
  lastSyncAt: z.string().nullable(),
  hasSecretsConfigured: z.boolean(),
});

const providerParamSchema = z.object({
  provider: z.enum([
    "stripe",
    "printful",
    "gooten",
    "prodigi",
    "shapeways",
    "gemini",
    "resend",
  ]),
});

const partnerProviderParamSchema = z.object({
  provider: z.enum(["printful", "gooten", "prodigi", "shapeways"]),
});

const partnerCapabilitySchema = z.enum([
  "catalog_sync",
  "order_submission",
  "order_tracking",
  "webhook_events",
]);

const partnerContractCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  passed: z.boolean(),
  severity: z.enum(["error", "warn"]),
  detail: z.string(),
});

const partnerOnboardingStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  completed: z.boolean(),
  blocked: z.boolean(),
  detail: z.string(),
});

const partnerContractVerificationSchema = z.object({
  verified: z.boolean(),
  scorePercent: z.number(),
  checks: z.array(partnerContractCheckSchema),
});

const partnerOnboardingStatusSchema = z.object({
  provider: partnerProviderParamSchema.shape.provider,
  appName: z.string(),
  docsUrl: z.string(),
  installed: z.boolean(),
  source: z.enum(["store_override", "platform", "none"]),
  status: z.enum([
    "connected",
    "disconnected",
    "error",
    "pending_verification",
    "not_installed",
  ]),
  statusMessage: z.string().nullable(),
  requiredSecrets: z.array(z.string()),
  configuredSecrets: z.array(z.string()),
  missingSecrets: z.array(z.string()),
  contactEmail: z.string().nullable(),
  callbackUrl: z.string().nullable(),
  webhookUrl: z.string().nullable(),
  requestedCapabilities: z.array(partnerCapabilitySchema),
  onboardingCompletedAt: z.string().nullable(),
  steps: z.array(partnerOnboardingStepSchema),
  progressPercent: z.number(),
  contractVerification: partnerContractVerificationSchema,
  recommendedNextAction: z.string(),
});

const completePartnerOnboardingBodySchema = z.object({
  enabled: z.boolean().optional(),
  contactEmail: z.string().email(),
  callbackUrl: z.string().url().nullable().optional(),
  webhookUrl: z.string().url().nullable().optional(),
  requestedCapabilities: z.array(partnerCapabilitySchema).optional(),
  secrets: z.record(z.string()),
  notes: z.string().max(500).optional(),
});

export const integrationMarketplaceContract = c.router({
  listApps: {
    method: "GET",
    path: "/api/admin/integration-marketplace/apps",
    responses: {
      200: z.object({ apps: z.array(appSchema) }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  installApp: {
    method: "POST",
    path: "/api/admin/integration-marketplace/apps/:provider/install",
    pathParams: providerParamSchema,
    body: z.object({}).optional(),
    responses: {
      201: z.object({ app: appSchema }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: z.object({ error: z.string() }),
    },
  },
  uninstallApp: {
    method: "POST",
    path: "/api/admin/integration-marketplace/apps/:provider/uninstall",
    pathParams: providerParamSchema,
    body: z.object({}).optional(),
    responses: {
      200: z.object({ success: z.boolean() }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: z.object({ error: z.string() }),
    },
  },
  verifyApp: {
    method: "POST",
    path: "/api/admin/integration-marketplace/apps/:provider/verify",
    pathParams: providerParamSchema,
    body: z.object({}).optional(),
    responses: {
      200: z.object({
        success: z.boolean(),
        message: z.string(),
        details: z.record(z.string(), z.unknown()).nullable(),
        app: appSchema.nullable(),
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: z.object({ error: z.string() }),
    },
  },
  listPartnerOnboarding: {
    method: "GET",
    path: "/api/admin/integration-marketplace/partners/onboarding",
    responses: {
      200: z.object({ partners: z.array(partnerOnboardingStatusSchema) }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  getPartnerOnboarding: {
    method: "GET",
    path: "/api/admin/integration-marketplace/partners/:provider/onboarding",
    pathParams: partnerProviderParamSchema,
    responses: {
      200: z.object({ partner: partnerOnboardingStatusSchema }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: z.object({ error: z.string() }),
    },
  },
  completePartnerOnboarding: {
    method: "POST",
    path: "/api/admin/integration-marketplace/partners/:provider/onboarding/complete",
    pathParams: partnerProviderParamSchema,
    body: completePartnerOnboardingBodySchema,
    responses: {
      200: z.object({
        onboarding: partnerOnboardingStatusSchema,
        verification: z.object({
          success: z.boolean(),
          message: z.string(),
          details: z.record(z.string(), z.unknown()).optional(),
        }),
      }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: z.object({ error: z.string() }),
    },
  },
  verifyPartnerContract: {
    method: "POST",
    path: "/api/admin/integration-marketplace/partners/:provider/contract-verify",
    pathParams: partnerProviderParamSchema,
    body: z.object({}).optional(),
    responses: {
      200: z.object({
        contractVerification: partnerContractVerificationSchema,
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: z.object({ error: z.string() }),
    },
  },
});
