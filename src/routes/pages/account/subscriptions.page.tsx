import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";

interface Subscription {
  id: string;
  planName: string;
  status: "active" | "past_due" | "cancelled" | "trialing";
  currentPeriodEnd: string;
  nextBillingDate: string;
  amount: string;
  interval: "month" | "year";
  cancelAtPeriodEnd: boolean;
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
}

const statusVariant: Record<string, "success" | "warning" | "error" | "info"> = {
  active: "success",
  trialing: "info",
  past_due: "warning",
  cancelled: "error",
};

const statusLabel: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Past Due",
  cancelled: "Cancelled",
};

export const SubscriptionsPage: FC<SubscriptionsPageProps> = ({ subscription, availablePlans }) => {
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
                  <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">{subscription.planName}</h2>
                  <div class="flex items-center gap-2 mt-1">
                    <Badge variant={statusVariant[subscription.status] || "neutral"}>
                      {statusLabel[subscription.status] || subscription.status}
                    </Badge>
                    {subscription.cancelAtPeriodEnd && (
                      <Badge variant="warning">Cancels at period end</Badge>
                    )}
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">${subscription.amount}</p>
                  <p class="text-xs text-gray-400">
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
                  <p class="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                    {subscription.currentPeriodEnd}
                  </p>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Next Billing Date
                  </p>
                  <p class="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                    {subscription.cancelAtPeriodEnd
                      ? "No further billing"
                      : subscription.nextBillingDate}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div class="flex flex-wrap items-center gap-3">
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
                    <div class={`p-6 ${isCurrent ? "bg-brand-50/50 dark:bg-brand-900/10" : ""}`}>
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
                          <Badge variant="info">Current Plan</Badge>
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
              var manageBtn = document.getElementById('manage-subscription-btn');
              var cancelBtn = document.getElementById('cancel-subscription-btn');
              var cancelConfirm = document.getElementById('cancel-confirm');

              if (manageBtn) {
                manageBtn.addEventListener('click', async function() {
                  manageBtn.disabled = true;
                  manageBtn.textContent = 'Redirecting...';
                  try {
                    var res = await fetch('/api/subscriptions/portal', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                    });
                    if (!res.ok) throw new Error('Failed to open billing portal');
                    var data = await res.json();
                    window.location.href = data.url;
                  } catch (err) {
                    alert(err.message);
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
                var subscriptionId = cancelBtn ? cancelBtn.getAttribute('data-subscription-id') : null;
                if (!subscriptionId) {
                  alert('Subscription not found');
                  cancelConfirm.classList.add('hidden');
                  return;
                }
                btn.disabled = true;
                btn.textContent = 'Cancelling...';
                try {
                  var res = await fetch('/api/subscriptions/' + subscriptionId, {
                    method: 'DELETE',
                  });
                  if (!res.ok) throw new Error('Failed to cancel subscription');
                  window.location.reload();
                } catch (err) {
                  alert(err.message);
                  btn.disabled = false;
                  btn.textContent = 'Yes, Cancel';
                  cancelConfirm.classList.add('hidden');
                }
              });

              // Resume subscription handler
              var resumeBtn = document.getElementById('resume-subscription-btn');
              if (resumeBtn) {
                resumeBtn.addEventListener('click', async function() {
                  var subscriptionId = this.getAttribute('data-subscription-id');
                  this.disabled = true;
                  this.textContent = 'Resuming...';
                  try {
                    var res = await fetch('/api/subscriptions/' + subscriptionId + '/resume', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                    });
                    if (!res.ok) {
                      var data = await res.json().catch(function() { return {}; });
                      throw new Error(data.error || 'Failed to resume subscription');
                    }
                    window.location.reload();
                  } catch (err) {
                    alert(err.message);
                    this.disabled = false;
                    this.textContent = 'Resume Subscription';
                  }
                });
              }

              // Change plan handlers
              document.querySelectorAll('.change-plan-btn').forEach(function(btn) {
                btn.addEventListener('click', async function() {
                  var planId = this.getAttribute('data-plan-id');
                  var planName = this.getAttribute('data-plan-name');
                  if (!confirm('Switch to ' + planName + '? Your billing will be prorated.')) return;
                  var subscriptionId = (cancelBtn || resumeBtn)
                    ? (cancelBtn || resumeBtn).getAttribute('data-subscription-id')
                    : null;
                  if (!subscriptionId) { alert('No active subscription found'); return; }
                  this.disabled = true;
                  this.textContent = 'Switching...';
                  try {
                    var res = await fetch('/api/subscriptions/' + subscriptionId + '/change-plan', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ newPlanId: planId }),
                    });
                    if (!res.ok) {
                      var data = await res.json().catch(function() { return {}; });
                      throw new Error(data.error || 'Failed to change plan');
                    }
                    window.location.reload();
                  } catch (err) {
                    alert(err.message);
                    this.disabled = false;
                    this.textContent = 'Switch to ' + planName;
                  }
                });
              });
            })();
      </script>`}
    </div>
  );
};
