import type { FC } from "hono/jsx";
import { Badge } from "../../../components/ui/badge";

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  total: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  itemCount: number;
}

interface Subscription {
  planName: string;
  status: "active" | "past_due" | "cancelled";
  nextBillingDate: string;
}

interface DashboardPageProps {
  userName: string;
  recentOrders: Order[];
  subscription?: Subscription | null;
}

const orderStatusVariant: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  pending: "warning",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "error",
};

export const DashboardPage: FC<DashboardPageProps> = ({
  userName,
  recentOrders,
  subscription,
}) => {
  return (
    <div class="max-w-5xl mx-auto px-4 py-8">
      {/* Welcome */}
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Welcome back, {userName}
        </h1>
        <p class="mt-1 text-gray-500 dark:text-gray-400">Manage your account and view your activity.</p>
      </div>

      {/* Quick Links Grid */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <a
          href="/account/orders"
          class="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md hover:border-brand-200 dark:hover:border-brand-700 transition-all duration-200"
        >
          <div class="w-10 h-10 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center mb-3 group-hover:bg-brand-100 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 text-sm">Orders</h3>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">View order history</p>
        </a>

        <a
          href="/account/addresses"
          class="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md hover:border-brand-200 dark:hover:border-brand-700 transition-all duration-200"
        >
          <div class="w-10 h-10 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center mb-3 group-hover:bg-brand-100 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 text-sm">Addresses</h3>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Manage shipping addresses</p>
        </a>

        <a
          href="/account/subscriptions"
          class="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md hover:border-brand-200 dark:hover:border-brand-700 transition-all duration-200"
        >
          <div class="w-10 h-10 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center mb-3 group-hover:bg-brand-100 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 text-sm">Subscriptions</h3>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Manage your plan</p>
        </a>

        <a
          href="/account/pets"
          class="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md hover:border-brand-200 dark:hover:border-brand-700 transition-all duration-200"
        >
          <div class="w-10 h-10 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center mb-3 group-hover:bg-brand-100 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 text-sm">Pets</h3>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Your pet profiles</p>
        </a>
      </div>

      <div class="grid md:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div class="md:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Orders</h2>
            <a href="/account/orders" class="text-sm text-brand-600 hover:text-brand-700 font-medium">
              View all
            </a>
          </div>

          {recentOrders.length === 0 ? (
            <div class="text-center py-8">
              <p class="text-gray-400 text-sm">No orders yet.</p>
              <a
                href="/products"
                class="inline-block mt-3 text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                Start shopping
              </a>
            </div>
          ) : (
            <div class="space-y-3">
              {recentOrders.map((order) => (
                <a
                  href={`/account/orders#order-${order.id}`}
                  class="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-900 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors group"
                >
                  <div>
                    <p class="font-medium text-sm text-gray-900 group-hover:text-brand-700">
                      #{order.orderNumber}
                    </p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {order.date} &middot; {order.itemCount}{" "}
                      {order.itemCount === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <div class="flex items-center gap-3">
                    <Badge variant={orderStatusVariant[order.status] || "neutral"}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                    <span class="text-sm font-semibold text-gray-900">${order.total}</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Subscription Status */}
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Subscription</h2>

          {subscription ? (
            <div class="space-y-4">
              <div class="p-4 rounded-xl bg-brand-50 border border-brand-100">
                <p class="font-semibold text-brand-700 text-sm">{subscription.planName}</p>
                <Badge
                  variant={
                    subscription.status === "active"
                      ? "success"
                      : subscription.status === "past_due"
                      ? "warning"
                      : "error"
                  }
                  class="mt-2"
                >
                  {subscription.status === "active"
                    ? "Active"
                    : subscription.status === "past_due"
                    ? "Past Due"
                    : "Cancelled"}
                </Badge>
              </div>
              <div class="text-xs text-gray-500">
                <span class="font-medium text-gray-700">Next billing:</span>{" "}
                {subscription.nextBillingDate}
              </div>
              <a
                href="/account/subscriptions"
                class="block text-center text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                Manage subscription
              </a>
            </div>
          ) : (
            <div class="text-center py-6">
              <div class="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p class="text-sm text-gray-400 mb-3">No active subscription</p>
              <a
                href="/products?type=subscription"
                class="text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                Browse Plans
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
