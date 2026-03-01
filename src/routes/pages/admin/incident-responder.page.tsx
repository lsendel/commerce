import type { FC } from "hono/jsx";

interface IncidentResponderPageProps {
  readiness: {
    conversionDropPercent: number | null;
    fulfillmentFailureRatePercent: number | null;
    p1Over60IncidentCount: number;
  };
}

function formatPercent(value: number | null, digits = 2): string {
  if (value === null || Number.isNaN(value)) return "n/a";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export const IncidentResponderPage: FC<IncidentResponderPageProps> = ({ readiness }) => {
  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="mb-8 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 px-6 py-5">
        <nav class="text-xs text-indigo-700/80 mb-1">
          <a href="/admin" class="hover:text-indigo-900">Admin</a>
          <span class="mx-1">/</span>
          <span class="text-indigo-900">Incident Responder</span>
        </nav>
        <h1 class="text-2xl font-bold text-slate-900">Incident Responder</h1>
        <p class="mt-1 text-sm text-slate-600">
          Triage active incidents, propose runbook actions, and capture a reliable first-response plan.
        </p>
      </div>

      <div class="grid sm:grid-cols-3 gap-4 mb-8">
        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <p class="text-xs uppercase tracking-wider text-gray-500">Conversion Drop</p>
          <p class="mt-2 text-2xl font-semibold text-gray-900">{formatPercent(readiness.conversionDropPercent)}</p>
          <p class="text-xs text-gray-500 mt-1">Guardrail trigger at -5%</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <p class="text-xs uppercase tracking-wider text-gray-500">Fulfillment Failure</p>
          <p class="mt-2 text-2xl font-semibold text-gray-900">{formatPercent(readiness.fulfillmentFailureRatePercent)}</p>
          <p class="text-xs text-gray-500 mt-1">Guardrail trigger above 2%</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <p class="text-xs uppercase tracking-wider text-gray-500">P1 Incidents &gt;60m</p>
          <p class="mt-2 text-2xl font-semibold text-gray-900">{readiness.p1Over60IncidentCount}</p>
          <p class="text-xs text-gray-500 mt-1">Any value above 0 requires escalation</p>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-6">
        <section class="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 class="text-lg font-semibold text-gray-900">Incident Input</h2>
          <p class="text-sm text-gray-500 mt-1">Describe the issue and provide the strongest signal.</p>

          <form id="incident-triage-form" class="space-y-4 mt-5">
            <div>
              <label for="incident-summary" class="block text-sm font-medium text-gray-700 mb-1">Summary</label>
              <textarea
                id="incident-summary"
                name="summary"
                rows={5}
                required
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                placeholder="Checkout conversion dropped 9% after deployment and payment errors increased."
              />
            </div>

            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label for="incident-signal" class="block text-sm font-medium text-gray-700 mb-1">Signal Type</label>
                <select
                  id="incident-signal"
                  name="signalType"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                >
                  <option value="unknown">Unknown</option>
                  <option value="checkout_conversion_drop">Checkout conversion drop</option>
                  <option value="fulfillment_failure_spike">Fulfillment failure spike</option>
                  <option value="payment_failure_spike">Payment failure spike</option>
                  <option value="provider_outage">Provider outage</option>
                  <option value="queue_backlog">Queue backlog</option>
                  <option value="p1_open_over_60m">P1 open over 60m</option>
                </select>
              </div>
              <div>
                <label for="incident-severity" class="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  id="incident-severity"
                  name="severity"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                >
                  <option value="">Auto-detect</option>
                  <option value="sev1">SEV-1</option>
                  <option value="sev2">SEV-2</option>
                  <option value="sev3">SEV-3</option>
                </select>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <button
                id="incident-triage-btn"
                type="submit"
                class="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Generate Triage Plan
              </button>
              <p id="incident-status" class="text-sm text-gray-500" />
            </div>
          </form>

          <div id="incident-form-error" class="hidden mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" />
        </section>

        <section class="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 class="text-lg font-semibold text-gray-900">Runbook Library</h2>
          <p class="text-sm text-gray-500 mt-1">Available runbooks used by the incident responder.</p>
          <div id="incident-runbooks" class="mt-4 space-y-2 text-sm text-gray-600">
            <p class="text-gray-400">Loading runbooks...</p>
          </div>
        </section>
      </div>

      <section id="incident-result" class="hidden mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Triage Recommendation</h2>
            <p id="incident-meta" class="text-sm text-gray-500 mt-1" />
          </div>
          <div id="incident-escalation" class="rounded-full px-3 py-1 text-xs font-semibold" />
        </div>

        <div class="mt-4 space-y-4">
          <div>
            <h3 class="text-sm font-semibold text-gray-900">Summary</h3>
            <p id="incident-triage-summary" class="mt-1 text-sm text-gray-700" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-900">Suspected Root Cause</h3>
            <p id="incident-root-cause" class="mt-1 text-sm text-gray-700" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-900">Runbook</h3>
            <p id="incident-runbook" class="mt-1 text-sm text-gray-700" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-900">Recommended Actions</h3>
            <ol id="incident-actions" class="mt-2 list-decimal pl-5 space-y-2 text-sm text-gray-700" />
          </div>
          <div id="incident-ack-actions" class="hidden border-t border-gray-200 pt-4">
            <h3 class="text-sm font-semibold text-gray-900">Outcome</h3>
            <p class="mt-1 text-xs text-gray-500">Record what happened after triage to improve incident playbooks.</p>
            <div class="mt-3 flex items-center gap-2 flex-wrap">
              <button type="button" class="incident-ack-btn rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700" data-outcome="mitigated">
                Mark Mitigated
              </button>
              <button type="button" class="incident-ack-btn rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700" data-outcome="monitoring">
                Monitoring
              </button>
              <button type="button" class="incident-ack-btn rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700" data-outcome="escalated">
                Escalated
              </button>
              <button type="button" class="incident-ack-btn rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700" data-outcome="false_positive">
                False Positive
              </button>
            </div>
          </div>
          <div id="incident-warnings" class="hidden rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" />
        </div>
      </section>

      <section class="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Recent Triage History</h2>
            <p class="text-sm text-gray-500 mt-1">Latest incident triage outcomes captured by the responder.</p>
          </div>
          <button
            type="button"
            id="incident-history-refresh"
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
        <div id="incident-history" class="mt-4 space-y-2 text-sm text-gray-600">
          <p class="text-gray-400">Loading history...</p>
        </div>
      </section>

      <script src="/scripts/admin-incident-responder.js" defer></script>
    </div>
  );
};
