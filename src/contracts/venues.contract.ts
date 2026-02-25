import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const createVenueSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  address: z.string().min(3),
  city: z.string().min(1),
  state: z.string().optional(),
  country: z.string().length(2),
  postalCode: z.string().min(3),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  photos: z.array(z.string().url()).optional(),
  capacity: z.number().int().positive().optional(),
  description: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

export const updateVenueSchema = createVenueSchema.partial();

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  r: z.coerce.number().min(0.1).max(500).default(50),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const venuesContract = c.router({
  create: {
    method: "POST",
    path: "/api/venues",
    body: createVenueSchema,
    responses: { 201: c.type<{ venue: any }>() },
  },
  list: {
    method: "GET",
    path: "/api/venues",
    query: z.object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
    }),
    responses: { 200: c.type<{ venues: any[] }>() },
  },
  get: {
    method: "GET",
    path: "/api/venues/:id",
    responses: { 200: c.type<{ venue: any }>() },
  },
  update: {
    method: "PATCH",
    path: "/api/venues/:id",
    body: updateVenueSchema,
    responses: { 200: c.type<{ venue: any }>() },
  },
  delete: {
    method: "DELETE",
    path: "/api/venues/:id",
    body: z.object({}),
    responses: { 204: c.type<void>() },
  },
  nearby: {
    method: "GET",
    path: "/api/venues/nearby",
    query: nearbyQuerySchema,
    responses: { 200: c.type<{ venues: any[] }>() },
  },
  eventsNearby: {
    method: "GET",
    path: "/api/events/nearby",
    query: nearbyQuerySchema,
    responses: { 200: c.type<{ events: any[] }>() },
  },
});
