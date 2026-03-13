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
import {
  QUEUE_WORKFLOW_POLICIES,
  computeRetryBackoffMs,
  isRetryableWorkflowError,
  resolveQueueMessageAttempt,
  withWorkflowTimeout,
} from "./orchestration-policy";

interface FulfillmentMessage {
  type: string;
  fulfillmentRequestId?: string;
  provider?: string;
  storeId?: string;
  // Legacy format
  orderId?: string;
}

function resolveWorkflowSettings(env: Env) {
  const base = QUEUE_WORKFLOW_POLICIES["order-fulfillment"];

  const timeoutOverride = Number(env.FULFILLMENT_WORKFLOW_TIMEOUT_MS ?? "");
  const timeoutMs =
    Number.isFinite(timeoutOverride) && timeoutOverride > 0
      ? Math.floor(timeoutOverride)
      : base.timeoutMs;

  const maxAttemptsOverride = Number(env.FULFILLMENT_WORKFLOW_MAX_ATTEMPTS ?? "");
  const maxAttempts =
    Number.isFinite(maxAttemptsOverride) && maxAttemptsOverride > 0
      ? Math.floor(maxAttemptsOverride)
      : base.maxAttempts;

  return {
    ...base,
    timeoutMs,
    maxAttempts,
  };
}

export async function compensateOrderFulfillmentFailure(input: {
  env: Env;
  storeId?: string;
  fulfillmentRequestId?: string;
  reason: string;
}) {
  const { env, storeId, fulfillmentRequestId, reason } = input;
  if (!storeId || !fulfillmentRequestId) return;

  try {
    const db = createDb(env.DATABASE_URL);
    const requestRepo = new FulfillmentRequestRepository(db, storeId);
    await requestRepo.updateStatus(fulfillmentRequestId, "failed", {
      errorMessage: reason,
    });
  } catch (error) {
    console.error(
      `[fulfillment] Compensation write failed for request ${fulfillmentRequestId}:`,
      error,
    );
  }
}

export async function handleOrderFulfillmentMessage(
  message: Message,
  env: Env,
): Promise<void> {
  const workflowSettings = resolveWorkflowSettings(env);
  const attempt = resolveQueueMessageAttempt(message);
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
    const result = await withWorkflowTimeout(
      fulfillmentProvider.createOrder(
        request.orderId,
        recipient,
        items,
      ),
      workflowSettings.timeoutMs,
      "order-fulfillment.create-order",
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
    const candidate = error as { status?: number; statusCode?: number };
    const statusCode = candidate.status ?? candidate.statusCode;
    const retryableByStatus =
      typeof statusCode === "number"
        ? [408, 409, 425, 429].includes(statusCode) || statusCode >= 500
        : null;
    const retryable = retryableByStatus ?? isRetryableWorkflowError(err);

    if (!retryable) {
      // 4xx: client error, mark as failed and ack (no retry)
      console.error(
        `[fulfillment] 4xx error for request ${fulfillmentRequestId}: ${err.message}`,
      );
      await compensateOrderFulfillmentFailure({
        env,
        storeId,
        fulfillmentRequestId,
        reason: err.message,
      });
      message.ack();
      return;
    }

    if (attempt >= workflowSettings.maxAttempts) {
      const finalReason =
        `Retry exhaustion after ${attempt} attempt(s): ${err.message}`;
      console.error(
        `[fulfillment] Retry budget exhausted for request ${fulfillmentRequestId}. ${finalReason}`,
      );
      await compensateOrderFulfillmentFailure({
        env,
        storeId,
        fulfillmentRequestId,
        reason: finalReason,
      });
      message.ack();
      return;
    }

    const recommendedBackoffMs = computeRetryBackoffMs(workflowSettings, attempt);
    console.error(
      `[fulfillment] Retriable error for request ${fulfillmentRequestId} (attempt ${attempt}/${workflowSettings.maxAttempts}, backoff~${recommendedBackoffMs}ms): ${err.message}`,
    );
    message.retry();
    return;
  }
}
