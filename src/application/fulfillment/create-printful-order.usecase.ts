import { eq, inArray } from "drizzle-orm";
import { PrintfulClient } from "../../infrastructure/printful/printful.client";
import { PrintfulOrderAdapter } from "../../infrastructure/printful/order.adapter";
import type { PrintfulOrderInput } from "../../infrastructure/printful/order.adapter";
import { PrintfulRepository } from "../../infrastructure/repositories/printful.repository";
import type { Database } from "../../infrastructure/db/client";
import {
  orders,
  orderItems,
  productVariants,
  printfulSyncVariants,
} from "../../infrastructure/db/schema";

interface CreatePrintfulOrderInput {
  apiKey: string;
  db: Database;
  orderId: string;
}

export class CreatePrintfulOrderUseCase {
  private adapter = new PrintfulOrderAdapter();

  /**
   * Take an internal order, map it to Printful order format,
   * and submit it to Printful for fulfillment.
   */
  async execute(input: CreatePrintfulOrderInput) {
    const { apiKey, db, orderId } = input;
    const client = new PrintfulClient(apiKey);
    const printfulRepo = new PrintfulRepository(db);

    // 1. Fetch the internal order
    const orderRows = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (orderRows.length === 0) {
      throw new Error(`Order ${orderId} not found`);
    }

    const order = orderRows[0];

    // 2. Fetch order items
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    if (items.length === 0) {
      throw new Error(`Order ${orderId} has no items`);
    }

    // 3. Resolve Printful sync variant IDs for each order item
    const variantIds = items
      .map((i) => i.variantId)
      .filter((id): id is string => id !== null);

    const syncVariants = await db
      .select()
      .from(printfulSyncVariants)
      .where(inArray(printfulSyncVariants.variantId, variantIds));

    const syncVariantMap = new Map(
      syncVariants.map((sv) => [sv.variantId, sv.printfulId]),
    );

    // 4. Build Printful order items (only items linked to Printful)
    const printfulItems: PrintfulOrderInput["items"] = [];

    for (const item of items) {
      if (!item.variantId) continue;

      const printfulSyncVariantId = syncVariantMap.get(item.variantId);
      if (!printfulSyncVariantId) continue;

      printfulItems.push({
        sync_variant_id: printfulSyncVariantId,
        quantity: item.quantity,
        retail_price: item.unitPrice,
      });
    }

    if (printfulItems.length === 0) {
      throw new Error(
        `Order ${orderId} has no items linked to Printful products`,
      );
    }

    // 5. Build the shipping address from the order
    const shippingAddress = order.shippingAddress as Record<string, string> | null;

    if (!shippingAddress) {
      throw new Error(`Order ${orderId} has no shipping address`);
    }

    const recipient: PrintfulOrderInput["recipient"] = {
      name: shippingAddress.name ?? "",
      address1: shippingAddress.street ?? shippingAddress.address1 ?? "",
      address2: shippingAddress.address2 ?? undefined,
      city: shippingAddress.city ?? "",
      state_code: shippingAddress.state ?? shippingAddress.state_code ?? undefined,
      country_code: shippingAddress.country ?? shippingAddress.country_code ?? "",
      zip: shippingAddress.zip ?? shippingAddress.postal_code ?? "",
      email: shippingAddress.email ?? undefined,
      phone: shippingAddress.phone ?? undefined,
    };

    // 6. Submit to Printful
    const printfulOrder: PrintfulOrderInput = {
      external_id: orderId,
      recipient,
      items: printfulItems,
      retail_costs: {
        subtotal: order.subtotal,
        shipping: order.shippingCost ?? "0",
        tax: order.tax ?? "0",
      },
    };

    const result = await this.adapter.createOrder(client, printfulOrder);

    // 7. Update order status to processing
    await db
      .update(orders)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    return {
      orderId,
      printfulOrderId: result.printfulOrderId,
      status: result.status,
      costs: result.costs,
    };
  }
}
