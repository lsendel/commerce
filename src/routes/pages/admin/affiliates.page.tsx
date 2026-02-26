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
          <p class="text-2xl font-bold text-gray-900">{affiliates.filter((a) => a.status === "pending").length}</p>
        </div>
        <div class="rounded-lg border border-green-200 bg-green-50 p-4">
          <p class="text-sm text-gray-600">Approved</p>
          <p class="text-2xl font-bold text-gray-900">{affiliates.filter((a) => a.status === "approved").length}</p>
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
                  <tr key={aff.id} class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td class="px-4 py-3 text-sm font-mono font-medium">{aff.referralCode}</td>
                    <td class="px-4 py-3">
                      <span class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[aff.status] ?? "bg-gray-100 text-gray-800"}`}>
                        {aff.status}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-sm">{aff.commissionRate}%</td>
                    <td class="px-4 py-3 text-sm text-gray-600">{aff.totalClicks}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">{aff.totalConversions}</td>
                    <td class="px-4 py-3 text-sm font-medium">${aff.totalEarnings}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">{aff.createdAt}</td>
                    <td class="px-4 py-3 flex gap-2">
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
            document.querySelectorAll('.approve-btn').forEach(function(btn) {
              btn.addEventListener('click', async function() {
                var id = this.getAttribute('data-aff-id');
                try {
                  var res = await fetch('/api/affiliates/admin/' + id + '/approve', { method: 'PATCH' });
                  if (!res.ok) throw new Error('Failed to approve');
                  window.location.reload();
                } catch (err) { alert(err.message); }
              });
            });
            document.querySelectorAll('.suspend-btn').forEach(function(btn) {
              btn.addEventListener('click', async function() {
                if (!confirm('Suspend this affiliate?')) return;
                var id = this.getAttribute('data-aff-id');
                try {
                  var res = await fetch('/api/affiliates/admin/' + id + '/suspend', {
                    method: 'PATCH',
                  });
                  if (!res.ok) throw new Error('Failed to suspend');
                  window.location.reload();
                } catch (err) { alert(err.message); }
              });
            });
          })();
        </script>
      `}
    </div>
  );
};
