import type { FC } from "hono/jsx";
import { html } from "hono/html";

interface FulfillmentDetailPageProps {
  request: {
    id: string;
    orderId: string;
    provider: string;
    externalId: string | null;
    status: string;
    errorMessage: string | null;
    costEstimatedTotal: string | null;
    costActualTotal: string | null;
    costShipping: string | null;
    costTax: string | null;
    currency: string;
    submittedAt: string | null;
    completedAt: string | null;
    createdAt: string;
  };
  items: Array<{
    id: string;
    orderItemId: string | null;
    providerLineId: string | null;
    quantity: number;
    status: string | null;
  }>;
  events: Array<{
    id: string;
    eventType: string;
    externalEventId: string | null;
    receivedAt: string;
    processedAt: string | null;
  }>;
  shipment: {
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    status: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  submitted: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-green-100 text-green-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancel_requested: "bg-orange-100 text-orange-800",
  cancelled: "bg-gray-100 text-gray-800",
  failed: "bg-red-100 text-red-800",
};

const TIMELINE_STEPS = ["pending", "submitted", "processing", "shipped", "delivered"] as const;

const TIMELINE_COLORS: Record<string, { bg: string; ring: string; text: string }> = {
  completed: { bg: "bg-brand-600", ring: "ring-brand-200", text: "text-brand-700" },
  current: { bg: "bg-brand-600", ring: "ring-brand-300", text: "text-brand-700 font-semibold" },
  upcoming: { bg: "bg-gray-200", ring: "ring-gray-100", text: "text-gray-400" },
};

function formatDate(date: Date | string | null): string {
  if (!date) return "\u2014";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: string | null, currency: string): string {
  if (!amount) return "\u2014";
  const symbol = currency.toUpperCase() === "USD" ? "$" : currency.toUpperCase() + " ";
  return `${symbol}${Number(amount).toFixed(2)}`;
}

export const FulfillmentDetailPage: FC<FulfillmentDetailPageProps> = ({
  request,
  items,
  events,
  shipment,
}) => {
  const status = request.status;
  const isFailed = status === "failed";
  const isCancellable = ["pending", "submitted", "processing"].includes(status);

  const currentStepIndex = TIMELINE_STEPS.indexOf(
    status as (typeof TIMELINE_STEPS)[number],
  );

  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      {/* Back link */}
      <a
        href="/admin/fulfillment"
        class="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Fulfillment
      </a>

      {/* Header */}
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            Fulfillment #{request.id.slice(0, 8)}
          </h1>
          <p class="text-sm text-gray-500 mt-1">
            Order{" "}
            <a
              href={`/admin/orders/${request.orderId}`}
              class="text-brand-600 hover:text-brand-700 font-mono"
            >
              #{request.orderId.slice(0, 8)}
            </a>
          </p>
        </div>
        <span
          class={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800"}`}
        >
          {status}
        </span>
      </div>

      {/* Error banner */}
      {request.errorMessage && (
        <div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="text-sm font-medium text-red-800">Fulfillment Error</p>
              <p class="text-sm text-red-700 mt-1">{request.errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Status Timeline */}
      <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 class="text-sm font-semibold text-gray-900 mb-4">Status Timeline</h2>
        <div class="flex items-center justify-between">
          {TIMELINE_STEPS.map((step, i) => {
            let variant: "completed" | "current" | "upcoming";
            if (isFailed || status === "cancelled") {
              variant = "upcoming";
            } else if (i < currentStepIndex) {
              variant = "completed";
            } else if (i === currentStepIndex) {
              variant = "current";
            } else {
              variant = "upcoming";
            }
            const colors = TIMELINE_COLORS[variant] ?? TIMELINE_COLORS.upcoming!;

            return (
              <div class="flex items-center flex-1 last:flex-none" key={step}>
                <div class="flex flex-col items-center">
                  <div
                    class={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ${colors.bg} ${colors.ring}`}
                  >
                    {variant === "completed" ? (
                      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : variant === "current" ? (
                      <div class="w-2.5 h-2.5 bg-white rounded-full" />
                    ) : (
                      <div class="w-2.5 h-2.5 bg-gray-400 rounded-full" />
                    )}
                  </div>
                  <span class={`mt-2 text-xs capitalize ${colors.text}`}>{step}</span>
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div
                    class={`flex-1 h-0.5 mx-2 mt-[-1.25rem] ${i < currentStepIndex && !isFailed && status !== "cancelled" ? "bg-brand-600" : "bg-gray-200"}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div class="lg:col-span-2 space-y-6">
          {/* Request Info Card */}
          <div class="bg-white rounded-lg border border-gray-200 p-5">
            <h2 class="font-semibold text-gray-900 mb-4">Request Info</h2>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-gray-500">Provider</span>
                <p class="font-medium text-gray-900 capitalize">{request.provider}</p>
              </div>
              <div>
                <span class="text-gray-500">External ID</span>
                <p class="font-mono text-gray-900">{request.externalId ?? "\u2014"}</p>
              </div>
              <div>
                <span class="text-gray-500">Created</span>
                <p class="font-medium text-gray-900">{formatDate(request.createdAt)}</p>
              </div>
              <div>
                <span class="text-gray-500">Submitted</span>
                <p class="font-medium text-gray-900">{formatDate(request.submittedAt)}</p>
              </div>
              <div>
                <span class="text-gray-500">Completed</span>
                <p class="font-medium text-gray-900">{formatDate(request.completedAt)}</p>
              </div>
              <div>
                <span class="text-gray-500">Currency</span>
                <p class="font-medium text-gray-900">{request.currency.toUpperCase()}</p>
              </div>
            </div>

            {/* Cost breakdown */}
            {(request.costEstimatedTotal || request.costActualTotal) && (
              <div class="mt-5 pt-4 border-t border-gray-200">
                <h3 class="text-sm font-medium text-gray-700 mb-3">Cost Breakdown</h3>
                <div class="space-y-2 text-sm">
                  {request.costEstimatedTotal && (
                    <div class="flex justify-between">
                      <span class="text-gray-500">Estimated Total</span>
                      <span class="text-gray-900">{formatCurrency(request.costEstimatedTotal, request.currency)}</span>
                    </div>
                  )}
                  {request.costActualTotal && (
                    <div class="flex justify-between">
                      <span class="text-gray-500">Actual Total</span>
                      <span class="font-medium text-gray-900">{formatCurrency(request.costActualTotal, request.currency)}</span>
                    </div>
                  )}
                  {request.costShipping && (
                    <div class="flex justify-between">
                      <span class="text-gray-500">Shipping</span>
                      <span class="text-gray-900">{formatCurrency(request.costShipping, request.currency)}</span>
                    </div>
                  )}
                  {request.costTax && (
                    <div class="flex justify-between">
                      <span class="text-gray-500">Tax</span>
                      <span class="text-gray-900">{formatCurrency(request.costTax, request.currency)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div class="px-5 py-3 border-b border-gray-200">
              <h2 class="font-semibold text-gray-900">Items ({items.length})</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ID
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Order Item
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Provider Line ID
                    </th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Qty
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colspan={5}
                        class="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        No items found.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} class="hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm font-mono text-gray-700">
                          {item.id.slice(0, 8)}...
                        </td>
                        <td class="px-4 py-3 text-sm font-mono text-gray-500">
                          {item.orderItemId ? `${item.orderItemId.slice(0, 8)}...` : "\u2014"}
                        </td>
                        <td class="px-4 py-3 text-sm font-mono text-gray-500">
                          {item.providerLineId ?? "\u2014"}
                        </td>
                        <td class="px-4 py-3 text-sm text-center text-gray-700">
                          {item.quantity}
                        </td>
                        <td class="px-4 py-3">
                          {item.status ? (
                            <span
                              class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[item.status] ?? "bg-gray-100 text-gray-800"}`}
                            >
                              {item.status}
                            </span>
                          ) : (
                            <span class="text-sm text-gray-400">{"\u2014"}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Provider Events Log */}
          <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div class="px-5 py-3 border-b border-gray-200">
              <h2 class="font-semibold text-gray-900">Provider Events ({events.length})</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Event Type
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      External Event ID
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Received
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Processed
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  {events.length === 0 ? (
                    <tr>
                      <td
                        colspan={4}
                        class="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        No events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    events.map((evt) => (
                      <tr key={evt.id} class="hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm font-medium text-gray-900">
                          {evt.eventType}
                        </td>
                        <td class="px-4 py-3 text-sm font-mono text-gray-500">
                          {evt.externalEventId ?? "\u2014"}
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-500">
                          {formatDate(evt.receivedAt)}
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-500">
                          {formatDate(evt.processedAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div class="space-y-6">
          {/* Shipment Info */}
          <div class="bg-white rounded-lg border border-gray-200 p-5">
            <h2 class="font-semibold text-gray-900 mb-4">Shipment</h2>
            {shipment ? (
              <div class="space-y-3 text-sm">
                <div>
                  <span class="text-gray-500">Carrier</span>
                  <p class="font-medium text-gray-900">{shipment.carrier ?? "\u2014"}</p>
                </div>
                <div>
                  <span class="text-gray-500">Tracking Number</span>
                  {shipment.trackingUrl ? (
                    <p>
                      <a
                        href={shipment.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-brand-600 hover:text-brand-700 font-mono text-xs break-all"
                      >
                        {shipment.trackingNumber ?? "Track shipment"}
                      </a>
                    </p>
                  ) : (
                    <p class="font-mono text-xs text-gray-900">{shipment.trackingNumber ?? "\u2014"}</p>
                  )}
                </div>
                <div>
                  <span class="text-gray-500">Status</span>
                  {shipment.status ? (
                    <p>
                      <span
                        class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[shipment.status] ?? "bg-gray-100 text-gray-800"}`}
                      >
                        {shipment.status}
                      </span>
                    </p>
                  ) : (
                    <p class="text-gray-400">{"\u2014"}</p>
                  )}
                </div>
                <div>
                  <span class="text-gray-500">Shipped</span>
                  <p class="font-medium text-gray-900">{formatDate(shipment.shippedAt)}</p>
                </div>
                <div>
                  <span class="text-gray-500">Delivered</span>
                  <p class="font-medium text-gray-900">{formatDate(shipment.deliveredAt)}</p>
                </div>
              </div>
            ) : (
              <p class="text-sm text-gray-400">No shipment information yet.</p>
            )}
          </div>

          {/* Actions */}
          <div class="bg-white rounded-lg border border-gray-200 p-5">
            <h2 class="font-semibold text-gray-900 mb-4">Actions</h2>
            <div class="space-y-2">
              {isFailed && (
                <button
                  type="button"
                  id="retry-btn"
                  data-request-id={request.id}
                  class="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 transition-colors"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry Fulfillment
                </button>
              )}
              {isCancellable && (
                <button
                  type="button"
                  id="cancel-btn"
                  data-request-id={request.id}
                  class="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel Fulfillment
                </button>
              )}
              {!isFailed && !isCancellable && (
                <p class="text-sm text-gray-400 text-center">No actions available.</p>
              )}
              <a
                href="/admin/fulfillment"
                class="block text-center text-sm text-gray-500 hover:text-gray-700 mt-2"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Static trusted script — no user input interpolated */}
      {html`
        <script>
          (function() {
            var retryBtn = document.getElementById('retry-btn');
            if (retryBtn) {
              retryBtn.addEventListener('click', async function() {
                if (!confirm('Retry this fulfillment request?')) return;
                this.disabled = true;
                this.textContent = 'Retrying...';

                try {
                  var requestId = this.getAttribute('data-request-id');
                  var res = await fetch('/api/admin/fulfillment/' + requestId + '/retry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                  });
                  if (!res.ok) {
                    var data = await res.json().catch(function() { return {}; });
                    throw new Error(data.error || 'Retry failed');
                  }
                  if (window.showToast) window.showToast('Retry queued successfully', 'success');
                  window.location.reload();
                } catch (err) {
                  alert(err.message);
                  this.disabled = false;
                  this.textContent = 'Retry Fulfillment';
                }
              });
            }

            var cancelBtn = document.getElementById('cancel-btn');
            if (cancelBtn) {
              cancelBtn.addEventListener('click', async function() {
                if (!confirm('Cancel this fulfillment request? This cannot be undone.')) return;
                this.disabled = true;
                this.textContent = 'Cancelling...';

                try {
                  var requestId = this.getAttribute('data-request-id');
                  var res = await fetch('/api/admin/fulfillment/' + requestId + '/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                  });
                  if (!res.ok) {
                    var data = await res.json().catch(function() { return {}; });
                    throw new Error(data.error || 'Cancellation failed');
                  }
                  if (window.showToast) window.showToast('Fulfillment cancelled', 'success');
                  window.location.reload();
                } catch (err) {
                  alert(err.message);
                  this.disabled = false;
                  this.textContent = 'Cancel Fulfillment';
                }
              });
            }
          })();
        </script>
      `}
    </div>
  );
};
