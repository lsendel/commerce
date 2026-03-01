import type { FC } from "hono/jsx";
import { Badge } from "../../../components/ui/badge";

interface OrderItem {
  name: string;
  quantity: number;
  price: string;
  imageUrl?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  total: string;
  subtotal: string;
  tax: string;
  shipping: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  itemCount: number;
  items: OrderItem[];
  trackingUrl?: string;
  canReorder?: boolean;
  reorderHint?: string;
  canReturnOrExchange?: boolean;
  returnExchangeHint?: string;
}

interface OrdersPageProps {
  orders: Order[];
  isIntelligentReorderEnabled?: boolean;
  isReturnsExchangeEnabled?: boolean;
}

const statusVariant: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  pending: "warning",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "error",
  refunded: "neutral",
};

const statusLabel: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const OrdersPage: FC<OrdersPageProps> = ({
  orders,
  isIntelligentReorderEnabled = true,
  isReturnsExchangeEnabled = false,
}) => {
  return (
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Orders</h1>
          <p class="mt-1 text-sm text-gray-500">View and track your order history.</p>
        </div>
        <a
          href="/account"
          class="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          Back to Account
        </a>
      </div>

      {orders.length === 0 ? (
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-12 text-center">
          <div class="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">No orders yet</h2>
          <p class="text-sm text-gray-400 mb-4">
            When you place your first order, it will appear here.
          </p>
          <a
            href="/products"
            class="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors"
          >
            Start Shopping
          </a>
        </div>
      ) : (
        <div class="space-y-4">
          {orders.map((order) => (
            <details
              id={`order-${order.id}`}
              class="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
            >
              {/* Order summary row */}
              <summary class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 cursor-pointer list-none hover:bg-gray-50 transition-colors">
                <div class="flex items-center gap-4">
                  <div>
                    <p class="font-semibold text-gray-900 dark:text-gray-100">#{order.orderNumber}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{order.date}</p>
                  </div>
                </div>
                <div class="flex items-center gap-4">
                  <span class="text-xs text-gray-500">
                    {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                  </span>
                  <Badge variant={statusVariant[order.status] || "neutral"}>
                    {statusLabel[order.status] || order.status}
                  </Badge>
                  <span class="text-sm font-bold text-gray-900">${order.total}</span>
                  <svg
                    class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </summary>

              {/* Order detail */}
              <div class="border-t border-gray-100 dark:border-gray-700 p-5">
                {/* Items */}
                <div class="space-y-3 mb-5">
                  {order.items.map((item) => (
                    <div class="flex items-center gap-4">
                      <div class="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} class="w-full h-full object-cover" />
                        ) : (
                          <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.5"
                              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            />
                          </svg>
                        )}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p class="text-xs text-gray-400">Qty: {item.quantity}</p>
                      </div>
                      <p class="text-sm font-medium text-gray-900">${item.price}</p>
                    </div>
                  ))}
                </div>

                {/* Price breakdown */}
                <div class="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2">
                  <div class="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span>${order.subtotal}</span>
                  </div>
                  <div class="flex justify-between text-sm text-gray-500">
                    <span>Shipping</span>
                    <span>{order.shipping === "0.00" ? "Free" : `$${order.shipping}`}</span>
                  </div>
                  <div class="flex justify-between text-sm text-gray-500">
                    <span>Tax</span>
                    <span>${order.tax}</span>
                  </div>
                  <div class="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <span>Total</span>
                    <span>${order.total}</span>
                  </div>
                </div>

                {/* Actions row */}
                <div class="mt-4 flex items-center gap-4">
                  {isIntelligentReorderEnabled !== false ? (
                    <button
                      type="button"
                      class={`reorder-btn inline-flex items-center gap-1.5 text-sm rounded-lg px-3 py-1.5 font-medium transition-colors ${
                        order.canReorder === false
                          ? "text-gray-400 bg-gray-50 cursor-not-allowed"
                          : "text-brand-600 hover:text-brand-700 hover:bg-brand-50"
                      }`}
                      data-order-id={order.id}
                      disabled={order.canReorder === false}
                      title={order.canReorder === false ? (order.reorderHint || "This order is not eligible for reorder.") : undefined}
                    >
                      Order Again
                    </button>
                  ) : (
                    <span class="inline-flex items-center gap-1.5 text-sm text-gray-400 px-3 py-1.5">
                      Reorder disabled
                    </span>
                  )}

                  {/* Tracking link */}
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Track Shipment
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}

                  {isReturnsExchangeEnabled && (
                    <button
                      type="button"
                      class={`return-exchange-btn inline-flex items-center gap-1.5 text-sm rounded-lg px-3 py-1.5 font-medium transition-colors ${
                        order.canReturnOrExchange === false
                          ? "text-gray-400 bg-gray-50 cursor-not-allowed"
                          : "text-brand-600 hover:text-brand-700 hover:bg-brand-50"
                      }`}
                      data-order-id={order.id}
                      disabled={order.canReturnOrExchange === false}
                      title={order.canReturnOrExchange === false ? (order.returnExchangeHint || "This order is not eligible for returns/exchanges.") : undefined}
                    >
                      Return/Exchange
                    </button>
                  )}

                  {/* Cancel button for pending/processing orders */}
                  {(order.status === "pending" || order.status === "processing") && (
                    <button
                      type="button"
                      class="cancel-order-btn inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg px-3 py-1.5 font-medium transition-colors"
                      data-order-id={order.id}
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
      <script src="/scripts/order-cancel.js" defer></script>
      <script src="/scripts/order-reorder.js" defer></script>
      <script src="/scripts/order-returns.js" defer></script>
    </div>
  );
};
