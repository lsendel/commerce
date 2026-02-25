import type { FC } from "hono/jsx";
import { Button } from "../ui/button";

interface CartSummaryProps {
  subtotal: number;
  itemCount: number;
}

export const CartSummary: FC<CartSummaryProps> = ({ subtotal, itemCount }) => {
  return (
    <div class="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sticky top-6">
      <h2 class="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

      <div class="space-y-3 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-600">
            Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
          <span class="font-medium text-gray-900" data-cart-subtotal>${subtotal.toFixed(2)}</span>
        </div>

        <div class="flex justify-between">
          <span class="text-gray-600">Shipping</span>
          <span class="text-gray-500 italic text-xs">Calculated at checkout</span>
        </div>

        <div class="border-t border-gray-100 pt-3 flex justify-between">
          <span class="font-bold text-gray-900">Total</span>
          <span class="font-bold text-lg text-gray-900" data-cart-total>${subtotal.toFixed(2)}</span>
        </div>
      </div>

      <div class="mt-6 space-y-3">
        <Button
          variant="primary"
          size="lg"
          class="w-full"
          data-checkout-btn
        >
          <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      <div class="mt-6 pt-4 border-t border-gray-100">
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
