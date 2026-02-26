import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { AnalyticsRepository } from "../infrastructure/repositories/analytics.repository";
import { stores } from "../infrastructure/db/schema";

/**
 * Daily job: aggregate yesterday's analytics events into daily rollups.
 * Runs at 2am UTC so the full previous day is complete.
 */
export async function runRollupAnalytics(env: Env): Promise<void> {
  const db = createDb(env.DATABASE_URL);

  // Calculate yesterday's date in YYYY-MM-DD format (UTC)
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0] ?? "";

  if (!dateStr) {
    console.error("[rollup-analytics] Failed to compute yesterday's date");
    return;
  }

  try {
    // Fetch all stores
    const allStores = await db.select({ id: stores.id }).from(stores);

    let rolledUp = 0;

    for (const store of allStores) {
      try {
        const analyticsRepo = new AnalyticsRepository(db, store.id);
        const metrics = await analyticsRepo.rollupDay(dateStr);
        const nonZero = metrics.filter((m) => m.count > 0 || Number(m.value) > 0);
        if (nonZero.length > 0) {
          rolledUp++;
        }
      } catch (error) {
        console.error(
          `[rollup-analytics] Failed to rollup store ${store.id}:`,
          error,
        );
      }
    }

    console.log(
      `[rollup-analytics] Rolled up ${dateStr} for ${rolledUp} store(s)`,
    );
  } catch (error) {
    console.error("[rollup-analytics] Job failed:", error);
  }
}
