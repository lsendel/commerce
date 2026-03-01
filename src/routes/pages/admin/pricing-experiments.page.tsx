import type { FC } from "hono/jsx";

interface PricingExperimentRow {
  experimentId: string;
  name: string;
  status: "running" | "stopped";
  startedAt: string;
  stoppedAt: string | null;
  assignmentsCount: number;
  avgDeltaPercent: number;
}

interface PricingExperimentsPageProps {
  experiments: PricingExperimentRow[];
}

export const PricingExperimentsPage: FC<PricingExperimentsPageProps> = ({
  experiments,
}) => {
  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="mb-8 rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 via-sky-50 to-blue-50 px-6 py-5">
        <nav class="text-xs text-cyan-700/80 mb-1">
          <a href="/admin" class="hover:text-cyan-900">Admin</a>
          <span class="mx-1">/</span>
          <span class="text-cyan-900">Pricing Experiments</span>
        </nav>
        <h1 class="text-2xl font-bold text-slate-900">Agentic Pricing Experiments</h1>
        <p class="mt-1 text-sm text-slate-600">
          Run controlled price tests with guardrails and reversible rollout.
        </p>
      </div>

      <section class="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900">Launch Experiment</h2>
        <p class="text-sm text-gray-500 mt-1">Create a proposal first, then start to apply price changes.</p>

        <form id="pricing-experiment-form" class="mt-4 grid lg:grid-cols-4 gap-4 items-end">
          <div class="lg:col-span-2">
            <label for="experiment-name" class="block text-xs font-medium text-gray-600 mb-1">Experiment Name</label>
            <input
              id="experiment-name"
              name="name"
              type="text"
              required
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Q1 demand elasticity pilot"
            />
          </div>
          <div>
            <label for="experiment-max-variants" class="block text-xs font-medium text-gray-600 mb-1">Max Variants</label>
            <input
              id="experiment-max-variants"
              name="maxVariants"
              type="number"
              min={1}
              max={30}
              value={8}
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div class="flex items-center gap-2 pt-4">
            <input id="experiment-auto-apply" name="autoApply" type="checkbox" checked class="rounded border-gray-300" />
            <label for="experiment-auto-apply" class="text-xs text-gray-600">Auto-apply on start</label>
          </div>
          <div>
            <label for="experiment-min-delta" class="block text-xs font-medium text-gray-600 mb-1">Min Delta (%)</label>
            <input
              id="experiment-min-delta"
              name="minDeltaPercent"
              type="number"
              min={-20}
              max={0}
              value={-10}
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label for="experiment-max-delta" class="block text-xs font-medium text-gray-600 mb-1">Max Delta (%)</label>
            <input
              id="experiment-max-delta"
              name="maxDeltaPercent"
              type="number"
              min={0}
              max={20}
              value={10}
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div class="lg:col-span-2">
            <label for="experiment-variant-ids" class="block text-xs font-medium text-gray-600 mb-1">Variant IDs (optional CSV)</label>
            <input
              id="experiment-variant-ids"
              name="variantIds"
              type="text"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="uuid-1,uuid-2"
            />
          </div>
        </form>

        <div class="mt-4 flex items-center gap-2">
          <button type="button" id="pricing-propose-btn" class="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100">
            Generate Proposal
          </button>
          <button type="button" id="pricing-start-btn" class="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
            Start Experiment
          </button>
          <p id="pricing-status" class="text-xs text-gray-500" />
        </div>

        <div id="pricing-form-error" class="hidden mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" />
      </section>

      <section class="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <h2 class="text-lg font-semibold text-gray-900">Proposal Preview</h2>
          <button type="button" id="pricing-clear-proposal" class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">Clear</button>
        </div>
        <div id="pricing-proposal" class="mt-3 text-sm text-gray-600">
          No proposal generated yet.
        </div>
      </section>

      <section class="rounded-2xl border border-gray-200 bg-white p-6">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Recent Experiments</h2>
            <p class="text-sm text-gray-500 mt-1">Track status, stop running tests, and view post-launch performance.</p>
          </div>
          <button type="button" id="pricing-refresh-btn" class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            Refresh
          </button>
        </div>

        <div id="pricing-experiments" class="mt-4 space-y-2">
          {experiments.length === 0 ? (
            <p class="text-sm text-gray-400">No pricing experiments yet.</p>
          ) : (
            experiments.map((experiment) => (
              <div class="rounded-lg border border-gray-200 px-3 py-2" data-experiment-id={experiment.experimentId}>
                <div class="flex items-center justify-between gap-3">
                  <p class="font-medium text-gray-900">{experiment.name}</p>
                  <span class={`rounded-full px-2 py-0.5 text-xs font-semibold ${experiment.status === "running" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>
                    {experiment.status}
                  </span>
                </div>
                <p class="text-xs text-gray-500 mt-0.5">
                  {experiment.assignmentsCount} variants · avg delta {experiment.avgDeltaPercent}% · started {experiment.startedAt}
                </p>
                <div class="mt-2 flex items-center gap-2">
                  {experiment.status === "running" && (
                    <button type="button" class="pricing-stop-btn rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700" data-experiment-id={experiment.experimentId}>
                      Stop + Restore
                    </button>
                  )}
                  <button type="button" class="pricing-performance-btn rounded-md border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700" data-experiment-id={experiment.experimentId}>
                    View Performance
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div id="pricing-performance" class="hidden mt-5 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900"></div>
      </section>

      <script src="/scripts/admin-pricing-experiments.js" defer></script>
    </div>
  );
};
