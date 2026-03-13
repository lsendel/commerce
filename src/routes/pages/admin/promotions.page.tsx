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
  isPromotionCopilotEnabled?: boolean;
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
  percentage_off: "% Off",
  fixed_amount: "$ Off",
  buy_x_get_y: "BOGO",
  free_shipping: "Free Ship",
  tiered: "Tiered",
  bundle: "Bundle",
};

export const PromotionsPage: FC<PromotionsPageProps> = ({
  promotions,
  filters,
  isPromotionCopilotEnabled = false,
}) => {
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
      <form
        method="get"
        class="flex flex-wrap items-end gap-3 mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
        data-persist-filters
        data-persist-key="admin-promotions-filters"
        data-persist-clear-selector="[data-clear-promotions-filters]"
      >
        <div>
          <label class="text-xs font-medium text-gray-500 block mb-1">Status</label>
          <select name="status" data-auto-submit="change" class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-300">
            <option value="">All statuses</option>
            {["active", "scheduled", "expired", "disabled"].map((s) => (
              <option value={s} selected={filters.status === s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-gray-500 block mb-1">Type</label>
          <select name="type" data-auto-submit="change" class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-300">
            <option value="">All types</option>
            {["coupon", "automatic", "flash_sale"].map((t) => (
              <option value={t} selected={filters.type === t}>{TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="primary" size="sm">Filter</Button>
        <a href="/admin/promotions" data-clear-promotions-filters class="text-sm text-gray-500 hover:text-gray-700 py-2">Clear</a>
      </form>

      {/* Promotion Copilot */}
      {isPromotionCopilotEnabled && (
        <section class="mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-brand-100 dark:border-brand-900/50 shadow-sm p-6">
          <div class="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Promotion Copilot</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Draft campaign strategy, copy, and rule scaffolding from a short brief.
              </p>
            </div>
            <span class="inline-flex items-center rounded-full bg-brand-50 text-brand-700 text-xs font-semibold px-2 py-1">
              MVP
            </span>
          </div>

          <div class="grid md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label class="text-sm font-medium text-gray-700 block mb-1">Campaign Brief</label>
              <textarea id="promo-copilot-brief" rows={3} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. Recover abandoned carts with a weekend offer for first-time buyers." />
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700 block mb-1">Objective</label>
              <select id="promo-copilot-objective" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
                <option value="conversion">Conversion</option>
                <option value="aov">AOV</option>
                <option value="acquisition">Acquisition</option>
                <option value="retention">Retention</option>
                <option value="clearance">Clearance</option>
              </select>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700 block mb-1">Audience</label>
              <input id="promo-copilot-audience" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. new customers in US" />
            </div>
          </div>

          <div class="flex items-center gap-3 mt-4">
            <Button type="button" variant="secondary" id="promo-copilot-generate-btn" size="sm">
              Generate Campaign Suggestion
            </Button>
            <Button type="button" variant="primary" id="promo-copilot-apply-btn" size="sm" class="hidden">
              Apply to Form
            </Button>
            <Button type="button" variant="primary" id="promo-copilot-create-btn" size="sm" class="hidden">
              Create With Copilot
            </Button>
            <p id="promo-copilot-status" class="text-sm text-gray-500 dark:text-gray-400" />
          </div>

          <div id="promo-copilot-output" class="hidden mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
            <p class="text-sm"><strong>Name:</strong> <span id="promo-copilot-name"></span></p>
            <p class="text-sm mt-1"><strong>Strategy:</strong> <span id="promo-copilot-strategy"></span></p>
            <p class="text-sm mt-1"><strong>Description:</strong> <span id="promo-copilot-description"></span></p>
            <p class="text-sm mt-1"><strong>Coupon Code Suggestion:</strong> <span id="promo-copilot-coupon"></span></p>
            <div id="promo-copilot-warnings" class="hidden mt-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-sm px-3 py-2" />
          </div>
        </section>
      )}

      {/* Add Promotion Form */}
      <div id="promo-form-section" class="hidden mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 id="promo-form-title" class="text-lg font-semibold text-gray-900 mb-4">Create Promotion</h2>
        <form id="promo-form" onsubmit="return false;" class="space-y-4" data-auto-draft data-auto-draft-key="admin-promotions-editor">
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
                <option value="percentage_off">Percentage Off</option>
                <option value="fixed_amount">Fixed Amount Off</option>
                <option value="buy_x_get_y">Buy X Get Y</option>
                <option value="free_shipping">Free Shipping</option>
                <option value="tiered">Tiered</option>
                <option value="bundle">Bundle</option>
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
            All Promotions (<span id="promotions-count">{promotions.length}</span>)
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
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700" id="promotions-tbody">
              {promotions.length === 0 ? (
                <tr id="promotions-empty-row">
                  <td colspan={7} class="px-4 py-8 text-center text-sm text-gray-500">
                    No promotions match your filters.
                  </td>
                </tr>
              ) : (
                promotions.map((promo) => (
                  <tr
                    key={promo.id}
                    class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    data-promo-row
                    data-promo-id={promo.id}
                    data-promo-status={promo.status}
                  >
                    <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100" data-promo-name>{promo.name}</td>
                    <td class="px-4 py-3 text-sm text-gray-600" data-promo-type>{TYPE_LABELS[promo.type] ?? promo.type}</td>
                    <td class="px-4 py-3 text-sm text-gray-600" data-promo-strategy>{STRATEGY_LABELS[promo.strategyType] ?? promo.strategyType}</td>
                    <td class="px-4 py-3">
                      <span data-promo-status-badge class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[promo.status] ?? "bg-gray-100 text-gray-800"}`}>
                        {promo.status}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600" data-promo-usage>
                      {promo.usageCount}{promo.usageLimit ? ` / ${promo.usageLimit}` : ""}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-500" data-promo-schedule>
                      {promo.startsAt ? promo.startsAt : "—"} → {promo.endsAt ? promo.endsAt : "∞"}
                    </td>
                    <td class="px-4 py-3 flex gap-2" data-promo-actions>
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
            var isPromotionCopilotEnabled = ${isPromotionCopilotEnabled ? "true" : "false"};
            var latestPromotionCopilotPatch = null;
            var flashTimer = null;
            var promotionsBody = document.getElementById('promotions-tbody');
            var promotionsCountEl = document.getElementById('promotions-count');

            var STATUS_COLOR_MAP = {
              active: 'bg-green-100 text-green-800',
              scheduled: 'bg-blue-100 text-blue-800',
              expired: 'bg-gray-100 text-gray-700',
              disabled: 'bg-red-100 text-red-800',
            };
            var TYPE_LABEL_MAP = {
              coupon: 'Coupon',
              automatic: 'Automatic',
              flash_sale: 'Flash Sale',
            };
            var STRATEGY_LABEL_MAP = {
              percentage_off: '% Off',
              fixed_amount: '$ Off',
              buy_x_get_y: 'BOGO',
              free_shipping: 'Free Ship',
              tiered: 'Tiered',
              bundle: 'Bundle',
            };

            function showFlash(message, type) {
              var banner = document.getElementById('admin-promotions-flash');
              if (!banner) {
                banner = document.createElement('div');
                banner.id = 'admin-promotions-flash';
                banner.className = 'fixed top-4 right-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm font-medium shadow-lg';
                document.body.appendChild(banner);
              }
              banner.textContent = message;
              banner.classList.remove(
                'bg-red-50', 'text-red-700', 'border-red-200',
                'bg-emerald-50', 'text-emerald-700', 'border-emerald-200',
                'hidden'
              );
              if (type === 'success') {
                banner.classList.add('bg-emerald-50', 'text-emerald-700', 'border-emerald-200');
              } else {
                banner.classList.add('bg-red-50', 'text-red-700', 'border-red-200');
              }
              if (flashTimer) clearTimeout(flashTimer);
              flashTimer = setTimeout(function() {
                banner.classList.add('hidden');
              }, 4000);
            }

            function escapeHtml(value) {
              return String(value == null ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
            }

            function setButtonLoading(btn, loading, loadingText, idleText) {
              if (!btn) return;
              if (loading) {
                btn.dataset.idleLabel = idleText || btn.textContent || '';
                btn.disabled = true;
                btn.textContent = loadingText || 'Saving...';
                btn.classList.add('opacity-70', 'cursor-not-allowed');
                return;
              }
              btn.disabled = false;
              btn.textContent = btn.dataset.idleLabel || idleText || btn.textContent || '';
              btn.classList.remove('opacity-70', 'cursor-not-allowed');
            }

            async function confirmAction(message, options) {
              if (window.petm8Ui && typeof window.petm8Ui.confirm === 'function') {
                return window.petm8Ui.confirm(message, options || {});
              }
              return confirm(message);
            }

            function normalizePromotion(record) {
              if (!record || typeof record !== 'object') return null;
              return {
                id: String(record.id || ''),
                name: String(record.name || 'Untitled Promotion'),
                type: String(record.type || 'automatic'),
                status: String(record.status || 'disabled'),
                strategyType: String(record.strategyType || ''),
                usageCount: Number(record.usageCount || 0),
                usageLimit: record.usageLimit == null ? null : Number(record.usageLimit),
                startsAt: record.startsAt ? String(record.startsAt) : null,
                endsAt: record.endsAt ? String(record.endsAt) : null,
              };
            }

            function formatSchedule(promo) {
              return (promo.startsAt ? promo.startsAt : '\u2014') + ' \u2192 ' + (promo.endsAt ? promo.endsAt : '\u221e');
            }

            function renderStatusBadge(status) {
              var classes = STATUS_COLOR_MAP[status] || 'bg-gray-100 text-gray-800';
              return '<span data-promo-status-badge class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' + classes + '">' + escapeHtml(status) + '</span>';
            }

            function renderActions(status, promoId) {
              if (status === 'active') {
                return '<button type="button" class="disable-btn text-xs text-red-600 hover:text-red-700 font-medium" data-promo-id="' + escapeHtml(promoId) + '">Disable</button>';
              }
              if (status === 'disabled') {
                return '<button type="button" class="enable-btn text-xs text-green-600 hover:text-green-700 font-medium" data-promo-id="' + escapeHtml(promoId) + '">Enable</button>';
              }
              return '<span class="text-xs text-gray-400">No actions</span>';
            }

            function buildPromotionRow(promo) {
              var tr = document.createElement('tr');
              tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-700/50';
              tr.setAttribute('data-promo-row', '');
              tr.setAttribute('data-promo-id', promo.id);
              tr.setAttribute('data-promo-status', promo.status);
              tr.innerHTML = [
                '<td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100" data-promo-name>' + escapeHtml(promo.name) + '</td>',
                '<td class="px-4 py-3 text-sm text-gray-600" data-promo-type>' + escapeHtml(TYPE_LABEL_MAP[promo.type] || promo.type) + '</td>',
                '<td class="px-4 py-3 text-sm text-gray-600" data-promo-strategy>' + escapeHtml(STRATEGY_LABEL_MAP[promo.strategyType] || promo.strategyType) + '</td>',
                '<td class="px-4 py-3">' + renderStatusBadge(promo.status) + '</td>',
                '<td class="px-4 py-3 text-sm text-gray-600" data-promo-usage>' + escapeHtml(String(promo.usageCount)) + (promo.usageLimit ? ' / ' + escapeHtml(String(promo.usageLimit)) : '') + '</td>',
                '<td class="px-4 py-3 text-sm text-gray-500" data-promo-schedule>' + escapeHtml(formatSchedule(promo)) + '</td>',
                '<td class="px-4 py-3 flex gap-2" data-promo-actions>' + renderActions(promo.status, promo.id) + '</td>',
              ].join('');
              return tr;
            }

            function setPromotionsCount() {
              if (!promotionsCountEl || !promotionsBody) return;
              var count = promotionsBody.querySelectorAll('[data-promo-row]').length;
              promotionsCountEl.textContent = String(count);
            }

            function upsertPromotionRow(rawPromotion) {
              if (!promotionsBody) return;
              var promo = normalizePromotion(rawPromotion);
              if (!promo || !promo.id) return;

              var existing = promotionsBody.querySelector('[data-promo-row][data-promo-id="' + promo.id + '"]');
              var emptyRow = document.getElementById('promotions-empty-row');
              if (emptyRow) emptyRow.remove();

              if (existing) {
                existing.setAttribute('data-promo-status', promo.status);
                var nameEl = existing.querySelector('[data-promo-name]');
                var typeEl = existing.querySelector('[data-promo-type]');
                var strategyEl = existing.querySelector('[data-promo-strategy]');
                var usageEl = existing.querySelector('[data-promo-usage]');
                var scheduleEl = existing.querySelector('[data-promo-schedule]');
                var actionsEl = existing.querySelector('[data-promo-actions]');
                var statusCell = existing.children[3];
                if (nameEl) nameEl.textContent = promo.name;
                if (typeEl) typeEl.textContent = TYPE_LABEL_MAP[promo.type] || promo.type;
                if (strategyEl) strategyEl.textContent = STRATEGY_LABEL_MAP[promo.strategyType] || promo.strategyType;
                if (usageEl) usageEl.textContent = String(promo.usageCount) + (promo.usageLimit ? ' / ' + String(promo.usageLimit) : '');
                if (scheduleEl) scheduleEl.textContent = formatSchedule(promo);
                if (statusCell) statusCell.innerHTML = renderStatusBadge(promo.status);
                if (actionsEl) actionsEl.innerHTML = renderActions(promo.status, promo.id);
              } else {
                promotionsBody.prepend(buildPromotionRow(promo));
              }
              setPromotionsCount();
            }

            function setCopilotStatus(message, isError) {
              var statusEl = document.getElementById('promo-copilot-status');
              if (!statusEl) return;
              statusEl.textContent = message || '';
              statusEl.className = isError ? 'text-sm text-red-600' : 'text-sm text-gray-500 dark:text-gray-400';
            }

            async function runPromotionCopilot() {
              if (!isPromotionCopilotEnabled) return;

              var briefEl = document.getElementById('promo-copilot-brief');
              var objectiveEl = document.getElementById('promo-copilot-objective');
              var audienceEl = document.getElementById('promo-copilot-audience');
              var formTypeEl = document.querySelector('#promo-form [name="type"]');
              var generateBtn = document.getElementById('promo-copilot-generate-btn');
              var applyBtn = document.getElementById('promo-copilot-apply-btn');
              var createBtn = document.getElementById('promo-copilot-create-btn');
              if (!briefEl || !objectiveEl || !audienceEl || !formTypeEl || !generateBtn || !applyBtn || !createBtn) return;

              var brief = String(briefEl.value || '').trim();
              if (brief.length < 10) {
                setCopilotStatus('Add a campaign brief with at least 10 characters.', true);
                return;
              }

              setCopilotStatus('Generating campaign suggestion...', false);
              generateBtn.disabled = true;
              applyBtn.classList.add('hidden');
              createBtn.classList.add('hidden');

              try {
                var res = await fetch('/api/promotions/copilot/draft', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    brief: brief,
                    promotionType: String(formTypeEl.value || 'coupon'),
                    objective: String(objectiveEl.value || 'conversion'),
                    audience: String(audienceEl.value || '').trim() || undefined,
                  }),
                });

                var data = await res.json().catch(function() { return {}; });
                if (!res.ok) {
                  throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to generate promotion suggestion') : (data.error || data.message || 'Failed to generate promotion suggestion'));
                }
                if (!data || !data.copilot || !data.applyPatch) {
                  throw new Error('Invalid copilot response payload');
                }

                latestPromotionCopilotPatch = data.applyPatch;
                var output = document.getElementById('promo-copilot-output');
                if (output) output.classList.remove('hidden');
                var nameEl = document.getElementById('promo-copilot-name');
                var strategyEl = document.getElementById('promo-copilot-strategy');
                var descriptionEl = document.getElementById('promo-copilot-description');
                var couponEl = document.getElementById('promo-copilot-coupon');
                if (nameEl) nameEl.textContent = data.copilot.name || '';
                if (strategyEl) strategyEl.textContent = data.copilot.strategyType || '';
                if (descriptionEl) descriptionEl.textContent = data.copilot.description || '';
                if (couponEl) couponEl.textContent = data.copilot.couponCodeSuggestion || '—';

                var warningsEl = document.getElementById('promo-copilot-warnings');
                var warnings = Array.isArray(data.copilot.warnings) ? data.copilot.warnings : [];
                if (warningsEl) {
                  if (warnings.length > 0) {
                    warningsEl.textContent = warnings.join(' ');
                    warningsEl.classList.remove('hidden');
                  } else {
                    warningsEl.textContent = '';
                    warningsEl.classList.add('hidden');
                  }
                }

                applyBtn.classList.remove('hidden');
                createBtn.classList.remove('hidden');
                setCopilotStatus('Suggestion ready. Review and apply to the form.', false);
              } catch (err) {
                setCopilotStatus(err && err.message ? err.message : 'Failed to generate suggestion.', true);
              } finally {
                generateBtn.disabled = false;
              }
            }

            function applyPromotionCopilotPatch() {
              if (!latestPromotionCopilotPatch) return;

              var form = document.getElementById('promo-form');
              if (!form) return;
              var setField = function(name, value) {
                var field = form.querySelector('[name="' + name + '"]');
                if (!field) return;
                if (field.type === 'checkbox') {
                  field.checked = !!value;
                } else {
                  field.value = value == null ? '' : String(value);
                }
              };

              setField('name', latestPromotionCopilotPatch.name);
              setField('description', latestPromotionCopilotPatch.description);
              setField('type', latestPromotionCopilotPatch.type);
              setField('strategyType', latestPromotionCopilotPatch.strategyType);
              setField('priority', latestPromotionCopilotPatch.priority);
              setField('stackable', !!latestPromotionCopilotPatch.stackable);
              setField('usageLimit', latestPromotionCopilotPatch.usageLimit);
              setCopilotStatus('Suggestion applied to form fields.', false);
            }

            async function createPromotionFromCopilot() {
              if (!latestPromotionCopilotPatch) return;
              var form = document.getElementById('promo-form');
              if (!form) return;
              var createBtn = document.getElementById('promo-copilot-create-btn');
              setButtonLoading(createBtn, true, 'Creating...', 'Create With Copilot');
              setCopilotStatus('Creating promotion...', false);

              try {
                var startsAtField = form.querySelector('[name="startsAt"]');
                var endsAtField = form.querySelector('[name="endsAt"]');
                var schedule = {};
                var startsAtValue = startsAtField ? String(startsAtField.value || '').trim() : '';
                var endsAtValue = endsAtField ? String(endsAtField.value || '').trim() : '';
                if (startsAtValue) {
                  var startsDate = new Date(startsAtValue);
                  if (!Number.isNaN(startsDate.getTime())) schedule.startsAt = startsDate.toISOString();
                }
                if (endsAtValue) {
                  var endsDate = new Date(endsAtValue);
                  if (!Number.isNaN(endsDate.getTime())) schedule.endsAt = endsDate.toISOString();
                }

                var res = await fetch('/api/promotions/copilot/apply', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    applyPatch: latestPromotionCopilotPatch,
                    schedule: Object.keys(schedule).length > 0 ? schedule : undefined,
                  }),
                });
                var data = await res.json().catch(function() { return {}; });
                if (!res.ok) {
                  throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to create promotion from copilot') : (data.error || data.message || 'Failed to create promotion from copilot'));
                }
                if (data && data.promotion) {
                  upsertPromotionRow(data.promotion);
                }
                setCopilotStatus('Promotion created from copilot suggestion.', false);
                showFlash('Promotion created from copilot suggestion.', 'success');
                form.reset();
                var formSection = document.getElementById('promo-form-section');
                if (formSection) formSection.classList.add('hidden');
              } catch (err) {
                setCopilotStatus(err && err.message ? err.message : 'Failed to create promotion from copilot.', true);
              } finally {
                setButtonLoading(createBtn, false, 'Creating...', 'Create With Copilot');
              }
            }

            var promoCopilotGenerateBtn = document.getElementById('promo-copilot-generate-btn');
            if (promoCopilotGenerateBtn) {
              promoCopilotGenerateBtn.addEventListener('click', function() {
                runPromotionCopilot();
              });
            }

            var promoCopilotApplyBtn = document.getElementById('promo-copilot-apply-btn');
            if (promoCopilotApplyBtn) {
              promoCopilotApplyBtn.addEventListener('click', function() {
                applyPromotionCopilotPatch();
              });
            }

            var promoCopilotCreateBtn = document.getElementById('promo-copilot-create-btn');
            if (promoCopilotCreateBtn) {
              promoCopilotCreateBtn.addEventListener('click', function() {
                createPromotionFromCopilot();
              });
            }

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
              var saveBtn = document.getElementById('promo-save-btn');
              var body = {
                name: fd.get('name'),
                description: fd.get('description') || undefined,
                type: fd.get('type'),
                strategyType: fd.get('strategyType'),
                strategyParams: latestPromotionCopilotPatch && latestPromotionCopilotPatch.strategyType === fd.get('strategyType')
                  ? (latestPromotionCopilotPatch.strategyParams || {})
                  : {},
                conditions: latestPromotionCopilotPatch ? (latestPromotionCopilotPatch.conditions || {}) : {},
                priority: parseInt(fd.get('priority') || '0', 10),
                stackable: !!fd.get('stackable'),
                startsAt: fd.get('startsAt') || undefined,
                endsAt: fd.get('endsAt') || undefined,
                usageLimit: fd.get('usageLimit') ? parseInt(fd.get('usageLimit'), 10) : undefined,
              };
              setButtonLoading(saveBtn, true, 'Saving...', 'Save Promotion');
              try {
                var res = await fetch('/api/promotions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                });
                var data = await res.json().catch(function() { return {}; });
                if (!res.ok) {
                  throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to create promotion') : (data.error || data.message || 'Failed to create promotion'));
                }
                if (data && data.promotion) {
                  upsertPromotionRow(data.promotion);
                }
                formSection.classList.add('hidden');
                form.reset();
                latestPromotionCopilotPatch = null;
                showFlash('Promotion created.', 'success');
              } catch (err) {
                showFlash(err.message || 'Failed to create promotion');
              } finally {
                setButtonLoading(saveBtn, false, 'Saving...', 'Save Promotion');
              }
            });

            document.addEventListener('click', async function(event) {
              var disableBtn = event.target.closest('.disable-btn');
              if (disableBtn) {
                var disableId = disableBtn.getAttribute('data-promo-id');
                if (!disableId) return;
                var allowDisable = await confirmAction('Disable this promotion?', {
                  title: 'Disable promotion',
                  confirmText: 'Disable',
                  danger: true,
                });
                if (!allowDisable) return;
                setButtonLoading(disableBtn, true, 'Disabling...', 'Disable');
                try {
                  var disableRes = await fetch('/api/promotions/' + disableId, { method: 'DELETE' });
                  var disableData = await disableRes.json().catch(function() { return {}; });
                  if (!disableRes.ok) {
                    throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(disableData, 'Failed to disable') : (disableData.error || disableData.message || 'Failed to disable'));
                  }
                  if (disableData && disableData.promotion) {
                    upsertPromotionRow(disableData.promotion);
                  }
                  showFlash('Promotion disabled.', 'success');
                } catch (err) {
                  showFlash(err.message || 'Failed to disable promotion');
                } finally {
                  setButtonLoading(disableBtn, false, 'Disabling...', 'Disable');
                }
                return;
              }

              var enableBtn = event.target.closest('.enable-btn');
              if (enableBtn) {
                var enableId = enableBtn.getAttribute('data-promo-id');
                if (!enableId) return;
                setButtonLoading(enableBtn, true, 'Enabling...', 'Enable');
                try {
                  var enableRes = await fetch('/api/promotions/' + enableId, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'active' }),
                  });
                  var enableData = await enableRes.json().catch(function() { return {}; });
                  if (!enableRes.ok) {
                    throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(enableData, 'Failed to enable') : (enableData.error || enableData.message || 'Failed to enable'));
                  }
                  if (enableData && enableData.promotion) {
                    upsertPromotionRow(enableData.promotion);
                  }
                  showFlash('Promotion enabled.', 'success');
                } catch (err) {
                  showFlash(err.message || 'Failed to enable promotion');
                } finally {
                  setButtonLoading(enableBtn, false, 'Enabling...', 'Enable');
                }
              }
            });
          })();
        </script>
      `}
    </div>
  );
};
