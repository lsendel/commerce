import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Button } from "../../../components/ui/button";

interface PromotionRow {
  id: string;
  name: string;
  type: string;
  status: string;
  strategyType: string;
  priority: number;
  stackable: boolean;
  usageCount: number;
  usageLimit: number | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

interface PromotionsPageProps {
  promotions: PromotionRow[];
  filters: {
    status?: string;
    type?: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  scheduled: "bg-blue-100 text-blue-800",
  expired: "bg-gray-100 text-gray-700",
  disabled: "bg-red-100 text-red-800",
};

const TYPE_LABELS: Record<string, string> = {
  coupon: "Coupon",
  automatic: "Automatic",
  flash_sale: "Flash Sale",
};

const STRATEGY_LABELS: Record<string, string> = {
  percentage: "% Off",
  fixed_amount: "$ Off",
  buy_x_get_y: "BOGO",
  free_shipping: "Free Ship",
  tiered: "Tiered",
};

export const PromotionsPage: FC<PromotionsPageProps> = ({ promotions, filters }) => {
  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <nav class="text-xs text-gray-400 mb-1">
            <a href="/admin" class="hover:text-gray-600">Admin</a>
            <span class="mx-1">/</span>
            <span class="text-gray-600">Promotions</span>
          </nav>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Promotions</h1>
        </div>
        <div class="flex gap-2">
          <a href="/admin/promotions/codes" class="text-sm text-brand-600 hover:text-brand-700 font-medium">Coupon Codes</a>
          <span class="text-gray-300">|</span>
          <a href="/admin/segments" class="text-sm text-brand-600 hover:text-brand-700 font-medium">Segments</a>
        </div>
      </div>

      {/* Filter Bar */}
      <form method="get" class="flex flex-wrap items-end gap-3 mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div>
          <label class="text-xs font-medium text-gray-500 block mb-1">Status</label>
          <select name="status" class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-300">
            <option value="">All statuses</option>
            {["active", "scheduled", "expired", "disabled"].map((s) => (
              <option value={s} selected={filters.status === s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-gray-500 block mb-1">Type</label>
          <select name="type" class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-300">
            <option value="">All types</option>
            {["coupon", "automatic", "flash_sale"].map((t) => (
              <option value={t} selected={filters.type === t}>{TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="primary" size="sm">Filter</Button>
        <a href="/admin/promotions" class="text-sm text-gray-500 hover:text-gray-700 py-2">Clear</a>
      </form>

      {/* Add Promotion Form */}
      <div id="promo-form-section" class="hidden mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 id="promo-form-title" class="text-lg font-semibold text-gray-900 mb-4">Create Promotion</h2>
        <form id="promo-form" onsubmit="return false;" class="space-y-4">
          <input type="hidden" name="promoId" value="" />
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-700 block mb-1">Name</label>
              <input type="text" name="name" required placeholder="e.g. Summer Sale 20% Off" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700 block mb-1">Type</label>
              <select name="type" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                <option value="coupon">Coupon</option>
                <option value="automatic">Automatic</option>
                <option value="flash_sale">Flash Sale</option>
              </select>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700 block mb-1">Strategy</label>
              <select name="strategyType" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                <option value="percentage">Percentage Off</option>
                <option value="fixed_amount">Fixed Amount Off</option>
                <option value="buy_x_get_y">Buy X Get Y</option>
                <option value="free_shipping">Free Shipping</option>
                <option value="tiered">Tiered</option>
              </select>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700 block mb-1">Priority</label>
              <input type="number" name="priority" value="0" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700 block mb-1">Starts At</label>
              <input type="datetime-local" name="startsAt" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700 block mb-1">Ends At</label>
              <input type="datetime-local" name="endsAt" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700 block mb-1">Usage Limit</label>
              <input type="number" name="usageLimit" placeholder="Unlimited" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div class="flex items-center gap-2 pt-6">
              <input type="checkbox" name="stackable" id="stackable-check" class="rounded" />
              <label for="stackable-check" class="text-sm text-gray-700">Stackable with other promotions</label>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 block mb-1">Description</label>
            <textarea name="description" rows={2} placeholder="Optional description..." class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div class="flex gap-3 pt-2">
            <Button type="submit" variant="primary" id="promo-save-btn">Save Promotion</Button>
            <Button type="button" variant="ghost" id="btn-cancel-promo">Cancel</Button>
          </div>
        </form>
      </div>

      {/* Promotions Table */}
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            All Promotions ({promotions.length})
          </h2>
          <button
            type="button"
            id="btn-add-promo"
            class="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New Promotion
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strategy</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              {promotions.length === 0 ? (
                <tr>
                  <td colspan={7} class="px-4 py-8 text-center text-sm text-gray-500">
                    No promotions match your filters.
                  </td>
                </tr>
              ) : (
                promotions.map((promo) => (
                  <tr key={promo.id} class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{promo.name}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">{TYPE_LABELS[promo.type] ?? promo.type}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">{STRATEGY_LABELS[promo.strategyType] ?? promo.strategyType}</td>
                    <td class="px-4 py-3">
                      <span class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[promo.status] ?? "bg-gray-100 text-gray-800"}`}>
                        {promo.status}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                      {promo.usageCount}{promo.usageLimit ? ` / ${promo.usageLimit}` : ""}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-500">
                      {promo.startsAt ? promo.startsAt : "—"} → {promo.endsAt ? promo.endsAt : "∞"}
                    </td>
                    <td class="px-4 py-3 flex gap-2">
                      {promo.status === "active" && (
                        <button type="button" class="disable-btn text-xs text-red-600 hover:text-red-700 font-medium" data-promo-id={promo.id}>Disable</button>
                      )}
                      {promo.status === "disabled" && (
                        <button type="button" class="enable-btn text-xs text-green-600 hover:text-green-700 font-medium" data-promo-id={promo.id}>Enable</button>
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
            var formSection = document.getElementById('promo-form-section');
            var form = document.getElementById('promo-form');
            document.getElementById('btn-add-promo').addEventListener('click', function() {
              formSection.classList.remove('hidden');
            });
            document.getElementById('btn-cancel-promo').addEventListener('click', function() {
              formSection.classList.add('hidden');
              form.reset();
            });
            form.addEventListener('submit', async function(e) {
              e.preventDefault();
              var fd = new FormData(this);
              var body = {
                name: fd.get('name'),
                description: fd.get('description') || undefined,
                type: fd.get('type'),
                strategyType: fd.get('strategyType'),
                strategyParams: {},
                conditions: {},
                priority: parseInt(fd.get('priority') || '0', 10),
                stackable: !!fd.get('stackable'),
                startsAt: fd.get('startsAt') || undefined,
                endsAt: fd.get('endsAt') || undefined,
                usageLimit: fd.get('usageLimit') ? parseInt(fd.get('usageLimit'), 10) : undefined,
              };
              try {
                var res = await fetch('/api/promotions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                });
                if (!res.ok) throw new Error('Failed to create promotion');
                window.location.reload();
              } catch (err) { alert(err.message); }
            });
            document.querySelectorAll('.disable-btn').forEach(function(btn) {
              btn.addEventListener('click', async function() {
                if (!confirm('Disable this promotion?')) return;
                var id = this.getAttribute('data-promo-id');
                try {
                  var res = await fetch('/api/promotions/' + id, { method: 'DELETE' });
                  if (!res.ok) throw new Error('Failed to disable');
                  window.location.reload();
                } catch (err) { alert(err.message); }
              });
            });
            document.querySelectorAll('.enable-btn').forEach(function(btn) {
              btn.addEventListener('click', async function() {
                var id = this.getAttribute('data-promo-id');
                try {
                  var res = await fetch('/api/promotions/' + id, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'active' }),
                  });
                  if (!res.ok) throw new Error('Failed to enable');
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
