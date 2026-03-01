import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { eq } from "drizzle-orm";
import {
  customerSegments,
  customerSegmentMemberships,
  stores,
} from "../infrastructure/db/schema";
import type { SegmentRule } from "../domain/promotions/customer-segment.entity";
import { evaluateSegmentRule } from "../application/promotions/segment-rule-evaluator";

export async function runRefreshCustomerSegments(env: Env) {
  const db = createDb(env.DATABASE_URL);

  try {
    // Get all stores
    const allStores = await db.select({ id: stores.id }).from(stores);

    for (const store of allStores) {
      const segments = await db
        .select()
        .from(customerSegments)
        .where(eq(customerSegments.storeId, store.id));

      for (const segment of segments) {
        const rules = segment.rules as SegmentRule;
        if (!rules || !("type" in rules)) continue;

        // Build qualifying customer IDs based on rules
        const customerIds = await evaluateSegmentRule(db, store.id, rules);

        // Clear existing memberships
        await db
          .delete(customerSegmentMemberships)
          .where(eq(customerSegmentMemberships.segmentId, segment.id));

        // Insert new memberships
        if (customerIds.length > 0) {
          await db.insert(customerSegmentMemberships).values(
            customerIds.map((customerId) => ({
              segmentId: segment.id,
              customerId,
            })),
          );
        }

        // Update member count and last refreshed time
        await db
          .update(customerSegments)
          .set({
            memberCount: customerIds.length,
            lastRefreshedAt: new Date(),
          })
          .where(eq(customerSegments.id, segment.id));
      }
    }

    console.log("[refresh-segments] Customer segments refreshed successfully");
  } catch (error) {
    console.error("[refresh-segments] Refresh failed:", error);
  }
}
