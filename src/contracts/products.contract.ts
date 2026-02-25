import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  paginationSchema,
  productFilterSchema,
  slugParamSchema,
} from "../shared/validators";

const c = initContract();

const variantSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.number(),
  compareAtPrice: z.number().nullable(),
  sku: z.string().nullable(),
  availableForSale: z.boolean(),
  options: z.record(z.string(), z.string()),
});

const imageSchema = z.object({
  id: z.string(),
  url: z.string(),
  altText: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
});

const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  descriptionHtml: z.string().nullable(),
  type: z.enum(["physical", "digital", "subscription", "bookable"]),
  availableForSale: z.boolean(),
  featuredImageUrl: z.string().nullable(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  priceRange: z.object({
    min: z.number(),
    max: z.number(),
  }),
  variants: z.array(variantSchema),
  images: z.array(imageSchema),
});

const collectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
});

export const productsContract = c.router({
  list: {
    method: "GET",
    path: "/api/products",
    query: paginationSchema.merge(productFilterSchema),
    responses: {
      200: z.object({
        products: z.array(productSchema),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      }),
    },
  },
  getBySlug: {
    method: "GET",
    path: "/api/products/:slug",
    pathParams: slugParamSchema,
    responses: {
      200: productSchema,
      404: z.object({ error: z.string() }),
    },
  },
  listCollections: {
    method: "GET",
    path: "/api/collections",
    query: paginationSchema,
    responses: {
      200: z.object({
        collections: z.array(collectionSchema),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      }),
    },
  },
  getCollectionBySlug: {
    method: "GET",
    path: "/api/collections/:slug",
    pathParams: slugParamSchema,
    query: paginationSchema,
    responses: {
      200: z.object({
        collection: collectionSchema,
        products: z.array(productSchema),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      }),
      404: z.object({ error: z.string() }),
    },
  },
});
