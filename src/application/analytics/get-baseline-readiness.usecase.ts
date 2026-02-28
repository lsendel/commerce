import type { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";

interface WindowMetrics {
  pageViews: number;
  addToCartCount: number;
  checkoutStartedCount: number;
  purchaseCount: number;
  conversionRate: number;
}

function aggregateWindowMetrics(
  rollups: Array<{ metric: string; count: number | null }>,
): WindowMetrics {
  let pageViews = 0;
  let addToCartCount = 0;
  let checkoutStartedCount = 0;
  let purchaseCount = 0;

  for (const rollup of rollups) {
    const count = Number(rollup.count ?? 0);
    if (rollup.metric === "page_views") pageViews += count;
    if (rollup.metric === "add_to_cart") addToCartCount += count;
    if (rollup.metric === "checkout_started") checkoutStartedCount += count;
    if (rollup.metric === "purchases") purchaseCount += count;
  }

  return {
    pageViews,
    addToCartCount,
    checkoutStartedCount,
    purchaseCount,
    conversionRate:
      checkoutStartedCount > 0 ? purchaseCount / checkoutStartedCount : 0,
  };
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function sumEventTypes(
  counts: Map<string, number>,
  eventTypes: readonly string[],
): number {
  return eventTypes.reduce((sum, eventType) => sum + (counts.get(eventType) ?? 0), 0);
}

export class GetBaselineReadinessUseCase {
  constructor(private analyticsRepo: AnalyticsRepository) {}

  async execute(days = 7) {
    const clampedDays = Math.max(3, Math.min(days, 30));
    const today = new Date();
    const currentTo = formatUtcDate(today);
    const currentFrom = formatUtcDate(addDays(today, -(clampedDays - 1)));

    const previousTo = formatUtcDate(addDays(today, -clampedDays));
    const previousFrom = formatUtcDate(addDays(today, -((2 * clampedDays) - 1)));

    const [currentRollups, previousRollups] = await Promise.all([
      this.analyticsRepo.queryRollups(currentFrom, currentTo),
      this.analyticsRepo.queryRollups(previousFrom, previousTo),
    ]);

    const current = aggregateWindowMetrics(currentRollups);
    const previous = aggregateWindowMetrics(previousRollups);

    const conversionDeltaPercent =
      previous.conversionRate > 0
        ? ((current.conversionRate - previous.conversionRate) / previous.conversionRate) * 100
        : null;

    const currentEventCounts = await this.analyticsRepo.countEventsByType(
      currentFrom,
      currentTo,
      [
        "fulfillment_job_failed",
        "fulfillment_failed",
        "fulfillment_job_processed",
        "fulfillment_processed",
        "fulfillment_succeeded",
        "incident_p1_open_over_60m",
      ],
    );

    const failedFulfillmentCount = sumEventTypes(currentEventCounts, [
      "fulfillment_job_failed",
      "fulfillment_failed",
    ]);
    const processedFulfillmentCount = sumEventTypes(currentEventCounts, [
      "fulfillment_job_processed",
      "fulfillment_processed",
      "fulfillment_succeeded",
    ]);
    const totalFulfillmentOps = failedFulfillmentCount + processedFulfillmentCount;

    const fulfillmentFailureRatePercent =
      totalFulfillmentOps > 0
        ? (failedFulfillmentCount / totalFulfillmentOps) * 100
        : null;

    const p1Over60Count = currentEventCounts.get("incident_p1_open_over_60m") ?? 0;

    return {
      windowDays: clampedDays,
      currentWindow: { from: currentFrom, to: currentTo, ...current },
      previousWindow: { from: previousFrom, to: previousTo, ...previous },
      safetyRails: {
        conversionDropPercent: conversionDeltaPercent,
        conversionDropThresholdPercent: -5,
        conversionDropTriggered:
          conversionDeltaPercent !== null && conversionDeltaPercent < -5,
        fulfillmentFailureRatePercent,
        fulfillmentFailureThresholdPercent: 2,
        fulfillmentFailureTriggered:
          fulfillmentFailureRatePercent !== null && fulfillmentFailureRatePercent > 2,
        p1Over60IncidentCount: p1Over60Count,
        p1Over60Triggered: p1Over60Count > 0,
      },
    };
  }
}
