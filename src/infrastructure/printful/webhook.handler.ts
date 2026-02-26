import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  orders,
  shipments,
  printfulSyncProducts,
  printfulSyncVariants,
  productVariants,
} from "../db/schema";

// ─── Printful Webhook event shapes ─────────────────────────────────────────

interface PrintfulWebhookEvent {
  type: string;
  created: number;
  retries: number;
  store: number;
  data: Record<string, unknown>;
}

interface PackageShippedData {
  order: {
    id: number;
    external_id: string;
    status: string;
  };
  shipment: {
    id: number;
    carrier: string;
    service: string;
    tracking_number: string;
    tracking_url: string;
    created: number;
    ship_date: string;
    shipped_at: number;
    reshipment: boolean;
    items: Array<{
      item_id: number;
      quantity: number;
    }>;
  };
}

interface OrderUpdatedData {
  order: {
    id: number;
    external_id: string;
    status: string;
    updated: number;
  };
}

interface StockUpdatedData {
  product: {
    id: number;
    name: string;
  };
  variant: {
    id: number;
    name: string;
    in_stock: boolean;
  };
}

// ─── Webhook Handler ───────────────────────────────────────────────────────

export class PrintfulWebhookHandler {
  /**
   * Verify the HMAC signature of an incoming Printful webhook request.
   * Printful signs the raw body with the webhook secret using HMAC-SHA256.
   */
  async verifySignature(
    rawBody: string,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(rawBody),
    );

    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison
    if (computedSignature.length !== signature.length) return false;

    let mismatch = 0;
    for (let i = 0; i < computedSignature.length; i++) {
      mismatch |= computedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
    }

    return mismatch === 0;
  }

  /**
   * Route a Printful webhook event to the appropriate handler.
   */
  async handleEvent(
    event: PrintfulWebhookEvent,
    db: Database,
  ): Promise<{ handled: boolean; type: string }> {
    switch (event.type) {
      case "package_shipped":
        await this.handlePackageShipped(
          event.data as unknown as PackageShippedData,
          db,
        );
        return { handled: true, type: event.type };

      case "order_updated":
        await this.handleOrderUpdated(
          event.data as unknown as OrderUpdatedData,
          db,
        );
        return { handled: true, type: event.type };

      case "stock_updated":
        await this.handleStockUpdated(
          event.data as unknown as StockUpdatedData,
          db,
        );
        return { handled: true, type: event.type };

      case "product_updated":
        await this.handleProductUpdated(event.data, db);
        return { handled: true, type: event.type };

      case "order_failed":
        await this.handleOrderFailed(event.data, db);
        return { handled: true, type: event.type };

      case "order_canceled":
        await this.handleOrderCanceled(event.data, db);
        return { handled: true, type: event.type };

      case "package_returned":
        await this.handlePackageReturned(event.data, db);
        return { handled: true, type: event.type };

      default:
        // Unhandled event type — acknowledge but do nothing
        return { handled: false, type: event.type };
    }
  }

  // ─── Private event handlers ──────────────────────────────────────────────

  /**
   * Handle package_shipped: create a shipment record and update the order status.
   */
  private async handlePackageShipped(data: PackageShippedData, db: Database) {
    const externalOrderId = data.order.external_id;

    // Find the local order by external_id (our order UUID)
    const orderRows = await db
      .select()
      .from(orders)
      .where(eq(orders.id, externalOrderId))
      .limit(1);

    const order = orderRows[0];
    if (!order) return;

    const shipmentData = data.shipment;

    // Create shipment record
    await db.insert(shipments).values({
      storeId: order.storeId,
      orderId: order.id,
      carrier: shipmentData.carrier,
      trackingNumber: shipmentData.tracking_number,
      trackingUrl: shipmentData.tracking_url,
      status: "shipped",
      shippedAt: new Date(shipmentData.shipped_at * 1000),
    });

    // Update order status to shipped
    await db
      .update(orders)
      .set({ status: "shipped", updatedAt: new Date() })
      .where(eq(orders.id, order.id));
  }

  /**
   * Handle order_updated: update the order status to reflect the Printful status.
   */
  private async handleOrderUpdated(data: OrderUpdatedData, db: Database) {
    const externalOrderId = data.order.external_id;

    const statusMap: Record<string, typeof orders.$inferInsert.status> = {
      fulfilled: "shipped",
      canceled: "cancelled",
      failed: "cancelled",
      pending: "processing",
      inprocess: "processing",
    };

    const mappedStatus = statusMap[data.order.status];
    if (!mappedStatus) return;

    await db
      .update(orders)
      .set({ status: mappedStatus, updatedAt: new Date() })
      .where(eq(orders.id, externalOrderId));
  }

  /**
   * Handle stock_updated: update the variant's available_for_sale status.
   */
  private async handleStockUpdated(data: StockUpdatedData, db: Database) {
    const printfulVariantId = data.variant.id;

    // Find local sync variant
    const syncVariantRows = await db
      .select()
      .from(printfulSyncVariants)
      .where(eq(printfulSyncVariants.printfulId, printfulVariantId))
      .limit(1);

    const syncVariant = syncVariantRows[0];
    if (!syncVariant) return;

    // Update product variant availability
    await db
      .update(productVariants)
      .set({ availableForSale: data.variant.in_stock })
      .where(eq(productVariants.id, syncVariant.variantId));
  }

  /**
   * Handle product_updated: log the update for re-sync.
   */
  private async handleProductUpdated(data: Record<string, unknown>, db: Database) {
    const product = data.product as { id?: number; external_id?: string } | undefined;
    if (!product?.external_id) return;

    const syncRows = await db
      .select()
      .from(printfulSyncProducts)
      .where(eq(printfulSyncProducts.productId, product.external_id))
      .limit(1);

    const syncRow = syncRows[0];
    if (syncRow) {
      await db
        .update(printfulSyncProducts)
        .set({ syncedAt: new Date() })
        .where(eq(printfulSyncProducts.id, syncRow.id));
    }
  }

  /**
   * Handle order_failed: mark the local order as cancelled.
   */
  private async handleOrderFailed(data: Record<string, unknown>, db: Database) {
    const order = data.order as { id?: number; external_id?: string } | undefined;
    if (!order?.external_id) return;

    await db
      .update(orders)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(orders.id, order.external_id));
  }

  /**
   * Handle order_canceled: mark the local order as cancelled.
   */
  private async handleOrderCanceled(data: Record<string, unknown>, db: Database) {
    const order = data.order as { id?: number; external_id?: string } | undefined;
    if (!order?.external_id) return;

    await db
      .update(orders)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(orders.id, order.external_id));
  }

  /**
   * Handle package_returned: update the shipment status.
   */
  private async handlePackageReturned(data: Record<string, unknown>, db: Database) {
    const order = data.order as { id?: number; external_id?: string } | undefined;
    if (!order?.external_id) return;

    // Find shipments for this order and mark as returned
    const shipmentRows = await db
      .select()
      .from(shipments)
      .where(eq(shipments.orderId, order.external_id));

    for (const shipment of shipmentRows) {
      await db
        .update(shipments)
        .set({ status: "returned" })
        .where(eq(shipments.id, shipment.id));
    }
  }
}
