import type { FC } from "hono/jsx";

interface WorkflowRow {
  id: string;
  name: string;
  description: string | null;
  triggerType: "abandoned_checkout";
  triggerConfig: {
    idleMinutes: number;
    lookbackMinutes: number;
    maxCandidates: number;
  };
  actionType: "checkout_recovery_message";
  actionConfig: {
    channel: "email" | "sms" | "whatsapp";
    stage: "recovery_1h" | "recovery_24h" | "recovery_72h";
    incentiveCode: string | null;
    maxPerRun: number;
  };
  isActive: boolean;
  lastRunAt: string | null;
  updatedAt: string;
}

interface WorkflowBuilderPageProps {
  workflows: WorkflowRow[];
}

export const WorkflowBuilderPage: FC<WorkflowBuilderPageProps> = ({ workflows }) => {
  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="mb-8 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-lime-50 to-cyan-50 px-6 py-5">
        <nav class="text-xs text-emerald-700/80 mb-1">
          <a href="/admin" class="hover:text-emerald-900">Admin</a>
          <span class="mx-1">/</span>
          <span class="text-emerald-900">Workflow Builder</span>
        </nav>
        <h1 class="text-2xl font-bold text-slate-900">No-code Workflow Builder</h1>
        <p class="mt-1 text-sm text-slate-600">
          Configure and run merchant automations without code. Week 20 MVP includes abandoned checkout recovery workflows.
        </p>
      </div>

      <section class="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900">Create Workflow</h2>
        <p class="text-sm text-gray-500 mt-1">Build a recovery automation with trigger and action guardrails.</p>

        <form id="workflow-form" class="mt-4 grid lg:grid-cols-4 gap-4 items-end">
          <div class="lg:col-span-2">
            <label for="workflow-name" class="block text-xs font-medium text-gray-600 mb-1">Workflow Name</label>
            <input
              id="workflow-name"
              name="name"
              type="text"
              required
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Recover carts over 2h"
            />
          </div>
          <div class="lg:col-span-2">
            <label for="workflow-description" class="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input
              id="workflow-description"
              name="description"
              type="text"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="High-intent cart recovery"
            />
          </div>

          <div>
            <label for="workflow-idle-minutes" class="block text-xs font-medium text-gray-600 mb-1">Idle Minutes</label>
            <input
              id="workflow-idle-minutes"
              name="idleMinutes"
              type="number"
              min={15}
              max={10080}
              value={60}
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label for="workflow-lookback-minutes" class="block text-xs font-medium text-gray-600 mb-1">Lookback Minutes</label>
            <input
              id="workflow-lookback-minutes"
              name="lookbackMinutes"
              type="number"
              min={15}
              max={43200}
              value={10080}
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label for="workflow-max-candidates" class="block text-xs font-medium text-gray-600 mb-1">Max Candidates</label>
            <input
              id="workflow-max-candidates"
              name="maxCandidates"
              type="number"
              min={10}
              max={500}
              value={120}
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div class="flex items-center gap-2 pt-4">
            <input id="workflow-is-active" name="isActive" type="checkbox" checked class="rounded border-gray-300" />
            <label for="workflow-is-active" class="text-xs text-gray-600">Activate on create</label>
          </div>

          <div>
            <label for="workflow-channel" class="block text-xs font-medium text-gray-600 mb-1">Channel</label>
            <select id="workflow-channel" name="channel" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
          <div>
            <label for="workflow-stage" class="block text-xs font-medium text-gray-600 mb-1">Stage</label>
            <select id="workflow-stage" name="stage" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="recovery_1h">Recovery 1h</option>
              <option value="recovery_24h">Recovery 24h</option>
              <option value="recovery_72h">Recovery 72h</option>
            </select>
          </div>
          <div>
            <label for="workflow-incentive" class="block text-xs font-medium text-gray-600 mb-1">Incentive Code</label>
            <input
              id="workflow-incentive"
              name="incentiveCode"
              type="text"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="COME_BACK10"
            />
          </div>
          <div>
            <label for="workflow-max-per-run" class="block text-xs font-medium text-gray-600 mb-1">Max Per Run</label>
            <input
              id="workflow-max-per-run"
              name="maxPerRun"
              type="number"
              min={1}
              max={200}
              value={40}
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </form>

        <div class="mt-4 flex items-center gap-2">
          <button type="button" id="workflow-create-btn" class="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
            Create Workflow
          </button>
          <button type="button" id="workflow-reset-btn" class="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            Reset Form
          </button>
          <p id="workflow-status" class="text-xs text-gray-500" />
        </div>

        <div id="workflow-error" class="hidden mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" />
      </section>

      <section class="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <h2 class="text-lg font-semibold text-gray-900">Workflow Preview</h2>
          <button type="button" id="workflow-clear-preview" class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">Clear</button>
        </div>
        <div id="workflow-preview" class="mt-3 text-sm text-gray-600">
          Select a workflow and click Preview to inspect candidate carts.
        </div>
      </section>

      <section class="rounded-2xl border border-gray-200 bg-white p-6">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Saved Workflows</h2>
            <p class="text-sm text-gray-500 mt-1">Preview, run now, activate/deactivate, and delete workflow definitions.</p>
          </div>
          <button type="button" id="workflow-refresh-btn" class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">Refresh</button>
        </div>

        <div id="workflows-list" class="mt-4 space-y-2">
          {workflows.length === 0 ? (
            <p class="text-sm text-gray-400">No workflows configured yet.</p>
          ) : (
            workflows.map((workflow) => (
              <div class="rounded-lg border border-gray-200 px-3 py-2" data-workflow-id={workflow.id}>
                <div class="flex items-center justify-between gap-3">
                  <p class="font-medium text-gray-900">{workflow.name}</p>
                  <span class={`rounded-full px-2 py-0.5 text-xs font-semibold ${workflow.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>
                    {workflow.isActive ? "active" : "paused"}
                  </span>
                </div>
                <p class="text-xs text-gray-500 mt-0.5">
                  idle {workflow.triggerConfig.idleMinutes}m · lookback {workflow.triggerConfig.lookbackMinutes}m · channel {workflow.actionConfig.channel} · stage {workflow.actionConfig.stage}
                </p>
                {workflow.description ? (
                  <p class="text-xs text-gray-600 mt-1">{workflow.description}</p>
                ) : null}
                <p class="text-xs text-gray-400 mt-1">Last run: {workflow.lastRunAt ?? "never"}</p>
                <div class="mt-2 flex items-center gap-2 flex-wrap">
                  <button type="button" class="workflow-preview-btn rounded-md border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700" data-workflow-id={workflow.id}>
                    Preview
                  </button>
                  <button type="button" class="workflow-run-btn rounded-md border border-cyan-300 bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700" data-workflow-id={workflow.id}>
                    Run Now
                  </button>
                  <button type="button" class="workflow-dry-run-btn rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700" data-workflow-id={workflow.id}>
                    Dry Run
                  </button>
                  <button
                    type="button"
                    class={`workflow-toggle-btn rounded-md border px-2 py-1 text-xs font-semibold ${workflow.isActive ? "border-amber-300 bg-amber-50 text-amber-700" : "border-emerald-300 bg-emerald-50 text-emerald-700"}`}
                    data-workflow-id={workflow.id}
                    data-next-active={workflow.isActive ? "false" : "true"}
                  >
                    {workflow.isActive ? "Pause" : "Activate"}
                  </button>
                  <button type="button" class="workflow-delete-btn rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700" data-workflow-id={workflow.id}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <script src="/scripts/admin-workflows.js" defer></script>
    </div>
  );
};
