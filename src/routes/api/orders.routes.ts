import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { OrderRepository } from "../../infrastructure/repositories/order.repository";
import { CartRepository } from "../../infrastructure/repositories/cart.repository";
import { InventoryRepository } from "../../infrastructure/repositories/inventory.repository";
import { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { GetOrdersUseCase } from "../../application/checkout/get-orders.usecase";
import { GetCartUseCase } from "../../application/cart/get-cart.usecase";
import { AddToCartUseCase } from "../../application/cart/add-to-cart.usecase";
import { TrackEventUseCase } from "../../application/analytics/track-event.usecase";
import { ReorderPlannerUseCase } from "../../application/checkout/reorder-planner.usecase";
import { ManageReturnExchangeUseCase } from "../../application/checkout/manage-return-exchange.usecase";
import { OrderReturnRepository } from "../../infrastructure/repositories/order-return.repository";
import { paginationSchema, createReturnExchangeRequestSchema } from "../../shared/validators";
import { resolveFeatureFlags } from "../../shared/feature-flags";
import { requireAuth } from "../../middleware/auth.middleware";
import { cartSession } from "../../middleware/cart-session.middleware";
import { NotFoundError, ValidationError } from "../../shared/errors";

const orders = new Hono<{ Bindings: Env }>();
const reorderAllowedStatuses = new Set(["processing", "shipped", "delivered", "refunded"]);

function checkReorderFeature(c: any) {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags.intelligent_reorder) {
    return c.json(
      { error: "Intelligent reorder is currently disabled", code: "FEATURE_DISABLED" },
      403,
    );
  }
  return null;
}

function checkReturnsExchangeFeature(c: any) {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags.self_serve_returns_exchange) {
    return c.json(
      { error: "Returns and exchanges are currently disabled", code: "FEATURE_DISABLED" },
      403,
    );
  }
  return null;
}

function shapeReorderPreview(order: any, plan: any) {
  return {
    orderId: order.id,
    orderStatus: order.status ?? "pending",
    eligible: reorderAllowedStatuses.has(order.status ?? "pending") && plan.action !== "blocked",
    action: plan.action,
    summary: {
      requestedLineCount: plan.requestedLineCount,
      readyLineCount: plan.readyLineCount,
      adjustedLineCount: plan.adjustedLineCount,
      skippedLineCount: plan.skippedLineCount,
      requestedQuantity: plan.requestedQuantity,
      plannedQuantity: plan.plannedQuantity,
    },
    messages: plan.messages,
    lines: plan.lines,
  };
}

// GET /orders — list user orders with pagination
orders.get(
  "/orders",
  requireAuth(),
  zValidator("query", paginationSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const orderRepo = new OrderRepository(db, c.get("storeId") as string);
    const useCase = new GetOrdersUseCase(orderRepo);

    const userId = c.get("userId");
    const { page, limit } = c.req.valid("query");

    const result = await useCase.list(userId, { page, limit });
    return c.json(result, 200);
  },
);

// GET /orders/returns — list return/exchange requests for the authenticated user
orders.get("/orders/returns", requireAuth(), async (c) => {
  const featureError = checkReturnsExchangeFeature(c);
  if (featureError) return featureError;

  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const userId = c.get("userId");

  const orderRepo = new OrderRepository(db, storeId);
  const returnRepo = new OrderReturnRepository(db, storeId);
  const useCase = new ManageReturnExchangeUseCase(orderRepo, returnRepo);
  const requests = await useCase.listRequests(userId);

  return c.json({
    requests: requests.map((request) => ({
      id: request.id,
      orderId: request.orderId,
      type: request.type,
      status: request.status,
      reason: request.reason,
      requestedItems: request.requestedItems ?? [],
      exchangeItems: request.exchangeItems ?? [],
      refundAmount: Number(request.refundAmount ?? 0).toFixed(2),
      creditAmount: Number(request.creditAmount ?? 0).toFixed(2),
      instantExchange: request.instantExchange,
      createdAt: request.createdAt?.toISOString() ?? null,
      updatedAt: request.updatedAt?.toISOString() ?? null,
    })),
  }, 200);
});

// GET /orders/:id — get order detail
orders.get("/orders/:id", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const orderRepo = new OrderRepository(db, c.get("storeId") as string);
  const useCase = new GetOrdersUseCase(orderRepo);

  const userId = c.get("userId");
  const orderId = c.req.param("id");

  const order = await useCase.getById(orderId, userId);
  return c.json(order, 200);
});

// GET /orders/:id/return-options — check return/exchange eligibility and selectable items
orders.get("/orders/:id/return-options", requireAuth(), async (c) => {
  const featureError = checkReturnsExchangeFeature(c);
  if (featureError) return featureError;

  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const userId = c.get("userId");
  const orderId = c.req.param("id");

  const orderRepo = new OrderRepository(db, storeId);
  const returnRepo = new OrderReturnRepository(db, storeId);
  const useCase = new ManageReturnExchangeUseCase(orderRepo, returnRepo);

  try {
    const options = await useCase.getOptions(orderId, userId);
    return c.json(options, 200);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, 404);
    }
    if (error instanceof ValidationError) {
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
});

