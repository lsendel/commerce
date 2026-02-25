import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { paginationSchema, idParamSchema } from "../shared/validators";

const c = initContract();

const orderItemSchema = z.object({
  id: z.string(),
  variantId: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  variant: z.object({
    title: z.string(),
    product: z.object({
      name: z.string(),
      slug: z.string(),
      featuredImageUrl: z.string().nullable(),
    }),
  }),
});

const orderSchema = z.object({
  id: z.string(),
  status: z.enum([
    "pending",
    "paid",
    "processing",
    "shipped",
    "delivered",
    "canceled",
    "refunded",
  ]),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  currency: z.string(),
  items: z.array(orderItemSchema),
  shippingAddress: z
    .object({
      street: z.string(),
      city: z.string(),
      state: z.string().nullable(),
      zip: z.string(),
      country: z.string(),
    })
    .nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ordersContract = c.router({
  list: {
    method: "GET",
    path: "/api/orders",
    query: paginationSchema,
    responses: {
      200: z.object({
        orders: z.array(orderSchema),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      }),
      401: z.object({ error: z.string() }),
    },
  },
  getById: {
    method: "GET",
    path: "/api/orders/:id",
    pathParams: idParamSchema,
    responses: {
      200: orderSchema,
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
});
