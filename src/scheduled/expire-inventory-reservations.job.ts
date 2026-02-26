import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { InventoryRepository } from "../infrastructure/repositories/inventory.repository";
import { stores } from "../infrastructure/db/schema";

export async function runExpireInventoryReservations(env: Env): Promise<void> {
  const db = createDb(env.DATABASE_URL);

  // Run across all stores
  const allStores = await db.select({ id: stores.id }).from(stores);

  let totalReleased = 0;
  for (const store of allStores) {
    const repo = new InventoryRepository(db, store.id);
    const released = await repo.releaseExpired();
    totalReleased += released;
  }

  if (totalReleased > 0) {
    console.log(
      `[expire-inventory-reservations] Released ${totalReleased} expired reservation(s)`,
    );
  }
}
