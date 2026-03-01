import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { createDb } from "../../infrastructure/db/client";
import { PromotionRepository } from "../../infrastructure/repositories/promotion.repository";
import { CreatePromotionUseCase } from "../../application/promotions/create-promotion.usecase";
import { ManageCouponCodesUseCase } from "../../application/promotions/manage-coupon-codes.usecase";
import { ApplyCouponUseCase } from "../../application/promotions/apply-coupon.usecase";
import { ManageCustomerSegmentsUseCase } from "../../application/promotions/manage-customer-segments.usecase";
import { GetPromotionAnalyticsUseCase } from "../../application/promotions/get-promotion-analytics.usecase";
import { AiPromotionCopilotUseCase } from "../../application/promotions/ai-promotion-copilot.usecase";
import { evaluateSegmentRule } from "../../application/promotions/segment-rule-evaluator";
import type { SegmentRule } from "../../domain/promotions/customer-segment.entity";
import { resolveFeatureFlags } from "../../shared/feature-flags";
import {
  createPromotionSchema,
  updatePromotionSchema,
  createCouponCodeSchema,
  applyCouponSchema,
  createSegmentSchema,
  updateSegmentSchema,
} from "../../contracts/promotions.contract";

const promotionRoutes = new Hono<{ Bindings: Env }>();
const promotionCopilotSchema = z.object({
  brief: z.string().min(10).max(1400),
  promotionType: z.enum(["coupon", "automatic", "flash_sale"]),
  objective: z.enum(["aov", "conversion", "acquisition", "clearance", "retention"]).optional(),
  audience: z.string().min(2).max(120).optional(),
});
const promotionCopilotApplySchema = z.object({
  applyPatch: z.object({
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    type: z.enum(["coupon", "automatic", "flash_sale"]),
    strategyType: z.enum([
      "percentage_off",
      "fixed_amount",
      "free_shipping",
      "bogo",
      "buy_x_get_y",
      "tiered",
      "bundle",
    ]),
    strategyParams: z.record(z.unknown()),
    conditions: z.record(z.unknown()),
    priority: z.number().int().min(0).max(100).optional(),
    stackable: z.boolean().optional(),
    usageLimit: z.number().int().positive().nullable().optional(),
    couponCodeSuggestion: z.string().max(40).nullable().optional(),
  }),
  schedule: z.object({
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
  }).optional(),
});

promotionRoutes.use("/*", requireAuth(), requireRole("admin"));

function checkSegmentFeature(c: any) {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags.segment_orchestration) {
    return c.json({ error: "Feature is currently disabled", code: "FEATURE_DISABLED" }, 403);
  }
  return null;
}

function checkPromotionCopilotFeature(c: any) {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags.ai_promotion_copilot) {
    return c.json({ error: "AI promotion copilot is currently disabled", code: "FEATURE_DISABLED" }, 403);
  }
  return null;
}

// POST /api/promotions — create promotion (admin)
promotionRoutes.post(
  "/",
  requireAuth(),
  zValidator("json", createPromotionSchema),
  async (c) => {
    const data = c.req.valid("json");
    const storeId = c.get("storeId");
    const db = createDb(c.env.DATABASE_URL);
    const repo = new PromotionRepository(db, storeId);
    const useCase = new CreatePromotionUseCase(repo);

    const promotion = await useCase.execute(data);
    return c.json({ promotion }, 201);
  },
);

// GET /api/promotions — list promotions (admin)
promotionRoutes.get("/", requireAuth(), async (c) => {
  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new PromotionRepository(db, storeId);

  const promotions = await repo.listAll();
  return c.json({ promotions });
});

// POST /api/promotions/copilot/draft — draft promotion strategy + copy
promotionRoutes.post(
  "/copilot/draft",
  requireAuth(),
  zValidator("json", promotionCopilotSchema),
  async (c) => {
    const featureError = checkPromotionCopilotFeature(c);
    if (featureError) return featureError;

    const body = c.req.valid("json");
    const useCase = new AiPromotionCopilotUseCase(c.env.GEMINI_API_KEY);
    const copilot = await useCase.execute({
      mode: "draft",
      brief: body.brief,
      promotionType: body.promotionType,
      objective: body.objective,
      audience: body.audience,
    });

    return c.json({
      copilot,
      applyPatch: {
        name: copilot.name,
        description: copilot.description,
        type: copilot.type,
        strategyType: copilot.strategyType,
        strategyParams: copilot.strategyParams,
        conditions: copilot.conditions,
        priority: copilot.priority,
        stackable: copilot.stackable,
        usageLimit: copilot.usageLimit,
        couponCodeSuggestion: copilot.couponCodeSuggestion,
      },
    }, 200);
  },
);

