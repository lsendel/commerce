import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const featureDisabledSchema = z.object({
  error: z.string(),
  code: z.literal("FEATURE_DISABLED"),
});

const effectivePolicySchema = z.object({
  version: z.number(),
  isActive: z.boolean(),
  config: z.object({
    pricing: z.object({
      maxVariants: z.number(),
      minDeltaPercent: z.number(),
      maxDeltaPercent: z.number(),
      allowAutoApply: z.boolean(),
    }),
    shipping: z.object({
      maxFlatRate: z.number(),
      maxEstimatedDays: z.number(),
    }),
    promotions: z.object({
      maxPercentageOff: z.number(),
      maxFixedAmount: z.number(),
      maxCampaignDays: z.number(),
      allowStackable: z.boolean(),
    }),
    enforcement: z.object({
      mode: z.enum(["enforce", "monitor"]),
    }),
  }),
});

const policyConfigUpdateSchema = z.object({
  pricing: z
    .object({
      maxVariants: z.number().int().min(1).max(100).optional(),
      minDeltaPercent: z.number().min(-50).max(-1).optional(),
      maxDeltaPercent: z.number().min(1).max(50).optional(),
      allowAutoApply: z.boolean().optional(),
    })
    .optional(),
  shipping: z
    .object({
      maxFlatRate: z.number().min(0).max(1000).optional(),
      maxEstimatedDays: z.number().int().min(0).max(120).optional(),
    })
    .optional(),
  promotions: z
    .object({
      maxPercentageOff: z.number().min(1).max(100).optional(),
      maxFixedAmount: z.number().min(0).max(5000).optional(),
      maxCampaignDays: z.number().int().min(1).max(365).optional(),
      allowStackable: z.boolean().optional(),
    })
    .optional(),
  enforcement: z
    .object({
      mode: z.enum(["enforce", "monitor"]).optional(),
    })
    .optional(),
  isActive: z.boolean().optional(),
});

export const policiesContract = c.router({
  getPolicy: {
    method: "GET",
    path: "/api/admin/policies",
    responses: {
      200: z.object({ policy: effectivePolicySchema }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  updatePolicy: {
    method: "PUT",
    path: "/api/admin/policies",
    body: policyConfigUpdateSchema,
    responses: {
      200: z.object({ policy: effectivePolicySchema }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  listViolations: {
    method: "GET",
    path: "/api/admin/policies/violations",
    query: z.object({
      limit: z.coerce.number().int().min(1).max(500).optional(),
    }),
    responses: {
      200: z.object({
        violations: z.array(
          z.object({
            id: z.string(),
            domain: z.string(),
            action: z.string(),
            severity: z.enum(["warning", "error"]),
            message: z.string(),
            details: z.record(z.string(), z.unknown()),
            actorUserId: z.string().nullable(),
            createdAt: z.string(),
          }),
        ),
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
});
