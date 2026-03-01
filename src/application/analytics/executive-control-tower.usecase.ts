import { and, eq, gte, sql } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import { fulfillmentRequests } from "../../infrastructure/db/schema";
import type { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { PolicyRepository } from "../../infrastructure/repositories/policy.repository";
import { GetBaselineReadinessUseCase } from "./get-baseline-readiness.usecase";
import { GetDashboardMetricsUseCase } from "./get-dashboard-metrics.usecase";
import {
  YOLO_WEEKLY_FLAG_MATRIX,
  type FeatureFlags,
} from "../../shared/feature-flags";

function toDayStart(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
}

function calculatePercentDelta(current: number, previous: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return clampPercent(((current - previous) / Math.abs(previous)) * 100);
}

function getPreviousRange(dateFrom: string, dateTo: string) {
  const from = toDayStart(dateFrom);
  const to = toDayStart(dateTo);
  const diffMs = Math.max(24 * 60 * 60 * 1000, to.getTime() - from.getTime() + 24 * 60 * 60 * 1000);
  const prevTo = new Date(from.getTime() - 24 * 60 * 60 * 1000);
  const prevFrom = new Date(prevTo.getTime() - diffMs + 24 * 60 * 60 * 1000);

  return {
    previousFrom: prevFrom.toISOString().slice(0, 10),
    previousTo: prevTo.toISOString().slice(0, 10),
  };
}

function deriveRiskLevel(input: {
  conversionDropPercent: number;
  fulfillmentFailureRatePercent: number;
  p1Over60IncidentCount: number;
  policyViolationErrorsLast7d: number;
}): "low" | "medium" | "high" {
  if (
    input.conversionDropPercent < -5 ||
    input.fulfillmentFailureRatePercent > 2 ||
    input.p1Over60IncidentCount > 0 ||
    input.policyViolationErrorsLast7d >= 10
  ) {
    return "high";
  }

  if (
    input.conversionDropPercent < -2 ||
    input.fulfillmentFailureRatePercent > 1 ||
    input.policyViolationErrorsLast7d >= 3
  ) {
    return "medium";
  }

  return "low";
}

export class ExecutiveControlTowerUseCase {
  private readonly policyRepository: PolicyRepository;

  constructor(
    private readonly db: Database,
    private readonly storeId: string,
    private readonly analyticsRepository: AnalyticsRepository,
  ) {
    this.policyRepository = new PolicyRepository(db, storeId);
  }

  async execute(input: {
    dateFrom: string;
    dateTo: string;
    featureFlags: FeatureFlags;
  }) {
    const { dateFrom, dateTo, featureFlags } = input;
    const { previousFrom, previousTo } = getPreviousRange(dateFrom, dateTo);

    const dashboardUseCase = new GetDashboardMetricsUseCase(this.analyticsRepository);
    const readinessUseCase = new GetBaselineReadinessUseCase(this.analyticsRepository);

    const [currentMetrics, previousMetrics, readiness, violationRows, fulfillmentRows] = await Promise.all([
      dashboardUseCase.execute(dateFrom, dateTo),
      dashboardUseCase.execute(previousFrom, previousTo),
      readinessUseCase.execute(7),
      this.policyRepository.listViolationsSince(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 1000),
      this.db
        .select({
          total: sql<number>`count(*)`,
          failed: sql<number>`sum(case when ${fulfillmentRequests.status} = 'failed' then 1 else 0 end)`,
        })
        .from(fulfillmentRequests)
        .where(
          and(
            eq(fulfillmentRequests.storeId, this.storeId),
            gte(fulfillmentRequests.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
          ),
        ),
    ]);

    const totalFulfillment = Number(fulfillmentRows[0]?.total ?? 0);
    const failedFulfillment = Number(fulfillmentRows[0]?.failed ?? 0);
    const fulfillmentFailureRatePercent =
      totalFulfillment > 0 ? clampPercent((failedFulfillment / totalFulfillment) * 100) : 0;

    const violationsByDomainMap = new Map<string, { total: number; errors: number; warnings: number }>();
    let policyViolationErrorsLast7d = 0;

    for (const violation of violationRows) {
      const current = violationsByDomainMap.get(violation.domain) ?? {
        total: 0,
        errors: 0,
        warnings: 0,
      };
      current.total += 1;
      if (violation.severity === "error") {
        current.errors += 1;
        policyViolationErrorsLast7d += 1;
      } else {
        current.warnings += 1;
      }
      violationsByDomainMap.set(violation.domain, current);
    }

    const violationsByDomain = Array.from(violationsByDomainMap.entries())
      .map(([domain, stats]) => ({
        domain,
        ...stats,
      }))
      .sort((a, b) => b.total - a.total);

    const enabledFlags = YOLO_WEEKLY_FLAG_MATRIX.filter((item) => featureFlags[item.key]);
    const rolloutItems = YOLO_WEEKLY_FLAG_MATRIX.map((item) => ({
      featureId: item.featureId,
      week: item.week,
      key: item.key,
      description: item.description,
      enabled: featureFlags[item.key],
    }));

    const conversionDropPercent = readiness.safetyRails.conversionDropPercent ?? 0;

    const riskLevel = deriveRiskLevel({
      conversionDropPercent,
      fulfillmentFailureRatePercent,
      p1Over60IncidentCount: readiness.safetyRails.p1Over60IncidentCount,
      policyViolationErrorsLast7d,
    });

    const blockers: string[] = [];
    if (conversionDropPercent < -5) {
      blockers.push("Conversion is below -5% safety rail.");
    }
    if (fulfillmentFailureRatePercent > 2) {
      blockers.push("Fulfillment failure rate exceeds 2% safety rail.");
    }
    if (readiness.safetyRails.p1Over60IncidentCount > 0) {
      blockers.push("There are open P1 incidents over 60 minutes.");
    }
    if (policyViolationErrorsLast7d > 0) {
      blockers.push(`${policyViolationErrorsLast7d} policy violations were blocked in the last 7 days.`);
    }

    return {
      snapshotAt: new Date().toISOString(),
      range: {
        dateFrom,
        dateTo,
        previousFrom,
        previousTo,
      },
      kpis: {
        revenue: currentMetrics.totalRevenue,
        orders: currentMetrics.orderCount,
        averageOrderValue: currentMetrics.averageOrderValue,
        conversionRate: currentMetrics.conversionRate,
        visitors: currentMetrics.uniqueVisitors,
        pageViews: currentMetrics.pageViews,
      },
      growth: {
        revenueDeltaPercent: calculatePercentDelta(currentMetrics.totalRevenue, previousMetrics.totalRevenue),
        ordersDeltaPercent: calculatePercentDelta(currentMetrics.orderCount, previousMetrics.orderCount),
        conversionDeltaPercent: calculatePercentDelta(currentMetrics.conversionRate, previousMetrics.conversionRate),
      },
      readiness: {
        conversionDropPercent,
        fulfillmentFailureRatePercent,
        p1Over60IncidentCount: readiness.safetyRails.p1Over60IncidentCount,
        baselineWindowDays: readiness.windowDays,
      },
      fulfillment: {
        totalRequestsLast7d: totalFulfillment,
        failedRequestsLast7d: failedFulfillment,
        failureRatePercentLast7d: fulfillmentFailureRatePercent,
      },
      policy: {
        violationsLast7d: violationRows.length,
        errorViolationsLast7d: policyViolationErrorsLast7d,
        violationsByDomain,
      },
      featureRollout: {
        enabledCount: enabledFlags.length,
        totalCount: YOLO_WEEKLY_FLAG_MATRIX.length,
        completionPercent: clampPercent((enabledFlags.length / YOLO_WEEKLY_FLAG_MATRIX.length) * 100),
        items: rolloutItems,
      },
      risk: {
        level: riskLevel,
        blockers,
      },
    };
  }
}
