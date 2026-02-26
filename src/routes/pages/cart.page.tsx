import type { FC } from "hono/jsx";
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

interface CartPageProps {
  items: CartItemData[];
}

export const CartPage: FC<CartPageProps> = ({ items }) => {
  const subtotal = items.reduce((sum, item) => {
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

  return (
    <>
      {/* Empty state — shown when cart has no items (or all removed dynamically) */}
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

      {/* Cart content — hidden when empty */}
      <div
        class={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isEmpty ? "hidden" : ""}`}
        data-cart-content
      >
        {/* Page header */}
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Shopping Cart</h1>
          <p class="mt-1 text-gray-500 dark:text-gray-400 text-sm">
            {itemCount} {itemCount === 1 ? "item" : "items"} in your cart
          </p>
        </div>

        <div class="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Cart items */}
          <div class="lg:col-span-2 space-y-4" data-cart-items>
            {items.map((item) => (
              <CartItem key={item.id} item={item} />
            ))}

            {/* Continue shopping link */}
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
            <CartSummary subtotal={subtotal} itemCount={itemCount} />
          </div>
        </div>
      </div>
    </>
  );
};
