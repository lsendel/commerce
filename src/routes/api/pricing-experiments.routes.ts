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
  "/pricing-experiments/start",
  zValidator("json", startSchema),
  async (c) => {
    const featureError = checkPricingExperimentFeature(c);
    if (featureError) return featureError;

    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const userId = c.get("userId") as string;
    const body = c.req.valid("json");

    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const useCase = new AgenticPricingExperimentsUseCase(db, storeId, analyticsRepo);
    const proposal = await useCase.propose(body);

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
