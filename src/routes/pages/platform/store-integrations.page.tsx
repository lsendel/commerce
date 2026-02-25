import type { FC } from "hono/jsx";
import { IntegrationTabs } from "../../../components/integrations/integration-tabs";
import { IntegrationCard } from "../../../components/integrations/integration-card";

interface StoreIntegrationsProps {
  store: any;
  integrations: any[];
}

const TABS = ["Payments", "Fulfillment", "AI", "Email"];

const PROVIDER_TAB: Record<string, string> = {
  stripe: "Payments",
  printful: "Fulfillment",
  gooten: "Fulfillment",
  prodigi: "Fulfillment",
  shapeways: "Fulfillment",
  gemini: "AI",
  resend: "Email",
};

const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe",
  printful: "Printful",
  gooten: "Gooten",
  prodigi: "Prodigi",
  shapeways: "Shapeways",
  gemini: "Google Gemini",
  resend: "Resend",
};

const PROVIDER_SECRETS: Record<
  string,
  { key: string; label: string; placeholder: string }[]
> = {
  stripe: [
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
  printful: [
    { key: "api_key", label: "API Key", placeholder: "Bearer token" },
    {
      key: "webhook_secret",
      label: "Webhook Secret",
      placeholder: "HMAC secret",
    },
  ],
  gooten: [
    {
      key: "api_key",
      label: "Recipe ID",
      placeholder: "Partner recipe ID",
    },
  ],
  prodigi: [
    { key: "api_key", label: "API Key", placeholder: "X-API-Key value" },
  ],
  shapeways: [
    { key: "api_key", label: "OAuth Token", placeholder: "Bearer token" },
  ],
  gemini: [
    { key: "api_key", label: "API Key", placeholder: "AI Studio key" },
  ],
  resend: [{ key: "api_key", label: "API Key", placeholder: "re_..." }],
};

export const StoreIntegrationsPage: FC<StoreIntegrationsProps> = ({
  store,
  integrations,
}) => (
  <div class="max-w-5xl mx-auto py-8 px-4">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold">Integrations</h1>
        <p class="text-gray-500">
          {store.name} — {store.slug}.petm8.io
        </p>
      </div>
      <a
        href={`/platform/stores/${store.id}/dashboard`}
        class="text-sm text-indigo-600 hover:underline"
      >
        Back to Dashboard
      </a>
    </div>

    <IntegrationTabs tabs={TABS} activeTab="Payments" prefix="store" />

    {TABS.map((tab) => (
      <div
        id={`store-${tab.toLowerCase()}`}
        class={`tab-panel ${tab === "Payments" ? "" : "hidden"}`}
      >
        {integrations
          .filter((i: any) => PROVIDER_TAB[i.provider] === tab)
          .map((integration: any) => (
            <div>
              <IntegrationCard
                provider={integration.provider}
                label={
                  PROVIDER_LABELS[integration.provider] ??
                  integration.provider
                }
                status={integration.status}
                statusMessage={integration.statusMessage}
                enabled={integration.enabled}
                secrets={integration.secrets ?? {}}
                config={integration.config ?? {}}
                lastVerifiedAt={integration.lastVerifiedAt}
                lastSyncAt={integration.lastSyncAt}
                source={integration.source}
                secretFields={
                  PROVIDER_SECRETS[integration.provider] ?? []
                }
                storeId={store.id}
                readOnly={integration.source === "platform"}
              />
              {integration.source === "platform" && (
                <div class="text-center mb-4">
                  <button
                    type="button"
                    class="override-btn text-sm text-indigo-600 hover:underline"
                    data-provider={integration.provider}
                    data-store-id={store.id}
                  >
                    Use your own{" "}
                    {PROVIDER_LABELS[integration.provider]} account
                  </button>
                </div>
              )}
              {integration.source === "store_override" && (
                <div class="text-center mb-4">
                  <button
                    type="button"
                    class="revert-btn text-sm text-red-600 hover:underline"
                    data-provider={integration.provider}
                    data-store-id={store.id}
                  >
                    Revert to Platform Default
                  </button>
                </div>
              )}
            </div>
          ))}

        {integrations.filter(
          (i: any) => PROVIDER_TAB[i.provider] === tab,
        ).length === 0 && (
          <p class="text-gray-400 text-center py-8">
            No integrations configured for this category.
          </p>
        )}
      </div>
    ))}

    <script src="/scripts/admin-integrations.js" />
  </div>
);
