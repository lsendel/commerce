import type { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { ValidationError } from "../../shared/errors";

export interface DashboardMetrics {
  dateFrom: string;
  dateTo: string;
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  pageViews: number;
  uniqueVisitors: number;
  addToCartCount: number;
  checkoutStartedCount: number;
  conversionRate: number;
  dailyBreakdown: Array<{
    date: string;
    metric: string;
    value: number;
    count: number;
  }>;
}

export class GetDashboardMetricsUseCase {
  constructor(private analyticsRepo: AnalyticsRepository) {}

  /**
   * Query rollups for date range and compute dashboard metrics.
   */
  async execute(dateFrom: string, dateTo: string): Promise<DashboardMetrics> {
    if (!dateFrom || !dateTo) {
      throw new ValidationError("dateFrom and dateTo are required");
    }

    if (dateFrom > dateTo) {
      throw new ValidationError("dateFrom must be before dateTo");
    }

    const rollups = await this.analyticsRepo.queryRollups(dateFrom, dateTo);

    // Aggregate metrics across the date range
    let totalRevenue = 0;
    let orderCount = 0;
    let pageViews = 0;
    let uniqueVisitors = 0;
    let addToCartCount = 0;
    let checkoutStartedCount = 0;

    const dailyBreakdown: DashboardMetrics["dailyBreakdown"] = [];

    for (const rollup of rollups) {
      const value = Number(rollup.value ?? 0);
      const count = rollup.count ?? 0;

      dailyBreakdown.push({
        date: rollup.date,
        metric: rollup.metric,
        value,
        count,
      });

      switch (rollup.metric) {
        case "revenue":
          totalRevenue += value;
          break;
        case "purchases":
          orderCount += count;
          break;
        case "page_views":
          pageViews += count;
          break;
        case "unique_visitors":
          uniqueVisitors += count;
          break;
        case "add_to_cart":
          addToCartCount += count;
          break;
        case "checkout_started":
          checkoutStartedCount += count;
          break;
      }
    }

    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
    const conversionRate =
      checkoutStartedCount > 0 ? orderCount / checkoutStartedCount : 0;

    return {
      dateFrom,
      dateTo,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      orderCount,
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
      pageViews,
      uniqueVisitors,
      addToCartCount,
      checkoutStartedCount,
      conversionRate: Number(conversionRate.toFixed(4)),
      dailyBreakdown,
    };
  }
}
