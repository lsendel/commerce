import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  availabilityFilterSchema,
  createAvailabilitySchema,
  bulkCreateAvailabilitySchema,
  createBookingRequestSchema,
  paginationSchema,
  idParamSchema,
} from "../shared/validators";

const c = initContract();

const availabilityPriceSchema = z.object({
  personType: z.enum(["adult", "child", "pet"]),
  price: z.number(),
});

const availabilitySchema = z.object({
  id: z.string(),
  productId: z.string(),
  slotDate: z.string(),
  slotTime: z.string(),
  totalCapacity: z.number(),
  bookedCount: z.number(),
  status: z.enum([
    "available",
    "full",
    "in_progress",
    "completed",
    "closed",
    "canceled",
  ]),
  prices: z.array(availabilityPriceSchema),
});

const bookingSchema = z.object({
  id: z.string(),
  userId: z.string(),
  availabilityId: z.string(),
  status: z.enum([
    "pending",
    "confirmed",
    "checked_in",
    "completed",
    "canceled",
    "no_show",
  ]),
  personTypeQuantities: z.record(z.string(), z.number()),
  totalPrice: z.number(),
  availability: z.object({
    slotDate: z.string(),
    slotTime: z.string(),
    product: z.object({
      name: z.string(),
      slug: z.string(),
      featuredImageUrl: z.string().nullable(),
    }),
  }),
  createdAt: z.string(),
});

export const bookingsContract = c.router({
  listAvailability: {
    method: "GET",
    path: "/api/bookings/availability",
    query: availabilityFilterSchema.merge(paginationSchema),
    responses: {
      200: z.object({
        slots: z.array(availabilitySchema),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      }),
    },
  },
  createAvailability: {
    method: "POST",
    path: "/api/bookings/availability",
    body: createAvailabilitySchema,
    responses: {
      201: availabilitySchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: z.object({ error: z.string() }),
    },
  },
  bulkCreateAvailability: {
    method: "POST",
    path: "/api/bookings/availability/bulk",
    body: bulkCreateAvailabilitySchema,
    responses: {
      201: z.object({
        created: z.number(),
        slots: z.array(availabilitySchema),
      }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: z.object({ error: z.string() }),
    },
  },
  list: {
    method: "GET",
    path: "/api/bookings",
    query: paginationSchema,
    responses: {
      200: z.object({
        bookings: z.array(bookingSchema),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      }),
      401: z.object({ error: z.string() }),
    },
  },
  request: {
    method: "POST",
    path: "/api/bookings/request",
    body: createBookingRequestSchema,
    responses: {
      201: bookingSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
      409: z.object({ error: z.string() }),
    },
  },
  checkIn: {
    method: "POST",
    path: "/api/bookings/:id/check-in",
    pathParams: idParamSchema,
    body: z.object({}),
    responses: {
      200: bookingSchema,
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
      409: z.object({ error: z.string() }),
    },
  },
  cancel: {
    method: "POST",
    path: "/api/bookings/:id/cancel",
    pathParams: idParamSchema,
    body: z.object({}),
    responses: {
      200: bookingSchema,
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
      409: z.object({ error: z.string() }),
    },
  },
});
