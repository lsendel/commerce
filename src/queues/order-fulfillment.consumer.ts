import { eq, inArray } from "drizzle-orm";
import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import {
  orders,
  orderItems,
  productVariants,
  providerProductMappings,
} from "../infrastructure/db/schema";
import { FulfillmentRequestRepository } from "../infrastructure/repositories/fulfillment-request.repository";
import { createFulfillmentProvider } from "../infrastructure/fulfillment/provider-factory";
import { ResolveSecretUseCase } from "../application/platform/resolve-secret.usecase";
import { IntegrationRepository, IntegrationSecretRepository } from "../infrastructure/repositories/integration.repository";
import type { FulfillmentOrderItem } from "../infrastructure/fulfillment/fulfillment-provider.interface";
import type { FulfillmentProviderType } from "../shared/types";
import type { IntegrationProvider } from "../domain/platform/integration.entity";

interface FulfillmentMessage {
  type: string;
  fulfillmentRequestId?: string;
  provider?: string;
  storeId?: string;
  // Legacy format
  orderId?: string;
}

export async function handleOrderFulfillmentMessage(
  message: Message,
  env: Env,
): Promise<void> {
  const body = message.body as FulfillmentMessage;

  // Handle legacy { orderId } messages — ack and skip
  if (body.orderId && !body.fulfillmentRequestId) {
    console.log(
      `[fulfillment] Legacy orderId message for ${body.orderId} — acking and skipping`,
    );
    message.ack();
    return;
  }

  const { fulfillmentRequestId, provider, storeId } = body;
  if (!fulfillmentRequestId || !provider || !storeId) {
    console.error("[fulfillment] Invalid message — missing required fields");
    message.ack();
    return;
  }

  const db = createDb(env.DATABASE_URL);
  const requestRepo = new FulfillmentRequestRepository(db, storeId);

  // Load the fulfillment request
  const request = await requestRepo.findById(fulfillmentRequestId);
  if (!request) {
    console.error(
      `[fulfillment] Request ${fulfillmentRequestId} not found — acking`,
    );
    message.ack();
    return;
  }

  // Idempotency gate: skip if already submitted or beyond pending
  if (request.externalId != null || request.status !== "pending") {
    console.log(
      `[fulfillment] Request ${fulfillmentRequestId} already ${request.status} (externalId=${request.externalId}) — skipping`,
    );
    message.ack();
    return;
  }

  // Resolve API key via integration secrets
  const integrationRepo = new IntegrationRepository(db);
  const secretRepo = new IntegrationSecretRepository(db);
  const resolveSecret = new ResolveSecretUseCase(integrationRepo, secretRepo);
  const apiKey = await resolveSecret.execute(
    provider as IntegrationProvider,
    "api_key",
    env,
    storeId,
  );

  if (!apiKey) {
    console.error(
      `[fulfillment] No API key for provider ${provider} in store ${storeId}`,
    );
    await requestRepo.updateStatus(fulfillmentRequestId, "failed", {
      errorMessage: `No API key configured for ${provider}`,
    });
    message.ack();
    return;
  }

  // Build the provider client
  const fulfillmentProvider = createFulfillmentProvider(
    provider as FulfillmentProviderType,
    { apiKey },
  );

  // Load request items, order items, variants, and mappings
  const requestItems = await requestRepo.findItemsByRequestId(
    fulfillmentRequestId,
  );
  const orderItemIds = requestItems
    .map((ri) => ri.orderItemId)
    .filter((id): id is string => id != null);

  if (orderItemIds.length === 0) {
    console.error(
      `[fulfillment] Request ${fulfillmentRequestId} has no order items`,
    );
    await requestRepo.updateStatus(fulfillmentRequestId, "failed", {
      errorMessage: "No order items linked to request",
    });
    message.ack();
    return;
  }

  const oiRows = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.id, orderItemIds));

  const variantIds = oiRows
    .map((oi) => oi.variantId)
    .filter((id): id is string => id != null);

  const [variantRows, mappingRows] = await Promise.all([
    variantIds.length > 0
      ? db
          .select()
          .from(productVariants)
          .where(inArray(productVariants.id, variantIds))
      : Promise.resolve([]),
    variantIds.length > 0
      ? db
          .select()
          .from(providerProductMappings)
          .where(inArray(providerProductMappings.variantId, variantIds))
      : Promise.resolve([]),
  ]);

  const mappingByVariant = new Map(
    mappingRows.map((m) => [m.variantId, m]),
  );

  // Build FulfillmentOrderItem[]
  const items: FulfillmentOrderItem[] = [];
  for (const oi of oiRows) {
    if (!oi.variantId) continue;
    const mapping = mappingByVariant.get(oi.variantId);

    items.push({
      externalVariantId: mapping?.externalVariantId ?? oi.variantId,
      quantity: oi.quantity,
      retailPrice: oi.unitPrice,
      name: `${oi.productName}${oi.variantTitle ? ` - ${oi.variantTitle}` : ""}`,
    });
  }

  // Get order for shipping address
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.id, request.orderId))
    .limit(1);

  const order = orderRows[0];
  if (!order) {
    await requestRepo.updateStatus(fulfillmentRequestId, "failed", {
      errorMessage: "Order not found",
    });
    message.ack();
    return;
  }

  const shippingAddress = order.shippingAddress as Record<string, string> | null;
  const recipient = {
    name: shippingAddress?.name ?? "",
    address1: shippingAddress?.street ?? shippingAddress?.address1 ?? "",
    city: shippingAddress?.city ?? "",
    stateCode: shippingAddress?.state ?? shippingAddress?.state_code ?? "",
    countryCode:
      shippingAddress?.country ?? shippingAddress?.country_code ?? "US",
    zip: shippingAddress?.zip ?? shippingAddress?.postal_code ?? "",
  };

  try {
    const result = await fulfillmentProvider.createOrder(
      request.orderId,
      recipient,
      items,
    );

    // Write externalId + status = 'submitted' atomically
    await requestRepo.updateStatus(fulfillmentRequestId, "submitted", {
      externalId: result.externalId,
      submittedAt: new Date(),
      costActualTotal: result.costs?.total,
      costShipping: result.costs?.shipping,
      costTax: result.costs?.tax,
    });

    console.log(
      `[fulfillment] Submitted request ${fulfillmentRequestId} to ${provider} — externalId=${result.externalId}`,
    );
    message.ack();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const statusCode = (error as any)?.status ?? (error as any)?.statusCode;

    if (statusCode && statusCode >= 400 && statusCode < 500) {
      // 4xx: client error, mark as failed and ack (no retry)
      console.error(
        `[fulfillment] 4xx error for request ${fulfillmentRequestId}: ${err.message}`,
      );
      await requestRepo.updateStatus(fulfillmentRequestId, "failed", {
        errorMessage: err.message,
      });
      message.ack();
    } else {
      // 5xx / network: retry
      console.error(
        `[fulfillment] Retriable error for request ${fulfillmentRequestId}: ${err.message}`,
      );
      message.retry();
    }
  }
}
