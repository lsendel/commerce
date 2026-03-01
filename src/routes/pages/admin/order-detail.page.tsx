import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { PageHeader } from "../../../components/ui/page-header";

interface OrderItem {
  id: string;
  productName: string;
  variantTitle: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variant?: {
    title: string;
    product: { name: string; slug: string; featuredImageUrl: string | null };
  };
}

interface AdminOrderDetailPageProps {
  order: {
    id: string;
    userId: string;
    status: string | null;
    subtotal: string;
    tax: string;
    shippingCost: string;
    discount: string;
    total: string;
    currency: string | null;
    couponCode: string | null;
    shippingAddress: Record<string, unknown> | null;
    notes: string | null;
    internalNotes: string | null;
    stripePaymentIntentId: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    items: OrderItem[];
  };
  customerName?: string;
  customerEmail?: string;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  pending: "warning",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "neutral",
  refunded: "error",
};

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: string | number): string {
  return `$${Number(amount).toFixed(2)}`;
}

export const AdminOrderDetailPage: FC<AdminOrderDetailPageProps> = ({
  order,
  customerName,
  customerEmail,
}) => {
  const status = order.status || "pending";
  const address = order.shippingAddress as Record<string, string> | null;
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Orders", href: "/admin/orders" },
    { label: `#${order.id.slice(0, 8)}` },
  ];

  return (
    <div>
      <PageHeader title={`Order #${order.id.slice(0, 8)}`} breadcrumbs={breadcrumbs} />

      <div class="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div class="lg:col-span-2 space-y-6">
          {/* Order info */}
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-semibold text-gray-900 dark:text-gray-100">Order Info</h2>
              <Badge variant={STATUS_VARIANT[status] || "neutral"}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-gray-500 dark:text-gray-400">Customer</span>
                <p class="font-medium text-gray-900 dark:text-gray-100">{customerName || "—"}</p>
                <p class="text-xs text-gray-400">{customerEmail || ""}</p>
              </div>
              <div>
                <span class="text-gray-500 dark:text-gray-400">Created</span>
                <p class="font-medium text-gray-900 dark:text-gray-100">{formatDate(order.createdAt)}</p>
              </div>
              {address && (
                <div class="col-span-2">
                  <span class="text-gray-500 dark:text-gray-400">Shipping Address</span>
                  <p class="font-medium text-gray-900 dark:text-gray-100">
                    {address.street || address.line1 || ""}
                    {address.city ? `, ${address.city}` : ""}
                    {address.state ? ` ${address.state}` : ""}
                    {address.zip ? ` ${address.zip}` : ""}
                  </p>
                </div>
              )}
              {order.stripePaymentIntentId && (
                <div class="col-span-2">
                  <span class="text-gray-500 dark:text-gray-400">Payment Intent</span>
                  <p class="font-mono text-xs text-gray-600 dark:text-gray-400">{order.stripePaymentIntentId}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items table */}
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div class="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 class="font-semibold text-gray-900 dark:text-gray-100">Items ({order.items.length})</h2>
            </div>
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th class="text-left px-5 py-2 font-medium text-gray-500 dark:text-gray-400">Product</th>
                  <th class="text-center px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Qty</th>
                  <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Unit</th>
                  <th class="text-right px-5 py-2 font-medium text-gray-500 dark:text-gray-400">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                {order.items.map((item) => (
                  <tr>
                    <td class="px-5 py-3">
                      <div class="flex items-center gap-3">
                        {item.variant?.product.featuredImageUrl && (
                          <img
                            src={item.variant.product.featuredImageUrl}
                            alt=""
                            class="w-10 h-10 rounded-lg object-cover bg-gray-100"
                            loading="lazy"
                          />
                        )}
                        <div>
                          <p class="font-medium text-gray-900 dark:text-gray-100">{item.productName}</p>
                          {item.variantTitle && (
                            <p class="text-xs text-gray-400">{item.variantTitle}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td class="px-3 py-3 text-center text-gray-600 dark:text-gray-400">{item.quantity}</td>
                    <td class="px-3 py-3 text-right text-gray-600 dark:text-gray-400">{formatCurrency(item.unitPrice)}</td>
                    <td class="px-5 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">Internal Notes</h2>
            {order.internalNotes ? (
              <pre class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-sans">{order.internalNotes}</pre>
            ) : (
              <p class="text-sm text-gray-400">No notes yet.</p>
            )}

            <form id="note-form" class="mt-4 flex gap-2" onsubmit="return false;">
              <input
                type="text"
                name="noteText"
                placeholder="Add a note..."
                class="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                required
              />
              <Button type="submit" variant="primary" size="sm" id="add-note-btn">
                Add
              </Button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div class="space-y-6">
          {/* Price breakdown */}
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 class="font-semibold text-gray-900 dark:text-gray-100 mb-4">Summary</h2>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">Subtotal</span>
                <span class="text-gray-900 dark:text-gray-100">{formatCurrency(order.subtotal)}</span>
              </div>
              {Number(order.shippingCost) > 0 && (
                <div class="flex justify-between">
                  <span class="text-gray-500 dark:text-gray-400">Shipping</span>
                  <span class="text-gray-900 dark:text-gray-100">{formatCurrency(order.shippingCost)}</span>
                </div>
              )}
              {Number(order.tax) > 0 && (
                <div class="flex justify-between">
                  <span class="text-gray-500 dark:text-gray-400">Tax</span>
                  <span class="text-gray-900 dark:text-gray-100">{formatCurrency(order.tax)}</span>
                </div>
              )}
              {Number(order.discount) > 0 && (
                <div class="flex justify-between">
                  <span class="text-gray-500 dark:text-gray-400">Discount</span>
                  <span class="text-green-600">-{formatCurrency(order.discount)}</span>
                </div>
              )}
              {order.couponCode && (
                <div class="flex justify-between">
                  <span class="text-gray-500 dark:text-gray-400">Coupon</span>
                  <span class="font-mono text-xs text-brand-600">{order.couponCode}</span>
                </div>
              )}
              <div class="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 flex justify-between font-semibold">
                <span class="text-gray-900 dark:text-gray-100">Total</span>
                <span class="text-gray-900 dark:text-gray-100">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 class="font-semibold text-gray-900 dark:text-gray-100 mb-4">Actions</h2>
            <div class="space-y-2">
              {status !== "refunded" && status !== "cancelled" && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  class="w-full"
                  id="refund-btn"
                  data-order-id={order.id}
                >
                  Issue Refund
                </Button>
              )}
              <a
                href="/admin/orders"
                class="block text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 mt-2"
              >
                Back to Orders
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Static trusted script — no user input interpolated */}
      {html`
        <script>
          (function() {
            function showOrderDetailError(message) {
              if (window.showToast) {
                window.showToast(message, 'error');
                return;
              }
              var banner = document.getElementById('admin-order-detail-flash');
              if (!banner) {
                banner = document.createElement('div');
                banner.id = 'admin-order-detail-flash';
                banner.className = 'fixed top-4 right-4 z-50 max-w-sm rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-lg';
                document.body.appendChild(banner);
              }
              banner.textContent = message;
              banner.classList.remove('hidden');
              setTimeout(function() { banner.classList.add('hidden'); }, 4000);
            }

            var noteForm = document.getElementById('note-form');
            if (noteForm) {
              noteForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                var input = this.querySelector('[name="noteText"]');
                var btn = document.getElementById('add-note-btn');
                btn.disabled = true;

                try {
                  var orderId = window.location.pathname.split('/').pop();
                  var res = await fetch('/api/admin/orders/' + orderId + '/notes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: input.value }),
                  });
                  if (!res.ok) {
                    var data = await res.json().catch(function() { return {}; });
                    throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to add note') : (data.error || data.message || 'Failed to add note'));
                  }
                  window.location.reload();
                } catch (err) {
                  showOrderDetailError(err.message || 'Failed to add note');
                  btn.disabled = false;
                }
              });
            }

            var refundBtn = document.getElementById('refund-btn');
            if (refundBtn) {
              refundBtn.addEventListener('click', async function() {
                if (!confirm('Issue a full refund for this order?')) return;
                this.disabled = true;
                this.textContent = 'Processing...';

                try {
                  var orderId = this.getAttribute('data-order-id');
                  var res = await fetch('/api/admin/orders/' + orderId + '/refund', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                  });
                  if (!res.ok) {
                    var data = await res.json().catch(function() { return {}; });
                    throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Refund failed') : (data.error || data.message || 'Refund failed'));
                  }
                  if (window.showToast) window.showToast('Refund issued successfully', 'success');
                  window.location.reload();
                } catch (err) {
                  showOrderDetailError(err.message || 'Refund failed');
                  this.disabled = false;
                  this.textContent = 'Issue Refund';
                }
              });
            }
          })();
        </script>
      `}
    </div>
  );
};
