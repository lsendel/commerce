import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Button } from "../../../components/ui/button";

interface CouponCodeRow {
  id: string;
  promotionId: string;
  promotionName: string;
  code: string;
  maxRedemptions: number | null;
  redemptionCount: number;
  singleUsePerCustomer: boolean;
  createdAt: string;
}

interface PromotionCodesPageProps {
  codes: CouponCodeRow[];
  promotions: Array<{ id: string; name: string }>;
}

export const PromotionCodesPage: FC<PromotionCodesPageProps> = ({ codes, promotions }) => {
  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <nav class="text-xs text-gray-400 mb-1">
            <a href="/admin" class="hover:text-gray-600">Admin</a>
            <span class="mx-1">/</span>
            <a href="/admin/promotions" class="hover:text-gray-600">Promotions</a>
            <span class="mx-1">/</span>
            <span class="text-gray-600">Coupon Codes</span>
          </nav>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Coupon Codes</h1>
        </div>
        <button
          type="button"
          id="btn-add-code"
          class="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Generate Code
        </button>
      </div>

      {/* Generate Code Form */}
      <div id="code-form-section" class="hidden mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Generate Coupon Code</h2>
        <form id="code-form" onsubmit="return false;" class="space-y-4">
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-700 block mb-1">Promotion</label>
              <select name="promotionId" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                <option value="">Select promotion...</option>
                {promotions.map((p) => (
                  <option value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700 block mb-1">Code</label>
              <input type="text" name="code" required placeholder="e.g. SUMMER20" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase" />
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700 block mb-1">Max Redemptions</label>
              <input type="number" name="maxRedemptions" placeholder="Unlimited" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div class="flex gap-3 pt-2">
            <Button type="submit" variant="primary" id="code-save-btn">Create Code</Button>
            <Button type="button" variant="ghost" id="btn-cancel-code">Cancel</Button>
          </div>
        </form>
      </div>

      {/* Codes Table */}
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Promotion</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Redemptions</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Single Use</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              {codes.length === 0 ? (
                <tr>
                  <td colspan={5} class="px-4 py-8 text-center text-sm text-gray-500">
                    No coupon codes yet. Generate one to get started.
                  </td>
                </tr>
              ) : (
                codes.map((code) => (
                  <tr key={code.id} class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td class="px-4 py-3 text-sm font-mono font-medium text-gray-900 dark:text-gray-100">{code.code}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">{code.promotionName}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                      {code.redemptionCount}{code.maxRedemptions ? ` / ${code.maxRedemptions}` : ""}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-500">{code.singleUsePerCustomer ? "Yes" : "No"}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">{code.createdAt}</td>
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
            function showPromotionCodesError(message) {
              if (window.showToast) {
                window.showToast(message, 'error');
                return;
              }
              var banner = document.getElementById('admin-promotion-codes-flash');
              if (!banner) {
                banner = document.createElement('div');
                banner.id = 'admin-promotion-codes-flash';
                banner.className = 'fixed top-4 right-4 z-50 max-w-sm rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-lg';
                document.body.appendChild(banner);
              }
              banner.textContent = message;
              banner.classList.remove('hidden');
              setTimeout(function() { banner.classList.add('hidden'); }, 4000);
            }

            var formSection = document.getElementById('code-form-section');
            var form = document.getElementById('code-form');
            document.getElementById('btn-add-code').addEventListener('click', function() {
              formSection.classList.remove('hidden');
            });
            document.getElementById('btn-cancel-code').addEventListener('click', function() {
              formSection.classList.add('hidden');
              form.reset();
            });
            form.addEventListener('submit', async function(e) {
              e.preventDefault();
              var fd = new FormData(this);
              var promotionId = fd.get('promotionId');
              var body = {
                code: fd.get('code'),
                maxRedemptions: fd.get('maxRedemptions') ? parseInt(fd.get('maxRedemptions'), 10) : undefined,
              };
              try {
                var res = await fetch('/api/promotions/' + promotionId + '/codes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                });
                if (!res.ok) {
                  var data = await res.json().catch(function() { return {}; });
                  throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to create code') : (data.error || data.message || 'Failed to create code'));
                }
                window.location.reload();
              } catch (err) { showPromotionCodesError(err.message || 'Failed to create code'); }
            });
          })();
        </script>
      `}
    </div>
  );
};
