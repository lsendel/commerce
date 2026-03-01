import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { CartItem } from "../../components/cart/cart-item";
import { CartSummary } from "../../components/cart/cart-summary";
import { Button } from "../../components/ui/button";

interface CartItemData {
  id: string;
  quantity: number;
  personTypeQuantities?: Record<string, number> | null;
  variant: {
    id: string;
    title: string;
    price: string;
    compareAtPrice?: string | null;
    inventoryQuantity?: number | null;
    estimatedProductionDays?: number | null;
    product: {
      name: string;
      slug: string;
      type: "physical" | "digital" | "subscription" | "bookable";
      featuredImageUrl?: string | null;
    };
  };
  bookingAvailability?: {
    id: string;
    slotDate: string;
    slotTime: string;
    prices?: Array<{
      personType: "adult" | "child" | "pet";
      price: string;
    }>;
  } | null;
}

interface CartTotals {
  subtotal: number;
  discount: number;
  shippingEstimate: number;
  taxEstimate: number;
  total: number;
}

interface BundleSuggestion {
  productId: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  variantId: string;
  price: number;
}

interface CartPageProps {
  items: CartItemData[];
  totals?: CartTotals | null;
  warnings?: string[];
  couponCode?: string | null;
  bundleSuggestions?: BundleSuggestion[];
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

export const CartPage: FC<CartPageProps> = ({
  items,
  totals,
  warnings = [],
  couponCode,
  bundleSuggestions = [],
  goalProgress,
  deliveryPromise,
  isStockConfidenceEnabled = false,
}) => {
  const subtotal = totals?.subtotal ?? items.reduce((sum, item) => {
    const isBookable = item.variant.product.type === "bookable";
    if (isBookable && item.personTypeQuantities && item.bookingAvailability?.prices) {
      let bookingTotal = 0;
      for (const p of item.bookingAvailability.prices) {
        const qty = item.personTypeQuantities[p.personType] || 0;
        bookingTotal += qty * parseFloat(p.price);
      }
      return sum + bookingTotal;
    }
    return sum + parseFloat(item.variant.price) * item.quantity;
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const isEmpty = items.length === 0;

  // Calculate savings from compare-at prices
  const totalSavings = items.reduce((sum, item) => {
    if (item.variant.compareAtPrice) {
      const compare = parseFloat(item.variant.compareAtPrice);
      const price = parseFloat(item.variant.price);
      if (compare > price) {
        return sum + (compare - price) * item.quantity;
      }
    }
    return sum;
  }, 0);

  return (
    <>
      {/* Empty state */}
      <div
        class={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 ${isEmpty ? "" : "hidden"}`}
        data-cart-empty
      >
        <div class="text-center max-w-md mx-auto">
          <div class="w-24 h-24 mx-auto mb-6 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
            <svg class="w-12 h-12 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Your cart is empty</h1>
          <p class="text-gray-500 dark:text-gray-400 mb-8">
            Looks like you have not added anything to your cart yet.
            Browse our products and find something your pet will love!
          </p>
          <Button variant="primary" size="lg" href="/products">
            Continue Shopping
          </Button>
        </div>
      </div>

      {/* Cart content */}
      <div
        class={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isEmpty ? "hidden" : ""}`}
        data-cart-content
      >
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Shopping Cart</h1>
          <p class="mt-1 text-gray-500 dark:text-gray-400 text-sm">
            {itemCount} {itemCount === 1 ? "item" : "items"} in your cart
          </p>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div class="mb-6 space-y-2">
            {warnings.map((w, i) => (
              <div key={i} class="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3">
                <svg class="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {w}
              </div>
            ))}
          </div>
        )}

        {/* Savings banner */}
        {totalSavings > 0 && (
          <div class="mb-6 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3">
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
            You're saving ${totalSavings.toFixed(2)} on this order!
          </div>
        )}

        <div class="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Cart items */}
          <div class="lg:col-span-2 space-y-4" data-cart-items>
            {items.map((item) => (
              <CartItem key={item.id} item={item} />
            ))}

            {bundleSuggestions.length > 0 && (
              <div class="pt-4 border-t border-gray-100 dark:border-gray-700">
                <div class="rounded-2xl border border-brand-100 dark:border-brand-900/50 bg-brand-50/40 dark:bg-brand-900/20 p-4">
                  <div class="flex items-center justify-between gap-2 mb-3">
                    <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Build your bundle
                    </h2>
                    <span class="text-xs text-gray-500">Recommended add-ons</span>
                  </div>
                  <div class="grid gap-3 sm:grid-cols-2">
                    {bundleSuggestions.map((bundle) => (
                      <div
                        key={bundle.productId}
                        class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3"
                      >
                        <div class="flex gap-3">
                          {bundle.imageUrl ? (
                            <img
                              src={bundle.imageUrl}
                              alt={bundle.name}
                              class="w-16 h-16 rounded-lg object-cover bg-gray-100 dark:bg-gray-700"
                            />
                          ) : (
                            <div class="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700" />
                          )}
                          <div class="min-w-0 flex-1">
                            <a
                              href={`/products/${bundle.slug}`}
                              class="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-brand-600 line-clamp-2"
                            >
                              {bundle.name}
                            </a>
                            <p class="mt-1 text-xs text-gray-500">${bundle.price.toFixed(2)}</p>
                            <button
                              type="button"
                              data-bundle-add
                              data-variant-id={bundle.variantId}
                              data-product-name={bundle.name}
                              class="mt-2 inline-flex items-center rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium px-3 py-1.5"
                            >
                              Add to cart
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div id="bundle-error" class="hidden mt-2 text-sm text-red-600" />
                </div>
              </div>
            )}

            {/* Coupon input */}
            <div class="pt-4 border-t border-gray-100 dark:border-gray-700">
              <div id="coupon-section">
                {couponCode ? (
                  <div class="flex items-center gap-3">
                    <span class="text-sm text-gray-700 dark:text-gray-300">
                      Coupon <strong class="text-brand-600">{couponCode}</strong> applied
                    </span>
                    <button
                      type="button"
                      id="remove-coupon-btn"
                      class="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form id="coupon-form" class="flex items-center gap-2">
                    <input
                      type="text"
                      name="code"
                      placeholder="Coupon code"
                      class="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
                    />
                    <Button type="submit" variant="secondary" size="sm">Apply</Button>
                  </form>
                )}
                <div id="coupon-error" class="hidden mt-2 text-sm text-red-600" />
                <div id="coupon-success" class="hidden mt-2 text-sm text-emerald-600" />
              </div>
            </div>

            {/* Order notes */}
            <div class="pt-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Order Notes (optional)
              </label>
              <textarea
                id="order-notes"
                rows={3}
                placeholder="Special instructions for your order..."
                class="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
              />
            </div>

            <div class="pt-4">
              <a
                href="/products"
                class="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Continue Shopping
              </a>
            </div>
          </div>

          {/* Summary sidebar */}
          <div class="mt-8 lg:mt-0">
            <CartSummary
              subtotal={subtotal}
              itemCount={itemCount}
              discount={totals?.discount ?? 0}
              shippingEstimate={totals?.shippingEstimate}
              taxEstimate={totals?.taxEstimate}
              total={totals?.total}
              goalProgress={goalProgress}
              deliveryPromise={deliveryPromise}
              isStockConfidenceEnabled={isStockConfidenceEnabled}
            />
          </div>
        </div>
      </div>

      {html`
        <script>
          (function() {
            var hasAppliedCoupon = ${couponCode ? "true" : "false"};
            var searchParams = new URLSearchParams(window.location.search);
            var recoveryStage = searchParams.get('recovery_stage');
            var recoveryChannel = searchParams.get('recovery_channel');
            var recoveryCartId = searchParams.get('cart_id');
            var recoveryCoupon = searchParams.get('coupon');

            if (searchParams.get('utm_source') === 'checkout_recovery' && window.petm8Track) {
              var trackingKey = 'petm8-recovery-landing:' + (recoveryStage || '') + ':' + (recoveryChannel || '') + ':' + (recoveryCartId || '');
              if (!sessionStorage.getItem(trackingKey)) {
                sessionStorage.setItem(trackingKey, '1');
                window.petm8Track('checkout_recovery_landing', {
                  stage: recoveryStage || undefined,
                  channel: recoveryChannel || undefined,
                  cartId: recoveryCartId || undefined,
                  coupon: recoveryCoupon || undefined,
                });
              }
            }

            function applyCouponCode(code) {
              return fetch('/api/cart/apply-coupon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code }),
              })
                .then(function(r) {
                  if (!r.ok) return r.json().then(function(d) {
                    throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(d, 'Invalid coupon') : (d.error || d.message || 'Invalid coupon'));
                  });
                  return r.json();
                });
            }

            /* Apply coupon */
            var couponForm = document.getElementById('coupon-form');
            if (couponForm) {
              couponForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var code = couponForm.querySelector('[name=code]').value.trim();
                if (!code) return;
                document.getElementById('coupon-error').classList.add('hidden');

                applyCouponCode(code)
                  .then(function() {
                    location.reload();
                  })
                  .catch(function(err) {
                    var el = document.getElementById('coupon-error');
                    el.textContent = err.message;
                    el.classList.remove('hidden');
                  });
              });
            }

            if (recoveryCoupon && !hasAppliedCoupon) {
              var autoApplyKey = 'petm8-recovery-coupon-attempt:' + recoveryCoupon;
              if (!sessionStorage.getItem(autoApplyKey)) {
                sessionStorage.setItem(autoApplyKey, '1');
                applyCouponCode(recoveryCoupon)
                  .then(function() { location.reload(); })
                  .catch(function(err) {
                    var el = document.getElementById('coupon-error');
                    if (el) {
                      el.textContent = err.message || 'Could not apply recovery offer';
                      el.classList.remove('hidden');
                    }
                  });
              }
            }

            /* Remove coupon */
            var removeBtn = document.getElementById('remove-coupon-btn');
            if (removeBtn) {
              removeBtn.addEventListener('click', function() {
                fetch('/api/cart/remove-coupon', { method: 'DELETE' })
                  .then(function() { location.reload(); });
              });
            }

            /* Dynamic bundles */
            var bundleButtons = Array.prototype.slice.call(document.querySelectorAll('[data-bundle-add]'));
            bundleButtons.forEach(function(btn) {
              btn.addEventListener('click', function() {
                var variantId = btn.getAttribute('data-variant-id');
                var productName = btn.getAttribute('data-product-name') || 'bundle_item';
                if (!variantId) return;

                fetch('/api/cart/items', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ variantId: variantId, quantity: 1 }),
                })
                  .then(function(r) {
                    if (!r.ok) return r.json().then(function(d) {
                      throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(d, 'Unable to add item') : (d.error || d.message || 'Unable to add item'));
                    });
                    return r.json();
                  })
                  .then(function() {
                    if (window.petm8Track) {
                      window.petm8Track('bundle_add_to_cart', { productName: productName, variantId: variantId });
                    }
                    location.reload();
                  })
                  .catch(function(err) {
                    var errEl = document.getElementById('bundle-error');
                    if (errEl) {
                      errEl.textContent = err.message;
                      errEl.classList.remove('hidden');
                    }
                  });
              });
            });
          })();
        </script>
      `}
    </>
  );
};
