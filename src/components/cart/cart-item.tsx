import type { FC } from "hono/jsx";

interface CartItemProps {
  item: {
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
  };
}

export const CartItem: FC<CartItemProps> = ({ item }) => {
  const { variant, quantity, bookingAvailability, personTypeQuantities } = item;
  const { product } = variant;
  const unitPrice = parseFloat(variant.price);
  const lineTotal = unitPrice * quantity;
  const isBookable = product.type === "bookable";

  let bookingTotal = 0;
  if (isBookable && personTypeQuantities && bookingAvailability?.prices) {
    for (const p of bookingAvailability.prices) {
      const qty = personTypeQuantities[p.personType] || 0;
      bookingTotal += qty * parseFloat(p.price);
    }
  }

  const displayTotal = isBookable && bookingTotal > 0 ? bookingTotal : lineTotal;

  return (
    <div class="flex gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm" data-cart-item={item.id}>
      {/* Image */}
      <a href={`/products/${product.slug}`} class="shrink-0">
        {product.featuredImageUrl ? (
          <img
            src={product.featuredImageUrl}
            alt={product.name}
            class="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl"
            loading="lazy"
          />
        ) : (
          <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-brand-50 flex items-center justify-center">
            <svg class="w-8 h-8 text-brand-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </a>

      {/* Details */}
      <div class="flex-1 min-w-0">
        <div class="flex justify-between items-start gap-2">
          <div>
            <a
              href={`/products/${product.slug}`}
              class="text-sm font-semibold text-gray-900 hover:text-brand-600 transition-colors line-clamp-1"
            >
              {product.name}
            </a>
            <p class="text-xs text-gray-500 mt-0.5">{variant.title}</p>
          </div>

          {/* Remove button */}
          <button
            type="button"
            class="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            data-cart-remove
            data-item-id={item.id}
            aria-label="Remove item"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Booking details */}
        {isBookable && bookingAvailability && (
          <div class="mt-2 p-2 rounded-lg bg-pet-teal/10 text-xs space-y-1">
            <div class="flex items-center gap-1.5 text-teal-700">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span class="font-medium">
                {new Date(`${bookingAvailability.slotDate}T${bookingAvailability.slotTime}`).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}{" "}
                at{" "}
                {new Date(`${bookingAvailability.slotDate}T${bookingAvailability.slotTime}`).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {personTypeQuantities && Object.keys(personTypeQuantities).length > 0 && (
              <div class="flex gap-3 text-gray-600">
                {Object.entries(personTypeQuantities).map(([type, qty]) =>
                  qty > 0 ? (
                    <span key={type} class="capitalize">
                      {qty}x {type}
                    </span>
                  ) : null,
                )}
              </div>
            )}
          </div>
        )}

        {/* Quantity & Price */}
        <div class="flex items-center justify-between mt-3">
          {!isBookable && (
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="w-7 h-7 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors text-xs"
                data-cart-qty="dec"
                data-item-id={item.id}
              >
                -
              </button>
              <span
                class="w-10 text-center rounded-lg border border-gray-300 text-xs py-1 inline-flex items-center justify-center"
                data-cart-qty-display
                data-item-id={item.id}
              >
                {quantity}
              </span>
              <button
                type="button"
                class="w-7 h-7 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors text-xs"
                data-cart-qty="inc"
                data-item-id={item.id}
              >
                +
              </button>
            </div>
          )}
          {isBookable && (
            <div class="text-xs text-gray-500">
              Booking
            </div>
          )}
          <div class="text-right">
            <span class="text-sm font-bold text-gray-900" data-cart-item-price data-item-id={item.id}>${displayTotal.toFixed(2)}</span>
            {!isBookable && quantity > 1 && (
              <span class="block text-xs text-gray-400">${unitPrice.toFixed(2)} each</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
