import { PrintfulRepository } from "../../infrastructure/repositories/printful.repository";
import type { Database } from "../../infrastructure/db/client";

interface TrackShipmentInput {
  db: Database;
  orderId: string;
  userId: string;
}

export class TrackShipmentUseCase {
  /**
   * List all shipments for an order, verifying the user owns the order.
   */
  async execute(input: TrackShipmentInput) {
    const { db, orderId, userId } = input;
    const repo = new PrintfulRepository(db);

    // Verify the user owns the order
    const { eq, and } = await import("drizzle-orm");
    const { orders } = await import("../../infrastructure/db/schema");

    const orderRows = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .limit(1);

    if (orderRows.length === 0) {
      throw new Error("Order not found or access denied");
    }

    // Fetch shipments for the order
    const shipmentRows = await repo.findShipmentsByOrderId(orderId);

    return {
      shipments: shipmentRows.map((s) => ({
        id: s.id,
        orderId: s.orderId,
        carrier: s.carrier ?? "",
        trackingNumber: s.trackingNumber,
        trackingUrl: s.trackingUrl,
        status: s.status,
        shippedAt: s.shippedAt?.toISOString() ?? null,
        deliveredAt: s.deliveredAt?.toISOString() ?? null,
        createdAt: s.createdAt?.toISOString() ?? "",
      })),
    };
  }
}
