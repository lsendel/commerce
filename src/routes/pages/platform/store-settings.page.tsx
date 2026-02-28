import type { FC } from "hono/jsx";
import { html } from "hono/html";

interface SettingsProps {
  store: {
    id: string;
    name: string;
    logo: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    slug: string;
  };
  billing: { platformPlanId: string | null } | null;
  plans: { id: string; name: string; monthlyPrice: string | null; transactionFeePercent: string | null; maxProducts: number | null }[];
  connectStatus: { chargesEnabled: boolean; payoutsEnabled: boolean } | null;
  domains: { id: string; domain: string; verificationStatus: string }[];
}

export const StoreSettingsPage: FC<SettingsProps> = ({
  store,
  billing,
  plans,
  connectStatus,
  domains,
}) => {
  return (
    <div class="max-w-4xl mx-auto py-8 px-4">
      <nav class="text-xs text-gray-400 mb-1">
        <a href="/platform/dashboard" class="hover:text-gray-600">Dashboard</a>
        <span class="mx-1">/</span>
        <span class="text-gray-600">Settings</span>
      </nav>
      <h1 class="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Store Settings</h1>

      {/* Logo Upload */}
      <section class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Store Logo</h2>
        <div class="flex items-center gap-6">
          <div class="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
            {store.logoUrl ?? store.logo ? (
              <img src={store.logoUrl ?? store.logo ?? ""} alt="Store logo" class="w-full h-full object-cover" />
            ) : (
              <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <form id="logo-upload-form" data-store-id={store.id} enctype="multipart/form-data">
            <input type="file" name="logo" accept="image/*" class="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
            <p class="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB. Recommended 256x256px.</p>
          </form>
        </div>
      </section>

      {/* Branding */}
      <section class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Branding</h2>
        <form id="branding-form" data-store-id={store.id} class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Store Name
            </label>
            <input
              type="text"
              name="name"
              value={store.name}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg"
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Primary Color
              </label>
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  name="primaryColor"
                  value={store.primaryColor ?? "#4F46E5"}
                  class="w-10 h-10 rounded cursor-pointer"
                />
                <span class="text-sm text-gray-500">{store.primaryColor ?? "#4F46E5"}</span>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Secondary Color
              </label>
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  name="secondaryColor"
                  value={store.secondaryColor ?? "#10B981"}
                  class="w-10 h-10 rounded cursor-pointer"
                />
                <span class="text-sm text-gray-500">{store.secondaryColor ?? "#10B981"}</span>
              </div>
            </div>
          </div>
          <button
            type="submit"
            class="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700"
          >
            Save Branding
          </button>
        </form>
      </section>

      {/* Plan */}
      <section class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Plan & Billing</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          {plans.map((p) => {
            const isCurrent = billing?.platformPlanId === p.id;
            return (
              <button
                type="button"
                class={`border-2 rounded-lg p-4 text-center transition-colors ${
                  isCurrent
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-indigo-300 cursor-pointer"
                }`}
                data-plan-id={p.id}
                data-store-id={store.id}
                disabled={isCurrent}
              >
                <h3 class="font-semibold text-gray-900 dark:text-gray-100">{p.name}</h3>
                <p class="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">
                  ${p.monthlyPrice ?? "0"}
                  <span class="text-sm text-gray-500 dark:text-gray-400">/mo</span>
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  {p.transactionFeePercent ?? "5"}% fee
                </p>
                <p class="text-xs text-gray-500">
                  {p.maxProducts ? `${p.maxProducts} products` : "Unlimited"}
                </p>
                {isCurrent && (
                  <span class="inline-block mt-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">Current</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Custom Domains */}
      <section class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Custom Domains</h2>
        {domains.length > 0 && (
          <ul class="space-y-2 mb-4">
            {domains.map((d) => (
              <li class="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <span class="text-sm text-gray-900 dark:text-gray-100">{d.domain}</span>
                <span class={`text-xs px-2 py-0.5 rounded ${
                  d.verificationStatus === "verified"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}>
                  {d.verificationStatus}
                </span>
              </li>
            ))}
          </ul>
        )}
        <form id="add-domain-form" data-store-id={store.id} class="flex gap-3">
          <input
            type="text"
            name="domain"
            placeholder="shop.example.com"
            class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm"
          />
          <button type="submit" class="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700">Add Domain</button>
        </form>
      </section>

      {/* Stripe Connect */}
      <section class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Payment Processing</h2>
        {connectStatus ? (
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <span
                class={`w-2 h-2 rounded-full ${connectStatus.chargesEnabled ? "bg-green-500" : "bg-red-500"}`}
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">
                Charges: {connectStatus.chargesEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span
                class={`w-2 h-2 rounded-full ${connectStatus.payoutsEnabled ? "bg-green-500" : "bg-red-500"}`}
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">
                Payouts: {connectStatus.payoutsEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        ) : (
          <div>
            <p class="text-gray-600 dark:text-gray-400 mb-3">
              Connect your Stripe account to accept payments.
            </p>
            <button
              id="connect-stripe-btn"
              data-store-id={store.id}
              class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Set Up Stripe Connect
            </button>
          </div>
        )}
      </section>

      {html`<script src="/scripts/platform.js"></script>`}
    </div>
  );
};
