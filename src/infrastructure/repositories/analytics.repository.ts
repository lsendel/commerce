import { eq, and, gte, lte, sql, count, countDistinct } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  analyticsEvents,
  analyticsDailyRollups,
} from "../db/schema";

export interface TrackEventData {
  sessionId?: string | null;
  userId?: string | null;
  eventType: string;
  properties?: Record<string, unknown>;
  pageUrl?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  ipHash?: string | null;
}

export class AnalyticsRepository {
  constructor(private db: Database, private storeId: string) {}

  /**
   * Insert a single analytics event (lightweight, no joins).
   */
  async trackEvent(data: TrackEventData) {
    const rows = await this.db
      .insert(analyticsEvents)
      .values({
        storeId: this.storeId,
        sessionId: data.sessionId ?? null,
        userId: data.userId ?? null,
        eventType: data.eventType,
        properties: data.properties ?? {},
        pageUrl: data.pageUrl ?? null,
        referrer: data.referrer ?? null,
        userAgent: data.userAgent ?? null,
        ipHash: data.ipHash ?? null,
      })
      .returning();

    return rows[0] ?? null;
  }

  /**
   * Query daily rollups by store, date range, and optional metric filter.
   */
  async queryRollups(
    dateFrom: string,
    dateTo: string,
    metric?: string,
  ) {
    const conditions = [
      eq(analyticsDailyRollups.storeId, this.storeId),
      gte(analyticsDailyRollups.date, dateFrom),
      lte(analyticsDailyRollups.date, dateTo),
    ];

    if (metric) {
      conditions.push(eq(analyticsDailyRollups.metric, metric));
    }

    const rows = await this.db
      .select()
      .from(analyticsDailyRollups)
      .where(and(...conditions));

    return rows;
  }

  /**
   * Aggregate a single day's events into rollups for this store.
   * Computes: page_views, unique_visitors, add_to_cart, checkout_started, purchases, revenue, aov.
   */
  async rollupDay(date: string) {
    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;

    const conditions = [
      eq(analyticsEvents.storeId, this.storeId),
      gte(analyticsEvents.createdAt, new Date(dayStart)),
      lte(analyticsEvents.createdAt, new Date(dayEnd)),
    ];

    // Count events by type
    const eventCounts = await this.db
      .select({
        eventType: analyticsEvents.eventType,
        total: count(),
      })
      .from(analyticsEvents)
      .where(and(...conditions))
      .groupBy(analyticsEvents.eventType);

    // Count unique visitors (distinct session IDs)
    const uniqueVisitorRows = await this.db
      .select({
        total: countDistinct(analyticsEvents.sessionId),
      })
      .from(analyticsEvents)
      .where(and(...conditions));

    const uniqueVisitors = uniqueVisitorRows[0]?.total ?? 0;

    // Build a map from event type to count
    const countMap = new Map<string, number>();
    for (const row of eventCounts) {
      countMap.set(row.eventType, row.total);
    }

    // Compute revenue from purchase events
    const purchaseEvents = await this.db
      .select({
        properties: analyticsEvents.properties,
      })
      .from(analyticsEvents)
      .where(
        and(
          ...conditions,
          eq(analyticsEvents.eventType, "purchase"),
        ),
      );

    let totalRevenue = 0;
    for (const event of purchaseEvents) {
      const props = event.properties as Record<string, unknown> | null;
      if (props && typeof props === "object" && "total" in props) {
        totalRevenue += Number(props.total) || 0;
      }
    }

    const purchaseCount = countMap.get("purchase") ?? 0;
    const aov = purchaseCount > 0 ? totalRevenue / purchaseCount : 0;
    const checkoutStarted = countMap.get("checkout_started") ?? 0;

    // Define rollup metrics to upsert
    const metrics: Array<{
      metric: string;
      value: string;
      count: number;
    }> = [
      {
        metric: "page_views",
        value: String(countMap.get("page_view") ?? 0),
        count: countMap.get("page_view") ?? 0,
      },
      {
        metric: "unique_visitors",
        value: String(uniqueVisitors),
        count: uniqueVisitors,
      },
      {
        metric: "add_to_cart",
        value: String(countMap.get("add_to_cart") ?? 0),
        count: countMap.get("add_to_cart") ?? 0,
      },
      {
        metric: "checkout_started",
        value: String(checkoutStarted),
        count: checkoutStarted,
      },
      {
        metric: "purchases",
        value: String(purchaseCount),
        count: purchaseCount,
      },
      {
        metric: "revenue",
        value: totalRevenue.toFixed(2),
        count: purchaseCount,
      },
      {
        metric: "aov",
        value: aov.toFixed(2),
        count: purchaseCount,
      },
    ];

    // Insert rollup rows (skip if zero to keep table lean)
    for (const m of metrics) {
      if (m.count === 0 && Number(m.value) === 0) continue;

      await this.db
        .insert(analyticsDailyRollups)
        .values({
          storeId: this.storeId,
          date,
          metric: m.metric,
          dimensions: {},
          value: m.value,
          count: m.count,
        });
    }

    return metrics;
  }

  /**
   * Fetch recent events for external push (batch).
   * Returns the most recent events ordered by creation time.
   */
  async getRecentEvents(limit: number) {
    const rows = await this.db
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.storeId, this.storeId))
      .orderBy(analyticsEvents.createdAt)
      .limit(limit);

    return rows;
  }
}