// POST /orders/:id/returns — submit return or instant exchange request
orders.post(
  "/orders/:id/returns",
  cartSession(),
  requireAuth(),
  zValidator("json", createReturnExchangeRequestSchema),
  async (c) => {
    const featureError = checkReturnsExchangeFeature(c);
    if (featureError) return featureError;

    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const userId = c.get("userId");
    const sessionId = c.get("cartSessionId");
    const orderId = c.req.param("id");
    const body = c.req.valid("json");

    const orderRepo = new OrderRepository(db, storeId);
    const returnRepo = new OrderReturnRepository(db, storeId);
    const useCase = new ManageReturnExchangeUseCase(orderRepo, returnRepo);

    try {
      const submitted = await useCase.submitRequest({
        orderId,
        userId,
        mode: body.mode,
        reason: body.reason,
        instantExchange: body.instantExchange,
        items: body.items,
      });

      let exchangeCartUpdated = false;
      let exchangeAddedLineCount = 0;
      const exchangeFailedLines: Array<{ orderItemId: string; reason: string }> = [];

      const shouldInstantExchange = submitted.request.type === "exchange"
        && submitted.request.instantExchange === true;

      if (shouldInstantExchange && submitted.exchangeItems.length > 0) {
        const cartRepo = new CartRepository(db, storeId);
        const inventoryRepo = new InventoryRepository(db, storeId);
        const addToCartUseCase = new AddToCartUseCase(cartRepo, db, inventoryRepo);

        for (const exchangeItem of submitted.exchangeItems) {
          try {
            await addToCartUseCase.execute(
              sessionId,
              {
                variantId: exchangeItem.replacementVariantId,
                quantity: exchangeItem.quantity,
              },
              userId,
            );
            exchangeAddedLineCount++;
          } catch (error) {
            exchangeFailedLines.push({
              orderItemId: exchangeItem.orderItemId,
              reason: error instanceof Error ? error.message : "Could not add exchange item to cart.",
            });
          }
        }

        exchangeCartUpdated = exchangeAddedLineCount > 0;
      }

      const isPartialExchange = exchangeFailedLines.length > 0;
      return c.json(
        {
          requestId: submitted.request.id,
          orderId,
          mode: submitted.request.type,
          status: submitted.request.status,
          reason: submitted.request.reason,
          refundAmount: submitted.refundAmount.toFixed(2),
          creditAmount: submitted.creditAmount.toFixed(2),
          instantExchange: submitted.request.instantExchange,
          requestedItems: submitted.plannedItems,
          exchangeItems: submitted.exchangeItems,
          exchangeCart: {
            updated: exchangeCartUpdated,
            addedLineCount: exchangeAddedLineCount,
            failedLines: exchangeFailedLines,
            redirectUrl: exchangeCartUpdated ? "/cart" : null,
          },
          message: submitted.request.type === "exchange"
            ? (isPartialExchange
              ? "Exchange request created. Some exchange items could not be added to cart."
              : "Exchange request created and replacement items added to your cart.")
            : "Return request submitted successfully.",
        },
        isPartialExchange ? 207 : 201,
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      if (error instanceof ValidationError) {
        return c.json({ error: error.message }, 400);
      }
      throw error;
    }
  },
);

// POST /orders/:id/reorder — add previous order items back into cart
orders.get("/orders/:id/reorder-preview", requireAuth(), async (c) => {
  const featureError = checkReorderFeature(c);
  if (featureError) return featureError;

  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const userId = c.get("userId");
  const orderId = c.req.param("id");

  const orderRepo = new OrderRepository(db, storeId);
  const order = await orderRepo.findById(orderId, userId);
  if (!order) {
    return c.json({ error: "Order not found" }, 404);
  }

  if (!reorderAllowedStatuses.has(order.status ?? "pending")) {
    return c.json(
      {
        orderId,
        orderStatus: order.status ?? "pending",
        eligible: false,
        action: "blocked",
        summary: {
          requestedLineCount: 0,
          readyLineCount: 0,
          adjustedLineCount: 0,
          skippedLineCount: 0,
          requestedQuantity: 0,
          plannedQuantity: 0,
        },
        messages: [`Order status "${order.status ?? "pending"}" is not eligible for reorder.`],
        lines: [],
      },
      200,
    );
  }

  const planner = new ReorderPlannerUseCase(db, storeId);
  const plan = await planner.execute(
    (order.items ?? []).map((item: any) => ({
      id: item.id,
      variantId: item.variantId as string | null,
      productName: item.productName,
      quantity: item.quantity ?? 1,
    })),
  );

  return c.json(shapeReorderPreview(order, plan), 200);
});

orders.post("/orders/:id/reorder", cartSession(), requireAuth(), async (c) => {
  const featureError = checkReorderFeature(c);
  if (featureError) return featureError;

  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const userId = c.get("userId");
  const sessionId = c.get("cartSessionId");
  const orderId = c.req.param("id");
  const body = await c.req.json<{ preferPartial?: boolean }>().catch(() => ({} as { preferPartial?: boolean }));
  const preferPartial = typeof body.preferPartial === "boolean" ? body.preferPartial : true;

  const orderRepo = new OrderRepository(db, storeId);
  const order = await orderRepo.findById(orderId, userId);
  if (!order) {
    return c.json({ error: "Order not found" }, 404);
  }

  if (!reorderAllowedStatuses.has(order.status ?? "pending")) {
    return c.json(
      { error: `Order status "${order.status ?? "pending"}" is not eligible for reorder.` },
      400,
    );
  }

  const planner = new ReorderPlannerUseCase(db, storeId);
  const plan = await planner.execute(
    (order.items ?? []).map((item: any) => ({
      id: item.id,
      variantId: item.variantId as string | null,
      productName: item.productName,
      quantity: item.quantity ?? 1,
    })),
  );

  if (plan.action === "blocked") {
    return c.json(
      {
        error: "No items from this order are currently eligible for reorder.",
        preview: shapeReorderPreview(order, plan),
      },
      400,
    );
  }

  if (plan.action === "partial" && !preferPartial) {
    return c.json(
      {
        error: "Reorder requires quantity adjustments or skipping unavailable lines.",
        preview: shapeReorderPreview(order, plan),
      },
      409,
    );
  }

  const cartRepo = new CartRepository(db, storeId);
  const inventoryRepo = new InventoryRepository(db, storeId);
  const addToCartUseCase = new AddToCartUseCase(cartRepo, db, inventoryRepo);

  let addedLineCount = 0;
  let adjustedLineCount = 0;
  let skippedLineCount = 0;
  let addedQuantity = 0;
  const skipped: string[] = [];
  const executedLines: Array<{
    orderItemId: string;
    variantId: string | null;
    productName: string;
    requestedQuantity: number;
    plannedQuantity: number;
    addedQuantity: number;
    status: "added" | "skipped";
    reason: string | null;
  }> = [];

  for (const line of plan.lines) {
    if (!line.variantId || line.plannedQuantity <= 0 || line.status === "skipped") {
      skippedLineCount++;
      skipped.push(`Skipped "${line.productName}": ${line.reason ?? "Not eligible for reorder."}`);
      executedLines.push({
        orderItemId: line.orderItemId,
        variantId: line.variantId,
        productName: line.productName,
        requestedQuantity: line.requestedQuantity,
        plannedQuantity: line.plannedQuantity,
        addedQuantity: 0,
        status: "skipped",
        reason: line.reason ?? "Not eligible for reorder.",
      });
      continue;
    }

    try {
      await addToCartUseCase.execute(
        sessionId,
        { variantId: line.variantId, quantity: line.plannedQuantity },
        userId,
      );
      addedLineCount++;
      addedQuantity += line.plannedQuantity;
      if (line.status === "adjusted") adjustedLineCount++;
      executedLines.push({
        orderItemId: line.orderItemId,
        variantId: line.variantId,
        productName: line.productName,
        requestedQuantity: line.requestedQuantity,
        plannedQuantity: line.plannedQuantity,
        addedQuantity: line.plannedQuantity,
        status: "added",
        reason: line.reason,
      });
    } catch (error) {
      skippedLineCount++;
      const message =
        error instanceof Error ? error.message : "Could not reorder this item.";
      skipped.push(`Skipped "${line.productName}": ${message}`);
      executedLines.push({
        orderItemId: line.orderItemId,
        variantId: line.variantId,
        productName: line.productName,
        requestedQuantity: line.requestedQuantity,
        plannedQuantity: line.plannedQuantity,
        addedQuantity: 0,
        status: "skipped",
        reason: message,
      });
    }
  }

  const cart = await new GetCartUseCase(cartRepo, db).execute(sessionId, userId);
  const analyticsRepo = new AnalyticsRepository(db, storeId);
  await new TrackEventUseCase(analyticsRepo).execute({
    userId,
    sessionId,
    eventType: "reorder_to_cart",
    properties: {
      orderId,
      action: plan.action,
      addedLineCount,
      adjustedLineCount,
      skippedLineCount,
      addedQuantity,
      skipped,
      planRequestedLineCount: plan.requestedLineCount,
      planRequestedQuantity: plan.requestedQuantity,
      planPlannedQuantity: plan.plannedQuantity,
    },
    pageUrl: null,
    referrer: null,
    userAgent: null,
    ip: undefined,
  });

  return c.json(
    {
      orderId,
      action: plan.action,
      addedLineCount,
      adjustedLineCount,
      skippedLineCount,
      addedQuantity,
      skipped,
      lines: executedLines,
      cart,
    },
    200,
  );
});

export { orders as orderRoutes };
