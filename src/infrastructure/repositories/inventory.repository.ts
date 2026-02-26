import { eq, and, sql, lt } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  productVariants,
  inventoryReservations,
} from "../db/schema";

export class InventoryRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async reserve(variantId: string, cartItemId: string, quantity: number, ttlMinutes = 15) {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    // Atomic check-and-reserve: only succeeds if enough unreserved stock
    const updated = await this.db
      .update(productVariants)
      .set({
        reservedQuantity: sql`${productVariants.reservedQuantity} + ${quantity}`,
      })
      .where(
        and(
          eq(productVariants.id, variantId),
          sql`${productVariants.inventoryQuantity} - ${productVariants.reservedQuantity} >= ${quantity}`,
        ),
      )
      .returning();

    if (updated.length === 0) {
      return null; // insufficient stock
    }

    const inserted = await this.db
      .insert(inventoryReservations)
      .values({ variantId, cartItemId, quantity, expiresAt })
      .returning();

    return inserted[0] ?? null;
  }

  async release(reservationId: string) {
    const rows = await this.db
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.id, reservationId),
          eq(inventoryReservations.status, "held"),
        ),
      )
      .limit(1);

    const reservation = rows[0];
    if (!reservation) return null;

    // Decrement reserved quantity on variant
    await this.db
      .update(productVariants)
      .set({
        reservedQuantity: sql`GREATEST(${productVariants.reservedQuantity} - ${reservation.quantity}, 0)`,
      })
      .where(eq(productVariants.id, reservation.variantId));

    // Mark reservation as released
    const released = await this.db
      .update(inventoryReservations)
      .set({ status: "released" })
      .where(eq(inventoryReservations.id, reservationId))
      .returning();

    return released[0] ?? null;
  }

  async commit(reservationId: string) {
    const rows = await this.db
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.id, reservationId),
          eq(inventoryReservations.status, "held"),
        ),
      )
      .limit(1);

    const reservation = rows[0];
    if (!reservation) return null;

    // Decrement both inventory and reserved quantity atomically
    await this.db
      .update(productVariants)
      .set({
        inventoryQuantity: sql`${productVariants.inventoryQuantity} - ${reservation.quantity}`,
        reservedQuantity: sql`GREATEST(${productVariants.reservedQuantity} - ${reservation.quantity}, 0)`,
      })
      .where(eq(productVariants.id, reservation.variantId));

    const committed = await this.db
      .update(inventoryReservations)
      .set({ status: "converted" })
      .where(eq(inventoryReservations.id, reservationId))
      .returning();

    return committed[0] ?? null;
  }

  async findByCartItem(cartItemId: string) {
    const rows = await this.db
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.cartItemId, cartItemId),
          eq(inventoryReservations.status, "held"),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async releaseExpired() {
    const now = new Date();
    const expired = await this.db
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.status, "held"),
          lt(inventoryReservations.expiresAt, now),
        ),
      );

    let releasedCount = 0;
    for (const reservation of expired) {
      await this.release(reservation.id);
      releasedCount++;
    }
    return releasedCount;
  }
}
