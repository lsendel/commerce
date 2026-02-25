import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { BookingRepository } from "../../infrastructure/repositories/booking.repository";
import { ProductRepository } from "../../infrastructure/repositories/product.repository";
import { CreateAvailabilityUseCase } from "../../application/booking/create-availability.usecase";
import { ListAvailabilityUseCase } from "../../application/booking/list-availability.usecase";
import { CreateBookingRequestUseCase } from "../../application/booking/create-booking-request.usecase";
import { CheckInUseCase } from "../../application/booking/check-in.usecase";
import { CancelBookingUseCase } from "../../application/booking/cancel-booking.usecase";
import {
  createAvailabilitySchema,
  bulkCreateAvailabilitySchema,
  availabilityFilterSchema,
  createBookingRequestSchema,
  paginationSchema,
} from "../../shared/validators";
import { requireAuth } from "../../middleware/auth.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";

const bookings = new Hono<{ Bindings: Env }>();

// Rate limit booking request creation
bookings.use("/request", rateLimit({ windowMs: 60_000, max: 10 }));

// ─── GET /bookings/availability ─────────────────────────────────────────────
// List availability slots (public)
bookings.get(
  "/availability",
  zValidator("query", availabilityFilterSchema.merge(paginationSchema)),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const bookingRepo = new BookingRepository(db);
    const useCase = new ListAvailabilityUseCase(bookingRepo);

    const query = c.req.valid("query");
    const result = await useCase.execute({
      productId: query.productId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    return c.json(result, 200);
  },
);

// ─── POST /bookings/availability ────────────────────────────────────────────
// Create a single availability slot (admin, requireAuth)
bookings.post(
  "/availability",
  requireAuth(),
  zValidator("json", createAvailabilitySchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const bookingRepo = new BookingRepository(db);
    const productRepo = new ProductRepository(db);
    const useCase = new CreateAvailabilityUseCase(bookingRepo, productRepo);

    const body = c.req.valid("json");
    const slot = await useCase.execute(body);

    return c.json(slot, 201);
  },
);

// ─── POST /bookings/availability/bulk ───────────────────────────────────────
// Bulk create availability slots (admin, requireAuth)
bookings.post(
  "/availability/bulk",
  requireAuth(),
  zValidator("json", bulkCreateAvailabilitySchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const bookingRepo = new BookingRepository(db);
    const productRepo = new ProductRepository(db);
    const useCase = new CreateAvailabilityUseCase(bookingRepo, productRepo);

    const body = c.req.valid("json");
    const result = await useCase.executeBulk(body);

    return c.json(result, 201);
  },
);

// ─── GET /bookings ──────────────────────────────────────────────────────────
// List user bookings (requireAuth)
bookings.get(
  "/",
  requireAuth(),
  zValidator("query", paginationSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const bookingRepo = new BookingRepository(db);

    const userId = c.get("userId");
    const query = c.req.valid("query");

    const result = await bookingRepo.findBookingsByUserId(userId, {
      page: query.page,
      limit: query.limit,
    });

    return c.json(result, 200);
  },
);

// ─── POST /bookings/request ─────────────────────────────────────────────────
// Create a booking request (requireAuth)
bookings.post(
  "/request",
  requireAuth(),
  zValidator("json", createBookingRequestSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const bookingRepo = new BookingRepository(db);
    const useCase = new CreateBookingRequestUseCase(bookingRepo);

    const userId = c.get("userId");
    const body = c.req.valid("json");

    const result = await useCase.execute({
      availabilityId: body.availabilityId,
      userId,
      personTypeQuantities: body.personTypeQuantities,
    });

    return c.json(result, 201);
  },
);

// ─── POST /bookings/:id/check-in ───────────────────────────────────────────
// Check in a booking (admin, requireAuth)
bookings.post(
  "/:id/check-in",
  requireAuth(),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const bookingRepo = new BookingRepository(db);
    const useCase = new CheckInUseCase(bookingRepo);

    const bookingId = c.req.param("id");
    const result = await useCase.execute(bookingId);

    return c.json(result, 200);
  },
);

// ─── POST /bookings/:id/cancel ──────────────────────────────────────────────
// Cancel a booking (requireAuth)
bookings.post(
  "/:id/cancel",
  requireAuth(),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const bookingRepo = new BookingRepository(db);
    const useCase = new CancelBookingUseCase(bookingRepo);

    const bookingId = c.req.param("id");
    const userId = c.get("userId");

    const result = await useCase.execute(bookingId, userId);

    return c.json(result, 200);
  },
);

export { bookings as bookingRoutes };
