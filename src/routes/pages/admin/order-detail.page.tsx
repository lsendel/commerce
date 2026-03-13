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

interface FulfillmentRequestRow {
  id: string;
  provider: string;
  providerId: string | null;
  providerName: string | null;
  externalId: string | null;
  status: string | null;
  costEstimatedTotal: string | null;
  costActualTotal: string | null;
  costShipping: string | null;
  costTax: string | null;
  currency: string | null;
  refundStripeId: string | null;
  refundAmount: string | null;
  refundStatus: string | null;
  errorMessage: string | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface ShipmentRow {
  id: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date | null;
}

interface ProviderEventRow {
  id: string;
  provider: string;
  externalEventId: string | null;
  externalOrderId: string | null;
  eventType: string;
  receivedAt: Date | null;
  processedAt: Date | null;
  errorMessage: string | null;
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
    fulfillmentRequests?: FulfillmentRequestRow[];
    shipments?: ShipmentRow[];
    providerEvents?: ProviderEventRow[];
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

const FULFILLMENT_STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  pending: "warning",
  submitted: "info",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancel_requested: "warning",
  cancelled: "neutral",
  failed: "error",
};

const SHIPMENT_STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  pending: "warning",
  shipped: "info",
  in_transit: "info",
  delivered: "success",
  returned: "error",
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

function formatLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const AdminOrderDetailPage: FC<AdminOrderDetailPageProps> = ({
  order,
  customerName,
  customerEmail,
}) => {
  const status = order.status || "pending";
  const address = order.shippingAddress as Record<string, string> | null;
  const fulfillmentRequests = order.fulfillmentRequests || [];
  const shipments = order.shipments || [];
  const providerEvents = order.providerEvents || [];
  const providerEventCountByExternalOrderId = new Map<string, number>();
  for (const event of providerEvents) {
    if (!event.externalOrderId) continue;
    providerEventCountByExternalOrderId.set(
      event.externalOrderId,
      (providerEventCountByExternalOrderId.get(event.externalOrderId) || 0) + 1,
    );
  }
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
              <span id="order-status-badge-wrap">
                <Badge variant={STATUS_VARIANT[status] || "neutral"} class="capitalize">
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
              </span>
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

          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div class="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 class="font-semibold text-gray-900 dark:text-gray-100">Fulfillment</h2>
              <span class="text-xs text-gray-400">{fulfillmentRequests.length} request{fulfillmentRequests.length === 1 ? "" : "s"}</span>
            </div>
            {fulfillmentRequests.length === 0 ? (
              <p class="px-5 py-4 text-sm text-gray-400">No fulfillment requests created yet.</p>
            ) : (
              <div class="divide-y divide-gray-100 dark:divide-gray-700">
                {fulfillmentRequests.map((request) => {
                  const relatedEventCount = request.externalId
                    ? providerEventCountByExternalOrderId.get(request.externalId) || 0
                    : 0;
                  return (
                    <div class="p-5 space-y-3">
                      <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="flex flex-wrap items-center gap-2">
                          <p class="font-medium text-gray-900 dark:text-gray-100">
                            {request.providerName || formatLabel(request.provider)}
                          </p>
                          <Badge variant={FULFILLMENT_STATUS_VARIANT[request.status || "pending"] || "neutral"}>
                            {formatLabel(request.status)}
                          </Badge>
                        </div>
                        <p class="text-xs text-gray-400">Created {formatDate(request.createdAt)}</p>
                      </div>
                      <div class="grid gap-3 text-sm md:grid-cols-2">
                        <div>
                          <span class="text-gray-500 dark:text-gray-400">External order</span>
                          <p class="font-mono text-xs text-gray-600 dark:text-gray-300">
                            {request.externalId || "Pending provider submission"}
                          </p>
                        </div>
                        <div>
                          <span class="text-gray-500 dark:text-gray-400">Lifecycle</span>
                          <p class="text-gray-900 dark:text-gray-100">
                            Submitted {formatDate(request.submittedAt)}
                          </p>
                          <p class="text-gray-900 dark:text-gray-100">
                            Completed {formatDate(request.completedAt)}
                          </p>
                        </div>
                        <div>
                          <span class="text-gray-500 dark:text-gray-400">Cost</span>
                          <p class="text-gray-900 dark:text-gray-100">
                            Estimated {request.costEstimatedTotal ? formatCurrency(request.costEstimatedTotal) : "—"}
                          </p>
                          <p class="text-gray-900 dark:text-gray-100">
                            Actual {request.costActualTotal ? formatCurrency(request.costActualTotal) : "—"}
                          </p>
                        </div>
                        <div>
                          <span class="text-gray-500 dark:text-gray-400">Refunds / Events</span>
                          <p class="text-gray-900 dark:text-gray-100">
                            Refund {request.refundStatus ? formatLabel(request.refundStatus) : "—"}
                            {request.refundAmount ? ` (${formatCurrency(request.refundAmount)})` : ""}
                          </p>
                          <p class="text-gray-900 dark:text-gray-100">
                            Provider events {relatedEventCount}
                          </p>
                        </div>
                        {request.errorMessage && (
                          <div class="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                            {request.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">Internal Notes</h2>
            <div id="internal-notes-content">
              {order.internalNotes ? (
                <pre id="internal-notes-text" class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-sans">{order.internalNotes}</pre>
              ) : (
                <p id="internal-notes-empty" class="text-sm text-gray-400">No notes yet.</p>
              )}
            </div>

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

          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-semibold text-gray-900 dark:text-gray-100">Shipments</h2>
              <span class="text-xs text-gray-400">{shipments.length}</span>
            </div>
            {shipments.length === 0 ? (
              <p class="text-sm text-gray-400">No shipment records yet.</p>
            ) : (
              <div class="space-y-3">
                {shipments.map((shipment) => (
                  <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="font-medium text-gray-900 dark:text-gray-100">
                        {shipment.carrier || "Shipment"}
                      </p>
                      <Badge variant={SHIPMENT_STATUS_VARIANT[shipment.status || "pending"] || "neutral"}>
                        {formatLabel(shipment.status)}
                      </Badge>
                    </div>
                    <div class="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                      <p>Tracking: {shipment.trackingNumber || "Pending"}</p>
                      <p>Shipped: {formatDate(shipment.shippedAt)}</p>
                      <p>Delivered: {formatDate(shipment.deliveredAt)}</p>
                      {shipment.trackingUrl && (
                        <a
                          href={shipment.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          class="inline-flex text-sm font-medium text-brand-600 hover:text-brand-700"
                        >
                          Open tracking
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-semibold text-gray-900 dark:text-gray-100">Provider Events</h2>
              <span class="text-xs text-gray-400">{providerEvents.length}</span>
            </div>
            {providerEvents.length === 0 ? (
              <p class="text-sm text-gray-400">No provider events recorded for this order yet.</p>
            ) : (
              <div class="space-y-3">
                {providerEvents.slice(0, 6).map((event) => (
                  <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="font-medium text-gray-900 dark:text-gray-100">
                        {formatLabel(event.provider)}: {formatLabel(event.eventType)}
                      </p>
                      <span class={event.errorMessage ? "text-xs font-medium text-red-600 dark:text-red-400" : "text-xs text-gray-400"}>
                        {event.errorMessage ? "Errored" : event.processedAt ? "Processed" : "Received"}
                      </span>
                    </div>
                    <div class="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                      <p>Received: {formatDate(event.receivedAt)}</p>
                      <p>Processed: {formatDate(event.processedAt)}</p>
                      <p class="font-mono text-xs text-gray-500 dark:text-gray-400">
                        {event.externalEventId || event.externalOrderId || "No external event id"}
                      </p>
                      {event.errorMessage && (
                        <p class="text-red-600 dark:text-red-400">{event.errorMessage}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 class="font-semibold text-gray-900 dark:text-gray-100 mb-4">Actions</h2>
            <div class="space-y-2">
              <div id="refund-action-wrap">
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
              </div>
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
            function showOrderDetailNotice(message, type) {
              if (window.showToast) {
                window.showToast(message, type || 'info');
                return;
              }
              var banner = document.getElementById('admin-order-detail-flash');
              if (!banner) {
                banner = document.createElement('div');
                banner.id = 'admin-order-detail-flash';
                banner.className = 'fixed top-4 right-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm font-medium shadow-lg';
                document.body.appendChild(banner);
              }
              if (type === 'error') {
                banner.classList.remove('border-emerald-200', 'bg-emerald-50', 'text-emerald-700');
                banner.classList.add('border-red-200', 'bg-red-50', 'text-red-700');
              } else {
                banner.classList.remove('border-red-200', 'bg-red-50', 'text-red-700');
                banner.classList.add('border-emerald-200', 'bg-emerald-50', 'text-emerald-700');
              }
              banner.textContent = message;
              banner.classList.remove('hidden');
              setTimeout(function() { banner.classList.add('hidden'); }, 4000);
            }

            function showOrderDetailError(message) {
              showOrderDetailNotice(message, 'error');
            }

            function showOrderDetailSuccess(message) {
              showOrderDetailNotice(message, 'success');
            }

            function setButtonLoading(btn, loading, loadingText, idleText) {
              if (!btn) return;
              if (loading) {
                btn.dataset.idleLabel = idleText || btn.textContent || '';
                btn.textContent = loadingText || 'Saving...';
                btn.disabled = true;
                btn.classList.add('opacity-70', 'cursor-not-allowed');
                return;
              }
              btn.textContent = btn.dataset.idleLabel || idleText || btn.textContent || '';
              btn.disabled = false;
              btn.classList.remove('opacity-70', 'cursor-not-allowed');
            }

            async function confirmAction(message, options) {
              if (window.petm8Ui && typeof window.petm8Ui.confirm === 'function') {
                return window.petm8Ui.confirm(message, options || {});
              }
              return confirm(message);
            }

            function renderInternalNotes(notesText) {
              var container = document.getElementById('internal-notes-content');
              if (!container) return;
              while (container.firstChild) container.removeChild(container.firstChild);
              var text = String(notesText || '').trim();
              if (!text) {
                var empty = document.createElement('p');
                empty.id = 'internal-notes-empty';
                empty.className = 'text-sm text-gray-400';
                empty.textContent = 'No notes yet.';
                container.appendChild(empty);
                return;
              }
              var pre = document.createElement('pre');
              pre.id = 'internal-notes-text';
              pre.className = 'text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-sans';
              pre.textContent = text;
              container.appendChild(pre);
            }

            function markOrderRefunded() {
              var badgeWrap = document.getElementById('order-status-badge-wrap');
              if (badgeWrap) {
                badgeWrap.innerHTML = '<span class="inline-flex items-center rounded-full font-medium px-2.5 py-0.5 text-xs bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 capitalize">Refunded</span>';
              }

              var wrap = document.getElementById('refund-action-wrap');
              if (wrap) {
                wrap.innerHTML = '<p class="text-xs font-medium text-red-600 dark:text-red-400">Refund issued</p>';
              }
            }

            var noteForm = document.getElementById('note-form');
            if (noteForm) {
              noteForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                var input = this.querySelector('[name="noteText"]');
                var btn = document.getElementById('add-note-btn');
                setButtonLoading(btn, true, 'Saving...', 'Add');

                try {
                  var orderId = window.location.pathname.split('/').pop();
                  var res = await fetch('/api/admin/orders/' + orderId + '/notes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: input.value }),
                  });
                  var data = await res.json().catch(function() { return {}; });
                  if (!res.ok) {
                    throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to add note') : (data.error || data.message || 'Failed to add note'));
                  }
                  renderInternalNotes(data && data.notes ? data.notes : input.value);
                  input.value = '';
                  showOrderDetailSuccess('Note added.');
                } catch (err) {
                  showOrderDetailError(err.message || 'Failed to add note');
                } finally {
                  setButtonLoading(btn, false, 'Saving...', 'Add');
                }
              });
            }

            var refundBtn = document.getElementById('refund-btn');
            if (refundBtn) {
              refundBtn.addEventListener('click', async function() {
                var allowRefund = await confirmAction('Issue a full refund for this order?', {
                  title: 'Issue full refund',
                  confirmText: 'Issue refund',
                  danger: true,
                });
                if (!allowRefund) return;
                setButtonLoading(this, true, 'Processing...', 'Issue Refund');

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
                  showOrderDetailSuccess('Refund issued successfully.');
                  markOrderRefunded();
                } catch (err) {
                  showOrderDetailError(err.message || 'Refund failed');
                  setButtonLoading(this, false, 'Processing...', 'Issue Refund');
                }
              });
            }
          })();
        </script>
      `}
    </div>
  );
};
