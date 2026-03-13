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
  isExceptionHandlerEnabled?: boolean;
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
  isExceptionHandlerEnabled = false,
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

      {isExceptionHandlerEnabled && (
        <section class="mb-6 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 p-4">
          <div class="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 class="text-sm font-semibold text-indigo-900">Fulfillment Exception Handler</h2>
              <p class="text-xs text-indigo-700 mt-0.5">
                Detects stuck requests and auto-requeues safe retries.
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                id="exception-scan-btn"
                class="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                Scan Exceptions
              </button>
              <button
                type="button"
                id="exception-resolve-btn"
                class="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                Auto-resolve
              </button>
            </div>
          </div>
          <div id="exception-results" class="mt-3 text-xs text-indigo-800">
            Exception scan not run yet.
          </div>
        </section>
      )}

      {isExceptionHandlerEnabled && (
        <section class="mb-6 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 p-4">
          <div class="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 class="text-sm font-semibold text-amber-900">SLA Risk Prediction</h2>
              <p class="text-xs text-amber-700 mt-0.5">
                Predicts fulfillment and return breaches with intervention recommendations.
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                id="sla-refresh-btn"
                class="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
              >
                Refresh SLA Risk
              </button>
              <button
                type="button"
                id="sla-intervene-btn"
                class="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                Run Interventions
              </button>
            </div>
          </div>
          <div id="sla-results" class="mt-3 text-xs text-amber-900">
            SLA risk prediction not run yet.
          </div>
        </section>
      )}

      {/* Filter Bar */}
      <form
        method="get"
        class="flex flex-wrap items-end gap-3 mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
        data-persist-filters
        data-persist-key="admin-fulfillment-filters"
        data-persist-clear-selector="[data-clear-fulfillment-filters]"
      >
        <div>
          <label class="text-xs font-medium text-gray-500 block mb-1">Status</label>
          <select name="status" data-auto-submit="change" class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-300">
            <option value="">All statuses</option>
            {["pending", "submitted", "processing", "shipped", "delivered", "failed", "cancelled"].map((s) => (
              <option value={s} selected={filters.status === s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-gray-500 block mb-1">Provider</label>
          <select name="provider" data-auto-submit="change" class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-300">
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
        <a href="/admin/fulfillment" data-clear-fulfillment-filters class="text-sm text-gray-500 hover:text-gray-700 py-2">Clear</a>
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
                  <tr
                    key={req.id}
                    class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    data-request-row
                    data-request-id={req.id}
                    data-request-status={req.status}
                  >
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
                      <span class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[req.status] ?? "bg-gray-100 text-gray-800"}`} data-request-status-badge>
                        {req.status}
                      </span>
                      {req.errorMessage && (
                        <p class="mt-1 text-xs text-red-600 max-w-xs truncate" data-request-error>{req.errorMessage}</p>
                      )}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-500">{req.createdAt}</td>
                    <td class="px-4 py-3" data-request-actions>
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

            function statusPillClass(status) {
              if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
              if (status === 'submitted') return 'bg-blue-100 text-blue-800';
              if (status === 'processing') return 'bg-indigo-100 text-indigo-800';
              if (status === 'shipped') return 'bg-green-100 text-green-800';
              if (status === 'delivered') return 'bg-green-200 text-green-900';
              if (status === 'cancel_requested') return 'bg-orange-100 text-orange-800';
              if (status === 'cancelled') return 'bg-gray-100 text-gray-800';
              if (status === 'failed') return 'bg-red-100 text-red-800';
              return 'bg-gray-100 text-gray-800';
            }

            function setRequestState(requestId, nextStatus, errorMessage) {
              var row = document.querySelector('[data-request-row][data-request-id="' + requestId + '"]');
              if (!row) return;
              row.setAttribute('data-request-status', nextStatus);

              var statusBadge = row.querySelector('[data-request-status-badge]');
              if (statusBadge) {
                statusBadge.className = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' + statusPillClass(nextStatus);
                statusBadge.textContent = nextStatus;
              }

              var errorEl = row.querySelector('[data-request-error]');
              if (errorMessage) {
                if (!errorEl) {
                  errorEl = document.createElement('p');
                  errorEl.className = 'mt-1 text-xs text-red-600 max-w-xs truncate';
                  errorEl.setAttribute('data-request-error', 'true');
                  var statusCell = statusBadge ? statusBadge.parentElement : null;
                  if (statusCell) statusCell.appendChild(errorEl);
                }
                errorEl.textContent = errorMessage;
              } else if (errorEl) {
                errorEl.remove();
              }

              var actionsCell = row.querySelector('[data-request-actions]');
              if (actionsCell) {
                if (nextStatus === 'failed') {
                  actionsCell.innerHTML = '<button type="button" class="retry-btn text-sm text-brand-600 hover:text-brand-700 font-medium" data-request-id="' + requestId + '">Retry</button>';
                } else {
                  actionsCell.innerHTML = '';
                }
              }
            }

            var pendingRetryId = null;
            var dialog = document.getElementById('retry-confirm');
            document.addEventListener('click', function(event) {
              var retryBtn = event.target && event.target.closest ? event.target.closest('.retry-btn') : null;
              if (!retryBtn) return;
              pendingRetryId = retryBtn.getAttribute('data-request-id');
              dialog.classList.remove('hidden');
            });
            document.getElementById('retry-no').addEventListener('click', function() {
              dialog.classList.add('hidden');
              pendingRetryId = null;
            });
            document.getElementById('retry-yes').addEventListener('click', async function() {
              if (!pendingRetryId) return;
              var confirmBtn = this;
              confirmBtn.setAttribute('disabled', 'true');
              try {
                var res = await fetch('/api/admin/fulfillment/' + pendingRetryId + '/retry', { method: 'POST' });
                var data = await res.json().catch(function() { return {}; });
                if (!res.ok) {
                  throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to retry') : (data.error || data.message || 'Failed to retry'));
                }
                setRequestState(pendingRetryId, 'pending', null);
                if (window.showToast) window.showToast(data.message || 'Retry queued.', 'success');
              } catch (err) {
                showFulfillmentDashboardError(err.message || 'Failed to retry fulfillment');
              } finally {
                confirmBtn.removeAttribute('disabled');
                dialog.classList.add('hidden');
                pendingRetryId = null;
              }
            });

            var scanBtn = document.getElementById('exception-scan-btn');
            var resolveBtn = document.getElementById('exception-resolve-btn');
            var resultEl = document.getElementById('exception-results');
            var slaRefreshBtn = document.getElementById('sla-refresh-btn');
            var slaInterveneBtn = document.getElementById('sla-intervene-btn');
            var slaResultEl = document.getElementById('sla-results');

            function renderExceptionResult(payload, mode) {
              if (!resultEl || !payload) return;
              var summary = payload.summary
                ? payload.summary
                : {
                    scannedCount: payload.scannedCount || 0,
                    autoResolvableCount: payload.eligibleCount || 0,
                  };
              var exceptions = Array.isArray(payload.exceptions) ? payload.exceptions : [];
              var top = exceptions.slice(0, 4).map(function(ex) {
                return '<li><span class=\"font-medium\">' + ex.requestId.slice(0, 8) + '...</span> · ' + ex.status + ' · ' + ex.suggestedAction + ' · ' + ex.reason + '</li>';
              }).join('');

              resultEl.innerHTML =
                '<p><span class=\"font-semibold\">' + mode + ':</span> scanned ' + summary.scannedCount + ', auto-resolvable ' + summary.autoResolvableCount + (payload.resolvedCount !== undefined ? ', resolved ' + payload.resolvedCount : '') + '.</p>' +
                (top ? '<ul class=\"mt-2 list-disc pl-4 space-y-1\">' + top + '</ul>' : '<p class=\"mt-2\">No exceptions found.</p>');
            }

            async function runExceptionScan() {
              if (!scanBtn) return;
              scanBtn.setAttribute('disabled', 'true');
              try {
                var res = await fetch('/api/admin/ops/fulfillment-exceptions?limit=30', { credentials: 'same-origin' });
                var data = await res.json().catch(function() { return {}; });
                if (!res.ok) {
                  throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to scan fulfillment exceptions') : (data.error || data.message || 'Failed to scan fulfillment exceptions'));
                }
                renderExceptionResult(data, 'Scan');
              } catch (err) {
                showFulfillmentDashboardError(err.message || 'Failed to scan fulfillment exceptions');
              } finally {
                scanBtn.removeAttribute('disabled');
              }
            }

            async function runExceptionResolve() {
              if (!resolveBtn) return;
              resolveBtn.setAttribute('disabled', 'true');
              try {
                var res = await fetch('/api/admin/ops/fulfillment-exceptions/auto-resolve', {
                  method: 'POST',
                  credentials: 'same-origin',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ dryRun: false, limit: 30 }),
                });
                var data = await res.json().catch(function() { return {}; });
                if (!res.ok) {
                  throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to auto-resolve fulfillment exceptions') : (data.error || data.message || 'Failed to auto-resolve fulfillment exceptions'));
                }
                renderExceptionResult(data, 'Auto-resolve');
                runExceptionScan();
                runSlaRefresh();
                if (window.showToast) window.showToast('Auto-resolve finished.', 'success');
              } catch (err) {
                showFulfillmentDashboardError(err.message || 'Failed to auto-resolve fulfillment exceptions');
              } finally {
                resolveBtn.removeAttribute('disabled');
              }
            }

            function riskPill(level) {
              if (level === 'high') return '<span class="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">high</span>';
              if (level === 'medium') return '<span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">medium</span>';
              return '<span class="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">low</span>';
            }

            function renderSlaDashboard(payload) {
              if (!slaResultEl || !payload || !payload.dashboard) return;
              var dashboard = payload.dashboard;
              var totals = dashboard.totals || {};
              var items = Array.isArray(dashboard.items) ? dashboard.items : [];
              var top = items.slice(0, 5).map(function(item) {
                return '<li>' +
                  '<div class="flex items-center gap-2 flex-wrap">' +
                    '<span class="font-medium">' + item.entityId.slice(0, 8) + '...</span>' +
                    riskPill(item.riskLevel) +
                    '<span>' + item.domain + '</span>' +
                  '</div>' +
                  '<div class="text-[11px] text-amber-800 mt-0.5">' +
                    'status=' + item.status +
                    ' · age=' + item.ageMinutes + 'm' +
                    ' · target=' + item.targetMinutes + 'm' +
                    ' · action=' + item.recommendedAction +
                  '</div>' +
                '</li>';
              }).join('');

              var actions = Array.isArray(dashboard.actionQueue)
                ? dashboard.actionQueue.map(function(row) {
                    return row.action + ': ' + row.count;
                  }).join(' · ')
                : '';

              slaResultEl.innerHTML =
                '<p><span class="font-semibold">SLA dashboard:</span> open ' + totals.openCount +
                ', at-risk ' + totals.atRiskCount +
                ', high-risk ' + totals.highRiskCount +
                ', projected breaches(24h) ' + totals.projectedBreaches24h +
                ', auto-eligible ' + totals.autoActionEligibleCount + '.</p>' +
                (actions ? '<p class="mt-1 text-[11px]">Action queue: ' + actions + '</p>' : '') +
                (top ? '<ul class="mt-2 list-disc pl-4 space-y-1">' + top + '</ul>' : '<p class="mt-2">No SLA risk items found.</p>');
            }

            function renderSlaInterventions(payload) {
              if (!slaResultEl || !payload) return;
              var actions = Array.isArray(payload.actions) ? payload.actions : [];
              var top = actions.slice(0, 6).map(function(action) {
                return '<li><span class="font-medium">' + action.entityId.slice(0, 8) + '...</span> · ' +
                  action.action + ' · ' + action.status + ' · ' + action.note + '</li>';
              }).join('');

              slaResultEl.innerHTML =
                '<p><span class="font-semibold">' + (payload.dryRun ? 'Intervention dry-run' : 'Intervention execution') + ':</span> ' +
                'scanned ' + payload.scannedCount +
                ', candidates ' + payload.candidateCount +
                ', executed ' + payload.executedCount +
                ', skipped ' + payload.skippedCount + '.</p>' +
                (top ? '<ul class="mt-2 list-disc pl-4 space-y-1">' + top + '</ul>' : '<p class="mt-2">No intervention actions generated.</p>');
            }

            async function runSlaRefresh() {
              if (!slaRefreshBtn) return;
              slaRefreshBtn.setAttribute('disabled', 'true');
              try {
                var res = await fetch('/api/admin/ops/fulfillment-sla?limit=40', { credentials: 'same-origin' });
                var data = await res.json().catch(function() { return {}; });
                if (!res.ok) {
                  throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to load SLA dashboard') : (data.error || data.message || 'Failed to load SLA dashboard'));
                }
                renderSlaDashboard(data);
              } catch (err) {
                showFulfillmentDashboardError(err.message || 'Failed to load SLA dashboard');
              } finally {
                slaRefreshBtn.removeAttribute('disabled');
              }
            }

            async function runSlaInterventions() {
              if (!slaInterveneBtn) return;
              slaInterveneBtn.setAttribute('disabled', 'true');
              try {
                var res = await fetch('/api/admin/ops/fulfillment-sla/interventions', {
                  method: 'POST',
                  credentials: 'same-origin',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ dryRun: false, limit: 20, minRiskLevel: 'high' }),
                });
                var data = await res.json().catch(function() { return {}; });
                if (!res.ok) {
                  throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to run SLA interventions') : (data.error || data.message || 'Failed to run SLA interventions'));
                }
                renderSlaInterventions(data);
                runSlaRefresh();
                runExceptionScan();
                if (window.showToast) window.showToast('SLA interventions completed.', 'success');
              } catch (err) {
                showFulfillmentDashboardError(err.message || 'Failed to run SLA interventions');
              } finally {
                slaInterveneBtn.removeAttribute('disabled');
              }
            }

            if (scanBtn) {
              scanBtn.addEventListener('click', runExceptionScan);
              runExceptionScan();
            }
            if (resolveBtn) {
              resolveBtn.addEventListener('click', runExceptionResolve);
            }
            if (slaRefreshBtn) {
              slaRefreshBtn.addEventListener('click', runSlaRefresh);
              runSlaRefresh();
            }
            if (slaInterveneBtn) {
              slaInterveneBtn.addEventListener('click', runSlaInterventions);
            }
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
