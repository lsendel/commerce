import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Button } from "../../../components/ui/button";

interface AffiliateRow {
  id: string;
  userId: string;
  referralCode: string;
  status: string;
  commissionRate: string;
  totalEarnings: string;
  totalClicks: number;
  totalConversions: number;
  createdAt: string;
}

interface AdminAffiliatesPageProps {
  affiliates: AffiliateRow[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-800",
};

export const AdminAffiliatesPage: FC<AdminAffiliatesPageProps> = ({ affiliates }) => {
  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <nav class="text-xs text-gray-400 mb-1">
            <a href="/admin" class="hover:text-gray-600">Admin</a>
            <span class="mx-1">/</span>
            <span class="text-gray-600">Affiliates</span>
          </nav>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Affiliate Management</h1>
        </div>
      </div>

      {/* Stats Summary */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div class="rounded-lg border border-gray-200 bg-white p-4">
          <p class="text-sm text-gray-600">Total</p>
          <p class="text-2xl font-bold text-gray-900">{affiliates.length}</p>
        </div>
        <div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p class="text-sm text-gray-600">Pending</p>
          <p class="text-2xl font-bold text-gray-900" data-aff-stat="pending">{affiliates.filter((a) => a.status === "pending").length}</p>
        </div>
        <div class="rounded-lg border border-green-200 bg-green-50 p-4">
          <p class="text-sm text-gray-600">Approved</p>
          <p class="text-2xl font-bold text-gray-900" data-aff-stat="approved">{affiliates.filter((a) => a.status === "approved").length}</p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p class="text-sm text-gray-600">Total Earnings</p>
          <p class="text-2xl font-bold text-gray-900">
            ${affiliates.reduce((sum, a) => sum + Number(a.totalEarnings), 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversions</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earnings</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              {affiliates.length === 0 ? (
                <tr>
                  <td colspan={8} class="px-4 py-8 text-center text-sm text-gray-500">No affiliates yet.</td>
                </tr>
              ) : (
                affiliates.map((aff) => (
                  <tr key={aff.id} class="hover:bg-gray-50 dark:hover:bg-gray-700/50" data-aff-row={aff.id} data-aff-status={aff.status}>
                    <td class="px-4 py-3 text-sm font-mono font-medium">{aff.referralCode}</td>
                    <td class="px-4 py-3">
                      <span data-aff-status-badge class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[aff.status] ?? "bg-gray-100 text-gray-800"}`}>
                        {aff.status}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-sm">{aff.commissionRate}%</td>
                    <td class="px-4 py-3 text-sm text-gray-600">{aff.totalClicks}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">{aff.totalConversions}</td>
                    <td class="px-4 py-3 text-sm font-medium">${aff.totalEarnings}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">{aff.createdAt}</td>
                    <td class="px-4 py-3 flex gap-2" data-aff-actions>
                      {aff.status === "pending" && (
                        <button type="button" class="approve-btn text-xs text-green-600 hover:text-green-700 font-medium" data-aff-id={aff.id}>Approve</button>
                      )}
                      {aff.status === "approved" && (
                        <button type="button" class="suspend-btn text-xs text-red-600 hover:text-red-700 font-medium" data-aff-id={aff.id}>Suspend</button>
                      )}
                      {aff.status === "suspended" && (
                        <button type="button" class="approve-btn text-xs text-green-600 hover:text-green-700 font-medium" data-aff-id={aff.id}>Reactivate</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {html`
        <script>
          (function() {
            var STATUS_COLORS = {
              pending: 'bg-yellow-100 text-yellow-800',
              approved: 'bg-green-100 text-green-800',
              suspended: 'bg-red-100 text-red-800',
            };

            function showAffiliatesNotice(message, type) {
              if (window.showToast) {
                window.showToast(message, type || 'info');
                return;
              }
              var banner = document.getElementById('admin-affiliates-flash');
              if (!banner) {
                banner = document.createElement('div');
                banner.id = 'admin-affiliates-flash';
                banner.className = 'fixed top-4 right-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm font-medium shadow-lg';
                document.body.appendChild(banner);
              }
              if (type === 'error') {
                banner.classList.remove('border-emerald-200', 'bg-emerald-50', 'text-emerald-700');
                banner.classList.add('border-red-200', 'bg-red-50', 'text-red-700');
              } else {
                banner.classList.remove('border-red-200', 'bg-red-50', 'text-red-700');
                banner.classList.add('border-emerald-200', 'bg-emerald-50', 'text-emerald-700');
              }
              banner.textContent = message;
              banner.classList.remove('hidden');
              setTimeout(function() { banner.classList.add('hidden'); }, 4000);
            }

            function setButtonLoading(btn, loading) {
              if (!btn) return;
              if (loading) {
                btn.dataset.originalLabel = btn.textContent || '';
                btn.textContent = 'Saving...';
                btn.disabled = true;
                btn.classList.add('opacity-60', 'cursor-not-allowed');
                return;
              }
              if (btn.dataset.originalLabel) btn.textContent = btn.dataset.originalLabel;
              btn.disabled = false;
              btn.classList.remove('opacity-60', 'cursor-not-allowed');
            }

            function actionsMarkup(id, status) {
              if (status === 'pending') {
                return '<button type="button" class="approve-btn text-xs text-green-600 hover:text-green-700 font-medium" data-aff-id="' + id + '">Approve</button>';
              }
              if (status === 'approved') {
                return '<button type="button" class="suspend-btn text-xs text-red-600 hover:text-red-700 font-medium" data-aff-id="' + id + '">Suspend</button>';
              }
              if (status === 'suspended') {
                return '<button type="button" class="approve-btn text-xs text-green-600 hover:text-green-700 font-medium" data-aff-id="' + id + '">Reactivate</button>';
              }
              return '<span class="text-xs text-gray-400">No actions available</span>';
            }

            function updateStatusStat(status, delta) {
              if (!status || !delta) return;
              var el = document.querySelector('[data-aff-stat="' + status + '"]');
              if (!el) return;
              var current = parseInt(el.textContent || '0', 10) || 0;
              var next = current + delta;
              el.textContent = String(next < 0 ? 0 : next);
            }

            function updateAffiliateRow(id, nextStatus) {
              var row = document.querySelector('[data-aff-row="' + id + '"]');
              if (!row) return;

              var previousStatus = row.dataset.affStatus || '';
              row.dataset.affStatus = nextStatus;

              var badge = row.querySelector('[data-aff-status-badge]');
              if (badge) {
                badge.textContent = nextStatus;
                badge.className = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' + (STATUS_COLORS[nextStatus] || 'bg-gray-100 text-gray-800');
              }

              var actions = row.querySelector('[data-aff-actions]');
              if (actions) actions.innerHTML = actionsMarkup(id, nextStatus);

              if (previousStatus && previousStatus !== nextStatus) {
                updateStatusStat(previousStatus, -1);
                updateStatusStat(nextStatus, 1);
              }
            }

            async function confirmSuspend() {
              if (window.petm8Ui && typeof window.petm8Ui.confirm === 'function') {
                return window.petm8Ui.confirm('Suspend this affiliate?', {
                  title: 'Suspend affiliate',
                  confirmText: 'Suspend',
                  danger: true,
                });
              }
              return confirm('Suspend this affiliate?');
            }

            async function performAffiliateAction(id, action, button) {
              var endpoint = action === 'approve' ? '/approve' : '/suspend';
              var nextStatus = action === 'approve' ? 'approved' : 'suspended';
              setButtonLoading(button, true);
              try {
                var res = await fetch('/api/affiliates/admin/' + id + endpoint, { method: 'PATCH' });
                if (!res.ok) {
                  var data = await res.json().catch(function() { return {}; });
                  throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Affiliate update failed') : (data.error || data.message || 'Affiliate update failed'));
                }
                updateAffiliateRow(id, nextStatus);
                showAffiliatesNotice(action === 'approve' ? 'Affiliate approved.' : 'Affiliate suspended.', 'success');
              } catch (err) {
                showAffiliatesNotice(err.message || 'Affiliate update failed', 'error');
              } finally {
                setButtonLoading(button, false);
              }
            }

            document.addEventListener('click', async function(event) {
              var approveButton = event.target.closest('.approve-btn');
              if (approveButton) {
                var approveId = approveButton.getAttribute('data-aff-id');
                if (approveId) await performAffiliateAction(approveId, 'approve', approveButton);
                return;
              }

              var suspendButton = event.target.closest('.suspend-btn');
              if (suspendButton) {
                var suspendId = suspendButton.getAttribute('data-aff-id');
                if (!suspendId) return;
                var confirmed = await confirmSuspend();
                if (!confirmed) return;
                await performAffiliateAction(suspendId, 'suspend', suspendButton);
              }
            });
          })();
        </script>
      `}
    </div>
  );
};
