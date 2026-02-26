import type { FC } from "hono/jsx";

interface SettingsProps {
  store: any;
  billing: any;
  plans: any[];
  connectStatus: { chargesEnabled: boolean; payoutsEnabled: boolean } | null;
}

export const StoreSettingsPage: FC<SettingsProps> = ({
  store,
  billing,
  plans,
  connectStatus,
}) => {
  return (
    <div class="max-w-4xl mx-auto py-8 px-4">
      <h1 class="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Store Settings</h1>

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
              <input
                type="color"
                name="primaryColor"
                value={store.primaryColor ?? "#4F46E5"}
                class="w-full h-10 rounded"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Secondary Color
              </label>
              <input
                type="color"
                name="secondaryColor"
                value={store.secondaryColor ?? "#10B981"}
                class="w-full h-10 rounded"
              />
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
          {plans.map((plan: any) => (
            <div
              class={`border-2 rounded-lg p-4 text-center ${
                billing?.platformPlanId === plan.id
                  ? "border-indigo-600 bg-indigo-50"
                  : "border-gray-200"
              }`}
            >
              <h3 class="font-semibold text-gray-900 dark:text-gray-100">{plan.name}</h3>
              <p class="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">
                ${plan.monthlyPrice}
                <span class="text-sm text-gray-500 dark:text-gray-400">/mo</span>
              </p>
              <p class="text-xs text-gray-500 mt-1">
                {plan.transactionFeePercent}% fee
              </p>
              <p class="text-xs text-gray-500">
                {plan.maxProducts ? `${plan.maxProducts} products` : "Unlimited"}
              </p>
            </div>
          ))}
        </div>
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
              <span class="text-sm">
                Charges: {connectStatus.chargesEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span
                class={`w-2 h-2 rounded-full ${connectStatus.payoutsEnabled ? "bg-green-500" : "bg-red-500"}`}
              />
              <span class="text-sm">
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

      <script src="/scripts/platform.js" />
    </div>
  );
};
