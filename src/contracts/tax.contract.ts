import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { idParamSchema } from "../shared/validators";

const c = initContract();

const taxZoneSchema = z.object({
  id: z.string(),
  storeId: z.string(),
  name: z.string(),
  countries: z.array(z.string()),
  regions: z.array(z.string()),
  postalCodes: z.array(z.string()),
  priority: z.number(),
  createdAt: z.string(),
});

const taxRateSchema = z.object({
  id: z.string(),
  taxZoneId: z.string(),
  name: z.string(),
  rate: z.number(),
  type: z.enum(["sales_tax", "vat", "gst"]),
  appliesTo: z.enum(["all", "physical", "digital", "shipping"]),
  compound: z.boolean(),
  createdAt: z.string(),
});

const taxBreakdownSchema = z.object({
  totalTax: z.number(),
  lines: z.array(
    z.object({
      itemId: z.string(),
      taxAmount: z.number(),
      rate: z.number(),
      taxType: z.string(),
    }),
  ),
});

export const createTaxZoneSchema = z.object({
  name: z.string().min(1),
  countries: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  postalCodes: z.array(z.string()).optional(),
  priority: z.number().int().min(0).optional(),
});

export const updateTaxZoneSchema = z.object({
  name: z.string().min(1).optional(),
  countries: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  postalCodes: z.array(z.string()).optional(),
  priority: z.number().int().min(0).optional(),
});

export const createTaxRateSchema = z.object({
  name: z.string().min(1),
  rate: z.number().min(0),
  type: z.enum(["sales_tax", "vat", "gst"]).optional(),
  appliesTo: z.enum(["all", "physical", "digital", "shipping"]).optional(),
  compound: z.boolean().optional(),
});

export const updateTaxRateSchema = createTaxRateSchema.partial();

export const calculateTaxSchema = z.object({
  lineItems: z.array(
    z.object({
      id: z.string(),
      amount: z.number().min(0),
      productType: z.string(),
    }),
  ),
  shippingAmount: z.number().min(0),
  address: z.object({
    country: z.string().length(2),
    state: z.string().optional(),
    zip: z.string().min(1),
  }),
});

export const taxContract = c.router({
  // Zone CRUD
  listZones: {
    method: "GET",
    path: "/api/tax/zones",
    responses: {
      200: z.object({ zones: z.array(taxZoneSchema) }),
      401: z.object({ error: z.string() }),
    },
  },
  createZone: {
    method: "POST",
    path: "/api/tax/zones",
    body: createTaxZoneSchema,
    responses: {
      201: taxZoneSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
    },
  },
  updateZone: {
    method: "PUT",
    path: "/api/tax/zones/:id",
    pathParams: idParamSchema,
    body: updateTaxZoneSchema,
    responses: {
      200: taxZoneSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
  deleteZone: {
    method: "DELETE",
    path: "/api/tax/zones/:id",
    pathParams: idParamSchema,
    body: z.object({}),
    responses: {
      200: z.object({ ok: z.boolean() }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
  // Rate CRUD
  listRates: {
    method: "GET",
    path: "/api/tax/zones/:id/rates",
    pathParams: idParamSchema,
    responses: {
      200: z.object({ rates: z.array(taxRateSchema) }),
      401: z.object({ error: z.string() }),
    },
  },
  createRate: {
    method: "POST",
    path: "/api/tax/zones/:id/rates",
    pathParams: idParamSchema,
    body: createTaxRateSchema,
    responses: {
      201: taxRateSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
    },
  },
  updateRate: {
    method: "PATCH",
    path: "/api/tax/zones/:id/rates/:rateId",
    pathParams: z.object({
      id: z.string().uuid(),
      rateId: z.string().uuid(),
    }),
    body: updateTaxRateSchema,
    responses: {
      200: taxRateSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
  deleteRate: {
    method: "DELETE",
    path: "/api/tax/zones/:id/rates/:rateId",
    pathParams: z.object({
      id: z.string().uuid(),
      rateId: z.string().uuid(),
    }),
    body: z.object({}),
    responses: {
      200: z.object({ ok: z.boolean() }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
  // Tax calculation
  calculate: {
    method: "POST",
    path: "/api/tax/calculate",
    body: calculateTaxSchema,
    responses: {
      200: taxBreakdownSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
    },
  },
});
