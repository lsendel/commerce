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

export const AdminAnalyticsPage: FC<AdminAnalyticsPageProps> = ({
  metrics,
  funnel,
  topProducts,
  dailyRevenue,
  attribution,
  dateFrom,
  dateTo,
}) => {
  const maxRevenue = Math.max(...dailyRevenue.map((d) => d.revenue), 1);
  const trendColor = (trend: number) =>
    trend > 0 ? "text-emerald-600" : trend < 0 ? "text-rose-600" : "text-gray-500";
  const trendLabel = (trend: number) => `${trend > 0 ? "+" : ""}${trend.toFixed(1)}%`;

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
          <form method="get" class="flex items-center gap-2">
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
