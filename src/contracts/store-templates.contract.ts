import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const featureDisabledSchema = z.object({
  error: z.string(),
  code: z.literal("FEATURE_DISABLED"),
});

const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  sourceStoreId: z.string(),
  snapshotVersion: z.number(),
  productCount: z.number(),
  collectionCount: z.number(),
  settingCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const storeTemplatesContract = c.router({
  listTemplates: {
    method: "GET",
    path: "/api/admin/store-templates",
    query: z.object({
      limit: z.coerce.number().int().min(1).max(200).optional(),
    }),
    responses: {
      200: z.object({ templates: z.array(templateSchema) }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  createTemplate: {
    method: "POST",
    path: "/api/admin/store-templates",
    body: z.object({
      name: z.string().min(2).max(120),
      description: z.string().max(500).optional(),
    }),
    responses: {
      201: z.object({ template: templateSchema }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      400: z.object({ error: z.string() }),
    },
  },
  cloneTemplate: {
    method: "POST",
    path: "/api/admin/store-templates/:id/clone",
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.object({
      name: z.string().min(2).max(120),
      slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
      subdomain: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/).optional(),
      copySettings: z.boolean().optional(),
      copyProducts: z.boolean().optional(),
      copyCollections: z.boolean().optional(),
    }),
    responses: {
      201: z.object({
        clone: z.object({
          templateId: z.string(),
          store: z.object({
            id: z.string(),
            name: z.string(),
            slug: z.string(),
            subdomain: z.string().nullable(),
          }),
          copied: z.object({
            settings: z.number(),
            products: z.number(),
            collections: z.number(),
          }),
        }),
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      400: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
  deleteTemplate: {
    method: "DELETE",
    path: "/api/admin/store-templates/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: z.object({ success: z.boolean() }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: z.object({ error: z.string() }),
    },
  },
});
