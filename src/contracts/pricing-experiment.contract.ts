import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const featureDisabledSchema = z.object({
  error: z.string(),
  code: z.literal("FEATURE_DISABLED"),
});

const assignmentSchema = z.object({
  variantId: z.string(),
  productId: z.string(),
  productName: z.string(),
  variantTitle: z.string(),
  baselinePrice: z.number(),
  baselineCompareAtPrice: z.number().nullable(),
  proposedPrice: z.number(),
  deltaPercent: z.number(),
  rationale: z.string(),
});

const guardrailSchema = z.object({
  minDeltaPercent: z.number(),
  maxDeltaPercent: z.number(),
  maxVariants: z.number(),
});

const preflightRiskSchema = z.object({
  score: z.number(),
  level: z.enum(["low", "medium", "high"]),
});

const policyViolationPreviewSchema = z.object({
  domain: z.string(),
  action: z.string(),
  severity: z.enum(["warning", "error"]),
  message: z.string(),
  details: z.record(z.string(), z.unknown()),
});

const preflightSchema = z.object({
  modelVersion: z.literal("wk49-pricing-policy-preflight-v1"),
  evaluatedAt: z.string(),
  proposal: z.object({
    assignments: z.array(assignmentSchema),
    warnings: z.array(z.string()),
    guardrails: guardrailSchema,
  }),
  proposalSummary: z.object({
    assignmentsCount: z.number(),
    markdownCount: z.number(),
    markdownShare: z.number(),
    avgDeltaPercent: z.number(),
    avgMarkdownPercent: z.number().nullable(),
    autoApply: z.boolean(),
  }),
  policyValidation: z.object({
    policyEngineEnabled: z.boolean(),
    pricing: z.object({
      policy: z.object({
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
      }),
      input: z.object({
        maxVariants: z.number().optional(),
        minDeltaPercent: z.number().optional(),
        maxDeltaPercent: z.number().optional(),
        autoApply: z.boolean().optional(),
      }),
      violations: z.array(policyViolationPreviewSchema),
      wouldBlock: z.boolean(),
    }),
    discount: z
      .object({
        policy: z.object({
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
        }),
        input: z.object({
          strategyType: z.string().optional(),
          strategyParams: z.unknown().optional(),
          stackable: z.boolean().optional(),
          startsAt: z.union([z.string(), z.date(), z.null()]).optional(),
          endsAt: z.union([z.string(), z.date(), z.null()]).optional(),
        }),
        violations: z.array(policyViolationPreviewSchema),
        wouldBlock: z.boolean(),
      })
      .nullable(),
  }),
  risk: preflightRiskSchema,
  findings: z.object({
    blockers: z.array(z.string()),
    warnings: z.array(z.string()),
    recommendations: z.array(z.string()),
  }),
});

export const pricingExperimentContract = c.router({
  listExperiments: {
    method: "GET",
    path: "/api/admin/pricing-experiments",
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).optional(),
    }),
    responses: {
      200: z.object({
        experiments: z.array(
          z.object({
            experimentId: z.string(),
            name: z.string(),
            status: z.enum(["running", "stopped"]),
            startedAt: z.string(),
            stoppedAt: z.string().nullable(),
            assignmentsCount: z.number(),
            avgDeltaPercent: z.number(),
          }),
        ),
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  propose: {
    method: "POST",
    path: "/api/admin/pricing-experiments/propose",
    body: z.object({
      maxVariants: z.number().int().min(1).max(30).optional(),
      variantIds: z.array(z.string().uuid()).max(100).optional(),
      minDeltaPercent: z.number().min(-20).max(0).optional(),
      maxDeltaPercent: z.number().min(0).max(20).optional(),
    }),
    responses: {
      200: z.object({
        proposal: z.object({
          assignments: z.array(assignmentSchema),
          warnings: z.array(z.string()),
          guardrails: guardrailSchema,
        }),
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  preflight: {
    method: "POST",
    path: "/api/admin/pricing-experiments/preflight",
    body: z.object({
      autoApply: z.boolean().optional(),
      maxVariants: z.number().int().min(1).max(30).optional(),
      variantIds: z.array(z.string().uuid()).max(100).optional(),
      minDeltaPercent: z.number().min(-20).max(0).optional(),
      maxDeltaPercent: z.number().min(0).max(20).optional(),
      discountScenario: z
        .object({
          strategyType: z.enum(["percentage_off", "fixed_amount"]).optional(),
          value: z.number().min(0).max(5000).optional(),
          stackable: z.boolean().optional(),
          startsAt: z.string().datetime().optional(),
          endsAt: z.string().datetime().optional(),
        })
        .optional(),
    }),
    responses: {
      200: z.object({
        preflight: preflightSchema,
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  start: {
    method: "POST",
    path: "/api/admin/pricing-experiments/start",
    body: z.object({
      name: z.string().min(3).max(120),
      autoApply: z.boolean().optional(),
      maxVariants: z.number().int().min(1).max(30).optional(),
      variantIds: z.array(z.string().uuid()).max(100).optional(),
      minDeltaPercent: z.number().min(-20).max(0).optional(),
      maxDeltaPercent: z.number().min(0).max(20).optional(),
      discountScenario: z
        .object({
          strategyType: z.enum(["percentage_off", "fixed_amount"]).optional(),
          value: z.number().min(0).max(5000).optional(),
          stackable: z.boolean().optional(),
          startsAt: z.string().datetime().optional(),
          endsAt: z.string().datetime().optional(),
        })
        .optional(),
    }),
    responses: {
      201: z.object({
        experiment: z.object({
          experimentId: z.string(),
          name: z.string(),
          status: z.literal("running"),
          startedAt: z.string(),
          assignmentsCount: z.number(),
          appliedCount: z.number(),
          autoApply: z.boolean(),
          guardrails: guardrailSchema,
          assignments: z.array(assignmentSchema),
          preflight: preflightSchema,
        }),
      }),
      409: z.object({
        error: z.string(),
        code: z.literal("PRE_FLIGHT_BLOCKED"),
        preflight: preflightSchema,
      }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  stop: {
    method: "POST",
    path: "/api/admin/pricing-experiments/:id/stop",
    body: z.object({}).optional(),
    responses: {
      200: z.object({
        success: z.boolean(),
        experimentId: z.string(),
        stoppedAt: z.string(),
        restoredCount: z.number(),
      }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  performance: {
    method: "GET",
    path: "/api/admin/pricing-experiments/:id/performance",
    query: z.object({
      windowDays: z.coerce.number().int().min(3).max(60).optional(),
    }),
    responses: {
      200: z.object({
        performance: z.object({
          experimentId: z.string(),
          startedAt: z.string(),
          stoppedAt: z.string().nullable(),
          windowDays: z.number(),
          preWindow: z.object({
            from: z.string(),
            to: z.string(),
            units: z.number(),
            revenue: z.number(),
            orderCount: z.number(),
          }),
          postWindow: z.object({
            from: z.string(),
            to: z.string(),
            units: z.number(),
            revenue: z.number(),
            orderCount: z.number(),
          }),
          lifts: z.object({
            unitsPercent: z.number().nullable(),
            revenuePercent: z.number().nullable(),
            orderCountPercent: z.number().nullable(),
          }),
        }),
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: z.object({ error: z.string() }),
    },
  },
});
