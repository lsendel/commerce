import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { AnalyticsRepository } from "../infrastructure/repositories/analytics.repository";
import {
  SegmentAdapter,
  type SegmentEvent,
} from "../infrastructure/analytics/segment.adapter";
import { stores } from "../infrastructure/db/schema";

const BATCH_LIMIT = 100;

/**
 * Every 15 minutes: batch-forward recent analytics events to an external
 * service (Segment/Mixpanel) if configured.
 */
export async function runPushAnalyticsExternal(env: Env): Promise<void> {
  const db = createDb(env.DATABASE_URL);

  // Use SEGMENT_WRITE_KEY env var if present (optional)
  const segmentWriteKey = (env as unknown as Record<string, unknown>)[
    "SEGMENT_WRITE_KEY"
  ] as string | undefined;
  const adapter = new SegmentAdapter(segmentWriteKey);

  try {
    const allStores = await db.select({ id: stores.id }).from(stores);

    let totalPushed = 0;

    for (const store of allStores) {
      try {
        const analyticsRepo = new AnalyticsRepository(db, store.id);
        const recentEvents = await analyticsRepo.getRecentEvents(BATCH_LIMIT);

        if (recentEvents.length === 0) continue;

        const segmentEvents: SegmentEvent[] = recentEvents.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          sessionId: e.sessionId,
          userId: e.userId,
          properties: (e.properties as Record<string, unknown>) ?? {},
          pageUrl: e.pageUrl,
          referrer: e.referrer,
          userAgent: e.userAgent,
          createdAt: e.createdAt,
        }));

        const sent = await adapter.sendBatch(segmentEvents);
        totalPushed += sent;
      } catch (error) {
        console.error(
          `[push-analytics-external] Failed for store ${store.id}:`,
          error,
        );
      }
    }

    console.log(
      `[push-analytics-external] Pushed ${totalPushed} event(s) to external service`,
    );
  } catch (error) {
    console.error("[push-analytics-external] Job failed:", error);
  }
}
