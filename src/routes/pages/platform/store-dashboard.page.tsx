import type { FC } from "hono/jsx";

interface MemberInfo {
  userId: string;
  role: string;
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  createdAt: string | null;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
}

interface DashboardProps {
  store: {
    id: string;
    name: string;
    slug: string;
    status: string;
    logoUrl: string | null;
  };
  members: MemberInfo[];
  domains: { domain: string; verificationStatus: string }[];
  billing: { platformPlanId: string | null } | null;
  plan: { name: string; transactionFeePercent: string | null } | null;
  pendingInvitations: PendingInvitation[];
}

export const StoreDashboardPage: FC<DashboardProps> = ({
  store,
  members,
  domains,
  billing,
  plan,
  pendingInvitations,
}) => {
  return (
    <div class="max-w-6xl mx-auto py-8 px-4">
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-4">
          {store.logoUrl ? (
            <img src={store.logoUrl} alt="" class="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div class="w-12 h-12 rounded-lg bg-brand-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          )}
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{store.name}</h1>
            <p class="text-gray-500 dark:text-gray-400">{store.slug}.petm8.io</p>
          </div>
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
          <div class="flex items-center gap-3 mb-2">
            <svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Plan</h3>
          </div>
          <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{plan?.name ?? "Free"}</p>
          <p class="text-sm text-gray-500">
            {plan?.transactionFeePercent ?? "5"}% transaction fee
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div class="flex items-center gap-3 mb-2">
            <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Team Members</h3>
          </div>
          <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{members.length}</p>
          {pendingInvitations.length > 0 && (
            <p class="text-sm text-amber-600">{pendingInvitations.length} pending invitation{pendingInvitations.length > 1 ? "s" : ""}</p>
          )}
        </div>
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div class="flex items-center gap-3 mb-2">
            <svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Custom Domains</h3>
          </div>
          <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{domains.length}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Team */}
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Team</h2>
            <a
              href="/platform/members"
              class="text-sm text-brand-600 dark:text-brand-400 hover:underline"
            >
              Manage
            </a>
          </div>
          <ul class="space-y-3">
            {members.map((m) => (
              <li class="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <div class="flex items-center gap-3">
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt="" class="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                      {m.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{m.userName}</p>
                    <p class="text-xs text-gray-500">{m.userEmail}</p>
                  </div>
                </div>
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
              href="/platform/settings"
              class="text-sm text-brand-600 dark:text-brand-400 hover:underline"
            >
              Settings
            </a>
          </div>
          <ul class="space-y-2">
            <li class="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span class="text-sm text-gray-900 dark:text-gray-100">{store.slug}.petm8.io</span>
              <span class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                Active
              </span>
            </li>
            {domains.map((d) => (
              <li class="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <span class="text-sm text-gray-900 dark:text-gray-100">{d.domain}</span>
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
          href="/admin/products"
          class="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow text-center"
        >
          <svg class="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Products</span>
        </a>
        <a
          href="/admin/orders"
          class="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow text-center"
        >
          <svg class="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Orders</span>
        </a>
        <a
          href="/platform/settings"
          class="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow text-center"
        >
          <svg class="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Settings</span>
        </a>
        <a
          href="/platform/integrations"
          class="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow text-center"
        >
          <svg class="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Integrations</span>
        </a>
      </div>
    </div>
  );
};
