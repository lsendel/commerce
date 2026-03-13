import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { TrackEventUseCase } from "../../application/analytics/track-event.usecase";
import { AgenticPricingExperimentsUseCase } from "../../application/pricing/agentic-pricing-experiments.usecase";
import { requireAuth } from "../../middleware/auth.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";
import { resolveFeatureFlags } from "../../shared/feature-flags";
import { PolicyRepository } from "../../infrastructure/repositories/policy.repository";
import { PolicyEngineUseCase } from "../../application/platform/policy-engine.usecase";
import {
  evaluatePricingPolicyPreflight,
  type PricingPreflightPolicyInput,
  type PricingPolicyPreflightResult,
} from "../../application/pricing/pricing-policy-preflight";
import { ValidationError } from "../../shared/errors";

const pricingExperimentRoutes = new Hono<{ Bindings: Env }>();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const performanceQuerySchema = z.object({
  windowDays: z.coerce.number().int().min(3).max(60).optional(),
});

const proposalSchema = z.object({
  maxVariants: z.number().int().min(1).max(30).optional(),
  variantIds: z.array(z.string().uuid()).max(100).optional(),
  minDeltaPercent: z.number().min(-20).max(0).optional(),
  maxDeltaPercent: z.number().min(0).max(20).optional(),
});

const startSchema = proposalSchema.extend({
  name: z.string().min(3).max(120),
  autoApply: z.boolean().optional(),
  discountScenario: z
    .object({
      strategyType: z.enum(["percentage_off", "fixed_amount"]).optional(),
      value: z.number().min(0).max(5000).optional(),
      stackable: z.boolean().optional(),
      startsAt: z.string().datetime().optional(),
      endsAt: z.string().datetime().optional(),
    })
    .optional(),
});

const preflightSchema = proposalSchema.extend({
  autoApply: z.boolean().optional(),
  discountScenario: z
    .object({
      strategyType: z.enum(["percentage_off", "fixed_amount"]).optional(),
      value: z.number().min(0).max(5000).optional(),
      stackable: z.boolean().optional(),
      startsAt: z.string().datetime().optional(),
      endsAt: z.string().datetime().optional(),
    })
    .optional(),
});

function checkPricingExperimentFeature(c: any) {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags.ai_pricing_experiments) {
    return c.json(
      {
        error: "Agentic pricing experiments are currently disabled",
        code: "FEATURE_DISABLED",
      },
      403,
    );
  }
  return null;
}

