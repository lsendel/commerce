import { eq, inArray } from "drizzle-orm";
import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { fulfillmentRequests } from "../infrastructure/db/schema";
import { FulfillmentRequestRepository } from "../infrastructure/repositories/fulfillment-request.repository";
import { FulfillmentWebhookRouter } from "../infrastructure/fulfillment/webhook-router";
import { createFulfillmentProvider } from "../infrastructure/fulfillment/provider-factory";
import { ResolveSecretUseCase } from "../application/platform/resolve-secret.usecase";
import {
  IntegrationRepository,
  IntegrationSecretRepository,
} from "../infrastructure/repositories/integration.repository";
import type { FulfillmentRequestStatus } from "../domain/fulfillment/fulfillment-request.entity";

const MAX_POLLS = 60;
const DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Map Gooten status codes to our internal status */
function mapGootenStatus(statusCode: string): FulfillmentRequestStatus | null {
  switch (statusCode.toLowerCase()) {
    case "inproduction":
    case "in production":
      return "processing";
    case "shipped":
      return "shipped";
    case "delivered":
      return "delivered";
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      return null;
  }
}

export async function runGootenPolling(env: Env): Promise<void> {
  const db = createDb(env.DATABASE_URL);

  // Query all Gooten requests across all stores that need polling
  const requests = await db
    .select()
    .from(fulfillmentRequests)
    .where(
      inArray(fulfillmentRequests.status, ["submitted", "processing"]),
    )
    .then((rows) => rows.filter((r) => r.provider === "gooten" && r.externalId));

  if (requests.length === 0) return;

  // Group by storeId to resolve API keys per store
  const byStore = new Map<string, typeof requests>();
  for (const req of requests) {
    const list = byStore.get(req.storeId) ?? [];
    list.push(req);
    byStore.set(req.storeId, list);
  }

  const integrationRepo = new IntegrationRepository(db);
  const secretRepo = new IntegrationSecretRepository(db);
  const resolveSecret = new ResolveSecretUseCase(integrationRepo, secretRepo);

  let pollCount = 0;

  for (const [storeId, storeRequests] of byStore) {
    // Resolve Gooten API key for this store
    const apiKey = await resolveSecret.execute("gooten" as any, "api_key", env, storeId);
    if (!apiKey) {
      console.warn(`[gooten-polling] No API key for store ${storeId}, skipping ${storeRequests.length} requests`);
      continue;
    }

    const provider = createFulfillmentProvider("gooten", { apiKey });
    const webhookRouter = new FulfillmentWebhookRouter(db, storeId);

    for (const request of storeRequests) {
      if (pollCount >= MAX_POLLS) {
        console.log(`[gooten-polling] Reached max polls (${MAX_POLLS}), stopping`);
        return;
      }

      try {
        const order = await provider.getOrder(request.externalId!);
        pollCount++;

        const mappedStatus = mapGootenStatus(order.status);
        if (!mappedStatus || mappedStatus === request.status) {
          // No meaningful status change
          continue;
        }

        // Process as synthetic webhook event
        await webhookRouter.processEvent({
          provider: "gooten",
          externalEventId: `poll-${request.externalId}-${Date.now()}`,
          externalOrderId: request.externalId!,
          eventType: `order.${mappedStatus}`,
          payload: order,
          mappedStatus,
          shipment:
            mappedStatus === "shipped" && order.trackingNumber
              ? {
                  carrier: "gooten",
                  trackingNumber: order.trackingNumber,
                  trackingUrl: order.trackingUrl ?? "",
                  shippedAt: new Date(),
                }
              : undefined,
        });

        console.log(
          `[gooten-polling] Request ${request.id}: ${request.status} → ${mappedStatus}`,
        );
      } catch (err) {
        console.error(
          `[gooten-polling] Error polling request ${request.id}:`,
          err instanceof Error ? err.message : err,
        );
      }

      // Rate limit: 1s between API calls
      if (pollCount < MAX_POLLS) {
        await sleep(DELAY_MS);
      }
    }
  }

  console.log(`[gooten-polling] Completed: ${pollCount} API calls`);
}
