import type { FC } from "hono/jsx";

interface DashboardProps {
  store: any;
  members: any[];
  domains: any[];
  billing: any;
  plan: any;
}

export const StoreDashboardPage: FC<DashboardProps> = ({
  store,
  members,
  domains,
  billing,
  plan,
}) => {
  return (
    <div class="max-w-6xl mx-auto py-8 px-4">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{store.name}</h1>
          <p class="text-gray-500 dark:text-gray-400">{store.slug}.petm8.io</p>
        </div>
        <span
          class={`px-3 py-1 rounded-full text-sm font-medium ${
            store.status === "active"
              ? "bg-green-100 text-green-800"
              : store.status === "trial"
                ? "bg-blue-100 text-blue-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {store.status}
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Plan</h3>
          <p class="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">{plan?.name ?? "Free"}</p>
          <p class="text-sm text-gray-500">
            {plan?.transactionFeePercent ?? "5"}% transaction fee
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Team Members</h3>
          <p class="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">{members.length}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Custom Domains</h3>
          <p class="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">{domains.length}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Team */}
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Team</h2>
            <a
              href={`/platform/stores/${store.id}/members`}
              class="text-sm text-brand-600 dark:text-brand-400 hover:underline"
            >
              Manage
            </a>
          </div>
          <ul class="space-y-2">
            {members.map((m: any) => (
              <li class="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <span class="text-sm text-gray-900 dark:text-gray-100">{m.userId}</span>
                <span class="text-xs bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Domains */}
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Domains</h2>
            <a
              href={`/platform/stores/${store.id}/settings`}
              class="text-sm text-brand-600 dark:text-brand-400 hover:underline"
            >
              Settings
            </a>
          </div>
          <ul class="space-y-2">
            <li class="flex items-center justify-between py-2 border-b">
              <span class="text-sm">{store.slug}.petm8.io</span>
              <span class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                Active
              </span>
            </li>
            {domains.map((d: any) => (
              <li class="flex items-center justify-between py-2 border-b last:border-0">
                <span class="text-sm">{d.domain}</span>
                <span
                  class={`text-xs px-2 py-0.5 rounded ${
                    d.verificationStatus === "verified"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {d.verificationStatus}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Quick Links */}
      <div class="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <a
          href="/products"
          class="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow text-center"
        >
          <div class="text-2xl mb-1">📦</div>
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Products</span>
        </a>
        <a
          href="/events"
          class="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow text-center"
        >
          <div class="text-2xl mb-1">📅</div>
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Events</span>
        </a>
        <a
          href={`/platform/stores/${store.id}/settings`}
          class="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow text-center"
        >
          <div class="text-2xl mb-1">⚙️</div>
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Settings</span>
        </a>
        <a
          href="/affiliates/dashboard"
          class="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow text-center"
        >
          <div class="text-2xl mb-1">🤝</div>
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Affiliates</span>
        </a>
        <a
          href="/platform/integrations"
          class="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow text-center"
        >
          <div class="text-2xl mb-1">🔌</div>
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Integrations</span>
        </a>
      </div>
    </div>
  );
};