// POST /api/promotions/:id/copilot/enrich — enrich existing promotion
promotionRoutes.post(
  "/:id/copilot/enrich",
  requireAuth(),
  zValidator("json", promotionCopilotSchema),
  async (c) => {
    const featureError = checkPromotionCopilotFeature(c);
    if (featureError) return featureError;

    const id = c.req.param("id");
    const body = c.req.valid("json");
    const storeId = c.get("storeId");
    const db = createDb(c.env.DATABASE_URL);
    const repo = new PromotionRepository(db, storeId);
    const existing = await repo.findById(id);
    if (!existing) {
      return c.json({ error: "Promotion not found" }, 404);
    }

    const useCase = new AiPromotionCopilotUseCase(c.env.GEMINI_API_KEY);
    const copilot = await useCase.execute({
      mode: "enrich",
      brief: body.brief,
      promotionType: body.promotionType,
      objective: body.objective,
      audience: body.audience,
      existing: {
        name: existing.name,
        description: existing.description,
        type: existing.type,
        strategyType: existing.strategyType,
        strategyParams: (existing.strategyParams as Record<string, unknown>) ?? {},
        conditions: (existing.conditions as Record<string, unknown>) ?? {},
      },
    });

    return c.json({
      copilot,
      applyPatch: {
        name: copilot.name,
        description: copilot.description,
        type: copilot.type,
        strategyType: copilot.strategyType,
        strategyParams: copilot.strategyParams,
        conditions: copilot.conditions,
        priority: copilot.priority,
        stackable: copilot.stackable,
        usageLimit: copilot.usageLimit,
        couponCodeSuggestion: copilot.couponCodeSuggestion,
      },
    }, 200);
  },
);

// POST /api/promotions/copilot/apply — create promotion directly from copilot patch
promotionRoutes.post(
  "/copilot/apply",
  requireAuth(),
  zValidator("json", promotionCopilotApplySchema),
  async (c) => {
    const featureError = checkPromotionCopilotFeature(c);
    if (featureError) return featureError;

    const body = c.req.valid("json");
    const patch = body.applyPatch;
    const storeId = c.get("storeId");
    const db = createDb(c.env.DATABASE_URL);
    const repo = new PromotionRepository(db, storeId);
    const createUseCase = new CreatePromotionUseCase(repo);
    const couponUseCase = new ManageCouponCodesUseCase(repo);

    const promotion = await createUseCase.execute({
      name: patch.name,
      description: patch.description,
      type: patch.type,
      strategyType: patch.strategyType,
      strategyParams: patch.strategyParams,
      conditions: patch.conditions,
      priority: patch.priority,
      stackable: patch.stackable,
      usageLimit: patch.usageLimit ?? undefined,
      startsAt: body.schedule?.startsAt,
      endsAt: body.schedule?.endsAt,
    });
    if (!promotion) {
      return c.json({ error: "Failed to create promotion" }, 500);
    }

    let coupon: any = null;
    const couponSuggestion = patch.couponCodeSuggestion?.trim();
    if (patch.type === "coupon" && couponSuggestion) {
      try {
        coupon = await couponUseCase.createCode(
          promotion.id,
          couponSuggestion,
          patch.usageLimit ?? undefined,
        );
      } catch {
        // Try one deterministic fallback code if suggestion collides
        const suffix = new Date().getTime().toString().slice(-4);
        const fallback = `${couponSuggestion}-${suffix}`.slice(0, 40);
        coupon = await couponUseCase.createCode(
          promotion.id,
          fallback,
          patch.usageLimit ?? undefined,
        );
      }
    }

    return c.json({ promotion, coupon }, 201);
  },
);

// GET /api/promotions/analytics — promotion analytics (admin)
promotionRoutes.get("/analytics", requireAuth(), async (c) => {
  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new PromotionRepository(db, storeId);
  const useCase = new GetPromotionAnalyticsUseCase(repo);

  const analytics = await useCase.execute();
  return c.json({ analytics });
});

// GET /api/promotions/segments — list segments (admin)
promotionRoutes.get("/segments", requireAuth(), async (c) => {
  const featureError = checkSegmentFeature(c);
  if (featureError) return featureError;

  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new PromotionRepository(db, storeId);
  const useCase = new ManageCustomerSegmentsUseCase(repo);

  const segments = await useCase.listSegments();
  return c.json({ segments });
});

