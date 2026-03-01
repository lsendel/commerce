import type { FC } from "hono/jsx";
import { IntegrationTabs } from "../../../components/integrations/integration-tabs";
import { IntegrationCard } from "../../../components/integrations/integration-card";
import { StatusBadge } from "../../../components/integrations/status-badge";

interface AdminIntegrationsProps {
  integrations: any[];
  infraHealth: any[];
}

const TABS = ["Payments", "Fulfillment", "AI", "Email", "Infrastructure"];

const PROVIDER_META: Record<
  string,
  {
    tab: string;
    label: string;
    secretFields: { key: string; label: string; placeholder: string }[];
    configFields?: { key: string; label: string; type: string }[];
    actions?: { label: string; action: string }[];
  }
> = {
  stripe: {
    tab: "Payments",
    label: "Stripe",
    secretFields: [
      { key: "api_key", label: "Secret Key", placeholder: "sk_test_..." },
      {
        key: "publishable_key",
        label: "Publishable Key",
        placeholder: "pk_test_...",
      },
      {
        key: "webhook_secret",
        label: "Webhook Secret",
        placeholder: "whsec_...",
      },
    ],
    configFields: [
      { key: "webhookUrl", label: "Webhook URL", type: "text" },
    ],
    actions: [{ label: "Test Connection", action: "verify" }],
  },
  printful: {
    tab: "Fulfillment",
    label: "Printful",
    secretFields: [
      { key: "api_key", label: "API Key", placeholder: "Bearer token" },
      {
        key: "webhook_secret",
        label: "Webhook Secret",
        placeholder: "HMAC secret",
      },
    ],
    actions: [
      { label: "Sync Catalog", action: "sync_catalog" },
      { label: "Test Connection", action: "verify" },
    ],
  },
  gooten: {
    tab: "Fulfillment",
    label: "Gooten",
    secretFields: [
      {
        key: "api_key",
        label: "Recipe ID",
        placeholder: "Partner recipe ID",
      },
    ],
  },
  prodigi: {
    tab: "Fulfillment",
    label: "Prodigi",
    secretFields: [
      { key: "api_key", label: "API Key", placeholder: "X-API-Key value" },
    ],
  },
  shapeways: {
    tab: "Fulfillment",
    label: "Shapeways",
    secretFields: [
      { key: "api_key", label: "OAuth Token", placeholder: "Bearer token" },
    ],
  },
  gemini: {
    tab: "AI",
    label: "Google Gemini",
    secretFields: [
      { key: "api_key", label: "API Key", placeholder: "AI Studio key" },
    ],
    actions: [{ label: "Test Connection", action: "verify" }],
  },
  resend: {
    tab: "Email",
    label: "Resend",
    secretFields: [{ key: "api_key", label: "API Key", placeholder: "re_..." }],
    configFields: [
      { key: "senderName", label: "Sender Name", type: "text" },
    ],
    actions: [
      { label: "Send Test Email", action: "test_email" },
      { label: "Test Connection", action: "verify" },
    ],
  },
};

export const AdminIntegrationsPage: FC<AdminIntegrationsProps> = ({
  integrations,
  infraHealth,
}) => {
  const integrationMap = new Map(
    integrations.map((i: any) => [i.provider, i]),
  );

  return (
    <div class="max-w-5xl mx-auto py-8 px-4">
      <div class="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">Platform Integrations</h1>
          <p class="text-gray-500 dark:text-gray-400">
            Manage API keys, verify connections, and monitor service health.
          </p>
        </div>
        <a
          href="/admin/integrations/marketplace"
          class="rounded-lg border border-fuchsia-300 bg-fuchsia-50 px-3 py-2 text-xs font-semibold text-fuchsia-700 hover:bg-fuchsia-100"
        >
          Open Marketplace
        </a>
      </div>

      <IntegrationTabs tabs={TABS} activeTab="Payments" prefix="admin" />

      {TABS.map((tab) => (
        <div
          id={`admin-${tab.toLowerCase()}`}
          class={`tab-panel ${tab === "Payments" ? "" : "hidden"}`}
        >
          {tab === "Infrastructure" ? (
            <div class="space-y-3">
              {(infraHealth ?? []).map((item: any) => (
                <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <StatusBadge
                      status={
                        item.status === "healthy"
                          ? "connected"
                          : item.status === "unhealthy"
                            ? "error"
                            : "disconnected"
                      }
                    />
                    <span class="font-medium text-gray-900 dark:text-gray-100">{item.service}</span>
                  </div>
                  <div class="text-sm text-gray-500">
                    {item.message}
                    {item.latencyMs != null && (
                      <span class="ml-2">({item.latencyMs}ms)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            Object.entries(PROVIDER_META)
              .filter(([, meta]) => meta.tab === tab)
              .map(([provider, meta]) => {
                const integration = integrationMap.get(provider);
                return (
                  <IntegrationCard
                    provider={provider}
                    label={meta.label}
                    status={integration?.status ?? "disconnected"}
                    statusMessage={integration?.statusMessage}
                    enabled={integration?.enabled ?? false}
                    secrets={integration?.secrets ?? {}}
                    config={integration?.config ?? {}}
                    lastVerifiedAt={integration?.lastVerifiedAt}
                    lastSyncAt={integration?.lastSyncAt}
                    source="platform"
                    secretFields={meta.secretFields}
                    configFields={meta.configFields}
                    actions={meta.actions}
                  />
                );
              })
          )}
        </div>
      ))}

      <script src="/scripts/admin-integrations.js" />
    </div>
  );
};
