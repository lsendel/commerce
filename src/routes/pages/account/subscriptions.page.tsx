import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";

interface Subscription {
  id: string;
  planName: string;
  status: "active" | "past_due" | "cancelled" | "trialing" | "paused";
  currentPeriodEnd: string;
  nextBillingDate: string;
  amount: string;
  interval: "month" | "year";
  cancelAtPeriodEnd: boolean;
  mixConfiguration?: {
    items?: Array<{
      planId: string;
      planName?: string;
      quantity: number;
    }>;
  } | null;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: string;
  interval: "month" | "year";
  features: string[];
  stripePriceId: string | null;
}

interface SubscriptionsPageProps {
  subscription?: Subscription | null;
  availablePlans?: SubscriptionPlan[];
  isSubscriptionBuilderEnabled?: boolean;
}

const statusVariant: Record<string, "success" | "warning" | "error" | "info"> = {
  active: "success",
  trialing: "info",
  past_due: "warning",
  paused: "warning",
  cancelled: "error",
};

const statusLabel: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Past Due",
  paused: "Paused",
  cancelled: "Cancelled",
};

export const SubscriptionsPage: FC<SubscriptionsPageProps> = ({
  subscription,
  availablePlans,
  isSubscriptionBuilderEnabled = false,
}) => {
  return (
    <div class="max-w-3xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Subscription</h1>
          <p class="mt-1 text-sm text-gray-500">Manage your subscription and billing.</p>
        </div>
        <a
          href="/account"
          class="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          Back to Account
        </a>
      </div>

      {subscription ? (
        <div class="space-y-6">
          {/* Active subscription card */}
          <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div class="p-6">
              <div class="flex items-start justify-between mb-4">
                <div>
                  <h2 id="subscription-plan-name" class="text-lg font-bold text-gray-900 dark:text-gray-100">{subscription.planName}</h2>
                  <div id="subscription-status-row" class="flex items-center gap-2 mt-1">
                    <span id="subscription-status-badge">
                      <Badge variant={statusVariant[subscription.status] || "neutral"}>
                        {statusLabel[subscription.status] || subscription.status}
                      </Badge>
                    </span>
                    {subscription.cancelAtPeriodEnd && (
                      <span id="subscription-cancel-badge">
                        <Badge variant="warning">Cancels at period end</Badge>
                      </span>
                    )}
                  </div>
                </div>
                <div class="text-right">
                  <p id="subscription-amount" class="text-2xl font-bold text-gray-900 dark:text-gray-100">${subscription.amount}</p>
                  <p id="subscription-interval" class="text-xs text-gray-400">
                    per {subscription.interval}
                  </p>
                </div>
              </div>

              {/* Billing details */}
              <div class="grid grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900 mb-5">
                <div>
                  <p class="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Current Period Ends
                  </p>
                  <p id="subscription-current-period-end" class="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                    {subscription.currentPeriodEnd}
                  </p>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Next Billing Date
                  </p>
                  <p id="subscription-next-billing" class="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                    {subscription.cancelAtPeriodEnd
                      ? "No further billing"
                      : subscription.nextBillingDate}
                  </p>
                </div>
              </div>

              {Array.isArray(subscription.mixConfiguration?.items) && subscription.mixConfiguration.items.length > 0 && (
                <div id="subscription-bundle-wrap" class="mb-5 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                  <p class="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Bundle Composition
                  </p>
                  <ul id="subscription-bundle-list" class="space-y-1">
                    {subscription.mixConfiguration.items.map((item) => (
                      <li class="text-sm text-gray-600 dark:text-gray-300">
                        {item.planName || "Plan"} x{item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div id="subscription-actions" class="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="primary"
                  id="manage-subscription-btn"
                >
                  Manage Subscription
                </Button>

                {subscription.cancelAtPeriodEnd && subscription.status !== "cancelled" && (
                  <Button
                    type="button"
                    variant="secondary"
                    id="resume-subscription-btn"
                    data-subscription-id={subscription.id}
                  >
                    Resume Subscription
                  </Button>
                )}

                {subscription.status !== "cancelled" && !subscription.cancelAtPeriodEnd && (
                  <Button
                    type="button"
                    variant="ghost"
                    id="cancel-subscription-btn"
                    data-subscription-id={subscription.id}
                    class="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Plan comparison */}
          {availablePlans && availablePlans.length > 1 && (
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div class="p-6 border-b border-gray-100 dark:border-gray-700">
                <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">Available Plans</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Compare plans and switch anytime.</p>
              </div>
              <div class="grid md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-700">
                {availablePlans.map((plan) => {
                  const isCurrent = subscription?.planName === plan.name;
                  return (
                    <div
                      class={`p-6 ${isCurrent ? "bg-brand-50/50 dark:bg-brand-900/10" : ""}`}
                      data-plan-card={plan.id}
                      data-plan-name={plan.name}
                    >
                      <h3 class="font-semibold text-gray-900 dark:text-gray-100">{plan.name}</h3>
                      <p class="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                        ${plan.price}<span class="text-sm font-normal text-gray-400">/{plan.interval}</span>
                      </p>
                      <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">{plan.description}</p>
                      <ul class="mt-4 space-y-2">
                        {plan.features.map((f) => (
                          <li class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                            {f}
                          </li>
                        ))}
                      </ul>
                      <div class="mt-4">
                        {isCurrent ? (
                          <Badge variant="info" data-current-plan-badge={plan.id}>Current Plan</Badge>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            class="w-full change-plan-btn"
                            data-plan-id={plan.id}
                            data-plan-name={plan.name}
                          >
                            Switch to {plan.name}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Info note */}
          <div class="rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 p-4">
            <div class="flex gap-3">
              <svg class="w-5 h-5 text-brand-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div class="text-sm text-brand-800 dark:text-brand-200">
                <p class="font-medium">Need help with billing?</p>
                <p class="text-brand-600 dark:text-brand-400 mt-0.5">
                  Contact us at{" "}
                  <a href="mailto:support@petm8.io" class="underline">support@petm8.io</a>{" "}
                  and we'll sort it out.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* No subscription state */
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-12 text-center">
          <div class="w-16 h-16 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">No Active Subscription</h2>
          <p class="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
            Subscribe to a plan to get exclusive perks, discounts, and premium access for you and your pets.
          </p>
          <Button href="/products?type=subscription" variant="primary" size="lg">
            Browse Plans
          </Button>
        </div>
      )}

      {isSubscriptionBuilderEnabled && availablePlans && availablePlans.length > 0 && (
        <div
          id="subscription-builder"
          class="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
        >
          <div class="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">Build Your Subscription Mix</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Mix multiple plans in one recurring bundle. All selected plans must share the same billing cadence.
            </p>
          </div>
          <div class="p-6 space-y-4">
            {availablePlans.map((plan) => (
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                <div>
                  <p class="font-semibold text-gray-900 dark:text-gray-100">{plan.name}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    ${plan.price}/{plan.interval}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <label for={`bundle-qty-${plan.id}`} class="text-xs text-gray-400 uppercase tracking-wide">
                    Quantity
                  </label>
                  <input
                    id={`bundle-qty-${plan.id}`}
                    type="number"
                    min="0"
                    max="12"
                    value="0"
                    class="bundle-qty-input w-20 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    data-plan-id={plan.id}
                    data-plan-name={plan.name}
                  />
                </div>
              </div>
            ))}

            <div class="flex flex-wrap items-center gap-3">
              <Button type="button" variant="secondary" id="bundle-quote-btn">
                Calculate Bundle
              </Button>
              <Button type="button" variant="primary" id="bundle-checkout-btn" disabled>
                Checkout Bundle
              </Button>
            </div>

            <div
              id="bundle-quote-panel"
              class="hidden rounded-xl border border-brand-100 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-900/10 p-4"
            >
              <p class="text-sm font-semibold text-brand-800 dark:text-brand-200 mb-2">Bundle Quote</p>
              <div id="bundle-quote-lines" class="space-y-1 text-sm text-brand-700 dark:text-brand-300"></div>
              <div class="mt-3 pt-3 border-t border-brand-100 dark:border-brand-800 text-sm space-y-1">
                <p id="bundle-quote-subtotal"></p>
                <p id="bundle-quote-discount"></p>
                <p id="bundle-quote-total" class="font-semibold"></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation dialog */}
      <div
        id="cancel-confirm"
        class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      >
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm mx-4 w-full">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Cancel Subscription</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Your subscription will remain active until the end of your current billing period. Are you sure?
          </p>
          <div class="flex items-center gap-3 justify-end">
            <Button type="button" variant="ghost" id="cancel-no-btn">
              Keep Subscription
            </Button>
            <Button type="button" variant="danger" id="cancel-yes-btn">
              Yes, Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Client-side handlers */}
      {html`<script>
            (function() {
              function getErrorMessage(err, fallback) {
                if (err && err.message) return err.message;
                return fallback;
              }

              function showError(err, fallback) {
                var message = (typeof err === 'string') ? err : getErrorMessage(err, fallback);
                if (window.showToast) window.showToast(message, 'error');
                else console.error(message);
              }

              function createMutationIdempotencyKey(action, payload) {
                var entropy = (window.crypto && window.crypto.randomUUID)
                  ? window.crypto.randomUUID()
                  : (Math.random().toString(36).slice(2) + '-' + Date.now());
                var payloadLength = 0;
                try {
                  payloadLength = JSON.stringify(payload || {}).length;
                } catch (_) {
                  payloadLength = 0;
                }
                return (action + '-' + payloadLength + '-' + entropy).slice(0, 255);
              }

              function mutationHeaders(action, payload, includeJsonContentType) {
                var headers = {
                  'Idempotency-Key': createMutationIdempotencyKey(action, payload),
                };
                if (includeJsonContentType) {
                  headers['Content-Type'] = 'application/json';
                }
                return headers;
              }

              function sleep(ms) {
                return new Promise(function(resolve) { setTimeout(resolve, ms); });
              }

              async function fetchMutation(url, options, retries) {
                var maxRetries = Number.isFinite(retries) ? retries : 1;
                var attempt = 0;
                while (true) {
                  try {
                    var res = await fetch(url, options);
                    if (res.status >= 500 && attempt < maxRetries) {
                      attempt += 1;
                      await sleep(250 * attempt);
                      continue;
                    }
                    return res;
                  } catch (err) {
                    if (attempt >= maxRetries) throw err;
                    attempt += 1;
                    await sleep(250 * attempt);
                  }
                }
              }

              function requireSecondClick(btn, confirmText, idleText, timeoutMs) {
                if (btn.dataset.confirming === 'true') return true;
                btn.dataset.confirming = 'true';
                btn.dataset.idleText = btn.textContent || idleText;
                btn.textContent = confirmText;
                if (window.showToast) window.showToast('Click again to confirm', 'warning');
                if (btn._confirmTimer) clearTimeout(btn._confirmTimer);
                btn._confirmTimer = setTimeout(function() {
                  btn.dataset.confirming = 'false';
                  btn.textContent = btn.dataset.idleText || idleText;
                }, timeoutMs);
                return false;
              }

              var manageBtn = document.getElementById('manage-subscription-btn');
              var cancelBtn = document.getElementById('cancel-subscription-btn');
              var resumeBtn = document.getElementById('resume-subscription-btn');
              var cancelConfirm = document.getElementById('cancel-confirm');

              function statusLabelText(status) {
                if (status === 'active') return 'Active';
                if (status === 'trialing') return 'Trial';
                if (status === 'past_due') return 'Past Due';
                if (status === 'paused') return 'Paused';
                if (status === 'cancelled') return 'Cancelled';
                return status || 'Unknown';
              }

              function statusBadgeClass(status) {
                var base = 'inline-flex items-center rounded-full font-medium px-2.5 py-0.5 text-xs';
                if (status === 'active') return base + ' bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
                if (status === 'trialing') return base + ' bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
                if (status === 'past_due' || status === 'paused') return base + ' bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
                if (status === 'cancelled') return base + ' bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';
                return base + ' bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
              }

              function formatDateLabel(value) {
                if (!value) return 'N/A';
                var parsed = new Date(value);
                if (Number.isNaN(parsed.getTime())) return String(value);
                return parsed.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
              }

              function getActiveSubscriptionId() {
                var cancelAction = document.getElementById('cancel-subscription-btn');
                var resumeAction = document.getElementById('resume-subscription-btn');
                return (cancelAction && cancelAction.getAttribute('data-subscription-id'))
                  || (resumeAction && resumeAction.getAttribute('data-subscription-id'))
                  || null;
              }

              function renderActionButton(label, id, variantClass, extraClass) {
                return '<button type="button" id="' + id + '" data-subscription-id="' + (getActiveSubscriptionId() || '') + '" class="inline-flex items-center justify-center font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none gap-2 px-5 py-2.5 text-sm rounded-xl ' + variantClass + (extraClass ? ' ' + extraClass : '') + '">' + label + '</button>';
              }

              function updatePlanCards(currentPlanName) {
                if (!currentPlanName) return;
                document.querySelectorAll('[data-plan-card]').forEach(function(card) {
                  var planName = card.getAttribute('data-plan-name') || '';
                  var planId = card.getAttribute('data-plan-card') || '';
                  var actionWrap = card.querySelector('.mt-4');
                  if (!actionWrap) return;
                  var isCurrent = planName === currentPlanName;
                  card.classList.toggle('bg-brand-50/50', isCurrent);
                  card.classList.toggle('dark:bg-brand-900/10', isCurrent);
                  if (isCurrent) {
                    actionWrap.innerHTML = '<span class="inline-flex items-center rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 px-2.5 py-0.5 text-xs" data-current-plan-badge="' + planId + '">Current Plan</span>';
                  } else {
                    actionWrap.innerHTML = '' +
                      '<button type="button" class="change-plan-btn inline-flex items-center justify-center font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none gap-2 border-2 border-brand-500 text-brand-600 dark:text-brand-400 bg-transparent hover:bg-brand-50 dark:hover:bg-brand-900/20 focus-visible:ring-brand-500/30 px-3 py-1.5 text-sm rounded-lg w-full" data-plan-id="' + planId + '" data-plan-name="' + planName + '">Switch to ' + planName + '</button>';
                  }
                });
              }

              function applySubscriptionView(nextSubscription, planNameOverride) {
                if (!nextSubscription || typeof nextSubscription !== 'object') return;
                var status = nextSubscription.status || 'active';
                var cancelAtPeriodEnd = !!nextSubscription.cancelAtPeriodEnd;
                var subscriptionId = nextSubscription.id || getActiveSubscriptionId() || '';

                var planNameEl = document.getElementById('subscription-plan-name');
                if (planNameEl && planNameOverride) planNameEl.textContent = planNameOverride;

                var statusBadgeWrap = document.getElementById('subscription-status-badge');
                var statusBadge = statusBadgeWrap && statusBadgeWrap.firstElementChild
                  ? statusBadgeWrap.firstElementChild
                  : statusBadgeWrap;
                if (statusBadge) {
                  statusBadge.className = statusBadgeClass(status);
                  statusBadge.textContent = statusLabelText(status);
                }

                var statusRow = document.getElementById('subscription-status-row');
                var cancelBadge = document.getElementById('subscription-cancel-badge');
                if (cancelAtPeriodEnd && status !== 'cancelled') {
                  if (!cancelBadge && statusRow) {
                    statusRow.insertAdjacentHTML('beforeend', '<span id="subscription-cancel-badge"><span class="inline-flex items-center rounded-full font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 px-2.5 py-0.5 text-xs">Cancels at period end</span></span>');
                  }
                } else if (cancelBadge) {
                  cancelBadge.remove();
                }

                var periodEnd = document.getElementById('subscription-current-period-end');
                if (periodEnd && nextSubscription.currentPeriodEnd) {
                  periodEnd.textContent = formatDateLabel(nextSubscription.currentPeriodEnd);
                }

                var nextBilling = document.getElementById('subscription-next-billing');
                if (nextBilling) {
                  nextBilling.textContent = (cancelAtPeriodEnd && status !== 'cancelled')
                    ? 'No further billing'
                    : formatDateLabel(nextSubscription.currentPeriodEnd);
                }

                var cancelAction = document.getElementById('cancel-subscription-btn');
                var resumeAction = document.getElementById('resume-subscription-btn');
                if (cancelAction) {
                  cancelAction.setAttribute('data-subscription-id', subscriptionId);
                  cancelAction.classList.toggle('hidden', status === 'cancelled' || cancelAtPeriodEnd);
                }
                if (resumeAction) {
                  resumeAction.setAttribute('data-subscription-id', subscriptionId);
                  resumeAction.classList.toggle('hidden', !(cancelAtPeriodEnd && status !== 'cancelled'));
                }
              }

              if (manageBtn) {
                manageBtn.addEventListener('click', async function() {
                  manageBtn.disabled = true;
                  manageBtn.textContent = 'Redirecting...';
                  try {
                    var portalBody = {};
                    var res = await fetchMutation('/api/subscriptions/portal', {
                      method: 'POST',
                      headers: mutationHeaders('subscriptions.portal', portalBody, true),
                      body: JSON.stringify(portalBody),
                    }, 1);
                    if (!res.ok) {
                      var data = await res.json().catch(function() { return {}; });
                      throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to open billing portal') : (data.error || data.message || 'Failed to open billing portal'));
                    }
                    var data = await res.json();
                    window.location.href = data.url;
                  } catch (err) {
                    showError(err, 'Failed to open billing portal');
                    manageBtn.disabled = false;
                    manageBtn.textContent = 'Manage Subscription';
                  }
                });
              }

              if (cancelBtn) {
                cancelBtn.addEventListener('click', function() {
                  cancelConfirm.classList.remove('hidden');
                });
              }

              document.getElementById('cancel-no-btn').addEventListener('click', function() {
                cancelConfirm.classList.add('hidden');
              });

              document.getElementById('cancel-yes-btn').addEventListener('click', async function() {
                var btn = this;
                var subscriptionId = getActiveSubscriptionId();
                if (!subscriptionId) {
                  showError('Subscription not found');
                  cancelConfirm.classList.add('hidden');
                  return;
                }
                btn.disabled = true;
                btn.textContent = 'Cancelling...';
                try {
                  var res = await fetchMutation('/api/subscriptions/' + subscriptionId, {
                    method: 'DELETE',
                    headers: mutationHeaders('subscriptions.cancel', { subscriptionId: subscriptionId }, false),
                  }, 1);
                  if (!res.ok) {
                    var data = await res.json().catch(function() { return {}; });
                    throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to cancel subscription') : (data.error || data.message || 'Failed to cancel subscription'));
                  }
                  var payload = await res.json().catch(function() { return {}; });
                  if (payload.subscription) applySubscriptionView(payload.subscription);
                  if (window.showToast) window.showToast('Subscription updated.', 'success');
                  cancelConfirm.classList.add('hidden');
                  btn.disabled = false;
                  btn.textContent = 'Yes, Cancel';
                } catch (err) {
                  showError(err, 'Failed to cancel subscription');
                  btn.disabled = false;
                  btn.textContent = 'Yes, Cancel';
                  cancelConfirm.classList.add('hidden');
                }
              });

              // Resume subscription handler
              if (resumeBtn) {
                resumeBtn.addEventListener('click', async function() {
                  var subscriptionId = this.getAttribute('data-subscription-id');
                  this.disabled = true;
                  this.textContent = 'Resuming...';
                  try {
                    var resumeBody = {};
                    var res = await fetchMutation('/api/subscriptions/' + subscriptionId + '/resume', {
                      method: 'POST',
                      headers: mutationHeaders('subscriptions.resume', { subscriptionId: subscriptionId }, true),
                      body: JSON.stringify(resumeBody),
                    }, 1);
                    var data = await res.json().catch(function() { return {}; });
                    if (!res.ok) {
                      throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to resume subscription') : (data.error || data.message || 'Failed to resume subscription'));
                    }
                    if (data.subscription) applySubscriptionView(data.subscription);
                    if (window.showToast) window.showToast('Subscription resumed.', 'success');
                  } catch (err) {
                    showError(err, 'Failed to resume subscription');
                  } finally {
                    this.disabled = false;
                    this.textContent = 'Resume Subscription';
                  }
                });
              }

              // Change plan handlers
              document.addEventListener('click', async function(event) {
                var btn = event.target && event.target.closest ? event.target.closest('.change-plan-btn') : null;
                if (!btn) return;
                var planId = btn.getAttribute('data-plan-id');
                var planName = btn.getAttribute('data-plan-name');
                if (!requireSecondClick(btn, 'Confirm Switch', 'Switch to ' + planName, 5000)) return;
                btn.dataset.confirming = 'false';
                if (btn._confirmTimer) clearTimeout(btn._confirmTimer);
                var subscriptionId = getActiveSubscriptionId();
                if (!subscriptionId) { showError('No active subscription found'); return; }
                btn.disabled = true;
                btn.textContent = 'Switching...';
                try {
                  var payload = { newPlanId: planId };
                  var res = await fetchMutation('/api/subscriptions/' + subscriptionId + '/change-plan', {
                    method: 'PATCH',
                    headers: mutationHeaders('subscriptions.change-plan', { subscriptionId: subscriptionId, newPlanId: planId }, true),
                    body: JSON.stringify(payload),
                  }, 1);
                  var data = await res.json().catch(function() { return {}; });
                  if (!res.ok) {
                    throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to change plan') : (data.error || data.message || 'Failed to change plan'));
                  }
                  if (data.subscription) applySubscriptionView(data.subscription, planName);
                  updatePlanCards(planName);
                  if (window.showToast) window.showToast('Plan switched.', 'success');
                } catch (err) {
                  showError(err, 'Failed to change plan');
                  btn.disabled = false;
                  btn.textContent = 'Switch to ' + planName;
                }
              });

              function formatCurrencyFromCents(cents) {
                var dollars = Number(cents || 0) / 100;
                return '$' + dollars.toFixed(2);
              }

              function collectBundleSelections() {
                var selections = [];
                document.querySelectorAll('.bundle-qty-input').forEach(function(input) {
                  var planId = input.getAttribute('data-plan-id');
                  var quantity = Number(input.value || 0);
                  if (!planId || !Number.isFinite(quantity) || quantity <= 0) return;
                  selections.push({ planId: planId, quantity: Math.floor(quantity) });
                });
                return selections;
              }

              function renderBundleQuote(quote) {
                var linesRoot = document.getElementById('bundle-quote-lines');
                var subtotalRoot = document.getElementById('bundle-quote-subtotal');
                var discountRoot = document.getElementById('bundle-quote-discount');
                var totalRoot = document.getElementById('bundle-quote-total');
                var panelRoot = document.getElementById('bundle-quote-panel');
                if (!linesRoot || !subtotalRoot || !discountRoot || !totalRoot || !panelRoot) return;

                linesRoot.innerHTML = '';
                (quote.lines || []).forEach(function(line) {
                  var row = document.createElement('p');
                  row.textContent = line.planName + ' x' + line.quantity + ': ' + formatCurrencyFromCents(line.lineAmountCents);
                  linesRoot.appendChild(row);
                });
                subtotalRoot.textContent = 'Subtotal: ' + formatCurrencyFromCents(quote.subtotalCents);
                discountRoot.textContent = 'Bundle discount: -' + formatCurrencyFromCents(quote.discountCents);
                totalRoot.textContent = 'Total: ' + formatCurrencyFromCents(quote.totalCents);
                panelRoot.classList.remove('hidden');
              }

              var bundleQuoteBtn = document.getElementById('bundle-quote-btn');
              var bundleCheckoutBtn = document.getElementById('bundle-checkout-btn');

              if (bundleQuoteBtn) {
                bundleQuoteBtn.addEventListener('click', async function() {
                  var selections = collectBundleSelections();
                  if (!selections.length) {
                    showError('Select at least one plan and quantity to quote your bundle.');
                    return;
                  }

                  bundleQuoteBtn.disabled = true;
                  bundleQuoteBtn.textContent = 'Calculating...';
                  try {
                    var quoteRes = await fetch('/api/subscriptions/builder/quote', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ selections: selections }),
                    });
                    if (!quoteRes.ok) {
                      var quoteErr = await quoteRes.json().catch(function() { return {}; });
                      throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(quoteErr, 'Failed to quote subscription bundle') : (quoteErr.error || quoteErr.message || 'Failed to quote subscription bundle'));
                    }

                    var quote = await quoteRes.json();
                    renderBundleQuote(quote);
                    if (bundleCheckoutBtn) {
                      bundleCheckoutBtn.disabled = false;
                    }
                  } catch (err) {
                    showError(err, 'Failed to quote subscription bundle');
                  } finally {
                    bundleQuoteBtn.disabled = false;
                    bundleQuoteBtn.textContent = 'Calculate Bundle';
                  }
                });
              }

              if (bundleCheckoutBtn) {
                bundleCheckoutBtn.addEventListener('click', async function() {
                  var selections = collectBundleSelections();
                  if (!selections.length) {
                    showError('Select at least one plan and quantity before checkout.');
                    return;
                  }

                  if (!requireSecondClick(bundleCheckoutBtn, 'Confirm Bundle Checkout', 'Checkout Bundle', 5000)) return;
                  bundleCheckoutBtn.dataset.confirming = 'false';
                  if (bundleCheckoutBtn._confirmTimer) clearTimeout(bundleCheckoutBtn._confirmTimer);

                  bundleCheckoutBtn.disabled = true;
                  bundleCheckoutBtn.textContent = 'Redirecting...';
                  try {
                    var checkoutPayload = { selections: selections };
                    var checkoutRes = await fetchMutation('/api/subscriptions/builder/checkout', {
                      method: 'POST',
                      headers: mutationHeaders('subscriptions.builder.checkout', checkoutPayload, true),
                      body: JSON.stringify(checkoutPayload),
                    }, 1);
                    if (!checkoutRes.ok) {
                      var checkoutErr = await checkoutRes.json().catch(function() { return {}; });
                      throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(checkoutErr, 'Failed to create bundle checkout') : (checkoutErr.error || checkoutErr.message || 'Failed to create bundle checkout'));
                    }
                    var checkout = await checkoutRes.json();
                    if (!checkout.checkoutUrl) {
                      throw new Error('Checkout URL was not returned');
                    }
                    window.location.href = checkout.checkoutUrl;
                  } catch (err) {
                    showError(err, 'Failed to create bundle checkout');
                    bundleCheckoutBtn.disabled = false;
                    bundleCheckoutBtn.textContent = 'Checkout Bundle';
                  }
                });
              }
            })();
      </script>`}
    </div>
  );
};
