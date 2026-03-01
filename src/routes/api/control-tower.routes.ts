import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { ExecutiveControlTowerUseCase } from "../../application/analytics/executive-control-tower.usecase";
import { requireAuth } from "../../middleware/auth.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";
import { resolveFeatureFlags } from "../../shared/feature-flags";

const controlTowerRoutes = new Hono<{ Bindings: Env }>();

const summaryQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function checkControlTowerFeature(c: any) {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags.executive_control_tower) {
    return c.json(
      {
        error: "Executive control tower is currently disabled",
        code: "FEATURE_DISABLED",
      },
      403,
    );
  }
  return null;
}

controlTowerRoutes.use("/control-tower/*", requireAuth());
controlTowerRoutes.use(
  "/control-tower/summary",
  rateLimit({ windowMs: 60_000, max: 80 }),
);

controlTowerRoutes.get(
  "/control-tower/summary",
  zValidator("query", summaryQuerySchema),
  async (c) => {
    const featureError = checkControlTowerFeature(c);
    if (featureError) return featureError;

    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);

    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const defaultTo = now.toISOString().slice(0, 10);

    const query = c.req.valid("query");
    const from = query.from ?? defaultFrom;
    const to = query.to ?? defaultTo;
    const dateFrom = from <= to ? from : to;
    const dateTo = from <= to ? to : from;

    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const useCase = new ExecutiveControlTowerUseCase(db, storeId, analyticsRepo);

    const summary = await useCase.execute({
      dateFrom,
      dateTo,
      featureFlags: flags,
    });

    return c.json({ summary }, 200);
  },
);

export { controlTowerRoutes };
