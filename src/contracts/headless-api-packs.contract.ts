import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const featureDisabledSchema = z.object({
  error: z.string(),
  code: z.literal("FEATURE_DISABLED"),
});

const headlessPackSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  keyPrefix: z.string(),
  scopes: z.array(z.enum(["catalog:read", "products:read", "collections:read"])),
  status: z.enum(["active", "revoked"]),
  rateLimitPerMinute: z.number(),
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  revokedAt: z.string().nullable(),
});

const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  type: z.enum(["physical", "digital", "subscription", "bookable"]).optional(),
  collection: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  available: z.coerce.boolean().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "name"]).optional(),
});

const headlessChannelSchema = z.object({
  packId: z.string(),
  keyPrefix: z.string(),
  storeId: z.string(),
});

export const headlessApiPacksContract = c.router({
  listAdminPacks: {
    method: "GET",
    path: "/api/admin/headless/packs",
    query: z.object({
      limit: z.coerce.number().int().min(1).max(200).optional(),
    }),
    responses: {
      200: z.object({ packs: z.array(headlessPackSchema) }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  createAdminPack: {
    method: "POST",
    path: "/api/admin/headless/packs",
    body: z.object({
      name: z.string().min(2).max(120),
      description: z.string().max(500).optional(),
      scopes: z.array(z.enum(["catalog:read", "products:read", "collections:read"])).optional(),
      rateLimitPerMinute: z.number().int().min(10).max(10_000).optional(),
    }),
    responses: {
      201: z.object({
        pack: headlessPackSchema,
        apiKey: z.string(),
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  revokeAdminPack: {
    method: "POST",
    path: "/api/admin/headless/packs/:id/revoke",
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.object({}).optional(),
    responses: {
      200: z.object({ pack: headlessPackSchema }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: z.object({ error: z.string() }),
    },
  },
  listHeadlessProducts: {
    method: "GET",
    path: "/api/headless/catalog/products",
    query: listProductsQuerySchema,
    responses: {
      200: z.object({
        products: z.array(z.unknown()),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
        channel: headlessChannelSchema,
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  getHeadlessProduct: {
    method: "GET",
    path: "/api/headless/catalog/products/:slug",
    responses: {
      200: z.object({
        product: z.unknown(),
        channel: headlessChannelSchema,
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: z.object({ error: z.string() }),
    },
  },
  listHeadlessCollections: {
    method: "GET",
    path: "/api/headless/catalog/collections",
    query: z.object({
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    }),
    responses: {
      200: z.object({
        collections: z.array(z.unknown()),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
        channel: headlessChannelSchema,
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  getHeadlessCollection: {
    method: "GET",
    path: "/api/headless/catalog/collections/:slug",
    query: z.object({
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    }),
    responses: {
      200: z.object({
        collection: z.unknown(),
        products: z.array(z.unknown()),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
        channel: headlessChannelSchema,
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: z.object({ error: z.string() }),
    },
  },
});
