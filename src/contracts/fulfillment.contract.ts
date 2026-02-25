import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { syncCatalogSchema } from "../shared/validators";

const c = initContract();

const shipmentSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  carrier: z.string(),
  trackingNumber: z.string().nullable(),
  trackingUrl: z.string().nullable(),
  status: z.enum([
    "pending",
    "in_transit",
    "delivered",
    "returned",
    "failed",
  ]),
  estimatedDelivery: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const mockupSchema = z.object({
  id: z.string(),
  productId: z.string(),
  imageUrl: z.string(),
  variantIds: z.array(z.string()),
  createdAt: z.string(),
});

export const fulfillmentContract = c.router({
  syncCatalog: {
    method: "POST",
    path: "/api/fulfillment/sync",
    body: syncCatalogSchema,
    responses: {
      200: z.object({
        synced: z.number(),
        created: z.number(),
        updated: z.number(),
      }),
      401: z.object({ error: z.string() }),
      403: z.object({ error: z.string() }),
    },
  },
  listShipments: {
    method: "GET",
    path: "/api/fulfillment/shipments",
    query: z.object({
      orderId: z.string().uuid(),
    }),
    responses: {
      200: z.object({
        shipments: z.array(shipmentSchema),
      }),
      401: z.object({ error: z.string() }),
    },
  },
  generateMockup: {
    method: "POST",
    path: "/api/fulfillment/mockup",
    body: z.object({
      productId: z.string().uuid(),
      imageUrl: z.string().url(),
      variantIds: z.array(z.string().uuid()).optional(),
    }),
    responses: {
      201: mockupSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: z.object({ error: z.string() }),
    },
  },
});
