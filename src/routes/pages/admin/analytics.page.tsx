import type { FC } from "hono/jsx";

interface MetricCard {
  label: string;
  value: string;
  trend?: number;
}

interface FunnelStep {
  step: string;
  count: number;
  dropOffPercent: number;
}

interface TopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

interface AttributionSource {
  source: string;
  events: number;
  sessions: number;
  trendPercent?: number | null;
}

interface AttributionCampaign {
  campaign: string;
  events: number;
  sessions: number;
  trendPercent?: number | null;
}

interface AttributionLandingPath {
  landingPath: string;
  events: number;
  sessions: number;
  trendPercent?: number | null;
}

interface CostDimensionRow {
  key: string;
  label: string;
  team?: string;
  events: number;
  orders: number;
  estimatedCostUsd: number;
  attributedRevenueUsd: number;
  costPerOrderUsd: number;
  revenueToCostRatio: number;
  status: "healthy" | "watch" | "critical";
  optimizationHint: string;
}

interface CostBacklogItem {
  id: string;
  title: string;
  dimension: "feature" | "team" | "tenant";
  ownerTeam: string;
  estimatedMonthlySavingsUsd: number;
  status: "candidate" | "planned" | "in_progress";
  priority: "p0" | "p1" | "p2";
  rationale: string;
}

interface CostObservabilityData {
  summary: {
    totalEstimatedCostUsd: number;
    totalRevenueUsd: number;
    contributionMarginUsd: number;
    blendedCostPerOrderUsd: number;
    blendedRevenueToCostRatio: number;
    totalOrders: number;
  };
  dimensions: {
    feature: CostDimensionRow[];
    team: CostDimensionRow[];
    tenant: CostDimensionRow[];
  };
  optimizationBacklog: CostBacklogItem[];
}

interface AdminAnalyticsPageProps {
  metrics: MetricCard[];
  funnel: FunnelStep[];
  topProducts: TopProduct[];
  dailyRevenue: DailyRevenue[];
  attribution: {
    topSources: AttributionSource[];
    topCampaigns: AttributionCampaign[];
    topLandingPaths: AttributionLandingPath[];
  };
  costObservability: CostObservabilityData;
  dateFrom: string;
  dateTo: string;
}

const STEP_LABELS: Record<string, string> = {
  page_view: "Page Views",
  product_view: "Product Views",
  add_to_cart: "Add to Cart",
  checkout_started: "Checkout",
  order_completed: "Purchases",
  purchase: "Purchases",
};

interface RecommendationCard {
  id: string;
  title: string;
  detail: string;
  ctaLabel: string;
  href: string;
  tone: "urgent" | "opportunity" | "efficiency";
  payload?: Record<string, string | number | boolean>;
}

const TONE_STYLES: Record<RecommendationCard["tone"], string> = {
  urgent: "border-rose-200 bg-rose-50/90 dark:border-rose-900/40 dark:bg-rose-950/20",
  opportunity: "border-teal-200 bg-teal-50/90 dark:border-teal-900/40 dark:bg-teal-950/20",
  efficiency: "border-indigo-200 bg-indigo-50/90 dark:border-indigo-900/40 dark:bg-indigo-950/20",
};

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toActionId(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "recommended-action";
}

