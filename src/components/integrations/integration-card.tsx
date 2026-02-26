import type { FC } from "hono/jsx";
import { StatusBadge } from "./status-badge";

interface IntegrationCardProps {
  provider: string;
  label: string;
  status: string;
  statusMessage?: string | null;
  enabled: boolean;
  secrets: Record<string, string>;
  config: Record<string, unknown>;
  lastVerifiedAt?: string | null;
  lastSyncAt?: string | null;
  source: "platform" | "store_override";
  secretFields: { key: string; label: string; placeholder: string }[];
  configFields?: { key: string; label: string; type: string }[];
  actions?: { label: string; action: string }[];
  storeId?: string;
  readOnly?: boolean;
}

export const IntegrationCard: FC<IntegrationCardProps> = ({
  provider,
  label,
  status,
  statusMessage,
  enabled,
  secrets,
  config,
  lastVerifiedAt,
  lastSyncAt,
  source,
  secretFields,
  configFields,
  actions,
  storeId,
  readOnly,
}) => (
  <div
    class="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-6 mb-4"
    data-provider={provider}
    data-store-id={storeId ?? ""}
  >
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <StatusBadge status={status} message={statusMessage} />
        <h3 class="text-lg font-semibold dark:text-gray-100">{label}</h3>
      </div>
      {!readOnly && (
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            class="toggle-integration rounded"
            data-provider={provider}
          />
          <span class="text-sm text-gray-600 dark:text-gray-400">Enabled</span>
        </label>
      )}
    </div>

    <div class="text-xs mb-4">
      <span
        class={`px-2 py-0.5 rounded ${
          source === "store_override"
            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
            : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
        }`}
      >
        Using:{" "}
        {source === "store_override" ? "Store override" : "Platform default"}
      </span>
    </div>

    {!readOnly && (
      <form
        class="integration-form space-y-3"
        data-provider={provider}
        data-store-id={storeId ?? ""}
      >
        {secretFields.map((field) => (
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {field.label}
            </label>
            <div class="flex gap-2">
              <input
                type="password"
                name={field.key}
                placeholder={secrets[field.key] || field.placeholder}
                class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm font-mono"
                autocomplete="off"
              />
              <button
                type="button"
                class="toggle-visibility px-2 py-1 text-xs border dark:border-gray-600 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Show
              </button>
            </div>
          </div>
        ))}

        {configFields && configFields.length > 0 && (
          <details class="mt-3">
            <summary class="text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer">
              Advanced Settings
            </summary>
            <div class="mt-2 space-y-2">
              {configFields.map((field) => (
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    name={`config_${field.key}`}
                    value={String(config[field.key] ?? "")}
                    class="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm"
                  />
                </div>
              ))}
            </div>
          </details>
        )}

        <div class="flex items-center gap-3 pt-2">
          <button
            type="submit"
            class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
          >
            Save Changes
          </button>
          <button
            type="button"
            class="verify-btn border border-gray-300 dark:border-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            data-provider={provider}
          >
            Verify Connection
          </button>
          {actions?.map((a) => (
            <button
              type="button"
              class="action-btn border border-gray-300 dark:border-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              data-provider={provider}
              data-action={a.action}
            >
              {a.label}
            </button>
          ))}
        </div>
      </form>
    )}

    <div class="mt-3 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
      {lastVerifiedAt && <span>Last verified: {lastVerifiedAt}</span>}
      {lastSyncAt && <span>Last sync: {lastSyncAt}</span>}
    </div>
  </div>
);
