import type { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";

export class GetRevenueMetricsUseCase {
  constructor(private analyticsRepo: AnalyticsRepository) {}

  async execute(dateFrom: string, dateTo: string) {
    const rollups = await this.analyticsRepo.queryRollups(dateFrom, dateTo, "revenue");

    const dailyRevenue = rollups.map((r) => ({
      date: r.date,
      revenue: Number(r.value ?? 0),
      orders: r.count ?? 0,
    }));

    const totalRevenue = dailyRevenue.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = dailyRevenue.reduce((sum, d) => sum + d.orders, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalOrders,
      avgOrderValue: Number(avgOrderValue.toFixed(2)),
      dailyRevenue,
    };
  }
}
