import type { FC } from "hono/jsx";

interface ControlTowerSummary {
  snapshotAt: string;
  range: {
    dateFrom: string;
    dateTo: string;
    previousFrom: string;
    previousTo: string;
  };
  kpis: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
    conversionRate: number;
    visitors: number;
    pageViews: number;
  };
  growth: {
    revenueDeltaPercent: number;
    ordersDeltaPercent: number;
    conversionDeltaPercent: number;
  };
  readiness: {
    conversionDropPercent: number;
    fulfillmentFailureRatePercent: number;
    p1Over60IncidentCount: number;
    baselineWindowDays: number;
  };
  fulfillment: {
    totalRequestsLast7d: number;
    failedRequestsLast7d: number;
    failureRatePercentLast7d: number;
  };
  policy: {
    violationsLast7d: number;
    errorViolationsLast7d: number;
    violationsByDomain: Array<{
      domain: string;
      total: number;
      errors: number;
      warnings: number;
    }>;
  };
  featureRollout: {
    enabledCount: number;
    totalCount: number;
    completionPercent: number;
    items: Array<{
      featureId: number;
      week: number;
      key: string;
      description: string;
      enabled: boolean;
    }>;
  };
  risk: {
    level: "low" | "medium" | "high";
    blockers: string[];
  };
}

interface ControlTowerPageProps {
  summary: ControlTowerSummary;
}

function riskBadgeClass(level: ControlTowerSummary["risk"]["level"]): string {
  switch (level) {
    case "high":
      return "bg-rose-100 text-rose-700";
    case "medium":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-emerald-100 text-emerald-700";
  }
}

function trendClass(value: number): string {
  return value >= 0 ? "text-emerald-700" : "text-rose-700";
}

