import type { FC } from "hono/jsx";

interface AffiliateInfo {
  referralCode: string;
  totalEarnings: string;
  totalClicks: number;
  totalConversions: number;
  commissionRate: string;
  status: string;
}

interface ConversionRow {
  id: string;
  orderTotal: string;
  commissionAmount: string;
  status: string;
  createdAt: string;
}

interface LinkRow {
  id: string;
  targetUrl: string;
  shortCode: string;
  clickCount: number;
}

interface AffiliateDashboardProps {
  affiliate: AffiliateInfo;
  recentConversions: ConversionRow[];
  links: LinkRow[];
  missions?: Array<{
    id: string;
    title: string;
    description: string;
    target: number;
    current: number;
    progressPercent: number;
    completed: boolean;
    rewardLabel: string;
  }>;
  missionWindowStart?: string | null;
  storefrontUrl?: string | null;
}

export const AffiliateDashboardPage: FC<AffiliateDashboardProps> = ({
  affiliate,
  recentConversions,
  links,
  missions = [],
  missionWindowStart = null,
  storefrontUrl = null,
}) => {
  return (
    <div class="max-w-6xl mx-auto py-8 px-4">
      <h1 class="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">Affiliate Dashboard</h1>
      <p class="text-gray-500 dark:text-gray-400 mb-8">
        Referral code:{" "}
        <code class="bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
          {affiliate.referralCode}
        </code>
      </p>

      {/* Stats */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Earnings</h3>
          <p class="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">${affiliate.totalEarnings}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Clicks</h3>
          <p class="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">{affiliate.totalClicks}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Conversions</h3>
          <p class="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">{affiliate.totalConversions}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Commission Rate</h3>
          <p class="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">{affiliate.commissionRate}%</p>
        </div>
      </div>

      {missions.length > 0 && (
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Mission Dashboard</h2>
              {missionWindowStart && (
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Weekly window since {new Date(missionWindowStart).toLocaleDateString()}
                </p>
              )}
            </div>
            {storefrontUrl && (
              <a href={storefrontUrl} class="text-sm text-brand-600 dark:text-brand-300 hover:underline">
                Open Creator Storefront
              </a>
            )}
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            {missions.map((mission) => (
              <div class="rounded-xl border border-gray-100 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
                <div class="flex items-start justify-between gap-3">
                  <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">{mission.title}</h3>
                  <span class={`text-xs px-2 py-0.5 rounded ${
                    mission.completed
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-200 text-gray-700"
                  }`}>
                    {mission.completed ? "Done" : "In Progress"}
                  </span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">{mission.description}</p>
                <div class="mt-3 h-2 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div class="h-full bg-brand-500" style={`width: ${mission.progressPercent}%`}></div>
                </div>
                <p class="text-xs text-gray-600 dark:text-gray-300 mt-2">
                  {mission.current}/{mission.target} • {mission.progressPercent}%
                </p>
                <p class="text-xs text-brand-700 dark:text-brand-300 mt-1">{mission.rewardLabel}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Links */}
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Your Links</h2>
          <a
            href="/affiliates/links"
            class="text-sm text-brand-600 dark:text-brand-400 hover:underline"
          >
            Manage Links
          </a>
        </div>
        {links.length === 0 ? (
          <p class="text-gray-500 text-sm">
            No links yet.{" "}
            <a href="/affiliates/links" class="text-brand-600 dark:text-brand-400 hover:underline">
              Create one
            </a>
          </p>
        ) : (
          <ul class="space-y-2">
            {links.slice(0, 5).map((l) => (
              <li class="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <span class="text-sm truncate max-w-xs">{l.targetUrl}</span>
                <div class="flex items-center gap-3">
                  <span class="text-xs text-gray-500">
                    {l.clickCount} clicks
                  </span>
                  <code class="text-xs bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                    {l.shortCode}
                  </code>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent Conversions */}
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Recent Conversions</h2>
        {recentConversions.length === 0 ? (
          <p class="text-gray-500 text-sm">No conversions yet.</p>
        ) : (
          <table class="w-full">
            <thead>
              <tr class="text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                <th class="pb-2">Date</th>
                <th class="pb-2">Order Total</th>
                <th class="pb-2">Commission</th>
                <th class="pb-2">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              {recentConversions.map((conv) => (
                <tr>
                  <td class="py-2 text-sm">
                    {new Date(conv.createdAt).toLocaleDateString()}
                  </td>
                  <td class="py-2 text-sm">${conv.orderTotal}</td>
                  <td class="py-2 text-sm font-medium">
                    ${conv.commissionAmount}
                  </td>
                  <td class="py-2">
                    <span
                      class={`text-xs px-2 py-0.5 rounded ${
                        conv.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : conv.status === "approved"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {conv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
