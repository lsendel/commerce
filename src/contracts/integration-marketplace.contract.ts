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
});