export const AdminAnalyticsPage: FC<AdminAnalyticsPageProps> = ({
  metrics,
  funnel,
  topProducts,
  dailyRevenue,
  attribution,
  costObservability,
  dateFrom,
  dateTo,
}) => {
  const maxRevenue = Math.max(...dailyRevenue.map((d) => d.revenue), 1);
  const trendColor = (trend: number) =>
    trend > 0 ? "text-emerald-600" : trend < 0 ? "text-rose-600" : "text-gray-500";
  const trendLabel = (trend: number) => `${trend > 0 ? "+" : ""}${trend.toFixed(1)}%`;
  const largestDropOff = funnel
    .slice(1)
    .sort((a, b) => b.dropOffPercent - a.dropOffPercent)[0];
  const topSource = attribution.topSources[0];
  const topCampaign = attribution.topCampaigns[0];
  const costRiskFeature = costObservability.dimensions.feature.find((row) => row.status !== "healthy");
  const topBacklogItem = [...costObservability.optimizationBacklog]
    .sort((a, b) => b.estimatedMonthlySavingsUsd - a.estimatedMonthlySavingsUsd)[0];
  const recommendations: RecommendationCard[] = [];

  if (largestDropOff && largestDropOff.dropOffPercent >= 20) {
    recommendations.push({
      id: toActionId(`fix-${largestDropOff.step}-dropoff`),
      title: `Fix ${STEP_LABELS[largestDropOff.step] ?? largestDropOff.step} drop-off`,
      detail: `${largestDropOff.dropOffPercent}% drop-off detected. Launch a targeted recovery campaign with one-click incentive and monitor next 7 days.`,
      ctaLabel: "Open Promotions",
      href: "/admin/promotions",
      tone: "urgent",
      payload: {
        step: largestDropOff.step,
        dropOffPercent: largestDropOff.dropOffPercent,
      },
    });
  }

  if (topSource && topSource.sessions > 0) {
    recommendations.push({
      id: toActionId(`double-down-${topSource.source}`),
      title: `Double down on ${topSource.source}`,
      detail: `${topSource.sessions} sessions are coming from this source. Clone best-performing campaign and route to high-intent landing pages.`,
      ctaLabel: "Open Analytics",
      href: "/admin/analytics",
      tone: "opportunity",
      payload: {
        source: topSource.source,
        sessions: topSource.sessions,
      },
    });
  }

  if (topCampaign && (topCampaign.trendPercent ?? 0) < 0) {
    recommendations.push({
      id: toActionId(`recover-campaign-${topCampaign.campaign}`),
      title: `Campaign ${topCampaign.campaign} is trending down`,
      detail: `${trendLabel(topCampaign.trendPercent ?? 0)} performance vs previous period. Refresh creative and align offer with top-converting products.`,
      ctaLabel: "Open Pricing Labs",
      href: "/admin/pricing-experiments",
      tone: "urgent",
      payload: {
        campaign: topCampaign.campaign,
        trendPercent: Number((topCampaign.trendPercent ?? 0).toFixed(2)),
      },
    });
  }

  if (costRiskFeature) {
    recommendations.push({
      id: toActionId(`optimize-${costRiskFeature.label}`),
      title: `Optimize ${costRiskFeature.label} unit economics`,
      detail: `${costRiskFeature.revenueToCostRatio.toFixed(2)}x revenue-to-cost ratio and ${costRiskFeature.status} status. Apply queued optimization and monitor impact.`,
      ctaLabel: "Open Control Tower",
      href: "/admin/control-tower",
      tone: "efficiency",
      payload: {
        feature: costRiskFeature.label,
        revenueToCostRatio: Number(costRiskFeature.revenueToCostRatio.toFixed(2)),
      },
    });
  }

  if (topBacklogItem) {
    recommendations.push({
      id: toActionId(`prioritize-${topBacklogItem.id}`),
      title: `Prioritize ${topBacklogItem.priority.toUpperCase()} backlog item`,
      detail: `Estimated $${topBacklogItem.estimatedMonthlySavingsUsd.toFixed(0)} monthly savings by shipping: ${topBacklogItem.title}.`,
      ctaLabel: "Open Workflows",
      href: "/admin/workflows",
      tone: "efficiency",
      payload: {
        backlogId: topBacklogItem.id,
        priority: topBacklogItem.priority,
        monthlySavingsUsd: Number(topBacklogItem.estimatedMonthlySavingsUsd.toFixed(2)),
      },
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "steady-state-growth-window",
      title: "No urgent regressions detected",
      detail: "Use this window to ship one growth experiment and one automation improvement to compound gains next week.",
      ctaLabel: "Open Promotions",
      href: "/admin/promotions",
      tone: "opportunity",
      payload: {
        status: "stable",
      },
    });
  }

  const rangeEnd = new Date(`${dateTo}T00:00:00Z`);
  const trailing7From = new Date(rangeEnd.getTime());
  trailing7From.setUTCDate(trailing7From.getUTCDate() - 6);
  const trailing30From = new Date(rangeEnd.getTime());
  trailing30From.setUTCDate(trailing30From.getUTCDate() - 29);
  const monthStart = new Date(Date.UTC(rangeEnd.getUTCFullYear(), rangeEnd.getUTCMonth(), 1));

  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="mb-8 rounded-2xl border border-teal-200/60 bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 dark:from-teal-950/40 dark:via-emerald-950/30 dark:to-cyan-950/30 px-6 py-5">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <nav class="text-xs text-teal-700/80 dark:text-teal-300/80 mb-1">
              <a href="/admin" class="hover:text-teal-900 dark:hover:text-teal-100">Admin</a>
              <span class="mx-1">/</span>
              <span class="text-teal-900 dark:text-teal-100">Analytics</span>
            </nav>
            <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Analytics Dashboard</h1>
          </div>
          <div class="flex items-center gap-2 flex-wrap justify-end">
            <form method="get" class="flex items-center gap-2 flex-wrap" data-persist-filters data-persist-key="admin-analytics-range">
              <input type="date" name="from" value={dateFrom} class="rounded-lg border border-teal-300/70 bg-white/80 dark:bg-slate-900/70 px-3 py-2 text-sm" />
              <span class="text-teal-700 dark:text-teal-300">to</span>
              <input type="date" name="to" value={dateTo} class="rounded-lg border border-teal-300/70 bg-white/80 dark:bg-slate-900/70 px-3 py-2 text-sm" />
              <button type="submit" class="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium hover:bg-teal-800">Apply</button>
              <a
                href={`/admin/analytics/export.csv?from=${encodeURIComponent(dateFrom)}&to=${encodeURIComponent(dateTo)}`}
                class="rounded-lg border border-teal-300 text-teal-800 dark:text-teal-200 px-4 py-2 text-sm font-medium hover:bg-teal-100/60 dark:hover:bg-teal-900/30"
              >
                Export CSV
              </a>
            </form>
            <button
              type="button"
              data-admin-quick-actions-btn
              class="rounded-lg border border-teal-300 bg-white/70 dark:bg-slate-900/70 px-3 py-2 text-sm font-medium text-teal-800 dark:text-teal-200 hover:bg-teal-100/70 dark:hover:bg-teal-900/40"
            >
              Quick Actions
            </button>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <a
            href={`/admin/analytics?from=${toIsoDate(trailing7From)}&to=${toIsoDate(rangeEnd)}`}
            class="rounded-full border border-teal-200 bg-white/70 px-3 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-100/70"
          >
            Last 7 Days
          </a>
          <a
            href={`/admin/analytics?from=${toIsoDate(trailing30From)}&to=${toIsoDate(rangeEnd)}`}
            class="rounded-full border border-teal-200 bg-white/70 px-3 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-100/70"
          >
            Last 30 Days
          </a>
          <a
            href={`/admin/analytics?from=${toIsoDate(monthStart)}&to=${toIsoDate(rangeEnd)}`}
            class="rounded-full border border-teal-200 bg-white/70 px-3 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-100/70"
          >
            Month to Date
          </a>
        </div>
      </div>

      <div class="mb-8 rounded-2xl border border-slate-200/70 dark:border-slate-700 bg-white/95 dark:bg-slate-900/85 p-5">
        <div class="flex items-center justify-between gap-3 mb-4">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Recommended Next Actions</h2>
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Auto-generated from current dashboard data</span>
        </div>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {recommendations.slice(0, 3).map((item) => (
            <article class={`rounded-xl border p-4 ${TONE_STYLES[item.tone]}`} key={item.title}>
              <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
              <p class="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.detail}</p>
              <div class="mt-3 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  data-recommendation-apply
                  data-recommendation-id={item.id}
                  data-recommendation-title={item.title}
                  data-recommendation-detail={item.detail}
                  data-recommendation-href={item.href}
                  data-recommendation-payload={JSON.stringify(item.payload ?? {})}
                  data-recommendation-from={dateFrom}
                  data-recommendation-to={dateTo}
                  class="inline-flex items-center rounded-md border border-slate-300 bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-white"
                >
                  Apply Default
                </button>
                <a href={item.href} class="inline-flex items-center text-xs font-semibold text-brand-700 hover:text-brand-800">
                  {item.ctaLabel} →
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div
        class="mb-8 rounded-2xl border border-teal-200/70 bg-white/95 dark:bg-slate-900/85 p-5"
        data-analytics-automation-center
        data-automation-history-url="/api/analytics/recommendations/history?limit=8"
      >
        <div class="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Automation Center</h2>
          <button
            type="button"
            data-automation-history-refresh
            class="rounded-md border border-teal-300 px-2.5 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50 dark:hover:bg-teal-900/30"
          >
            Refresh Activity
          </button>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Applied defaults are logged here so operators can track what actions were automated from this dashboard.
        </p>
        <div class="mt-3 space-y-2" data-automation-history-list>
          <p class="text-sm text-slate-500 dark:text-slate-400" data-automation-history-empty>
            No automation activity yet. Use &quot;Apply Default&quot; on any recommendation.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {metrics.map((m) => (
          <div class="bg-white/95 dark:bg-slate-900/90 rounded-xl border border-teal-100 dark:border-slate-700 p-4 shadow-sm">
            <p class="text-sm text-slate-500 dark:text-slate-400">{m.label}</p>
            <p class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{m.value}</p>
            {m.trend !== undefined && (
              <p class={`text-xs mt-1 ${m.trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                {m.trend >= 0 ? "+" : ""}{m.trend}%
              </p>
            )}
          </div>
        ))}
      </div>

      <div class="mb-8 rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/35 dark:via-orange-950/25 dark:to-rose-950/25 p-6">
        <div class="flex items-start justify-between gap-3 flex-wrap mb-5">
          <div>
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Cost Observability &amp; Unit Economics</h2>
            <p class="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Feature, team, and tenant cost telemetry with optimization candidates.
            </p>
          </div>
          <div class="text-xs text-slate-500 dark:text-slate-400">
            <p>Orders in window: {costObservability.summary.totalOrders}</p>
            <p>Blended ratio: {costObservability.summary.blendedRevenueToCostRatio.toFixed(2)}x</p>
          </div>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div class="rounded-xl border border-amber-200/80 bg-white/90 dark:bg-slate-900/80 p-3">
            <p class="text-xs text-slate-500">Estimated Cost</p>
            <p class="text-xl font-semibold text-slate-900 dark:text-slate-100">${costObservability.summary.totalEstimatedCostUsd.toFixed(2)}</p>
          </div>
          <div class="rounded-xl border border-amber-200/80 bg-white/90 dark:bg-slate-900/80 p-3">
            <p class="text-xs text-slate-500">Attributed Revenue</p>
            <p class="text-xl font-semibold text-slate-900 dark:text-slate-100">${costObservability.summary.totalRevenueUsd.toFixed(2)}</p>
          </div>
          <div class="rounded-xl border border-amber-200/80 bg-white/90 dark:bg-slate-900/80 p-3">
            <p class="text-xs text-slate-500">Contribution Margin</p>
            <p class="text-xl font-semibold text-slate-900 dark:text-slate-100">${costObservability.summary.contributionMarginUsd.toFixed(2)}</p>
          </div>
          <div class="rounded-xl border border-amber-200/80 bg-white/90 dark:bg-slate-900/80 p-3">
            <p class="text-xs text-slate-500">Cost Per Order</p>
            <p class="text-xl font-semibold text-slate-900 dark:text-slate-100">${costObservability.summary.blendedCostPerOrderUsd.toFixed(2)}</p>
          </div>
        </div>

        <div class="grid lg:grid-cols-3 gap-4 mb-5">
          <div class="rounded-xl border border-amber-200/70 bg-white/90 dark:bg-slate-900/80 p-4">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">By Feature</h3>
            <div class="space-y-2">
              {costObservability.dimensions.feature.slice(0, 4).map((row) => (
                <div class="rounded-lg border border-slate-100 dark:border-slate-700 p-2.5" key={row.key}>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-sm font-medium text-slate-800 dark:text-slate-200">{row.label}</span>
                    <span class={`text-[11px] rounded-full px-2 py-0.5 font-semibold ${row.status === "healthy" ? "bg-emerald-100 text-emerald-700" : row.status === "watch" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                      {row.status}
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 mt-1">${row.estimatedCostUsd.toFixed(2)} cost • {row.revenueToCostRatio.toFixed(2)}x ratio</p>
                </div>
              ))}
            </div>
          </div>
          <div class="rounded-xl border border-amber-200/70 bg-white/90 dark:bg-slate-900/80 p-4">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">By Team</h3>
            <div class="space-y-2">
              {costObservability.dimensions.team.map((row) => (
                <div class="rounded-lg border border-slate-100 dark:border-slate-700 p-2.5" key={row.key}>
                  <p class="text-sm font-medium text-slate-800 dark:text-slate-200">{row.label}</p>
                  <p class="text-xs text-slate-500 mt-1">${row.estimatedCostUsd.toFixed(2)} cost • ${row.costPerOrderUsd.toFixed(2)} / order</p>
                </div>
              ))}
            </div>
          </div>
          <div class="rounded-xl border border-amber-200/70 bg-white/90 dark:bg-slate-900/80 p-4">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">By Tenant</h3>
            <div class="space-y-2">
              {costObservability.dimensions.tenant.map((row) => (
                <div class="rounded-lg border border-slate-100 dark:border-slate-700 p-2.5" key={row.key}>
                  <p class="text-sm font-medium text-slate-800 dark:text-slate-200">{row.label}</p>
                  <p class="text-xs text-slate-500 mt-1">${row.estimatedCostUsd.toFixed(2)} cost • {row.revenueToCostRatio.toFixed(2)}x ratio</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-amber-200/70 bg-white/90 dark:bg-slate-900/80 p-4">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Optimization Backlog</h3>
          {costObservability.optimizationBacklog.length === 0 ? (
            <p class="text-sm text-slate-500">No optimization backlog items generated for this window.</p>
          ) : (
            <div class="space-y-2">
              {costObservability.optimizationBacklog.map((item) => (
                <div key={item.id} class="rounded-lg border border-slate-100 dark:border-slate-700 px-3 py-2">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-sm font-medium text-slate-800 dark:text-slate-200">{item.title}</p>
                    <span class="text-[11px] rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 font-semibold">{item.priority.toUpperCase()}</span>
                  </div>
                  <p class="text-xs text-slate-500 mt-1">{item.ownerTeam} • ${item.estimatedMonthlySavingsUsd.toFixed(2)} monthly savings • {item.status.replace("_", " ")}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart (SVG bar chart) */}
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Daily Revenue</h2>
          {dailyRevenue.length === 0 ? (
            <p class="text-sm text-gray-400">No revenue data for this period.</p>
          ) : (
            <svg viewBox={`0 0 ${dailyRevenue.length * 40} 200`} class="w-full h-48">
              {dailyRevenue.map((d, i) => {
                const barHeight = (d.revenue / maxRevenue) * 170;
                return (
                  <g key={d.date}>
                    <rect
                      x={i * 40 + 5}
                      y={190 - barHeight}
                      width="30"
                      height={barHeight}
                      fill="#0f766e"
                      rx="3"
                    />
                    <text
                      x={i * 40 + 20}
                      y="200"
                      text-anchor="middle"
                      class="text-[8px] fill-gray-400"
                    >
                      {d.date.slice(5)}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Conversion Funnel */}
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Conversion Funnel</h2>
          {funnel.length === 0 ? (
            <p class="text-sm text-gray-400">No funnel data for this period.</p>
          ) : (
            <div class="space-y-3">
              {funnel.map((step, i) => {
                const maxCount = funnel[0]?.count ?? 1;
                const widthPct = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
                return (
                  <div key={step.step}>
                    <div class="flex justify-between text-sm mb-1">
                      <span class="text-gray-700 dark:text-gray-300">{STEP_LABELS[step.step] ?? step.step}</span>
                      <span class="text-gray-500">{step.count}</span>
                    </div>
                    <div class="h-6 bg-gray-100 dark:bg-gray-700 rounded">
                      <div
                        class="h-6 bg-brand-500 rounded"
                        style={`width: ${Math.max(widthPct, 2)}%`}
                      />
                    </div>
                    {i > 0 && step.dropOffPercent > 0 && (
                      <p class="text-xs text-red-500 mt-0.5">-{step.dropOffPercent}% drop-off</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Attribution */}
      <div class="grid lg:grid-cols-3 gap-6 mb-8">
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Sources</h2>
          {attribution.topSources.length === 0 ? (
            <p class="text-sm text-gray-400">No source attribution data.</p>
          ) : (
            <div class="space-y-2">
              {attribution.topSources.map((row) => (
                <div class="flex items-center justify-between text-sm" key={row.source}>
                  <div class="min-w-0 pr-3">
                    <span class="text-gray-700 dark:text-gray-300 truncate block">{row.source}</span>
                    {row.trendPercent !== null && row.trendPercent !== undefined && (
                      <span class={`text-xs ${trendColor(row.trendPercent)}`}>
                        {trendLabel(row.trendPercent)} vs previous period
                      </span>
                    )}
                  </div>
                  <span class="text-gray-500 whitespace-nowrap">{row.events} events / {row.sessions} sessions</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Campaigns</h2>
          {attribution.topCampaigns.length === 0 ? (
            <p class="text-sm text-gray-400">No campaign attribution data.</p>
          ) : (
            <div class="space-y-2">
              {attribution.topCampaigns.map((row) => (
                <div class="flex items-center justify-between text-sm" key={row.campaign}>
                  <div class="min-w-0 pr-3">
                    <span class="text-gray-700 dark:text-gray-300 truncate block">{row.campaign}</span>
                    {row.trendPercent !== null && row.trendPercent !== undefined && (
                      <span class={`text-xs ${trendColor(row.trendPercent)}`}>
                        {trendLabel(row.trendPercent)} vs previous period
                      </span>
                    )}
                  </div>
                  <span class="text-gray-500 whitespace-nowrap">{row.events} events / {row.sessions} sessions</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Landing Paths</h2>
          {attribution.topLandingPaths.length === 0 ? (
            <p class="text-sm text-gray-400">No landing path attribution data.</p>
          ) : (
            <div class="space-y-2">
              {attribution.topLandingPaths.map((row) => (
                <div class="flex items-center justify-between text-sm" key={row.landingPath}>
                  <div class="min-w-0 pr-3">
                    <span class="text-gray-700 dark:text-gray-300 truncate block">{row.landingPath}</span>
                    {row.trendPercent !== null && row.trendPercent !== undefined && (
                      <span class={`text-xs ${trendColor(row.trendPercent)}`}>
                        {trendLabel(row.trendPercent)} vs previous period
                      </span>
                    )}
                  </div>
                  <span class="text-gray-500 whitespace-nowrap">{row.events} events / {row.sessions} sessions</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Top Products</h2>
        </div>
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Units Sold</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            {topProducts.length === 0 ? (
              <tr><td colspan={4} class="px-4 py-6 text-center text-sm text-gray-400">No product data for this period.</td></tr>
            ) : (
              topProducts.map((p) => (
                <tr key={p.productId} class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{p.productName}</td>
                  <td class="px-4 py-3 text-sm text-gray-600">{p.totalQuantity}</td>
                  <td class="px-4 py-3 text-sm font-medium">${p.totalRevenue.toFixed(2)}</td>
                  <td class="px-4 py-3 text-sm text-gray-500">{p.orderCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
