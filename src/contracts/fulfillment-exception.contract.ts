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
});
