import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { ShippingRepository } from "../../infrastructure/repositories/shipping.repository";
import { ManageShippingZonesUseCase } from "../../application/fulfillment/manage-shipping-zones.usecase";
import { CalculateShippingUseCase } from "../../application/fulfillment/calculate-shipping.usecase";
import {
  createZoneSchema,
  updateZoneSchema,
  createRateSchema,
  updateRateSchema,
  calculateShippingSchema,
} from "../../contracts/shipping.contract";
import { NotFoundError, ValidationError } from "../../shared/errors";

const shipping = new Hono<{ Bindings: Env }>();

// All zone/rate management routes require auth (admin)
// The calculate endpoint is public-facing (no auth required)

// ─── GET /shipping/zones — List all shipping zones ───────────────────────────

shipping.get("/shipping/zones", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const repo = new ShippingRepository(db, storeId);
  const useCase = new ManageShippingZonesUseCase(repo);

  const zones = await useCase.listZones();
  return c.json({ zones }, 200);
});

// ─── POST /shipping/zones — Create a shipping zone ──────────────────────────

shipping.post(
  "/shipping/zones",
  requireAuth(),
  zValidator("json", createZoneSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const repo = new ShippingRepository(db, storeId);
    const useCase = new ManageShippingZonesUseCase(repo);

    try {
      const body = c.req.valid("json");
      const zone = await useCase.createZone(body);
      return c.json(zone, 201);
    } catch (err) {
      if (err instanceof ValidationError) {
        return c.json({ error: err.message }, 400);
      }
      throw err;
    }
  },
);

// ─── PATCH /shipping/zones/:id — Update a shipping zone ─────────────────────

shipping.patch(
  "/shipping/zones/:id",
  requireAuth(),
  zValidator("json", updateZoneSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const repo = new ShippingRepository(db, storeId);
    const useCase = new ManageShippingZonesUseCase(repo);

    try {
      const id = c.req.param("id");
      const body = c.req.valid("json");
      const zone = await useCase.updateZone(id, body);
      return c.json(zone, 200);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return c.json({ error: err.message }, 404);
      }
      if (err instanceof ValidationError) {
        return c.json({ error: err.message }, 400);
      }
      throw err;
    }
  },
);

// ─── DELETE /shipping/zones/:id — Delete a shipping zone ─────────────────────

shipping.delete("/shipping/zones/:id", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const repo = new ShippingRepository(db, storeId);
  const useCase = new ManageShippingZonesUseCase(repo);

  try {
    const id = c.req.param("id");
    await useCase.deleteZone(id);
    return c.json({ success: true }, 200);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    throw err;
  }
});

// ─── GET /shipping/zones/:zoneId/rates — List rates for a zone ──────────────

shipping.get("/shipping/zones/:zoneId/rates", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const repo = new ShippingRepository(db, storeId);
  const useCase = new ManageShippingZonesUseCase(repo);

  try {
    const zoneId = c.req.param("zoneId");
    const rates = await useCase.listRates(zoneId);
    return c.json({ rates }, 200);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    throw err;
  }
});

// ─── POST /shipping/zones/:zoneId/rates — Create a rate for a zone ─────────

shipping.post(
  "/shipping/zones/:zoneId/rates",
  requireAuth(),
  zValidator("json", createRateSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const repo = new ShippingRepository(db, storeId);
    const useCase = new ManageShippingZonesUseCase(repo);

    try {
      const zoneId = c.req.param("zoneId");
      const body = c.req.valid("json");
      const rate = await useCase.createRate({ ...body, zoneId });
      return c.json(rate, 201);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return c.json({ error: err.message }, 404);
      }
      if (err instanceof ValidationError) {
        return c.json({ error: err.message }, 400);
      }
      throw err;
    }
  },
);

// ─── PATCH /shipping/zones/:zoneId/rates/:id — Update a rate ────────────────

shipping.patch(
  "/shipping/zones/:zoneId/rates/:id",
  requireAuth(),
  zValidator("json", updateRateSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const repo = new ShippingRepository(db, storeId);
    const useCase = new ManageShippingZonesUseCase(repo);

    try {
      const rateId = c.req.param("id");
      const body = c.req.valid("json");
      const rate = await useCase.updateRate(rateId, body);
      return c.json(rate, 200);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return c.json({ error: err.message }, 404);
      }
      if (err instanceof ValidationError) {
        return c.json({ error: err.message }, 400);
      }
      throw err;
    }
  },
);

// ─── DELETE /shipping/zones/:zoneId/rates/:id — Delete a rate ───────────────

shipping.delete(
  "/shipping/zones/:zoneId/rates/:id",
  requireAuth(),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const repo = new ShippingRepository(db, storeId);
    const useCase = new ManageShippingZonesUseCase(repo);

    try {
      const rateId = c.req.param("id");
      await useCase.deleteRate(rateId);
      return c.json({ success: true }, 200);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return c.json({ error: err.message }, 404);
      }
      throw err;
    }
  },
);

// ─── POST /shipping/calculate — Calculate shipping options ──────────────────

shipping.post(
  "/shipping/calculate",
  zValidator("json", calculateShippingSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const repo = new ShippingRepository(db, storeId);
    const useCase = new CalculateShippingUseCase(repo);

    try {
      const body = c.req.valid("json");
      const result = await useCase.execute({
        items: body.items.map((item) => ({
          ...item,
          weight: item.weight ?? null,
          weightUnit: item.weightUnit ?? null,
        })),
        address: body.address,
        subtotal: body.subtotal,
      });
      return c.json(result, 200);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return c.json({ error: err.message }, 404);
      }
      if (err instanceof ValidationError) {
        return c.json({ error: err.message }, 400);
      }
      throw err;
    }
  },
);

export { shipping as shippingZoneRoutes };
