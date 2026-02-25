import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../env";
import { requireAuth } from "../../middleware/auth.middleware";
import { createDb } from "../../infrastructure/db/client";
import { VenueRepository } from "../../infrastructure/repositories/venue.repository";
import {
  createVenueSchema,
  updateVenueSchema,
  nearbyQuerySchema,
} from "../../contracts/venues.contract";

const venueRoutes = new Hono<{ Bindings: Env }>();

// Geosearch — must be before /:id to avoid route conflict
venueRoutes.get("/nearby", async (c) => {
  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new VenueRepository(db, storeId);

  const lat = Number(c.req.query("lat"));
  const lng = Number(c.req.query("lng"));
  const r = Number(c.req.query("r") ?? "50");
  const limit = Number(c.req.query("limit") ?? "20");

  if (isNaN(lat) || isNaN(lng)) {
    return c.json({ error: "lat and lng are required" }, 400);
  }

  const venues = await repo.findNearby(lat, lng, r, limit);
  return c.json({ venues });
});

// Create venue
venueRoutes.post(
  "/",
  requireAuth(),
  zValidator("json", createVenueSchema),
  async (c) => {
    const data = c.req.valid("json");
    const storeId = c.get("storeId");
    const db = createDb(c.env.DATABASE_URL);
    const repo = new VenueRepository(db, storeId);
    const venue = await repo.create(data);
    return c.json({ venue }, 201);
  },
);

// List venues
venueRoutes.get("/", async (c) => {
  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new VenueRepository(db, storeId);
  const page = Number(c.req.query("page") ?? "1");
  const limit = Number(c.req.query("limit") ?? "20");
  const venues = await repo.findAll(page, limit);
  return c.json({ venues });
});

// Get venue
venueRoutes.get("/:id", async (c) => {
  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new VenueRepository(db, storeId);
  const venue = await repo.findById(c.req.param("id"));
  if (!venue) return c.json({ error: "Venue not found" }, 404);
  return c.json({ venue });
});

// Update venue
venueRoutes.patch(
  "/:id",
  requireAuth(),
  zValidator("json", updateVenueSchema),
  async (c) => {
    const data = c.req.valid("json");
    const storeId = c.get("storeId");
    const db = createDb(c.env.DATABASE_URL);
    const repo = new VenueRepository(db, storeId);
    const venue = await repo.update(c.req.param("id"), data);
    if (!venue) return c.json({ error: "Venue not found" }, 404);
    return c.json({ venue });
  },
);

// Delete venue
venueRoutes.delete("/:id", requireAuth(), async (c) => {
  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new VenueRepository(db, storeId);
  await repo.delete(c.req.param("id"));
  return c.body(null, 204);
});

export default venueRoutes;