function createExperimentId() {
  return `price-exp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function fallbackProposalFromInput(input: {
  maxVariants?: number;
  minDeltaPercent?: number;
  maxDeltaPercent?: number;
}, warning: string) {
  return {
    assignments: [],
    warnings: [warning],
    guardrails: {
      maxVariants: Math.max(1, Math.min(Number(input.maxVariants ?? 8), 30)),
      minDeltaPercent: clamp(Number(input.minDeltaPercent ?? -10), -20, 0),
      maxDeltaPercent: clamp(Number(input.maxDeltaPercent ?? 10), 0, 20),
    },
  };
}

type PreflightInput = z.infer<typeof preflightSchema>;

async function buildPreflight(params: {
  db: ReturnType<typeof createDb>;
  storeId: string;
  body: PreflightInput;
  flags: ReturnType<typeof resolveFeatureFlags>;
}): Promise<PricingPolicyPreflightResult> {
  const analyticsRepo = new AnalyticsRepository(params.db, params.storeId);
  const pricingUseCase = new AgenticPricingExperimentsUseCase(
    params.db,
    params.storeId,
    analyticsRepo,
  );

  let proposal: Awaited<ReturnType<AgenticPricingExperimentsUseCase["propose"]>>;
  try {
    proposal = await pricingUseCase.propose(params.body);
  } catch (error) {
    if (error instanceof ValidationError) {
      proposal = fallbackProposalFromInput(params.body, error.message);
    } else {
      throw error;
    }
  }

  const policyUseCase = new PolicyEngineUseCase(
    new PolicyRepository(params.db, params.storeId),
  );
  const pricingInput: PricingPreflightPolicyInput = {
    maxVariants: params.body.maxVariants,
    minDeltaPercent: params.body.minDeltaPercent,
    maxDeltaPercent: params.body.maxDeltaPercent,
    autoApply: params.body.autoApply,
  };

  const [effectivePolicy, pricingPreview] = await Promise.all([
    policyUseCase.getEffectivePolicy(),
    policyUseCase.previewPricingExperimentGuardrails("start", pricingInput),
  ]);

  let discountPreview: Awaited<
    ReturnType<PolicyEngineUseCase["previewPromotionGuardrails"]>
  > | null = null;
  const discountScenario = params.body.discountScenario;
  if (discountScenario?.strategyType) {
    const strategyParams =
      discountScenario.strategyType === "fixed_amount"
        ? { amount: discountScenario.value ?? 0 }
        : { value: discountScenario.value ?? 0 };

    discountPreview = await policyUseCase.previewPromotionGuardrails(
      "copilot_apply",
      {
        strategyType: discountScenario.strategyType,
        strategyParams,
        stackable: discountScenario.stackable,
        startsAt: discountScenario.startsAt ?? null,
        endsAt: discountScenario.endsAt ?? null,
      },
    );
  }

  const pricingValidation = params.flags.policy_engine_guardrails
    ? pricingPreview
    : {
        ...pricingPreview,
        policy: effectivePolicy,
        violations: [],
        wouldBlock: false,
      };

  const discountValidation = !discountPreview
    ? null
    : params.flags.policy_engine_guardrails
      ? discountPreview
      : {
          ...discountPreview,
          policy: effectivePolicy,
          violations: [],
          wouldBlock: false,
        };

  return evaluatePricingPolicyPreflight({
    proposal,
    pricingPolicyPreview: pricingValidation,
    discountPolicyPreview: discountValidation,
    discountScenario,
    policyEngineEnabled: params.flags.policy_engine_guardrails,
  });
}

pricingExperimentRoutes.use("/pricing-experiments/*", requireAuth());
pricingExperimentRoutes.use(
  "/pricing-experiments",
  rateLimit({ windowMs: 60_000, max: 60 }),
);
pricingExperimentRoutes.use(
  "/pricing-experiments/propose",
  rateLimit({ windowMs: 60_000, max: 30 }),
);
pricingExperimentRoutes.use(
  "/pricing-experiments/start",
  rateLimit({ windowMs: 60_000, max: 20 }),
);
pricingExperimentRoutes.use(
  "/pricing-experiments/preflight",
  rateLimit({ windowMs: 60_000, max: 30 }),
);
pricingExperimentRoutes.use(
  "/pricing-experiments/:id/stop",
  rateLimit({ windowMs: 60_000, max: 20 }),
);

pricingExperimentRoutes.get(
  "/pricing-experiments",
  zValidator("query", listQuerySchema),
  async (c) => {
    const featureError = checkPricingExperimentFeature(c);
    if (featureError) return featureError;

    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const { limit } = c.req.valid("query");

    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const useCase = new AgenticPricingExperimentsUseCase(db, storeId, analyticsRepo);
    const experiments = await useCase.listExperiments(limit ?? 20);

    return c.json({ experiments }, 200);
  },
);

pricingExperimentRoutes.post(
  "/pricing-experiments/propose",
  zValidator("json", proposalSchema),
  async (c) => {
    const featureError = checkPricingExperimentFeature(c);
    if (featureError) return featureError;

    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const userId = c.get("userId") as string;
    const body = c.req.valid("json");
    const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);

    if (flags.policy_engine_guardrails) {
      const policyUseCase = new PolicyEngineUseCase(new PolicyRepository(db, storeId));
      await policyUseCase.enforcePricingExperimentGuardrails("propose", {
        maxVariants: body.maxVariants,
        minDeltaPercent: body.minDeltaPercent,
        maxDeltaPercent: body.maxDeltaPercent,
      }, userId);
    }

    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const useCase = new AgenticPricingExperimentsUseCase(db, storeId, analyticsRepo);
    const proposal = await useCase.propose(body);

    const trackEvent = new TrackEventUseCase(analyticsRepo);
    await trackEvent.execute({
      eventType: "pricing_experiment_proposal_generated",
      userId,
      properties: {
        assignmentCount: proposal.assignments.length,
        maxVariants: proposal.guardrails.maxVariants,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json({ proposal }, 200);
  },
);

pricingExperimentRoutes.post(
  "/pricing-experiments/preflight",
  zValidator("json", preflightSchema),
  async (c) => {
    const featureError = checkPricingExperimentFeature(c);
    if (featureError) return featureError;

    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
    const body = c.req.valid("json");
    const preflight = await buildPreflight({
      db,
      storeId,
      body,
      flags,
    });

    return c.json({ preflight }, 200);
  },
);

pricingExperimentRoutes.post(
  "/pricing-experiments/start",
  zValidator("json", startSchema),
  async (c) => {
    const featureError = checkPricingExperimentFeature(c);
    if (featureError) return featureError;

    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const userId = c.get("userId") as string;
    const body = c.req.valid("json");
    const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
    const preflight = await buildPreflight({
      db,
      storeId,
      body,
      flags,
    });

    if (preflight.findings.blockers.length > 0 || preflight.risk.level === "high") {
      return c.json(
        {
          error: "Preflight risk check blocked experiment start",
          code: "PRE_FLIGHT_BLOCKED",
          preflight,
        },
        409,
      );
    }

    if (flags.policy_engine_guardrails) {
      const policyUseCase = new PolicyEngineUseCase(new PolicyRepository(db, storeId));
      await policyUseCase.enforcePricingExperimentGuardrails("start", {
        maxVariants: body.maxVariants,
        minDeltaPercent: body.minDeltaPercent,
        maxDeltaPercent: body.maxDeltaPercent,
        autoApply: body.autoApply,
      }, userId);
    }

    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const useCase = new AgenticPricingExperimentsUseCase(db, storeId, analyticsRepo);
    const proposal = preflight.proposal;

    if (proposal.assignments.length === 0) {
      return c.json({ error: "No eligible assignments to start an experiment" }, 400);
    }

    const autoApply = body.autoApply ?? true;
    const experimentId = createExperimentId();
    const startedAt = new Date().toISOString();

    let appliedCount = 0;
    if (autoApply) {
      appliedCount = await useCase.applyAssignments(proposal.assignments);
    }

    const trackEvent = new TrackEventUseCase(analyticsRepo);
    await trackEvent.execute({
      eventType: "pricing_experiment_started",
      userId,
      properties: {
        experimentId,
        name: body.name,
        startedAt,
        autoApply,
        appliedCount,
        guardrails: proposal.guardrails,
        assignments: proposal.assignments,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json(
      {
        experiment: {
          experimentId,
          name: body.name,
          status: "running",
          startedAt,
          assignmentsCount: proposal.assignments.length,
          appliedCount,
          autoApply,
          guardrails: proposal.guardrails,
          assignments: proposal.assignments,
          preflight,
        },
      },
      201,
    );
  },
);

pricingExperimentRoutes.post(
  "/pricing-experiments/:id/stop",
  async (c) => {
    const featureError = checkPricingExperimentFeature(c);
    if (featureError) return featureError;

    const experimentId = c.req.param("id");
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const userId = c.get("userId") as string;

    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const useCase = new AgenticPricingExperimentsUseCase(db, storeId, analyticsRepo);
    const experiment = await useCase.getExperimentById(experimentId);

    if (experiment.status === "stopped") {
      return c.json({ error: "Experiment is already stopped" }, 400);
    }

    const restoredCount = await useCase.restoreAssignments(experiment.assignments);
    const stoppedAt = new Date().toISOString();

    const trackEvent = new TrackEventUseCase(analyticsRepo);
    await trackEvent.execute({
      eventType: "pricing_experiment_stopped",
      userId,
      properties: {
        experimentId,
        stoppedAt,
        restoredCount,
        assignmentsCount: experiment.assignments.length,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json(
      {
        success: true,
        experimentId,
        stoppedAt,
        restoredCount,
      },
      200,
    );
  },
);

pricingExperimentRoutes.get(
  "/pricing-experiments/:id/performance",
  zValidator("query", performanceQuerySchema),
  async (c) => {
    const featureError = checkPricingExperimentFeature(c);
    if (featureError) return featureError;

    const experimentId = c.req.param("id");
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const { windowDays } = c.req.valid("query");

    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const useCase = new AgenticPricingExperimentsUseCase(db, storeId, analyticsRepo);
    const performance = await useCase.getPerformance(experimentId, windowDays ?? 14);

    return c.json({ performance }, 200);
  },
);

export { pricingExperimentRoutes };
