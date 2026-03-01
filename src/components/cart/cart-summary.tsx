import type { FC } from "hono/jsx";
import { Button } from "../ui/button";

interface CartSummaryProps {
  subtotal: number;
  itemCount: number;
  discount?: number;
  shippingEstimate?: number;
  taxEstimate?: number;
  total?: number;
  goalProgress?: {
    target: number;
    remaining: number;
    percent: number;
    reached: boolean;
  };
  deliveryPromise?: {
    minDays: number;
    maxDays: number;
    label: string;
    confidence?: "high" | "medium" | "low";
    source?: "production+shipping" | "production-only";
  };
  isStockConfidenceEnabled?: boolean;
}

export const CartSummary: FC<CartSummaryProps> = ({
  subtotal,
  itemCount,
  discount = 0,
  shippingEstimate,
  taxEstimate,
  total,
  goalProgress,
  deliveryPromise,
  isStockConfidenceEnabled,
}) => {
  const computedTotal = total ?? subtotal - discount;

  return (
    <div class="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-6 sticky top-6">
      <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Order Summary</h2>

      <div class="space-y-3 text-sm">
        {goalProgress && (
          <div class="rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-medium text-brand-700">
                {goalProgress.reached
                  ? "You unlocked free shipping"
                  : `Add $${goalProgress.remaining.toFixed(2)} for free shipping`}
              </span>
              <span class="text-xs text-brand-600">
                ${Math.min(goalProgress.target, subtotal - discount).toFixed(2)} / ${goalProgress.target.toFixed(2)}
              </span>
            </div>
            <div class="mt-2 h-2 rounded-full bg-brand-100">
              <div
                class="h-2 rounded-full bg-brand-500 transition-all"
                style={`width:${goalProgress.percent}%`}
              />
            </div>
          </div>
        )}

        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">
            Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
          <span class="font-medium text-gray-900 dark:text-gray-100" data-cart-subtotal>${subtotal.toFixed(2)}</span>
        </div>

        {discount > 0 && (
          <div class="flex justify-between text-emerald-600">
            <span>Discount</span>
            <span class="font-medium">-${discount.toFixed(2)}</span>
          </div>
        )}

        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Shipping</span>
          {shippingEstimate !== undefined ? (
            <span class="font-medium text-gray-900 dark:text-gray-100">
              {shippingEstimate === 0 ? (
                <span class="text-emerald-600">Free</span>
              ) : (
                `$${shippingEstimate.toFixed(2)}`
              )}
            </span>
          ) : (
            <span class="text-gray-500 italic text-xs">Calculated at checkout</span>
          )}
        </div>

        {deliveryPromise && (
          <div class="rounded-lg bg-sky-50/70 border border-sky-100 px-3 py-2">
            <p class="text-xs font-medium text-sky-800">{deliveryPromise.label}</p>
            <p class="text-xs text-sky-700 mt-0.5">
              Arrives in {deliveryPromise.minDays}-{deliveryPromise.maxDays} business days.
            </p>
            {deliveryPromise.source === "production-only" && (
              <p class="text-[11px] text-sky-600 mt-1">
                Based on production lead times while shipping lanes are being calibrated.
              </p>
            )}
            {deliveryPromise.confidence && (
              <p class="text-[11px] text-sky-600 mt-1">
                Confidence: {deliveryPromise.confidence}
              </p>
            )}
          </div>
        )}

        {taxEstimate !== undefined && taxEstimate > 0 && (
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Tax (est.)</span>
            <span class="font-medium text-gray-900 dark:text-gray-100">${taxEstimate.toFixed(2)}</span>
          </div>
        )}

        <div class="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between">
          <span class="font-bold text-gray-900 dark:text-gray-100">Total</span>
          <span class="font-bold text-lg text-gray-900 dark:text-gray-100" data-cart-total>${computedTotal.toFixed(2)}</span>
        </div>
      </div>

      <div class="mt-6 space-y-3">
        {isStockConfidenceEnabled && (
          <div
            id="checkout-stock-panel"
            data-checkout-stock-panel
            class="hidden rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
          >
            <div class="flex items-center justify-between gap-2">
              <span
                id="checkout-stock-headline"
                data-checkout-stock-headline
                class="text-xs font-medium text-gray-700"
              >
                Running stock check...
              </span>
              <span
                id="checkout-stock-badge"
                data-checkout-stock-badge
                class="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700"
              >
                Checking
              </span>
            </div>
            <ul id="checkout-stock-list" data-checkout-stock-list class="mt-2 space-y-1 text-xs text-gray-600" />
          </div>
        )}

        <Button
          variant="primary"
          size="lg"
          class="w-full"
          data-checkout-btn
        >
          <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Secure Checkout
        </Button>

        <a
          href="/products"
          class="block text-center text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
        >
          Continue Shopping
        </a>
      </div>

      {/* Trust signals */}
      <div class="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div class="flex items-center gap-2 text-xs text-gray-400">
          <svg class="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>SSL encrypted &amp; secure payment</span>
        </div>
      </div>
    </div>
  );
};
