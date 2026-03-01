import type { FC } from "hono/jsx";

interface PolicyView {
  version: number;
  isActive: boolean;
  config: {
    pricing: {
      maxVariants: number;
      minDeltaPercent: number;
      maxDeltaPercent: number;
      allowAutoApply: boolean;
    };
    shipping: {
      maxFlatRate: number;
      maxEstimatedDays: number;
    };
    promotions: {
      maxPercentageOff: number;
      maxFixedAmount: number;
      maxCampaignDays: number;
      allowStackable: boolean;
    };
    enforcement: {
      mode: "enforce" | "monitor";
    };
  };
}

interface PolicyViolationRow {
  id: string;
  domain: string;
  action: string;
  severity: "warning" | "error";
  message: string;
  details: Record<string, unknown>;
  actorUserId: string | null;
  createdAt: string;
}

interface PoliciesPageProps {
  policy: PolicyView;
  violations: PolicyViolationRow[];
}

function severityClasses(severity: PolicyViolationRow["severity"]): string {
  return severity === "error"
    ? "bg-rose-100 text-rose-700"
    : "bg-amber-100 text-amber-700";
}

export const PoliciesPage: FC<PoliciesPageProps> = ({ policy, violations }) => {
  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="mb-8 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 px-6 py-5">
        <nav class="text-xs text-indigo-700/80 mb-1">
          <a href="/admin" class="hover:text-indigo-900">Admin</a>
          <span class="mx-1">/</span>
          <span class="text-indigo-900">Policy Engine</span>
        </nav>
        <h1 class="text-2xl font-bold text-slate-900">Policy Engine Guardrails</h1>
        <p class="mt-1 text-sm text-slate-600">
          Central policy controls for pricing, shipping, and promotion safety enforcement.
        </p>
      </div>

      <section class="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Policy Configuration</h2>
            <p class="text-sm text-gray-500 mt-1">Version {policy.version}</p>
          </div>
        </div>

        <form id="policy-config-form" class="mt-4 grid lg:grid-cols-3 gap-4">
          <div class="rounded-lg border border-gray-200 p-4">
            <h3 class="text-sm font-semibold text-gray-900 mb-3">Pricing</h3>
            <label class="block text-xs text-gray-600 mb-1" for="policy-max-variants">Max variants</label>
            <input id="policy-max-variants" name="maxVariants" type="number" min={1} max={100} value={policy.config.pricing.maxVariants} class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />

            <label class="block text-xs text-gray-600 mb-1 mt-3" for="policy-min-delta">Min delta %</label>
            <input id="policy-min-delta" name="minDeltaPercent" type="number" min={-50} max={-1} value={policy.config.pricing.minDeltaPercent} class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />

            <label class="block text-xs text-gray-600 mb-1 mt-3" for="policy-max-delta">Max delta %</label>
            <input id="policy-max-delta" name="maxDeltaPercent" type="number" min={1} max={50} value={policy.config.pricing.maxDeltaPercent} class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />

            <label class="mt-3 inline-flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" id="policy-allow-auto-apply" name="allowAutoApply" checked={policy.config.pricing.allowAutoApply} />
              <span>Allow auto-apply experiments</span>
            </label>
          </div>

          <div class="rounded-lg border border-gray-200 p-4">
            <h3 class="text-sm font-semibold text-gray-900 mb-3">Shipping</h3>
            <label class="block text-xs text-gray-600 mb-1" for="policy-max-flat-rate">Max flat rate</label>
            <input id="policy-max-flat-rate" name="maxFlatRate" type="number" min={0} max={1000} value={policy.config.shipping.maxFlatRate} class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />

            <label class="block text-xs text-gray-600 mb-1 mt-3" for="policy-max-estimated-days">Max estimated days</label>
            <input id="policy-max-estimated-days" name="maxEstimatedDays" type="number" min={0} max={120} value={policy.config.shipping.maxEstimatedDays} class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
          </div>

          <div class="rounded-lg border border-gray-200 p-4">
            <h3 class="text-sm font-semibold text-gray-900 mb-3">Promotions</h3>
            <label class="block text-xs text-gray-600 mb-1" for="policy-max-percentage-off">Max percentage off</label>
            <input id="policy-max-percentage-off" name="maxPercentageOff" type="number" min={1} max={100} value={policy.config.promotions.maxPercentageOff} class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />

            <label class="block text-xs text-gray-600 mb-1 mt-3" for="policy-max-fixed-amount">Max fixed amount</label>
            <input id="policy-max-fixed-amount" name="maxFixedAmount" type="number" min={0} max={5000} value={policy.config.promotions.maxFixedAmount} class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />

            <label class="block text-xs text-gray-600 mb-1 mt-3" for="policy-max-campaign-days">Max campaign days</label>
            <input id="policy-max-campaign-days" name="maxCampaignDays" type="number" min={1} max={365} value={policy.config.promotions.maxCampaignDays} class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />

            <label class="mt-3 inline-flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" id="policy-allow-stackable" name="allowStackable" checked={policy.config.promotions.allowStackable} />
              <span>Allow stackable promotions</span>
            </label>
          </div>

          <div class="lg:col-span-3 rounded-lg border border-gray-200 p-4 flex items-center justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-4">
              <label class="inline-flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" id="policy-is-active" name="isActive" checked={policy.isActive} />
                <span>Policy engine active</span>
              </label>

              <label class="inline-flex items-center gap-2 text-xs text-gray-700" for="policy-mode">
                <span>Mode</span>
                <select id="policy-mode" name="mode" class="rounded border border-gray-300 px-2 py-1 text-xs">
                  <option value="enforce" selected={policy.config.enforcement.mode === "enforce"}>enforce</option>
                  <option value="monitor" selected={policy.config.enforcement.mode === "monitor"}>monitor</option>
                </select>
              </label>
            </div>

            <div class="flex items-center gap-2">
              <button type="button" id="policy-save-btn" class="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">Save Policy</button>
              <button type="button" id="policy-refresh-btn" class="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Refresh</button>
            </div>
          </div>
        </form>

        <p id="policy-status" class="mt-3 text-xs text-gray-500"></p>
        <div id="policy-error" class="hidden mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"></div>
      </section>

      <section class="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 class="text-lg font-semibold text-gray-900">Recent Policy Violations</h2>
        <p class="text-sm text-gray-500 mt-1">Most recent blocked or monitored violations across critical flows.</p>

        <div id="policy-violations-list" class="mt-4 space-y-2">
          {violations.length === 0 ? (
            <p class="text-sm text-gray-400">No policy violations recorded.</p>
          ) : (
            violations.map((violation) => (
              <article class="rounded-lg border border-gray-200 px-3 py-3">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm font-medium text-gray-900">{violation.domain} / {violation.action}</p>
                  <span class={`rounded-full px-2 py-0.5 text-xs font-semibold ${severityClasses(violation.severity)}`}>
                    {violation.severity}
                  </span>
                </div>
                <p class="text-sm text-gray-700 mt-1">{violation.message}</p>
                <p class="text-xs text-gray-400 mt-1">{violation.createdAt}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <script src="/scripts/admin-policies.js" defer></script>
    </div>
  );
};
