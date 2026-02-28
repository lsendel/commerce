import { eq, and, gte, lte, count, inArray } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import { analyticsEvents } from "../../infrastructure/db/schema";

const FUNNEL_STEPS = ["page_view", "product_view", "add_to_cart", "checkout_started", "order_completed"] as const;
const EVENT_TYPES_BY_STEP: Record<(typeof FUNNEL_STEPS)[number], string[]> = {
  page_view: ["page_view"],
  product_view: ["product_view"],
  add_to_cart: ["add_to_cart"],
  checkout_started: ["checkout_started", "begin_checkout"],
  order_completed: ["purchase", "order_completed"],
};

export class GetConversionFunnelUseCase {
  constructor(private db: Database, private storeId: string) {}

  async execute(dateFrom: string, dateTo: string) {
    const includedEventTypes = Array.from(
      new Set(
        Object.values(EVENT_TYPES_BY_STEP).flat(),
      ),
    );

    const eventCounts = await this.db
      .select({
        eventType: analyticsEvents.eventType,
        total: count(),
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.storeId, this.storeId),
          gte(analyticsEvents.createdAt, new Date(`${dateFrom}T00:00:00Z`)),
          lte(analyticsEvents.createdAt, new Date(`${dateTo}T23:59:59Z`)),
          inArray(analyticsEvents.eventType, includedEventTypes),
        ),
      )
      .groupBy(analyticsEvents.eventType);

    const countMap = new Map(eventCounts.map((r) => [r.eventType, r.total]));

    const totalsByStep = new Map<string, number>();
    for (const step of FUNNEL_STEPS) {
      const stepEventTypes = EVENT_TYPES_BY_STEP[step] ?? [step];
      const total = stepEventTypes.reduce(
        (sum, eventType) => sum + (countMap.get(eventType) ?? 0),
        0,
      );
      totalsByStep.set(step, total);
    }

    return FUNNEL_STEPS.map((step, i) => {
      const total = totalsByStep.get(step) ?? 0;
      const prevTotal = i > 0 ? (totalsByStep.get(FUNNEL_STEPS[i - 1]!) ?? 0) : total;
      const dropOff = prevTotal > 0 ? ((prevTotal - total) / prevTotal) * 100 : 0;
      return { step, count: total, dropOffPercent: Number(dropOff.toFixed(1)) };
    });
  }
}
