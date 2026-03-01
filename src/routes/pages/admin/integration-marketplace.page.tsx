import type { FC } from "hono/jsx";

interface MarketplaceAppRow {
  provider: "stripe" | "printful" | "gooten" | "prodigi" | "shapeways" | "gemini" | "resend";
  name: string;
  vendor: string;
  kind: "first_party" | "partner";
  category: "payments" | "fulfillment" | "ai" | "messaging";
  description: string;
  docsUrl: string;
  setupComplexity: "low" | "medium" | "high";
  requiredSecrets: string[];
  installed: boolean;
  source: "store_override" | "platform" | "none";
  enabled: boolean;
  status: "connected" | "disconnected" | "error" | "pending_verification" | "not_installed";
  statusMessage: string | null;
  lastVerifiedAt: string | null;
  lastSyncAt: string | null;
  hasSecretsConfigured: boolean;
}

interface IntegrationMarketplacePageProps {
  apps: MarketplaceAppRow[];
}

function statusBadgeClasses(status: MarketplaceAppRow["status"]): string {
  switch (status) {
    case "connected":
      return "bg-emerald-100 text-emerald-700";
    case "error":
      return "bg-rose-100 text-rose-700";
    case "pending_verification":
      return "bg-amber-100 text-amber-700";
    case "disconnected":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export const IntegrationMarketplacePage: FC<IntegrationMarketplacePageProps> = ({ apps }) => {
  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="mb-8 rounded-2xl border border-fuchsia-200 bg-gradient-to-r from-fuchsia-50 via-pink-50 to-rose-50 px-6 py-5">
        <nav class="text-xs text-fuchsia-700/80 mb-1">
          <a href="/admin" class="hover:text-fuchsia-900">Admin</a>
          <span class="mx-1">/</span>
          <a href="/admin/integrations" class="hover:text-fuchsia-900">Integrations</a>
          <span class="mx-1">/</span>
          <span class="text-fuchsia-900">Marketplace</span>
        </nav>
        <h1 class="text-2xl font-bold text-slate-900">Integration Marketplace</h1>
        <p class="mt-1 text-sm text-slate-600">
          Discover first-party and partner integrations, install per store, and verify connection readiness.
        </p>
      </div>

      <section class="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">App Catalog</h2>
            <p class="text-sm text-gray-500 mt-1">Install app shells first, then configure provider credentials in Integrations.</p>
          </div>
          <div class="flex items-center gap-2">
            <a href="/admin/integrations" class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              Open Integrations
            </a>
            <button id="marketplace-refresh-btn" type="button" class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              Refresh
            </button>
          </div>
        </div>
        <p id="marketplace-status" class="mt-2 text-xs text-gray-500"></p>
        <div id="marketplace-error" class="hidden mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"></div>
      </section>

      <section id="marketplace-grid" class="grid md:grid-cols-2 gap-4">
        {apps.map((app) => (
          <article class="rounded-2xl border border-gray-200 bg-white p-5" data-provider={app.provider}>
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-base font-semibold text-gray-900">{app.name}</h3>
                <p class="text-xs text-gray-500">by {app.vendor} · {app.kind === "first_party" ? "First-party" : "Partner"}</p>
              </div>
              <span class={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClasses(app.status)}`}>
                {app.status}
              </span>
            </div>

            <p class="mt-2 text-sm text-gray-600">{app.description}</p>
            <p class="mt-2 text-xs text-gray-500">
              Category: {app.category} · Setup: {app.setupComplexity} · Required keys: {app.requiredSecrets.join(", ")}
            </p>

            <div class="mt-2 flex items-center gap-2 text-xs">
              <span class={`rounded-full px-2 py-0.5 font-semibold ${app.installed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                {app.installed ? (app.source === "platform" ? "platform default" : "installed") : "not installed"}
              </span>
              {app.enabled && <span class="rounded-full bg-cyan-100 text-cyan-700 px-2 py-0.5 font-semibold">enabled</span>}
              {app.hasSecretsConfigured && <span class="rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 font-semibold">keys configured</span>}
            </div>

            {app.statusMessage && <p class="mt-2 text-xs text-gray-500">{app.statusMessage}</p>}
            {app.lastVerifiedAt && <p class="mt-1 text-xs text-gray-400">Verified: {app.lastVerifiedAt}</p>}

            <div class="mt-4 flex items-center gap-2 flex-wrap">
              <a href={app.docsUrl} target="_blank" rel="noreferrer" class="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                Docs
              </a>

              {!app.installed || app.source === "platform" ? (
                <button type="button" class="marketplace-install-btn rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700" data-provider={app.provider}>
                  {app.source === "platform" ? "Install Override" : "Install"}
                </button>
              ) : (
                <>
                  <button type="button" class="marketplace-verify-btn rounded-md border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700" data-provider={app.provider}>
                    Verify
                  </button>
                  <button type="button" class="marketplace-uninstall-btn rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700" data-provider={app.provider}>
                    Uninstall
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </section>

      <script src="/scripts/admin-integration-marketplace.js" defer></script>
    </div>
  );
};
