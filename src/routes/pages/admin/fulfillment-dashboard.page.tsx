import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Button } from "../../../components/ui/button";

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

interface ProviderHealth {
  provider: string;
  successRate: number;
  totalRequests: number;
  avgResponseMs: number | null;
}

interface FulfillmentDashboardProps {
  requests: FulfillmentRequestRow[];
  stats: DashboardStats;
  health?: ProviderHealth[];
  page: number;
  totalPages: number;
  filters: {
    status?: string;
    provider?: string;
    search?: string;
  };
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
  health,
  page,
  totalPages,
  filters,
}) => {
  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Fulfillment Dashboard
        </h1>
        <div class="flex gap-2">
          <a href="/admin/shipping" class="text-sm text-brand-600 hover:text-brand-700 font-medium">Shipping Zones</a>
          <span class="text-gray-300">|</span>
          <a href="/admin/tax" class="text-sm text-brand-600 hover:text-brand-700 font-medium">Tax Settings</a>
        </div>
      </div>

      {/* Provider Health Cards */}
      {health && health.length > 0 && (
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {health.map((h) => (
            <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <p class="text-xs text-gray-500 uppercase tracking-wider">{h.provider}</p>
              <p class={`text-2xl font-bold mt-1 ${h.successRate >= 95 ? "text-green-600" : h.successRate >= 80 ? "text-yellow-600" : "text-red-600"}`}>
                {h.successRate}%
              </p>
              <p class="text-xs text-gray-400 mt-1">
                {h.totalRequests} requests{h.avgResponseMs !== null ? ` · ${h.avgResponseMs}ms avg` : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={stats.total} color="gray" />
        <StatCard label="Pending" value={stats.pending} color="yellow" />
        <StatCard label="Processing" value={stats.submitted + stats.processing} color="blue" />
        <StatCard label="Shipped" value={stats.shipped} color="green" />
        <StatCard label="Delivered" value={stats.delivered} color="emerald" />
        <StatCard label="Failed" value={stats.failed} color="red" />
        <StatCard label="Cancelled" value={stats.cancelled} color="gray" />
      </div>

      {/* Filter Bar */}
      <form method="get" class="flex flex-wrap items-end gap-3 mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div>
          <label class="text-xs font-medium text-gray-500 block mb-1">Status</label>
          <select name="status" class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-300">
            <option value="">All statuses</option>
            {["pending", "submitted", "processing", "shipped", "delivered", "failed", "cancelled"].map((s) => (
              <option value={s} selected={filters.status === s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-gray-500 block mb-1">Provider</label>
          <select name="provider" class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-300">
            <option value="">All providers</option>
            {["printful", "gooten", "prodigi", "shapeways"].map((p) => (
              <option value={p} selected={filters.provider === p}>{p}</option>
            ))}
          </select>
        </div>
        <div class="flex-1 min-w-[200px]">
          <label class="text-xs font-medium text-gray-500 block mb-1">Search (Order ID)</label>
          <input
            type="text"
            name="search"
            value={filters.search ?? ""}
            placeholder="Order ID..."
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <Button type="submit" variant="primary" size="sm">Filter</Button>
        <a href="/admin/fulfillment" class="text-sm text-gray-500 hover:text-gray-700 py-2">Clear</a>
      </form>

      {/* Requests Table */}
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              {requests.length === 0 ? (
                <tr>
                  <td colspan={6} class="px-4 py-8 text-center text-sm text-gray-500">
                    No fulfillment requests match your filters.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td class="px-4 py-3 text-sm">
                      <a href={`/admin/fulfillment/${req.id}`} class="font-mono text-brand-600 hover:text-brand-700">
                        {req.id.slice(0, 8)}...
                      </a>
                    </td>
                    <td class="px-4 py-3 text-sm">
                      <a href={`/admin/orders/${req.orderId}`} class="font-mono text-brand-600 hover:text-brand-700">
                        {req.orderId.slice(0, 8)}...
                      </a>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {req.provider}
                    </td>
                    <td class="px-4 py-3">
                      <span class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[req.status] ?? "bg-gray-100 text-gray-800"}`}>
                        {req.status}
                      </span>
                      {req.errorMessage && (
                        <p class="mt-1 text-xs text-red-600 max-w-xs truncate">{req.errorMessage}</p>
                      )}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-500">{req.createdAt}</td>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div class="flex items-center justify-center gap-2 mt-6">
          {page > 1 && (
            <a
              href={`/admin/fulfillment?page=${page - 1}${filters.status ? `&status=${filters.status}` : ""}${filters.provider ? `&provider=${filters.provider}` : ""}${filters.search ? `&search=${filters.search}` : ""}`}
              class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Previous
            </a>
          )}
          <span class="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/admin/fulfillment?page=${page + 1}${filters.status ? `&status=${filters.status}` : ""}${filters.provider ? `&provider=${filters.provider}` : ""}${filters.search ? `&search=${filters.search}` : ""}`}
              class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Next
            </a>
          )}
        </div>
      )}

      {/* Retry confirmation + script */}
      <div id="retry-confirm" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div class="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4 w-full">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Retry Fulfillment</h3>
          <p class="text-sm text-gray-500 mb-5">Re-submit this request to the provider?</p>
          <div class="flex items-center gap-3 justify-end">
            <Button type="button" variant="ghost" id="retry-no">Cancel</Button>
            <Button type="button" variant="primary" id="retry-yes">Retry</Button>
          </div>
        </div>
      </div>

      {html`
        <script>
          (function() {
            function showFulfillmentDashboardError(message) {
              if (window.showToast) {
                window.showToast(message, 'error');
                return;
              }
              var banner = document.getElementById('admin-fulfillment-dashboard-flash');
              if (!banner) {
                banner = document.createElement('div');
                banner.id = 'admin-fulfillment-dashboard-flash';
                banner.className = 'fixed top-4 right-4 z-50 max-w-sm rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-lg';
                document.body.appendChild(banner);
              }
              banner.textContent = message;
              banner.classList.remove('hidden');
              setTimeout(function() { banner.classList.add('hidden'); }, 4000);
            }

            var pendingRetryId = null;
            var dialog = document.getElementById('retry-confirm');
            document.querySelectorAll('.retry-btn').forEach(function(btn) {
              btn.addEventListener('click', function() {
                pendingRetryId = this.getAttribute('data-request-id');
                dialog.classList.remove('hidden');
              });
            });
            document.getElementById('retry-no').addEventListener('click', function() {
              dialog.classList.add('hidden');
              pendingRetryId = null;
            });
            document.getElementById('retry-yes').addEventListener('click', async function() {
              if (!pendingRetryId) return;
              try {
                var res = await fetch('/api/admin/fulfillment/' + pendingRetryId + '/retry', { method: 'POST' });
                if (!res.ok) throw new Error('Failed to retry');
                window.location.reload();
              } catch (err) {
                showFulfillmentDashboardError(err.message || 'Failed to retry fulfillment');
              } finally {
                dialog.classList.add('hidden');
                pendingRetryId = null;
              }
            });
          })();
        </script>
      `}
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
    <div class={`rounded-lg border p-4 ${colorMap[color] ?? colorMap.gray}`}>
      <p class="text-sm text-gray-600">{label}</p>
      <p class="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
};
