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
import { syncCatalogSchema } from "../../shared/validators";

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
    const result = await useCase.execute({ db, orderId, userId });

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
    }),
  ),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const { productId, imageUrl } = c.req.valid("json");

    const useCase = new GenerateMockupUseCase();
    const result = await useCase.execute({
      apiKey: c.env.PRINTFUL_API_KEY,
      db,
      productId,
      imageUrl,
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

  // Process the event
  const db = createDb(c.env.DATABASE_URL);
  const result = await webhookHandler.handleEvent(event, db);

  return c.json({ received: true, ...result }, 200);
});

export { fulfillment as fulfillmentRoutes };
