import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
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
import {
  createPromotionSchema,
  updatePromotionSchema,
  createCouponCodeSchema,
  applyCouponSchema,
  createSegmentSchema,
  updateSegmentSchema,
} from "../../contracts/promotions.contract";

const promotionRoutes = new Hono<{ Bindings: Env }>();

promotionRoutes.use("/*", requireAuth(), requireRole("admin"));

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
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const storeId = c.get("storeId");
    const db = createDb(c.env.DATABASE_URL);
    const repo = new PromotionRepository(db, storeId);
    const useCase = new ManageCustomerSegmentsUseCase(repo);

    const segment = await useCase.updateSegment(id, data);
    return c.json({ segment });
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
