import type { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { ValidationError } from "../../shared/errors";

type DimensionStatus = "healthy" | "watch" | "critical";
type BacklogStatus = "candidate" | "planned" | "in_progress";
type BacklogPriority = "p0" | "p1" | "p2";

interface FeatureCostModel {
  key: string;
  label: string;
  team: string;
  eventTypes: readonly string[];
  costPerEventUsd: number;
  baseDailyCostUsd: number;
  revenueWeight: number;
  targetRevenueToCostRatio: number;
  targetCostPerOrderUsd: number;
  optimizationHint: string;
}

export interface CostDimensionRow {
  key: string;
  label: string;
  team?: string;
  events: number;
  orders: number;
  estimatedCostUsd: number;
  attributedRevenueUsd: number;
  costPerOrderUsd: number;
  revenueToCostRatio: number;
  status: DimensionStatus;
  optimizationHint: string;
}

export interface UnitEconomicsSummary {
  totalEstimatedCostUsd: number;
  totalRevenueUsd: number;
  contributionMarginUsd: number;
  blendedCostPerOrderUsd: number;
  blendedRevenueToCostRatio: number;
  totalOrders: number;
}

export interface CostOptimizationBacklogItem {
  id: string;
  title: string;
  dimension: "feature" | "team" | "tenant";
  ownerTeam: string;
  estimatedMonthlySavingsUsd: number;
  status: BacklogStatus;
  priority: BacklogPriority;
  rationale: string;
}

export interface CostObservabilityDashboard {
  dateFrom: string;
  dateTo: string;
  summary: UnitEconomicsSummary;
  dimensions: {
    feature: CostDimensionRow[];
    team: CostDimensionRow[];
    tenant: CostDimensionRow[];
  };
  optimizationBacklog: CostOptimizationBacklogItem[];
}

const FEATURE_COST_MODELS: readonly FeatureCostModel[] = [
  {
    key: "acquisition",
    label: "Acquisition surfaces",
    team: "growth",
    eventTypes: ["page_view", "product_view", "search_performed"],
    costPerEventUsd: 0.0028,
    baseDailyCostUsd: 5.6,
    revenueWeight: 0.22,
    targetRevenueToCostRatio: 3.8,
    targetCostPerOrderUsd: 1.25,
    optimizationHint: "Improve landing-page cache hit rates and reduce duplicate page view events.",
  },
  {
    key: "conversion",
    label: "Checkout conversion",
    team: "checkout",
    eventTypes: ["add_to_cart", "checkout_started", "purchase", "order_completed"],
    costPerEventUsd: 0.0074,
    baseDailyCostUsd: 8.4,
    revenueWeight: 0.42,
    targetRevenueToCostRatio: 5.5,
    targetCostPerOrderUsd: 2.15,
    optimizationHint: "Trim validation retries and collapse repeated checkout calls into idempotent flows.",
  },
  {
    key: "retention",
    label: "Retention and lifecycle",
    team: "lifecycle",
    eventTypes: ["subscription_renewed", "email_clicked", "loyalty_redeemed", "account_login"],
    costPerEventUsd: 0.0041,
    baseDailyCostUsd: 4.7,
    revenueWeight: 0.21,
    targetRevenueToCostRatio: 4.2,
    targetCostPerOrderUsd: 1.4,
    optimizationHint: "Throttle low-yield lifecycle campaigns and de-duplicate webhook delivery.",
  },
  {
    key: "operations",
    label: "Fulfillment and support operations",
    team: "operations",
    eventTypes: [
      "fulfillment_job_processed",
      "fulfillment_succeeded",
      "fulfillment_job_failed",
      "fulfillment_failed",
      "support_ticket_created",
    ],
    costPerEventUsd: 0.0069,
    baseDailyCostUsd: 6.2,
    revenueWeight: 0.15,
    targetRevenueToCostRatio: 3.2,
    targetCostPerOrderUsd: 1.8,
    optimizationHint: "Auto-remediate known fulfillment failure signatures and reduce manual escalations.",
  },
] as const;

const TEAM_LABELS: Record<string, string> = {
  growth: "Growth",
  checkout: "Checkout",
  lifecycle: "Lifecycle",
  operations: "Operations",
};

function daysBetweenInclusive(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00.000Z`).getTime();
  const end = new Date(`${to}T00:00:00.000Z`).getTime();
  const diff = Math.max(0, end - start);
  return Math.floor(diff / 86_400_000) + 1;
}

function toCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function safeRatio(numerator: number, denominator: number): number {
  if (denominator <= 0) return numerator > 0 ? 99 : 0;
  return Number((numerator / denominator).toFixed(3));
}

function toPercentWeight(value: number, total: number): number {
  if (total <= 0) return 0;
  return value / total;
}

function resolveStatus(input: {
  revenueToCostRatio: number;
  costPerOrderUsd: number;
  targetRevenueToCostRatio: number;
  targetCostPerOrderUsd: number;
}): DimensionStatus {
  const ratioGap = input.revenueToCostRatio / input.targetRevenueToCostRatio;
  const costGap = input.costPerOrderUsd / Math.max(0.01, input.targetCostPerOrderUsd);

  if (ratioGap >= 1 && costGap <= 1) return "healthy";
  if (ratioGap < 0.8 || costGap > 1.25) return "critical";
  return "watch";
}

function compareBySeverityAndCost(a: CostDimensionRow, b: CostDimensionRow): number {
  const rank: Record<DimensionStatus, number> = {
    critical: 3,
    watch: 2,
    healthy: 1,
  };
  const severityDelta = rank[b.status] - rank[a.status];
  if (severityDelta !== 0) return severityDelta;
  return b.estimatedCostUsd - a.estimatedCostUsd;
}

function sumDimensionRows(rows: CostDimensionRow[]): CostDimensionRow {
  const totalEvents = rows.reduce((sum, row) => sum + row.events, 0);
  const totalOrders = rows.reduce((sum, row) => sum + row.orders, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.estimatedCostUsd, 0);
  const totalRevenue = rows.reduce((sum, row) => sum + row.attributedRevenueUsd, 0);
  const costPerOrder = totalOrders > 0 ? totalCost / totalOrders : totalCost;
  const ratio = safeRatio(totalRevenue, totalCost);
  const hasCritical = rows.some((row) => row.status === "critical");
  const hasWatch = rows.some((row) => row.status === "watch");

  return {
    key: "total",
    label: "Total",
    events: totalEvents,
    orders: totalOrders,
    estimatedCostUsd: toCurrency(totalCost),
    attributedRevenueUsd: toCurrency(totalRevenue),
    costPerOrderUsd: toCurrency(costPerOrder),
    revenueToCostRatio: ratio,
    status: hasCritical ? "critical" : hasWatch ? "watch" : "healthy",
    optimizationHint: "Aggregate row",
  };
}

export class GetCostObservabilityUseCase {
  constructor(
    private analyticsRepo: AnalyticsRepository,
    private storeId: string,
  ) {}

  async execute(dateFrom: string, dateTo: string): Promise<CostObservabilityDashboard> {
    if (!dateFrom || !dateTo) {
      throw new ValidationError("dateFrom and dateTo are required");
    }
    if (dateFrom > dateTo) {
      throw new ValidationError("dateFrom must be before dateTo");
    }

    const days = daysBetweenInclusive(dateFrom, dateTo);
    const rollups = await this.analyticsRepo.queryRollups(dateFrom, dateTo);

    let totalRevenue = 0;
    let totalOrders = 0;
    for (const rollup of rollups) {
      const value = Number(rollup.value ?? 0);
      const count = Number(rollup.count ?? 0);
      if (rollup.metric === "revenue") totalRevenue += value;
      if (rollup.metric === "purchases") totalOrders += count;
    }

    const eventTypes = [...new Set(FEATURE_COST_MODELS.flatMap((model) => [...model.eventTypes]))];
    const eventCountMap = await this.analyticsRepo.countEventsByType(dateFrom, dateTo, eventTypes);

    const totalWeight = FEATURE_COST_MODELS.reduce((sum, model) => sum + model.revenueWeight, 0);
    const featureRows: CostDimensionRow[] = FEATURE_COST_MODELS.map((model) => {
      const events = model.eventTypes.reduce(
        (sum, eventType) => sum + (eventCountMap.get(eventType) ?? 0),
        0,
      );
      const attributedRevenue = totalRevenue * toPercentWeight(model.revenueWeight, totalWeight);
      const attributedOrders = Math.round(totalOrders * toPercentWeight(model.revenueWeight, totalWeight));
      const variableCost = events * model.costPerEventUsd;
      const fixedCost = model.baseDailyCostUsd * days;
      const estimatedCost = variableCost + fixedCost;
      const costPerOrderUsd = attributedOrders > 0 ? estimatedCost / attributedOrders : estimatedCost;
      const revenueToCostRatio = safeRatio(attributedRevenue, estimatedCost);

      return {
        key: model.key,
        label: model.label,
        team: model.team,
        events,
        orders: attributedOrders,
        estimatedCostUsd: toCurrency(estimatedCost),
        attributedRevenueUsd: toCurrency(attributedRevenue),
        costPerOrderUsd: toCurrency(costPerOrderUsd),
        revenueToCostRatio,
        status: resolveStatus({
          revenueToCostRatio,
          costPerOrderUsd,
          targetRevenueToCostRatio: model.targetRevenueToCostRatio,
          targetCostPerOrderUsd: model.targetCostPerOrderUsd,
        }),
        optimizationHint: model.optimizationHint,
      };
    }).sort(compareBySeverityAndCost);

    const teamRows = [...new Set(featureRows.map((row) => row.team).filter(Boolean) as string[])]
      .map((teamKey) => {
        const rows = featureRows.filter((row) => row.team === teamKey);
        const totals = sumDimensionRows(rows);
        return {
          ...totals,
          key: teamKey,
          label: TEAM_LABELS[teamKey] ?? teamKey,
          team: teamKey,
          optimizationHint: `Reduce blended costs in ${TEAM_LABELS[teamKey] ?? teamKey} workflows.`,
        };
      })
      .sort(compareBySeverityAndCost);

    const totalFeatureCost = featureRows.reduce((sum, row) => sum + row.estimatedCostUsd, 0);
    const totalFeatureRevenue = featureRows.reduce((sum, row) => sum + row.attributedRevenueUsd, 0);
    const totalFeatureOrders = featureRows.reduce((sum, row) => sum + row.orders, 0);
    const sharedPlatformCost = totalFeatureCost * 0.18;
    const directTenantCost = Math.max(0, totalFeatureCost - sharedPlatformCost);
    const sharedPlatformRevenue = totalFeatureRevenue * 0.12;
    const directTenantRevenue = Math.max(0, totalFeatureRevenue - sharedPlatformRevenue);
    const sharedPlatformOrders = Math.round(totalFeatureOrders * 0.12);
    const directTenantOrders = Math.max(0, totalFeatureOrders - sharedPlatformOrders);

    const tenantRows: CostDimensionRow[] = [
      {
        key: `tenant:${this.storeId}`,
        label: `Store ${this.storeId.slice(0, 8)}`,
        events: featureRows.reduce((sum, row) => sum + row.events, 0),
        orders: directTenantOrders,
        estimatedCostUsd: toCurrency(directTenantCost),
        attributedRevenueUsd: toCurrency(directTenantRevenue),
        costPerOrderUsd: toCurrency(
          directTenantOrders > 0 ? directTenantCost / directTenantOrders : directTenantCost,
        ),
        revenueToCostRatio: safeRatio(directTenantRevenue, directTenantCost),
        status: resolveStatus({
          revenueToCostRatio: safeRatio(directTenantRevenue, directTenantCost),
          costPerOrderUsd:
            directTenantOrders > 0 ? directTenantCost / directTenantOrders : directTenantCost,
          targetRevenueToCostRatio: 4.2,
          targetCostPerOrderUsd: 2.1,
        }),
        optimizationHint: "Shift high-volume calls to cached read paths for this tenant.",
      },
      {
        key: "tenant:shared-platform",
        label: "Shared platform overhead",
        events: 0,
        orders: sharedPlatformOrders,
        estimatedCostUsd: toCurrency(sharedPlatformCost),
        attributedRevenueUsd: toCurrency(sharedPlatformRevenue),
        costPerOrderUsd: toCurrency(
          sharedPlatformOrders > 0 ? sharedPlatformCost / sharedPlatformOrders : sharedPlatformCost,
        ),
        revenueToCostRatio: safeRatio(sharedPlatformRevenue, sharedPlatformCost),
        status: resolveStatus({
          revenueToCostRatio: safeRatio(sharedPlatformRevenue, sharedPlatformCost),
          costPerOrderUsd:
            sharedPlatformOrders > 0 ? sharedPlatformCost / sharedPlatformOrders : sharedPlatformCost,
          targetRevenueToCostRatio: 2.4,
          targetCostPerOrderUsd: 1.6,
        }),
        optimizationHint: "Consolidate shared queue consumers and cap retry fan-out.",
      },
    ].sort(compareBySeverityAndCost);

    const summaryTotalCost = toCurrency(totalFeatureCost);
    const summaryTotalRevenue = toCurrency(totalFeatureRevenue);
    const contributionMargin = toCurrency(summaryTotalRevenue - summaryTotalCost);
    const blendedCostPerOrder = toCurrency(
      totalFeatureOrders > 0 ? summaryTotalCost / totalFeatureOrders : summaryTotalCost,
    );
    const blendedRevenueToCostRatio = safeRatio(summaryTotalRevenue, summaryTotalCost);

    const topBacklogRows = [...featureRows]
      .sort(compareBySeverityAndCost)
      .slice(0, 4);

    const optimizationBacklog: CostOptimizationBacklogItem[] = topBacklogRows.map((row, index) => {
      const estimatedMonthlySavingsUsd =
        (row.status === "critical" ? 0.22 : row.status === "watch" ? 0.14 : 0.08) *
        (row.estimatedCostUsd * (30 / Math.max(1, days)));

      return {
        id: `cost-opt-${String(index + 1).padStart(3, "0")}`,
        title: `Optimize ${row.label.toLowerCase()}`,
        dimension: "feature",
        ownerTeam: row.team ?? "platform",
        estimatedMonthlySavingsUsd: toCurrency(estimatedMonthlySavingsUsd),
        status:
          row.status === "critical"
            ? "planned"
            : row.status === "watch"
              ? "candidate"
              : "in_progress",
        priority:
          row.status === "critical"
            ? "p0"
            : row.status === "watch"
              ? "p1"
              : "p2",
        rationale: row.optimizationHint,
      };
    });

    return {
      dateFrom,
      dateTo,
      summary: {
        totalEstimatedCostUsd: summaryTotalCost,
        totalRevenueUsd: summaryTotalRevenue,
        contributionMarginUsd: contributionMargin,
        blendedCostPerOrderUsd: blendedCostPerOrder,
        blendedRevenueToCostRatio,
        totalOrders: totalFeatureOrders,
      },
      dimensions: {
        feature: featureRows,
        team: teamRows,
        tenant: tenantRows,
      },
      optimizationBacklog,
    };
  }
}
