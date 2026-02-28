import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { SyncPrintfulCatalogUseCase } from "../../application/fulfillment/sync-printful-catalog.usecase";
import { TrackShipmentUseCase } from "../../application/fulfillment/track-shipment.usecase";
import { GenerateMockupUseCase } from "../../application/fulfillment/generate-mockup.usecase";
import { PrintfulWebhookHandler } from "../../infrastructure/printful/webhook.handler";
import { FulfillmentWebhookRouter } from "../../infrastructure/fulfillment/webhook-router";
import { syncCatalogSchema } from "../../shared/validators";
import type { FulfillmentRequestStatus } from "../../domain/fulfillment/fulfillment-request.entity";

const fulfillment = new Hono<{ Bindings: Env }>();

// ─── POST /fulfillment/sync — Sync catalog from Printful (admin) ────────

fulfillment.post(
  "/fulfillment/sync",
  requireAuth(),
  zValidator("json", syncCatalogSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const body = c.req.valid("json");

    const useCase = new SyncPrintfulCatalogUseCase();
    const result = await useCase.execute({
      apiKey: c.env.PRINTFUL_API_KEY,
      db,
      storeId: c.get("storeId") as string,
      printfulProductIds: body.printfulProductIds,
    });

    return c.json(result, 200);
  },
);

// ─── GET /fulfillment/shipments — List shipments by orderId ─────────────

fulfillment.get(
  "/fulfillment/shipments",
  requireAuth(),
  zValidator(
    "query",
    z.object({
      orderId: z.string().uuid(),
    }),
  ),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const { orderId } = c.req.valid("query");
    const userId = c.get("userId");

    const useCase = new TrackShipmentUseCase();
    const result = await useCase.execute({
      db,
      storeId: c.get("storeId") as string,
      orderId,
      userId,
    });

    return c.json(result, 200);
  },
);

// ─── POST /fulfillment/mockup — Generate a product mockup ──────────────

fulfillment.post(
  "/fulfillment/mockup",
  requireAuth(),
  zValidator(
    "json",
    z.object({
      productId: z.string().uuid(),
      imageUrl: z.string().url(),
      printfulProductId: z.number().int().positive().optional(),
      waitAndApply: z.boolean().optional(),
      timeoutMs: z.number().int().min(5_000).max(300_000).optional(),
      pollIntervalMs: z.number().int().min(500).max(10_000).optional(),
    }),
  ),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const {
      productId,
      imageUrl,
      printfulProductId,
      waitAndApply,
      timeoutMs,
      pollIntervalMs,
    } = c.req.valid("json");

    const useCase = new GenerateMockupUseCase();
    const result = waitAndApply
      ? await useCase.executeAndApply({
          apiKey: c.env.PRINTFUL_API_KEY,
          db,
          productId,
          imageUrl,
          printfulProductId,
          timeoutMs,
          pollIntervalMs,
        })
      : await useCase.execute({
          apiKey: c.env.PRINTFUL_API_KEY,
          db,
          productId,
          imageUrl,
          printfulProductId,
        });

    return c.json(result, 201);
  },
);

// ─── POST /webhooks/printful — Handle Printful webhook events ───────────

fulfillment.post("/webhooks/printful", async (c) => {
  const webhookHandler = new PrintfulWebhookHandler();

  // Read raw body for signature verification
  const rawBody = await c.req.text();
  const signature = c.req.header("x-printful-signature") ?? "";

  // Verify the webhook signature
  const isValid = await webhookHandler.verifySignature(
    rawBody,
    signature,
    c.env.PRINTFUL_WEBHOOK_SECRET,
  );

  if (!isValid) {
    return c.json({ error: "Invalid webhook signature" }, 401);
  }

  // Parse the event payload
  const event = JSON.parse(rawBody);

  // Process the event through existing handler
  const db = createDb(c.env.DATABASE_URL);
  const result = await webhookHandler.handleEvent(event, db);

  // Also record event via webhook router for fulfillment request tracking
  const storeId = c.get("storeId") as string;
  if (storeId && event.data?.order?.external_id) {
    const statusMap: Record<string, FulfillmentRequestStatus> = {
      package_shipped: "shipped",
      order_updated: "processing",
      order_failed: "failed",
      order_canceled: "cancelled",
    };
    const webhookRouter = new FulfillmentWebhookRouter(db, storeId);
    const shipmentData = event.data?.shipment;
    await webhookRouter.processEvent({
      provider: "printful",
      externalEventId: `printful-${event.type}-${event.created}`,
      externalOrderId: String(event.data.order.external_id),
      eventType: event.type,
      payload: event.data,
      mappedStatus: statusMap[event.type],
      shipment: event.type === "package_shipped" && shipmentData
        ? {
            carrier: shipmentData.carrier ?? "",
            trackingNumber: shipmentData.tracking_number ?? "",
            trackingUrl: shipmentData.tracking_url ?? "",
            shippedAt: new Date(shipmentData.shipped_at * 1000),
            raw: shipmentData,
          }
        : undefined,
    });
  }

  return c.json({ received: true, ...result }, 200);
});

// ─── POST /webhooks/prodigi — Handle Prodigi webhook events ──────────

fulfillment.post("/webhooks/prodigi", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-prodigi-signature") ?? "";

  // Stub verification for now (Task 19 implements full HMAC)
  if (!signature && c.env.PRODIGI_WEBHOOK_SECRET) {
    return c.json({ error: "Missing webhook signature" }, 401);
  }

  const event = JSON.parse(rawBody);
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;

  if (!storeId || !event.id || !event.order?.id) {
    return c.json({ received: true, handled: false }, 200);
  }

  const statusMap: Record<string, FulfillmentRequestStatus> = {
    "order.shipped": "shipped",
    "order.completed": "delivered",
    "order.cancelled": "cancelled",
    "order.failed": "failed",
  };

  const webhookRouter = new FulfillmentWebhookRouter(db, storeId);
  const shipmentInfo = event.shipment;

  await webhookRouter.processEvent({
    provider: "prodigi",
    externalEventId: event.id,
    externalOrderId: String(event.order.id),
    eventType: event.type ?? event.event ?? "unknown",
    payload: event,
    mappedStatus: statusMap[event.type ?? event.event],
    shipment: shipmentInfo
      ? {
          carrier: shipmentInfo.carrier ?? "",
          trackingNumber: shipmentInfo.tracking_number ?? shipmentInfo.trackingNumber ?? "",
          trackingUrl: shipmentInfo.tracking_url ?? shipmentInfo.trackingUrl ?? "",
          shippedAt: new Date(),
          raw: shipmentInfo,
        }
      : undefined,
  });

  return c.json({ received: true }, 200);
});

export { fulfillment as fulfillmentRoutes };
