import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Button } from "../../../components/ui/button";

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
  delivered: "bg-green-200 text-green-900",
  cancel_requested: "bg-orange-100 text-orange-800",
  cancelled: "bg-gray-100 text-gray-800",
  failed: "bg-red-100 text-red-800",
};

const STEPS = ["pending", "submitted", "processing", "shipped", "delivered"];

export const FulfillmentDetailPage: FC<FulfillmentDetailPageProps> = ({
  request,
  items,
  events,
  shipment,
}) => {
  const stepIndex = STEPS.indexOf(request.status);
  const isFailed = request.status === "failed";
  const isCancelled = request.status === "cancelled" || request.status === "cancel_requested";
  const canRetry = isFailed;
  const canCancel = request.status === "pending" || request.status === "submitted" || request.status === "processing";

  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <a href="/admin/fulfillment" class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Dashboard
      </a>

      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Request {request.id.slice(0, 8)}...
          </h1>
          <p class="text-sm text-gray-500 mt-1">
            Order: <a href={`/admin/orders/${request.orderId}`} class="text-brand-600 hover:text-brand-700 font-mono">{request.orderId.slice(0, 8)}...</a>
          </p>
        </div>
        <span class={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[request.status] ?? "bg-gray-100 text-gray-800"}`}>
          {request.status}
        </span>
      </div>

      {request.errorMessage && (
        <div class="mb-6 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          <strong>Error:</strong> {request.errorMessage}
        </div>
      )}

      {/* Status Timeline */}
      <div class="mb-8 flex items-center gap-2">
        {STEPS.map((step, i) => {
          const isCompleted = !isFailed && !isCancelled && i < stepIndex;
          const isCurrent = !isFailed && !isCancelled && i === stepIndex;
          return (
            <div class="flex items-center gap-2 flex-1" key={step}>
              <div class={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                isCompleted ? "bg-green-500 text-white" :
                isCurrent ? "bg-brand-500 text-white ring-4 ring-brand-100" :
                "bg-gray-200 text-gray-500"
              }`}>
                {isCompleted ? (
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span class={`text-xs ${isCurrent ? "font-semibold text-gray-900" : "text-gray-500"}`}>{step}</span>
              {i < STEPS.length - 1 && <div class={`flex-1 h-0.5 ${isCompleted ? "bg-green-500" : "bg-gray-200"}`} />}
            </div>
          );
        })}
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div class="lg:col-span-2 space-y-6">
          {/* Request Info */}
          <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Request Details</h2>
            <dl class="grid sm:grid-cols-2 gap-4 text-sm">
              <div><dt class="text-gray-500">Provider</dt><dd class="font-medium capitalize mt-0.5">{request.provider}</dd></div>
              <div><dt class="text-gray-500">External ID</dt><dd class="font-mono mt-0.5">{request.externalId ?? "—"}</dd></div>
              <div><dt class="text-gray-500">Created</dt><dd class="mt-0.5">{request.createdAt}</dd></div>
              <div><dt class="text-gray-500">Submitted</dt><dd class="mt-0.5">{request.submittedAt ?? "—"}</dd></div>
              <div><dt class="text-gray-500">Completed</dt><dd class="mt-0.5">{request.completedAt ?? "—"}</dd></div>
              <div><dt class="text-gray-500">Currency</dt><dd class="mt-0.5">{request.currency}</dd></div>
            </dl>
            {(request.costEstimatedTotal || request.costActualTotal) && (
              <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <h3 class="text-sm font-medium text-gray-700 mb-2">Costs</h3>
                <dl class="grid sm:grid-cols-2 gap-3 text-sm">
                  {request.costEstimatedTotal && <div><dt class="text-gray-500">Estimated</dt><dd>${request.costEstimatedTotal}</dd></div>}
                  {request.costActualTotal && <div><dt class="text-gray-500">Actual</dt><dd>${request.costActualTotal}</dd></div>}
                  {request.costShipping && <div><dt class="text-gray-500">Shipping</dt><dd>${request.costShipping}</dd></div>}
                  {request.costTax && <div><dt class="text-gray-500">Tax</dt><dd>${request.costTax}</dd></div>}
                </dl>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Items ({items.length})</h2>
            </div>
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider Line</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td class="px-4 py-3 text-sm font-mono text-gray-700">{item.id.slice(0, 8)}...</td>
                    <td class="px-4 py-3 text-sm text-gray-500 font-mono">{item.providerLineId ?? "—"}</td>
                    <td class="px-4 py-3 text-sm">{item.quantity}</td>
                    <td class="px-4 py-3 text-sm">{item.status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Events Log */}
          {events.length > 0 && (
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Provider Events</h2>
              </div>
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Type</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">External ID</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Processed</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                  {events.map((evt) => (
                    <tr key={evt.id}>
                      <td class="px-4 py-3 text-sm font-medium">{evt.eventType}</td>
                      <td class="px-4 py-3 text-sm text-gray-500 font-mono">{evt.externalEventId ?? "—"}</td>
                      <td class="px-4 py-3 text-sm text-gray-500">{evt.receivedAt}</td>
                      <td class="px-4 py-3 text-sm text-gray-500">{evt.processedAt ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div class="space-y-6">
          {/* Shipment */}
          <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Shipment</h2>
            {shipment ? (
              <dl class="space-y-3 text-sm">
                <div><dt class="text-gray-500">Carrier</dt><dd class="font-medium mt-0.5">{shipment.carrier ?? "—"}</dd></div>
                <div>
                  <dt class="text-gray-500">Tracking</dt>
                  <dd class="mt-0.5">
                    {shipment.trackingUrl && shipment.trackingNumber ? (
                      <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer" class="text-brand-600 hover:text-brand-700">
                        {shipment.trackingNumber}
                      </a>
                    ) : (
                      <span>{shipment.trackingNumber ?? "—"}</span>
                    )}
                  </dd>
                </div>
                {shipment.shippedAt && <div><dt class="text-gray-500">Shipped</dt><dd class="mt-0.5">{shipment.shippedAt}</dd></div>}
                {shipment.deliveredAt && <div><dt class="text-gray-500">Delivered</dt><dd class="mt-0.5">{shipment.deliveredAt}</dd></div>}
              </dl>
            ) : (
              <p class="text-sm text-gray-400">No shipment information yet.</p>
            )}
          </div>

          {/* Actions */}
          <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Actions</h2>
            <div class="space-y-3">
              {canRetry && (
                <Button type="button" variant="primary" id="retry-btn" data-request-id={request.id} class="w-full">
                  Retry Fulfillment
                </Button>
              )}
              {canCancel && (
                <Button type="button" variant="danger" id="cancel-btn" data-request-id={request.id} class="w-full">
                  Cancel Fulfillment
                </Button>
              )}
              {!canRetry && !canCancel && (
                <p class="text-sm text-gray-400">No actions available.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {html`
        <script>
          (function() {
            var retryBtn = document.getElementById('retry-btn');
            var cancelBtn = document.getElementById('cancel-btn');
            if (retryBtn) {
              retryBtn.addEventListener('click', async function() {
                if (!confirm('Retry this fulfillment request?')) return;
                var id = this.getAttribute('data-request-id');
                this.disabled = true;
                this.textContent = 'Retrying...';
                try {
                  var res = await fetch('/api/admin/fulfillment/' + id + '/retry', { method: 'POST' });
                  if (!res.ok) throw new Error('Failed to retry');
                  window.location.reload();
                } catch (err) {
                  alert(err.message);
                  this.disabled = false;
                  this.textContent = 'Retry Fulfillment';
                }
              });
            }
            if (cancelBtn) {
              cancelBtn.addEventListener('click', async function() {
                if (!confirm('Cancel this fulfillment request?')) return;
                var id = this.getAttribute('data-request-id');
                this.disabled = true;
                this.textContent = 'Cancelling...';
                try {
                  var res = await fetch('/api/admin/fulfillment/' + id + '/cancel', { method: 'POST' });
                  if (!res.ok) throw new Error('Failed to cancel');
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
