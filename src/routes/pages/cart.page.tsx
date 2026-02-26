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

interface CartPageProps {
  items: CartItemData[];
  totals?: CartTotals | null;
  warnings?: string[];
  couponCode?: string | null;
}

export const CartPage: FC<CartPageProps> = ({
  items,
  totals,
  warnings = [],
  couponCode,
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
            />
          </div>
        </div>
      </div>

      {html`
        <script>
          (function() {
            /* Apply coupon */
            var couponForm = document.getElementById('coupon-form');
            if (couponForm) {
              couponForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var code = couponForm.querySelector('[name=code]').value.trim();
                if (!code) return;
                document.getElementById('coupon-error').classList.add('hidden');

                fetch('/api/cart/apply-coupon', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ code: code }),
                })
                  .then(function(r) {
                    if (!r.ok) return r.json().then(function(d) { throw new Error(d.error || 'Invalid coupon'); });
                    return r.json();
                  })
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

            /* Remove coupon */
            var removeBtn = document.getElementById('remove-coupon-btn');
            if (removeBtn) {
              removeBtn.addEventListener('click', function() {
                fetch('/api/cart/remove-coupon', { method: 'DELETE' })
                  .then(function() { location.reload(); });
              });
            }
          })();
        </script>
      `}
    </>
  );
};
