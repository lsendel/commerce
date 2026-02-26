import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { eq, sql, gte, lte, and } from "drizzle-orm";
import {
  customerSegments,
  customerSegmentMemberships,
  orders,
  users,
  stores,
} from "../infrastructure/db/schema";
import type { SegmentRule } from "../domain/promotions/customer-segment.entity";

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
        const customerIds = await evaluateSegmentRules(db, rules);

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

async function evaluateSegmentRules(
  db: ReturnType<typeof createDb>,
  rule: SegmentRule,
): Promise<string[]> {
  switch (rule.type) {
    case "total_spent": {
      const rows = await db
        .select({ userId: orders.userId })
        .from(orders)
        .groupBy(orders.userId)
        .having(
          rule.op === "gte"
            ? gte(sql`sum(${orders.total}::numeric)`, String(rule.value))
            : lte(sql`sum(${orders.total}::numeric)`, String(rule.value)),
        );
      return rows.map((r) => r.userId);
    }
    case "order_count": {
      const rows = await db
        .select({ userId: orders.userId })
        .from(orders)
        .groupBy(orders.userId)
        .having(
          rule.op === "gte"
            ? gte(sql`count(*)`, rule.value)
            : lte(sql`count(*)`, rule.value),
        );
      return rows.map((r) => r.userId);
    }
    case "registered_before": {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(lte(users.createdAt, new Date(rule.date)));
      return rows.map((r) => r.id);
    }
    case "and": {
      const results = await Promise.all(
        rule.children.map((child) => evaluateSegmentRules(db, child)),
      );
      // Intersection
      if (results.length === 0) return [];
      let intersection = new Set(results[0]);
      for (let i = 1; i < results.length; i++) {
        const nextSet = new Set(results[i]);
        intersection = new Set([...intersection].filter((x) => nextSet.has(x)));
      }
      return [...intersection];
    }
    case "or": {
      const results = await Promise.all(
        rule.children.map((child) => evaluateSegmentRules(db, child)),
      );
      // Union
      const union = new Set(results.flat());
      return [...union];
    }
    default:
      return [];
  }
}
