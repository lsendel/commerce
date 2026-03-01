import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { createDb } from "../../infrastructure/db/client";
import { orders, users } from "../../infrastructure/db/schema";
import type { SegmentRule } from "../../domain/promotions/customer-segment.entity";

type Db = ReturnType<typeof createDb>;

export async function evaluateSegmentRule(
  db: Db,
  storeId: string,
  rule: SegmentRule,
): Promise<string[]> {
  switch (rule.type) {
    case "total_spent": {
      const rows = await db
        .select({ userId: orders.userId })
        .from(orders)
        .where(eq(orders.storeId, storeId))
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
        .where(eq(orders.storeId, storeId))
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
        .selectDistinct({ id: users.id })
        .from(users)
        .innerJoin(orders, eq(orders.userId, users.id))
        .where(
          and(
            eq(orders.storeId, storeId),
            lte(users.createdAt, new Date(rule.date)),
          ),
        );
      return rows.map((r) => r.id);
    }

    case "and": {
      const results = await Promise.all(
        rule.children.map((child) => evaluateSegmentRule(db, storeId, child)),
      );
      if (results.length === 0) return [];
      let intersection = new Set(results[0]);
      for (let i = 1; i < results.length; i++) {
        const nextSet = new Set(results[i]);
        intersection = new Set([...intersection].filter((id) => nextSet.has(id)));
      }
      return [...intersection];
    }

    case "or": {
      const results = await Promise.all(
        rule.children.map((child) => evaluateSegmentRule(db, storeId, child)),
      );
      return [...new Set(results.flat())];
    }
  }
}

