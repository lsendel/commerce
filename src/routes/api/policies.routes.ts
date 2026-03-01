import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";
import { resolveFeatureFlags } from "../../shared/feature-flags";
import { PolicyRepository } from "../../infrastructure/repositories/policy.repository";
import { PolicyEngineUseCase } from "../../application/platform/policy-engine.usecase";

const policyRoutes = new Hono<{ Bindings: Env }>();

const policyConfigSchema = z.object({
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

const violationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

function checkPolicyEngineFeature(c: any) {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags.policy_engine_guardrails) {
    return c.json(
      {
        error: "Policy engine is currently disabled",
        code: "FEATURE_DISABLED",
      },
      403,
    );
  }
  return null;
}

function buildDependencies(c: any) {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const repository = new PolicyRepository(db, storeId);
  const useCase = new PolicyEngineUseCase(repository);

  return { useCase };
}

policyRoutes.use("/policies/*", requireAuth());
policyRoutes.use("/policies", rateLimit({ windowMs: 60_000, max: 60 }));
policyRoutes.use("/policies/violations", rateLimit({ windowMs: 60_000, max: 80 }));

policyRoutes.get("/policies", async (c) => {
  const featureError = checkPolicyEngineFeature(c);
  if (featureError) return featureError;

  const { useCase } = buildDependencies(c);
  const policy = await useCase.getEffectivePolicy();

  return c.json({ policy }, 200);
});

policyRoutes.put(
  "/policies",
  zValidator("json", policyConfigSchema),
  async (c) => {
    const featureError = checkPolicyEngineFeature(c);
    if (featureError) return featureError;

    const body = c.req.valid("json");
    const userId = c.get("userId") as string;
    const { useCase } = buildDependencies(c);

    const policy = await useCase.updatePolicy(
      {
        pricing: body.pricing,
        shipping: body.shipping,
        promotions: body.promotions,
        enforcement: body.enforcement,
      },
      {
        isActive: body.isActive,
        updatedBy: userId,
      },
    );

    return c.json({ policy }, 200);
  },
);

policyRoutes.get(
  "/policies/violations",
  zValidator("query", violationsQuerySchema),
  async (c) => {
    const featureError = checkPolicyEngineFeature(c);
    if (featureError) return featureError;

    const { limit } = c.req.valid("query");
    const { useCase } = buildDependencies(c);
    const violations = await useCase.listViolations(limit ?? 100);

    return c.json({ violations }, 200);
  },
);

export { policyRoutes };
