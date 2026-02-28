import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { ManageTaxZonesUseCase } from "../../application/tax/manage-tax-zones.usecase";
import { CalculateTaxUseCase } from "../../application/tax/calculate-tax.usecase";
import {
  createTaxZoneSchema,
  updateTaxZoneSchema,
  createTaxRateSchema,
  updateTaxRateSchema,
  calculateTaxSchema,
} from "../../contracts/tax.contract";

const taxRoutes = new Hono<{ Bindings: Env }>();

taxRoutes.use("/*", requireAuth(), requireRole("admin"));

// ─── GET /zones — List all tax zones ──────────────────────────

taxRoutes.get("/zones", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;

  const useCase = new ManageTaxZonesUseCase();
  const zones = await useCase.listZones({ db, storeId });

  return c.json({
    zones: zones.map((z) => ({
      ...z,
      createdAt: z.createdAt.toISOString(),
    })),
  });
});

// ─── POST /zones — Create a tax zone ──────────────────────────

taxRoutes.post(
  "/zones",
  requireAuth(),
  zValidator("json", createTaxZoneSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const body = c.req.valid("json");

    const useCase = new ManageTaxZonesUseCase();
    const zone = await useCase.createZone({ db, storeId, ...body });

    return c.json(
      {
        ...zone,
        createdAt: zone.createdAt.toISOString(),
      },
      201,
    );
  },
);

// ─── PUT /zones/:id — Update a tax zone ───────────────────────

taxRoutes.put(
  "/zones/:id",
  requireAuth(),
  zValidator("json", updateTaxZoneSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const zoneId = c.req.param("id");
    const body = c.req.valid("json");

    const useCase = new ManageTaxZonesUseCase();
    const zone = await useCase.updateZone({ db, storeId, zoneId, ...body });

    return c.json({
      ...zone,
      createdAt: zone.createdAt.toISOString(),
    });
  },
);

// ─── DELETE /zones/:id — Delete a tax zone ────────────────────

taxRoutes.delete("/zones/:id", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const zoneId = c.req.param("id");

  const useCase = new ManageTaxZonesUseCase();
  await useCase.deleteZone({ db, storeId, zoneId });

  return c.json({ ok: true });
});

// ─── GET /zones/:id/rates — List rates for a zone ─────────────

taxRoutes.get("/zones/:id/rates", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const zoneId = c.req.param("id");

  const useCase = new ManageTaxZonesUseCase();
  const rates = await useCase.listRates({ db, storeId, zoneId });

  return c.json({
    rates: rates.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

// ─── POST /zones/:id/rates — Create a rate in a zone ──────────

taxRoutes.post(
  "/zones/:id/rates",
  requireAuth(),
  zValidator("json", createTaxRateSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const zoneId = c.req.param("id");
    const body = c.req.valid("json");

    const useCase = new ManageTaxZonesUseCase();
    const rate = await useCase.createRate({ db, storeId, zoneId, ...body });

    return c.json(
      {
        ...rate,
        createdAt: rate.createdAt.toISOString(),
      },
      201,
    );
  },
);

// ─── PATCH /zones/:id/rates/:rateId — Update a rate in a zone ─────────────

taxRoutes.patch(
  "/zones/:id/rates/:rateId",
  requireAuth(),
  zValidator("json", updateTaxRateSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const rateId = c.req.param("rateId");
    const body = c.req.valid("json");

    const useCase = new ManageTaxZonesUseCase();
    const rate = await useCase.updateRate({ db, storeId, rateId, ...body });

    return c.json(
      {
        ...rate,
        createdAt: rate.createdAt.toISOString(),
      },
      200,
    );
  },
);

// ─── DELETE /zones/:id/rates/:rateId — Delete a rate ──────────

taxRoutes.delete("/zones/:id/rates/:rateId", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const rateId = c.req.param("rateId");

  const useCase = new ManageTaxZonesUseCase();
  await useCase.deleteRate({ db, storeId, rateId });

  return c.json({ ok: true });
});

// ─── POST /calculate — Calculate tax for items ────────────────

taxRoutes.post(
  "/calculate",
  requireAuth(),
  zValidator("json", calculateTaxSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const body = c.req.valid("json");

    const useCase = new CalculateTaxUseCase();
    const result = await useCase.execute({
      db,
      storeId,
      lineItems: body.lineItems,
      shippingAmount: body.shippingAmount,
      address: body.address,
    });

    return c.json(result);
  },
);

export { taxRoutes };
