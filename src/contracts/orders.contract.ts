import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  paginationSchema,
  idParamSchema,
  createReturnExchangeRequestSchema,
} from "../shared/validators";

const c = initContract();
const orderStatusSchema = z.enum([
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

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
  status: orderStatusSchema,
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

const reorderPlanLineSchema = z.object({
  orderItemId: z.string(),
  variantId: z.string().nullable(),
  productName: z.string(),
  productType: z
    .enum(["physical", "digital", "subscription", "bookable"])
    .nullable(),
  requestedQuantity: z.number(),
  plannedQuantity: z.number(),
  status: z.enum(["ready", "adjusted", "skipped"]),
  reason: z.string().nullable(),
});

const featureDisabledSchema = z.object({
  error: z.string(),
  code: z.literal("FEATURE_DISABLED"),
});

const returnOptionItemSchema = z.object({
  orderItemId: z.string(),
  productName: z.string(),
  variantId: z.string().nullable(),
  quantityPurchased: z.number(),
  maxReturnableQuantity: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
});

const returnExchangeRequestSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  type: z.enum(["refund", "exchange"]),
  status: z.enum(["submitted", "approved", "rejected", "completed", "cancelled"]),
  reason: z.string().nullable(),
  requestedItems: z.array(z.unknown()),
  exchangeItems: z.array(z.unknown()),
  refundAmount: z.string(),
  creditAmount: z.string(),
  instantExchange: z.boolean(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
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
  listReturnRequests: {
    method: "GET",
    path: "/api/orders/returns",
    responses: {
      200: z.object({
        requests: z.array(returnExchangeRequestSchema),
      }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  returnOptions: {
    method: "GET",
    path: "/api/orders/:id/return-options",
    pathParams: idParamSchema,
    responses: {
      200: z.object({
        orderId: z.string(),
        orderStatus: orderStatusSchema,
        eligible: z.boolean(),
        reasonIfIneligible: z.string().nullable(),
        windowEndsAt: z.string().nullable(),
        daysRemaining: z.number(),
        items: z.array(returnOptionItemSchema),
      }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: z.object({ error: z.string() }),
    },
  },
  submitReturnExchange: {
    method: "POST",
    path: "/api/orders/:id/returns",
    pathParams: idParamSchema,
    body: createReturnExchangeRequestSchema,
    responses: {
      201: z.object({
        requestId: z.string(),
        orderId: z.string(),
        mode: z.enum(["refund", "exchange"]),
        status: z.enum(["submitted", "approved", "rejected", "completed", "cancelled"]),
        reason: z.string().nullable(),
        refundAmount: z.string(),
        creditAmount: z.string(),
        instantExchange: z.boolean(),
        requestedItems: z.array(z.unknown()),
        exchangeItems: z.array(z.unknown()),
        exchangeCart: z.object({
          updated: z.boolean(),
          addedLineCount: z.number(),
          failedLines: z.array(
            z.object({
              orderItemId: z.string(),
              reason: z.string(),
            }),
          ),
          redirectUrl: z.string().nullable(),
        }),
        message: z.string(),
      }),
      207: z.object({
        requestId: z.string(),
        orderId: z.string(),
        mode: z.enum(["refund", "exchange"]),
        status: z.enum(["submitted", "approved", "rejected", "completed", "cancelled"]),
        reason: z.string().nullable(),
        refundAmount: z.string(),
        creditAmount: z.string(),
        instantExchange: z.boolean(),
        requestedItems: z.array(z.unknown()),
        exchangeItems: z.array(z.unknown()),
        exchangeCart: z.object({
          updated: z.boolean(),
          addedLineCount: z.number(),
          failedLines: z.array(
            z.object({
              orderItemId: z.string(),
              reason: z.string(),
            }),
          ),
          redirectUrl: z.string().nullable(),
        }),
        message: z.string(),
      }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
      404: z.object({ error: z.string() }),
    },
  },
  reorderPreview: {
    method: "GET",
    path: "/api/orders/:id/reorder-preview",
    pathParams: idParamSchema,
    responses: {
      200: z.object({
        orderId: z.string(),
        orderStatus: orderStatusSchema,
        eligible: z.boolean(),
        action: z.enum(["proceed", "partial", "blocked"]),
        summary: z.object({
          requestedLineCount: z.number(),
          readyLineCount: z.number(),
          adjustedLineCount: z.number(),
          skippedLineCount: z.number(),
          requestedQuantity: z.number(),
          plannedQuantity: z.number(),
        }),
        messages: z.array(z.string()),
        lines: z.array(reorderPlanLineSchema),
      }),
      401: z.object({ error: z.string() }),
      403: z.object({ error: z.string(), code: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
  reorder: {
    method: "POST",
    path: "/api/orders/:id/reorder",
    pathParams: idParamSchema,
    body: z.object({
      preferPartial: z.boolean().optional(),
    }).optional(),
    responses: {
      200: z.object({
        orderId: z.string(),
        action: z.enum(["proceed", "partial", "blocked"]),
        addedLineCount: z.number(),
        adjustedLineCount: z.number(),
        skippedLineCount: z.number(),
        addedQuantity: z.number(),
        skipped: z.array(z.string()),
        lines: z.array(
          z.object({
            orderItemId: z.string(),
            variantId: z.string().nullable(),
            productName: z.string(),
            requestedQuantity: z.number(),
            plannedQuantity: z.number(),
            addedQuantity: z.number(),
            status: z.enum(["added", "skipped"]),
            reason: z.string().nullable(),
          }),
        ),
        cart: z.unknown().optional(),
      }),
      400: z.object({ error: z.string() }),
      409: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: z.object({ error: z.string(), code: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
});
