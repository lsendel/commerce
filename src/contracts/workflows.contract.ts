import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const featureDisabledSchema = z.object({
  error: z.string(),
  code: z.literal("FEATURE_DISABLED"),
});

const triggerConfigSchema = z.object({
  idleMinutes: z.number(),
  lookbackMinutes: z.number(),
  maxCandidates: z.number(),
});

const actionConfigSchema = z.object({
  channel: z.enum(["email", "sms", "whatsapp"]),
  stage: z.enum(["recovery_1h", "recovery_24h", "recovery_72h"]),
  incentiveCode: z.string().nullable(),
  maxPerRun: z.number(),
});

const workflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  triggerType: z.literal("abandoned_checkout"),
  triggerConfig: triggerConfigSchema,
  actionType: z.literal("checkout_recovery_message"),
  actionConfig: actionConfigSchema,
  isActive: z.boolean(),
  lastRunAt: z.string().nullable(),
  updatedAt: z.string(),
});

export const workflowsContract = c.router({
  list: {
    method: "GET",
    path: "/api/admin/workflows",
    query: z.object({
      limit: z.coerce.number().int().min(1).max(200).optional(),
    }),
    responses: {
      200: z.object({
        workflows: z.array(workflowSchema),
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  create: {
    method: "POST",
    path: "/api/admin/workflows",
    body: z.object({
      name: z.string().min(2).max(120),
      description: z.string().max(500).optional(),
      triggerType: z.literal("abandoned_checkout"),
      triggerConfig: z
        .object({
          idleMinutes: z.number().int().min(15).max(60 * 24 * 7).optional(),
          lookbackMinutes: z.number().int().min(15).max(60 * 24 * 30).optional(),
          maxCandidates: z.number().int().min(10).max(500).optional(),
        })
        .optional(),
      actionType: z.literal("checkout_recovery_message"),
      actionConfig: z
        .object({
          channel: z.enum(["email", "sms", "whatsapp"]).optional(),
          stage: z.enum(["recovery_1h", "recovery_24h", "recovery_72h"]).optional(),
          incentiveCode: z.string().max(60).optional(),
          maxPerRun: z.number().int().min(1).max(200).optional(),
        })
        .optional(),
      isActive: z.boolean().optional(),
    }),
    responses: {
      201: z.object({ workflow: workflowSchema }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: z.object({ error: z.string() }),
    },
  },
  update: {
    method: "PATCH",
    path: "/api/admin/workflows/:id",
    body: z.object({
      name: z.string().min(2).max(120).optional(),
      description: z.string().max(500).nullable().optional(),
      triggerType: z.literal("abandoned_checkout").optional(),
      triggerConfig: z
        .object({
          idleMinutes: z.number().int().min(15).max(60 * 24 * 7).optional(),
          lookbackMinutes: z.number().int().min(15).max(60 * 24 * 30).optional(),
          maxCandidates: z.number().int().min(10).max(500).optional(),
        })
        .optional(),
      actionType: z.literal("checkout_recovery_message").optional(),
      actionConfig: z
        .object({
          channel: z.enum(["email", "sms", "whatsapp"]).optional(),
          stage: z.enum(["recovery_1h", "recovery_24h", "recovery_72h"]).optional(),
          incentiveCode: z.string().max(60).nullable().optional(),
          maxPerRun: z.number().int().min(1).max(200).optional(),
        })
        .optional(),
      isActive: z.boolean().optional(),
    }),
    responses: {
      200: z.object({ workflow: workflowSchema }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: z.object({ error: z.string() }),
    },
  },
  toggle: {
    method: "POST",
    path: "/api/admin/workflows/:id/toggle",
    body: z.object({
      isActive: z.boolean(),
    }),
    responses: {
      200: z.object({ workflow: workflowSchema }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: z.object({ error: z.string() }),
    },
  },
  preview: {
    method: "POST",
    path: "/api/admin/workflows/:id/preview",
    body: z.object({}).optional(),
    responses: {
      200: z.object({
        preview: z.object({
          workflowId: z.string(),
          matchedCount: z.number(),
          warnings: z.array(z.string()),
          sample: z.array(
            z.object({
              cartId: z.string(),
              userId: z.string(),
              userEmail: z.string(),
              userPhone: z.string().nullable(),
              userName: z.string(),
              itemCount: z.number(),
              updatedAt: z.string(),
            }),
          ),
        }),
      }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: z.object({ error: z.string() }),
    },
  },
  run: {
    method: "POST",
    path: "/api/admin/workflows/:id/run",
    body: z.object({
      dryRun: z.boolean().optional(),
      maxPerRun: z.number().int().min(1).max(200).optional(),
    }),
    responses: {
      200: z.object({
        run: z.object({
          workflowId: z.string(),
          dryRun: z.boolean(),
          matchedCount: z.number(),
          preparedCount: z.number(),
          enqueuedCount: z.number(),
          skippedRecovered: z.number(),
          skippedRecentlyEnqueued: z.number(),
          skippedMissingChannelAddress: z.number(),
          warnings: z.array(z.string()),
          sample: z.array(
            z.object({
              cartId: z.string(),
              userEmail: z.string(),
              channel: z.enum(["email", "sms", "whatsapp"]),
              stage: z.enum(["recovery_1h", "recovery_24h", "recovery_72h"]),
              itemCount: z.number(),
              recoveryUrl: z.string(),
            }),
          ),
        }),
      }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: z.object({ error: z.string() }),
    },
  },
  remove: {
    method: "DELETE",
    path: "/api/admin/workflows/:id",
    responses: {
      200: z.object({ success: z.boolean() }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: z.object({ error: z.string() }),
    },
  },
});
