import type { FC } from "hono/jsx";

interface FulfillmentRequestRow {
  id: string;
  orderId: string;
  provider: string;
  externalId: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  total: number;
  pending: number;
  submitted: number;
  processing: number;
  shipped: number;
  delivered: number;
  failed: number;
  cancelled: number;
}

interface FulfillmentDashboardProps {
  requests: FulfillmentRequestRow[];
  stats: DashboardStats;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  submitted: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-green-100 text-green-800",
  delivered: "bg-green-200 text-green-900",
  cancel_requested: "bg-orange-100 text-orange-800",
  cancelled: "bg-gray-100 text-gray-800",
  failed: "bg-red-100 text-red-800",
};

export const FulfillmentDashboardPage: FC<FulfillmentDashboardProps> = ({
  requests,
  stats,
}) => {
  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">
        Fulfillment Dashboard
      </h1>

      {/* Stats Cards */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total" value={stats.total} color="gray" />
        <StatCard label="Pending" value={stats.pending} color="yellow" />
        <StatCard label="Processing" value={stats.submitted + stats.processing} color="blue" />
        <StatCard label="Shipped" value={stats.shipped} color="green" />
        <StatCard label="Delivered" value={stats.delivered} color="emerald" />
        <StatCard label="Failed" value={stats.failed} color="red" />
        <StatCard label="Cancelled" value={stats.cancelled} color="gray" />
      </div>

      {/* Requests Table */}
      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Request
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Provider
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  External ID
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Created
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {requests.length === 0 ? (
                <tr>
                  <td
                    colspan={6}
                    class="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No fulfillment requests yet.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-sm font-mono text-gray-700">
                      {req.id.slice(0, 8)}...
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-700 capitalize">
                      {req.provider}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-500 font-mono">
                      {req.externalId ?? "—"}
                    </td>
                    <td class="px-4 py-3">
                      <span
                        class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[req.status] ?? "bg-gray-100 text-gray-800"}`}
                      >
                        {req.status}
                      </span>
                      {req.errorMessage && (
                        <p class="mt-1 text-xs text-red-600 max-w-xs truncate">
                          {req.errorMessage}
                        </p>
                      )}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-500">
                      {req.createdAt}
                    </td>
                    <td class="px-4 py-3">
                      {req.status === "failed" && (
                        <button
                          type="button"
                          class="retry-btn text-sm text-brand-600 hover:text-brand-700 font-medium"
                          data-request-id={req.id}
                        >
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <script src="/scripts/admin-fulfillment.js" defer></script>
    </div>
  );
};

const StatCard: FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => {
  const colorMap: Record<string, string> = {
    gray: "bg-gray-50 border-gray-200",
    yellow: "bg-yellow-50 border-yellow-200",
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    emerald: "bg-emerald-50 border-emerald-200",
    red: "bg-red-50 border-red-200",
  };
  return (
    <div
      class={`rounded-lg border p-4 ${colorMap[color] ?? colorMap.gray}`}
    >
      <p class="text-sm text-gray-600">{label}</p>
      <p class="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
};
