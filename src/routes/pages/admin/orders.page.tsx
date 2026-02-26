import type { FC } from "hono/jsx";
import { Badge } from "../../../components/ui/badge";
import { Pagination } from "../../../components/ui/pagination";
import { PageHeader } from "../../../components/ui/page-header";
import { EmptyState } from "../../../components/ui/empty-state";

interface OrderRow {
  id: string;
  status: string | null;
  total: string;
  subtotal: string;
  createdAt: Date | null;
  customerName: string | null;
  customerEmail: string | null;
}

interface AdminOrdersPageProps {
  orders: OrderRow[];
  total: number;
  page: number;
  limit: number;
  filters: {
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  pending: "warning",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "neutral",
  refunded: "error",
};

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: string | number): string {
  return `$${Number(amount).toFixed(2)}`;
}

export const AdminOrdersPage: FC<AdminOrdersPageProps> = ({
  orders,
  total,
  page,
  limit,
  filters,
}) => {
  const totalPages = Math.ceil(total / limit);
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Orders" },
  ];

  return (
    <div>
      <PageHeader
        title="Orders"
        breadcrumbs={breadcrumbs}
        actions={
          <a
            href={`/admin/orders?export=csv&status=${filters.status || ""}`}
            class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </a>
        }
      />

      {/* Filter bar */}
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <form method="get" action="/admin/orders" class="flex flex-wrap items-end gap-3">
          <div class="flex-1 min-w-[200px]">
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search</label>
            <input
              type="text"
              name="search"
              value={filters.search || ""}
              placeholder="Order ID or email..."
              class="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
            <select
              name="status"
              class="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              <option value="">All statuses</option>
              {["pending", "processing", "shipped", "delivered", "cancelled", "refunded"].map((s) => (
                <option value={s} selected={filters.status === s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From</label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom || ""}
              class="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To</label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo || ""}
              class="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>
          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors"
          >
            Filter
          </button>
          {(filters.status || filters.search || filters.dateFrom || filters.dateTo) && (
            <a
              href="/admin/orders"
              class="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              Clear
            </a>
          )}
        </form>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description={filters.status || filters.search ? "Try adjusting your filters." : "Orders will appear here when customers complete purchases."}
          icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      ) : (
        <>
          <div class="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} orders
          </div>

          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Order</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Customer</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th class="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Total</th>
                  <th class="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                {orders.map((order) => (
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <td class="px-4 py-3">
                      <a
                        href={`/admin/orders/${order.id}`}
                        class="font-medium text-brand-600 hover:text-brand-700"
                      >
                        {order.id.slice(0, 8)}...
                      </a>
                    </td>
                    <td class="px-4 py-3">
                      <div class="font-medium text-gray-900 dark:text-gray-100">
                        {order.customerName || "—"}
                      </div>
                      <div class="text-xs text-gray-400">{order.customerEmail || ""}</div>
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {formatDate(order.createdAt)}
                    </td>
                    <td class="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[order.status || "pending"] || "neutral"}>
                        {(order.status || "pending").charAt(0).toUpperCase() + (order.status || "pending").slice(1)}
                      </Badge>
                    </td>
                    <td class="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(order.total)}
                    </td>
                    <td class="px-4 py-3 text-right">
                      <a
                        href={`/admin/orders/${order.id}`}
                        class="text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div class="mt-6">
              <Pagination currentPage={page} totalPages={totalPages} baseUrl="/admin/orders" />
            </div>
          )}
        </>
      )}
    </div>
  );
};
