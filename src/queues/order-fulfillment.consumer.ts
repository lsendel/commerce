import { eq, inArray } from "drizzle-orm";
import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { PrintfulClient } from "../infrastructure/printful/printful.client";
import {
  orders,
  orderItems,
  productVariants,
  printfulSyncVariants,
} from "../infrastructure/db/schema";
import { OrderRepository } from "../infrastructure/repositories/order.repository";

interface OrderFulfillmentMessage {
  orderId: string;
}

interface PrintfulRecipient {
  name: string;
  address1: string;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
}

interface PrintfulOrderItem {
  sync_variant_id: number;
  quantity: number;
  retail_price: string;
}

interface PrintfulCreateOrderPayload {
  external_id: string;
  recipient: PrintfulRecipient;
  items: PrintfulOrderItem[];
}

export async function handleOrderFulfillmentMessage(
  message: Message,
  env: Env,
): Promise<void> {
  const { orderId } = message.body as OrderFulfillmentMessage;

  const db = createDb(env.DATABASE_URL);
  const printful = new PrintfulClient(env.PRINTFUL_API_KEY);
  const orderRows = await db
    .select({ storeId: orders.storeId })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  const orderRow = orderRows[0];
  if (!orderRow) {
    console.error(
      `[order-fulfillment] Order ${orderId} not found -- acking to prevent retries`,
    );
    message.ack();
    return;
  }

  const orderRepo = new OrderRepository(db, orderRow.storeId);

  // Fetch the order with items
  const order = await orderRepo.findById(orderId);

  if (!order) {
    console.error(
      `[order-fulfillment] Order ${orderId} not found in scoped repo -- acking to prevent retries`,
    );
    message.ack();
    return;
  }

  // Get all variant IDs from order items
  const variantIds = order.items
    .map((item) => item.variantId)
    .filter((id): id is string => id !== null);

  if (variantIds.length === 0) {
    console.log(
      `[order-fulfillment] Order ${orderId} has no variant items -- nothing to fulfill via Printful`,
    );
    message.ack();
    return;
  }

  // Fetch the actual variant rows to get Printful sync variant IDs
  const variantRows = await db
    .select()
    .from(productVariants)
    .where(inArray(productVariants.id, variantIds));

  // Find which variants have Printful sync mappings
  const printfulVariantIds = variantRows
    .map((v) => v.printfulSyncVariantId)
    .filter((id): id is number => id !== null);

  if (printfulVariantIds.length === 0) {
    console.log(
      `[order-fulfillment] Order ${orderId} has no Printful-linked variants -- nothing to fulfill`,
    );
    message.ack();
    return;
  }

  // Get Printful sync variant mappings for the variant IDs that have a printfulSyncVariantId
  const syncVariantRows = await db
    .select()
    .from(printfulSyncVariants)
    .where(inArray(printfulSyncVariants.printfulId, printfulVariantIds));

  // Build a map: local variant ID -> Printful sync variant ID
  const variantToPrintfulMap = new Map<string, number>();
  for (const sv of syncVariantRows) {
    variantToPrintfulMap.set(sv.variantId, sv.printfulId);
  }

  // Build Printful order items (only for physical items with Printful mappings)
  const printfulItems: PrintfulOrderItem[] = [];

  for (const item of order.items) {
    if (!item.variantId) continue;

    // Check if the variant has a printfulSyncVariantId on the variant row
    const variantRow = variantRows.find((v) => v.id === item.variantId);
    if (!variantRow?.printfulSyncVariantId) continue;

    const printfulSyncVariantId = variantToPrintfulMap.get(item.variantId);
    if (!printfulSyncVariantId) continue;

    printfulItems.push({
      sync_variant_id: printfulSyncVariantId,
      quantity: item.quantity,
      retail_price: item.unitPrice.toFixed(2),
    });
  }

  if (printfulItems.length === 0) {
    console.log(
      `[order-fulfillment] Order ${orderId} has no fulfillable Printful items after filtering`,
    );
    message.ack();
    return;
  }

  // Build recipient from order shipping address
  const shippingAddress = order.shippingAddress as Record<string, string> | null;

  const recipient: PrintfulRecipient = {
    name: shippingAddress?.name ?? "",
    address1: shippingAddress?.street ?? shippingAddress?.address1 ?? "",
    city: shippingAddress?.city ?? "",
    state_code: shippingAddress?.state ?? shippingAddress?.state_code ?? "",
    country_code:
      shippingAddress?.country ?? shippingAddress?.country_code ?? "",
    zip: shippingAddress?.zip ?? shippingAddress?.postal_code ?? "",
  };

  // Create order on Printful
  const payload: PrintfulCreateOrderPayload = {
    external_id: order.id,
    recipient,
    items: printfulItems,
  };

  try {
    await printful.post("/orders", payload);

    // Update order status to processing
    await orderRepo.updateStatus(orderId, "processing");

    console.log(
      `[order-fulfillment] Created Printful order for ${orderId} with ${printfulItems.length} item(s)`,
    );

    message.ack();
  } catch (error) {
    console.error(
      `[order-fulfillment] Failed to create Printful order for ${orderId}:`,
      error,
    );
    // Retry on failure -- Printful API may be temporarily unavailable
    message.retry();
  }
}