function trendLabel(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export const ControlTowerPage: FC<ControlTowerPageProps> = ({ summary }) => {
  return (
    <div class="max-w-7xl mx-auto px-4 py-8">
      <div class="mb-8 rounded-2xl border border-slate-300 bg-gradient-to-r from-slate-50 via-gray-50 to-zinc-50 px-6 py-5">
        <nav class="text-xs text-slate-600 mb-1">
          <a href="/admin" class="hover:text-slate-900">Admin</a>
          <span class="mx-1">/</span>
          <span class="text-slate-900">Executive Control Tower</span>
        </nav>
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 class="text-2xl font-bold text-slate-900">Executive Control Tower</h1>
            <p class="mt-1 text-sm text-slate-600">
              Unified KPI, rollout, risk, and guardrail posture for operating decisions.
            </p>
          </div>
          <span class={`rounded-full px-3 py-1 text-xs font-semibold ${riskBadgeClass(summary.risk.level)}`}>
            Risk {summary.risk.level}
          </span>
        </div>
        <p class="mt-2 text-xs text-slate-500">
          Snapshot {summary.snapshotAt} · range {summary.range.dateFrom} to {summary.range.dateTo}
        </p>
      </div>

      <section class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <article class="rounded-xl border border-gray-200 bg-white p-4">
          <p class="text-xs text-gray-500">Revenue</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">${summary.kpis.revenue.toFixed(2)}</p>
          <p class={`text-xs mt-1 ${trendClass(summary.growth.revenueDeltaPercent)}`}>{trendLabel(summary.growth.revenueDeltaPercent)} vs prior period</p>
        </article>
        <article class="rounded-xl border border-gray-200 bg-white p-4">
          <p class="text-xs text-gray-500">Orders</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{summary.kpis.orders}</p>
          <p class={`text-xs mt-1 ${trendClass(summary.growth.ordersDeltaPercent)}`}>{trendLabel(summary.growth.ordersDeltaPercent)} vs prior period</p>
        </article>
        <article class="rounded-xl border border-gray-200 bg-white p-4">
          <p class="text-xs text-gray-500">Conversion</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{(summary.kpis.conversionRate * 100).toFixed(2)}%</p>
          <p class={`text-xs mt-1 ${trendClass(summary.growth.conversionDeltaPercent)}`}>{trendLabel(summary.growth.conversionDeltaPercent)} vs prior period</p>
        </article>
        <article class="rounded-xl border border-gray-200 bg-white p-4">
          <p class="text-xs text-gray-500">Feature Rollout</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{summary.featureRollout.completionPercent.toFixed(1)}%</p>
          <p class="text-xs mt-1 text-gray-600">{summary.featureRollout.enabledCount}/{summary.featureRollout.totalCount} enabled</p>
        </article>
      </section>

      <section class="grid lg:grid-cols-3 gap-6 mb-8">
        <article class="rounded-xl border border-gray-200 bg-white p-5">
          <h2 class="text-base font-semibold text-gray-900">Safety Rails</h2>
          <div class="mt-3 space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Conversion drop</span>
              <span class={summary.readiness.conversionDropPercent < -5 ? "text-rose-700 font-semibold" : "text-gray-900"}>
                {summary.readiness.conversionDropPercent.toFixed(2)}%
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Fulfillment failure rate</span>
              <span class={summary.readiness.fulfillmentFailureRatePercent > 2 ? "text-rose-700 font-semibold" : "text-gray-900"}>
                {summary.readiness.fulfillmentFailureRatePercent.toFixed(2)}%
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600">P1 incidents &gt; 60m</span>
              <span class={summary.readiness.p1Over60IncidentCount > 0 ? "text-rose-700 font-semibold" : "text-gray-900"}>
                {summary.readiness.p1Over60IncidentCount}
              </span>
            </div>
          </div>
        </article>

        <article class="rounded-xl border border-gray-200 bg-white p-5">
          <h2 class="text-base font-semibold text-gray-900">Policy Violations (7d)</h2>
          <p class="mt-2 text-sm text-gray-600">
            Total {summary.policy.violationsLast7d} · blocked {summary.policy.errorViolationsLast7d}
          </p>
          <div class="mt-3 space-y-1">
            {summary.policy.violationsByDomain.length === 0 ? (
              <p class="text-sm text-gray-400">No policy violations in last 7 days.</p>
            ) : (
              summary.policy.violationsByDomain.map((row) => (
                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-700">{row.domain}</span>
                  <span class="text-gray-500">{row.total} ({row.errors} err / {row.warnings} warn)</span>
                </div>
              ))
            )}
          </div>
        </article>

        <article class="rounded-xl border border-gray-200 bg-white p-5">
          <h2 class="text-base font-semibold text-gray-900">Fulfillment (7d)</h2>
          <div class="mt-3 space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Total requests</span>
              <span class="text-gray-900">{summary.fulfillment.totalRequestsLast7d}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Failed requests</span>
              <span class="text-gray-900">{summary.fulfillment.failedRequestsLast7d}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Failure rate</span>
              <span class={summary.fulfillment.failureRatePercentLast7d > 2 ? "text-rose-700 font-semibold" : "text-gray-900"}>
                {summary.fulfillment.failureRatePercentLast7d.toFixed(2)}%
              </span>
            </div>
          </div>
        </article>
      </section>

      <section class="rounded-xl border border-gray-200 bg-white p-5 mb-8">
        <h2 class="text-base font-semibold text-gray-900">Portfolio Feature Rollout</h2>
        <div class="mt-3 max-h-80 overflow-auto border border-gray-100 rounded">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50 text-gray-600">
              <tr>
                <th class="px-3 py-2 text-left">Feature</th>
                <th class="px-3 py-2 text-left">Week</th>
                <th class="px-3 py-2 text-left">Flag</th>
                <th class="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.featureRollout.items.map((item) => (
                <tr class="border-t border-gray-100">
                  <td class="px-3 py-2 text-gray-900">{item.featureId}: {item.description}</td>
                  <td class="px-3 py-2 text-gray-600">{item.week}</td>
                  <td class="px-3 py-2 text-gray-600">{item.key}</td>
                  <td class="px-3 py-2">
                    <span class={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>
                      {item.enabled ? "enabled" : "disabled"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section class="rounded-xl border border-gray-200 bg-white p-5">
        <h2 class="text-base font-semibold text-gray-900">Current Blockers</h2>
        {summary.risk.blockers.length === 0 ? (
          <p class="mt-3 text-sm text-emerald-700">No active blockers.</p>
        ) : (
          <ul class="mt-3 list-disc list-inside space-y-1 text-sm text-gray-700">
            {summary.risk.blockers.map((blocker) => (
              <li>{blocker}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
