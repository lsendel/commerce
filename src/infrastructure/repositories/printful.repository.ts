import { eq, and } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  printfulSyncProducts,
  printfulSyncVariants,
  shipments,
} from "../db/schema";

export class PrintfulRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  // ─── Sync Products ─────────────────────────────────────────────────────────

  /**
   * Upsert a Printful sync product by its printfulId.
   */
  async upsertSyncProduct(data: {
    printfulId: number;
    productId: string;
    externalId?: string;
  }) {
    const existing = await this.db
      .select()
      .from(printfulSyncProducts)
      .where(and(eq(printfulSyncProducts.printfulId, data.printfulId), eq(printfulSyncProducts.storeId, this.storeId)))
      .limit(1);

    if (existing.length > 0) {
      const updated = await this.db
        .update(printfulSyncProducts)
        .set({
          productId: data.productId,
          externalId: data.externalId ?? existing[0].externalId,
          syncedAt: new Date(),
        })
        .where(eq(printfulSyncProducts.printfulId, data.printfulId))
        .returning();

      return updated[0];
    }

    const inserted = await this.db
      .insert(printfulSyncProducts)
      .values({
        storeId: this.storeId,
        printfulId: data.printfulId,
        productId: data.productId,
        externalId: data.externalId ?? null,
        syncedAt: new Date(),
      })
      .returning();

    return inserted[0];
  }

  // ─── Sync Variants ────────────────────────────────────────────────────────

  /**
   * Upsert a Printful sync variant by its printfulId.
   */
  async upsertSyncVariant(data: {
    printfulId: number;
    variantId: string;
    printfulProductId?: number;
  }) {
    const existing = await this.db
      .select()
      .from(printfulSyncVariants)
      .where(eq(printfulSyncVariants.printfulId, data.printfulId))
      .limit(1);

    if (existing.length > 0) {
      const updated = await this.db
        .update(printfulSyncVariants)
        .set({
          variantId: data.variantId,
          printfulProductId:
            data.printfulProductId ?? existing[0].printfulProductId,
          syncedAt: new Date(),
        })
        .where(eq(printfulSyncVariants.printfulId, data.printfulId))
        .returning();

      return updated[0];
    }

    const inserted = await this.db
      .insert(printfulSyncVariants)
      .values({
        printfulId: data.printfulId,
        variantId: data.variantId,
        printfulProductId: data.printfulProductId ?? null,
        syncedAt: new Date(),
      })
      .returning();

    return inserted[0];
  }

  // ─── Lookups ──────────────────────────────────────────────────────────────

  /**
   * Find a sync product by our internal product UUID.
   */
  async findSyncProductByProductId(productId: string) {
    const rows = await this.db
      .select()
      .from(printfulSyncProducts)
      .where(and(eq(printfulSyncProducts.productId, productId), eq(printfulSyncProducts.storeId, this.storeId)))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Find a sync variant by our internal variant UUID.
   */
  async findSyncVariantByVariantId(variantId: string) {
    const rows = await this.db
      .select()
      .from(printfulSyncVariants)
      .where(eq(printfulSyncVariants.variantId, variantId))
      .limit(1);

    return rows[0] ?? null;
  }

  // ─── Shipments ────────────────────────────────────────────────────────────

  /**
   * Insert a new shipment record.
   */
  async createShipment(data: {
    orderId: string;
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    status?: "pending" | "shipped" | "in_transit" | "delivered" | "returned";
    shippedAt?: Date;
  }) {
    const inserted = await this.db
      .insert(shipments)
      .values({
        storeId: this.storeId,
        orderId: data.orderId,
        carrier: data.carrier ?? null,
        trackingNumber: data.trackingNumber ?? null,
        trackingUrl: data.trackingUrl ?? null,
        status: data.status ?? "pending",
        shippedAt: data.shippedAt ?? null,
      })
      .returning();

    return inserted[0];
  }

  /**
   * List all shipments for a given order.
   */
  async findShipmentsByOrderId(orderId: string) {
    return this.db
      .select()
      .from(shipments)
      .where(and(eq(shipments.orderId, orderId), eq(shipments.storeId, this.storeId)));
  }

  /**
   * Update the status of a shipment.
   */
  async updateShipmentStatus(
    id: string,
    status: "pending" | "shipped" | "in_transit" | "delivered" | "returned",
  ) {
    const deliveredAt =
      status === "delivered" ? new Date() : undefined;

    const updated = await this.db
      .update(shipments)
      .set({
        status,
        ...(deliveredAt ? { deliveredAt } : {}),
      })
      .where(and(eq(shipments.id, id), eq(shipments.storeId, this.storeId)))
      .returning();

    return updated[0] ?? null;
  }
}
