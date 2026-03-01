import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const shippingRateTypeSchema = z.enum([
  "flat",
  "weight_based",
  "price_based",
  "carrier_calculated",
]);

const shippingZoneSchema = z.object({
  id: z.string(),
  storeId: z.string(),
  name: z.string(),
  countries: z.array(z.string()),
  regions: z.array(z.string()),
  postalCodes: z.array(z.string()),
  isRestOfWorld: z.boolean(),
  isActive: z.boolean(),
  position: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const shippingRateSchema = z.object({
  id: z.string(),
  zoneId: z.string(),
  name: z.string(),
  type: shippingRateTypeSchema,
  price: z.string().nullable(),
  minWeight: z.string().nullable(),
  maxWeight: z.string().nullable(),
  minOrderTotal: z.string().nullable(),
  maxOrderTotal: z.string().nullable(),
  estimatedDaysMin: z.number().nullable(),
  estimatedDaysMax: z.number().nullable(),
  carrierAccountId: z.string().nullable(),
  isActive: z.boolean(),
  position: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const shippingOptionSchema = z.object({
  rateId: z.string(),
  name: z.string(),
  price: z.number().nullable(),
  estimatedDaysMin: z.number().nullable(),
  estimatedDaysMax: z.number().nullable(),
  type: z.enum([
    "flat",
    "weight_based",
    "price_based",
    "carrier_calculated",
    "carrier_fallback",
  ]),
  fallbackRateId: z.string().optional(),
  fallbackReason: z.string().optional(),
});

const createZoneSchema = z.object({
  name: z.string().min(1).max(200),
  countries: z.array(z.string().length(2)).optional(),
  regions: z.array(z.string()).optional(),
  postalCodes: z.array(z.string()).optional(),
  isRestOfWorld: z.boolean().optional(),
  isActive: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

const updateZoneSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  countries: z.array(z.string().length(2)).optional(),
  regions: z.array(z.string()).optional(),
  postalCodes: z.array(z.string()).optional(),
  isRestOfWorld: z.boolean().optional(),
  isActive: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

const createRateSchema = z.object({
  name: z.string().min(1).max(200),
  type: shippingRateTypeSchema,
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  minWeight: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  maxWeight: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  minOrderTotal: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  maxOrderTotal: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  estimatedDaysMin: z.number().int().min(0).optional(),
  estimatedDaysMax: z.number().int().min(0).optional(),
  carrierAccountId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

const updateRateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: shippingRateTypeSchema.optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  minWeight: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  maxWeight: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  minOrderTotal: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  maxOrderTotal: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  estimatedDaysMin: z.number().int().min(0).optional(),
  estimatedDaysMax: z.number().int().min(0).optional(),
  carrierAccountId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

const calculateShippingSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().min(1),
        price: z.number().min(0),
        weight: z.number().nullable().optional(),
        weightUnit: z.string().nullable().optional(),
      }),
    )
    .min(1),
  address: z.object({
    country: z.string().length(2),
    state: z.string().optional(),
    postalCode: z.string().optional(),
  }),
  subtotal: z.number().min(0),
});

export const shippingContract = c.router({
  // ─── Zones ─────────────────────────────────────────────────────────
  listZones: {
    method: "GET",
    path: "/api/shipping/zones",
    responses: {
      200: z.object({ zones: z.array(shippingZoneSchema) }),
      401: z.object({ error: z.string() }),
    },
  },
  createZone: {
    method: "POST",
    path: "/api/shipping/zones",
    body: createZoneSchema,
    responses: {
      201: shippingZoneSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
    },
  },
  updateZone: {
    method: "PATCH",
    path: "/api/shipping/zones/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    body: updateZoneSchema,
    responses: {
      200: shippingZoneSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
  deleteZone: {
    method: "DELETE",
    path: "/api/shipping/zones/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.object({}),
    responses: {
      200: z.object({ success: z.boolean() }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },

  // ─── Rates ─────────────────────────────────────────────────────────
  listRates: {
    method: "GET",
    path: "/api/shipping/zones/:zoneId/rates",
    pathParams: z.object({ zoneId: z.string().uuid() }),
    responses: {
      200: z.object({ rates: z.array(shippingRateSchema) }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
  createRate: {
    method: "POST",
    path: "/api/shipping/zones/:zoneId/rates",
    pathParams: z.object({ zoneId: z.string().uuid() }),
    body: createRateSchema,
    responses: {
      201: shippingRateSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
  updateRate: {
    method: "PATCH",
    path: "/api/shipping/zones/:zoneId/rates/:id",
    pathParams: z.object({
      zoneId: z.string().uuid(),
      id: z.string().uuid(),
    }),
    body: updateRateSchema,
    responses: {
      200: shippingRateSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
  deleteRate: {
    method: "DELETE",
    path: "/api/shipping/zones/:zoneId/rates/:id",
    pathParams: z.object({
      zoneId: z.string().uuid(),
      id: z.string().uuid(),
    }),
    body: z.object({}),
    responses: {
      200: z.object({ success: z.boolean() }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },

  // ─── Calculate ─────────────────────────────────────────────────────
  calculate: {
    method: "POST",
    path: "/api/shipping/calculate",
    body: calculateShippingSchema,
    responses: {
      200: z.object({
        zoneId: z.string(),
        zoneName: z.string(),
        options: z.array(shippingOptionSchema),
      }),
      400: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
});

export {
  createZoneSchema,
  updateZoneSchema,
  createRateSchema,
  updateRateSchema,
  calculateShippingSchema,
};
