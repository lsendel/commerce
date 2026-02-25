import type { FC } from "hono/jsx";

interface AffiliateDashboardProps {
  affiliate: any;
  recentConversions: any[];
  links: any[];
}

export const AffiliateDashboardPage: FC<AffiliateDashboardProps> = ({
  affiliate,
  recentConversions,
  links,
}) => {
  return (
    <div class="max-w-6xl mx-auto py-8 px-4">
      <h1 class="text-3xl font-bold mb-2">Affiliate Dashboard</h1>
      <p class="text-gray-500 mb-8">
        Referral code:{" "}
        <code class="bg-gray-100 px-2 py-0.5 rounded">
          {affiliate.referralCode}
        </code>
      </p>

      {/* Stats */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white border rounded-lg p-6">
          <h3 class="text-sm font-medium text-gray-500">Total Earnings</h3>
          <p class="text-2xl font-bold mt-1">${affiliate.totalEarnings}</p>
        </div>
        <div class="bg-white border rounded-lg p-6">
          <h3 class="text-sm font-medium text-gray-500">Total Clicks</h3>
          <p class="text-2xl font-bold mt-1">{affiliate.totalClicks}</p>
        </div>
        <div class="bg-white border rounded-lg p-6">
          <h3 class="text-sm font-medium text-gray-500">Conversions</h3>
          <p class="text-2xl font-bold mt-1">{affiliate.totalConversions}</p>
        </div>
        <div class="bg-white border rounded-lg p-6">
          <h3 class="text-sm font-medium text-gray-500">Commission Rate</h3>
          <p class="text-2xl font-bold mt-1">{affiliate.commissionRate}%</p>
        </div>
      </div>

      {/* Links */}
      <div class="bg-white border rounded-lg p-6 mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">Your Links</h2>
          <a
            href="/affiliates/links"
            class="text-sm text-indigo-600 hover:underline"
          >
            Manage Links
          </a>
        </div>
        {links.length === 0 ? (
          <p class="text-gray-500 text-sm">
            No links yet.{" "}
            <a href="/affiliates/links" class="text-indigo-600 hover:underline">
              Create one
            </a>
          </p>
        ) : (
          <ul class="space-y-2">
            {links.slice(0, 5).map((l: any) => (
              <li class="flex items-center justify-between py-2 border-b last:border-0">
                <span class="text-sm truncate max-w-xs">{l.targetUrl}</span>
                <div class="flex items-center gap-3">
                  <span class="text-xs text-gray-500">
                    {l.clickCount} clicks
                  </span>
                  <code class="text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {l.shortCode}
                  </code>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent Conversions */}
      <div class="bg-white border rounded-lg p-6">
        <h2 class="text-lg font-semibold mb-4">Recent Conversions</h2>
        {recentConversions.length === 0 ? (
          <p class="text-gray-500 text-sm">No conversions yet.</p>
        ) : (
          <table class="w-full">
            <thead>
              <tr class="text-left text-xs text-gray-500 uppercase">
                <th class="pb-2">Date</th>
                <th class="pb-2">Order Total</th>
                <th class="pb-2">Commission</th>
                <th class="pb-2">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              {recentConversions.map((conv: any) => (
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