// POST /api/promotions/segments — create segment (admin)
promotionRoutes.post(
  "/segments",
  requireAuth(),
  zValidator("json", createSegmentSchema),
  async (c) => {
    const featureError = checkSegmentFeature(c);
    if (featureError) return featureError;

    const data = c.req.valid("json");
    const storeId = c.get("storeId");
    const db = createDb(c.env.DATABASE_URL);
    const repo = new PromotionRepository(db, storeId);
    const useCase = new ManageCustomerSegmentsUseCase(repo);

    const segment = await useCase.createSegment(data);
    return c.json({ segment }, 201);
  },
);

// PATCH /api/promotions/segments/:id — update segment (admin)
promotionRoutes.patch(
  "/segments/:id",
  requireAuth(),
  zValidator("json", updateSegmentSchema),
  async (c) => {
    const featureError = checkSegmentFeature(c);
    if (featureError) return featureError;

    const id = c.req.param("id");
    const data = c.req.valid("json");
    const storeId = c.get("storeId");
    const db = createDb(c.env.DATABASE_URL);
    const repo = new PromotionRepository(db, storeId);
    const useCase = new ManageCustomerSegmentsUseCase(repo);

    const segment = await useCase.updateSegment(id, data);
    if (!segment) {
      return c.json({ error: "Segment not found" }, 404);
    }
    return c.json({ segment });
  },
);

// POST /api/promotions/segments/:id/refresh — refresh segment memberships (admin)
promotionRoutes.post(
  "/segments/:id/refresh",
  requireAuth(),
  async (c) => {
    const featureError = checkSegmentFeature(c);
    if (featureError) return featureError;

    const id = c.req.param("id");
    const storeId = c.get("storeId");
    const db = createDb(c.env.DATABASE_URL);
    const repo = new PromotionRepository(db, storeId);

    const segment = await repo.findSegmentById(id);
    if (!segment) {
      return c.json({ error: "Segment not found" }, 404);
    }

    const rules = segment.rules as SegmentRule;
    if (!rules || typeof rules !== "object" || !("type" in rules)) {
      return c.json({ error: "Segment has invalid rule configuration" }, 400);
    }

    const customerIds = await evaluateSegmentRule(db, storeId, rules);
    const refreshed = await repo.refreshSegmentMemberships(id, customerIds);
    if (!refreshed) {
      return c.json({ error: "Segment not found" }, 404);
    }

    return c.json({ segment: refreshed, memberCount: customerIds.length }, 200);
  },
);

// PATCH /api/promotions/:id — update promotion (admin)
promotionRoutes.patch(
  "/:id",
  requireAuth(),
  zValidator("json", updatePromotionSchema),
  async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const storeId = c.get("storeId");
    const db = createDb(c.env.DATABASE_URL);
    const repo = new PromotionRepository(db, storeId);

    const promotion = await repo.update(id, {
      ...data,
      startsAt: data.startsAt !== undefined ? (data.startsAt ? new Date(data.startsAt) : null) : undefined,
      endsAt: data.endsAt !== undefined ? (data.endsAt ? new Date(data.endsAt) : null) : undefined,
    });

    if (!promotion) {
      return c.json({ error: "Promotion not found" }, 404);
    }

    return c.json({ promotion });
  },
);

// DELETE /api/promotions/:id — disable promotion (admin)
promotionRoutes.delete("/:id", requireAuth(), async (c) => {
  const id = c.req.param("id");
  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new PromotionRepository(db, storeId);

  const promotion = await repo.update(id, { status: "disabled" });
  if (!promotion) {
    return c.json({ error: "Promotion not found" }, 404);
  }

  return c.json({ promotion });
});

// POST /api/promotions/:id/codes — create coupon code (admin)
promotionRoutes.post(
  "/:id/codes",
  requireAuth(),
  zValidator("json", createCouponCodeSchema),
  async (c) => {
    const promotionId = c.req.param("id");
    const { code, maxRedemptions } = c.req.valid("json");
    const storeId = c.get("storeId");
    const db = createDb(c.env.DATABASE_URL);
    const repo = new PromotionRepository(db, storeId);
    const useCase = new ManageCouponCodesUseCase(repo);

    const coupon = await useCase.createCode(promotionId, code, maxRedemptions);
    return c.json({ coupon }, 201);
  },
);

export default promotionRoutes;
