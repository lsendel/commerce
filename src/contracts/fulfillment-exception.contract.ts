import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const featureDisabledSchema = z.object({
  error: z.string(),
  code: z.literal("FEATURE_DISABLED"),
});

const exceptionItemSchema = z.object({
  requestId: z.string(),
  orderId: z.string(),
  provider: z.string(),
  status: z.string(),
  ageMinutes: z.number(),
  externalId: z.string().nullable(),
  errorMessage: z.string().nullable(),
  reason: z.string(),
  suggestedAction: z.enum(["retry", "monitor", "manual_review"]),
  autoResolvable: z.boolean(),
});

const slaRiskItemSchema = z.object({
  domain: z.enum(["fulfillment_request", "return_request"]),
  entityId: z.string(),
  orderId: z.string(),
  provider: z.string().nullable(),
  status: z.string(),
  ageMinutes: z.number(),
  targetMinutes: z.number(),
  riskScore: z.number(),
  riskLevel: z.enum(["low", "medium", "high"]),
  breachProbability: z.number(),
  predictedBreachAt: z.string().nullable(),
  reasons: z.array(z.string()),
  recommendedAction: z.enum([
    "retry",
    "expedite_provider",
    "manual_review",
    "prioritize_return_review",
    "prioritize_return_completion",
    "monitor",
  ]),
  autoActionEligible: z.boolean(),
});

export const fulfillmentExceptionContract = c.router({
  listExceptions: {
    method: "GET",
    path: "/api/admin/ops/fulfillment-exceptions",
    query: z.object({
      limit: z.coerce.number().int().min(1).max(200).optional(),
      pendingOlderThanMinutes: z.coerce.number().int().min(1).max(720).optional(),
      submittedOlderThanMinutes: z.coerce.number().int().min(1).max(1440).optional(),
      processingOlderThanMinutes: z.coerce.number().int().min(1).max(2880).optional(),
      cancelRequestedOlderThanMinutes: z.coerce.number().int().min(1).max(4320).optional(),
    }),
    responses: {
      200: z.object({
        exceptions: z.array(exceptionItemSchema),
        summary: z.object({
          scannedCount: z.number(),
          autoResolvableCount: z.number(),
        }),
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  autoResolve: {
    method: "POST",
    path: "/api/admin/ops/fulfillment-exceptions/auto-resolve",
    body: z.object({
      dryRun: z.boolean().optional(),
      limit: z.number().int().min(1).max(200).optional(),
      pendingOlderThanMinutes: z.number().int().min(1).max(720).optional(),
      submittedOlderThanMinutes: z.number().int().min(1).max(1440).optional(),
      processingOlderThanMinutes: z.number().int().min(1).max(2880).optional(),
      cancelRequestedOlderThanMinutes: z.number().int().min(1).max(4320).optional(),
    }),
    responses: {
      200: z.object({
        scannedCount: z.number(),
        eligibleCount: z.number(),
        resolvedCount: z.number(),
        dryRun: z.boolean(),
        resolvedRequestIds: z.array(z.string()),
        exceptions: z.array(exceptionItemSchema),
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  slaDashboard: {
    method: "GET",
    path: "/api/admin/ops/fulfillment-sla",
    query: z.object({
      limit: z.coerce.number().int().min(1).max(200).optional(),
    }),
    responses: {
      200: z.object({
        dashboard: z.object({
          modelVersion: z.literal("wk50-fulfillment-sla-v1"),
          generatedAt: z.string(),
          totals: z.object({
            openCount: z.number(),
            fulfillmentOpenCount: z.number(),
            returnsOpenCount: z.number(),
            atRiskCount: z.number(),
            highRiskCount: z.number(),
            mediumRiskCount: z.number(),
            autoActionEligibleCount: z.number(),
            projectedBreaches24h: z.number(),
          }),
          actionQueue: z.array(
            z.object({
              action: z.enum([
                "retry",
                "expedite_provider",
                "manual_review",
                "prioritize_return_review",
                "prioritize_return_completion",
                "monitor",
              ]),
              count: z.number(),
            }),
          ),
          items: z.array(slaRiskItemSchema),
        }),
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  runSlaInterventions: {
    method: "POST",
    path: "/api/admin/ops/fulfillment-sla/interventions",
    body: z.object({
      dryRun: z.boolean().optional(),
      limit: z.number().int().min(1).max(200).optional(),
      minRiskLevel: z.enum(["low", "medium", "high"]).optional(),
    }),
    responses: {
      200: z.object({
        modelVersion: z.literal("wk50-fulfillment-sla-v1"),
        executedAt: z.string(),
        dryRun: z.boolean(),
        minRiskLevel: z.enum(["low", "medium", "high"]),
        scannedCount: z.number(),
        candidateCount: z.number(),
        executedCount: z.number(),
        skippedCount: z.number(),
        actions: z.array(
          z.object({
            entityId: z.string(),
            orderId: z.string(),
            domain: z.enum(["fulfillment_request", "return_request"]),
            action: z.enum([
              "retry",
              "expedite_provider",
              "manual_review",
              "prioritize_return_review",
              "prioritize_return_completion",
              "monitor",
            ]),
            status: z.enum(["planned", "executed", "skipped"]),
            note: z.string(),
          }),
        ),
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
});
