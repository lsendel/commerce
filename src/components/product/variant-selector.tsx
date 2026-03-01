import type { FC } from "hono/jsx";
import { PriceDisplay } from "./price-display";
import { Button } from "../ui/button";
import { formatMoney } from "../../shared/money";

interface Variant {
  id: string;
  title: string;
  price: string;
  compareAtPrice?: string | null;
  availableForSale?: boolean | null;
  inventoryQuantity?: number | null;
  options?: Record<string, string> | null;
}

interface BookingSlot {
  id: string;
  slotDate: string;
  slotTime: string;
  totalCapacity: number;
  reservedCount?: number | null;
  status?: string | null;
  prices?: Array<{
    personType: "adult" | "child" | "pet";
    price: string;
  }>;
}

interface VariantSelectorProps {
  productId: string;
  productType: "physical" | "digital" | "subscription" | "bookable";
  variants: Variant[];
  slots?: BookingSlot[];
  currencyCode?: string;
}

export const VariantSelector: FC<VariantSelectorProps> = ({
  productId,
  productType,
  variants,
  slots,
  currencyCode = "USD",
}) => {
  const isBookable = productType === "bookable";
  const isSingleVariant = variants.length === 1;
  const defaultVariant = variants[0];
  if (!defaultVariant) return null;

  // Calculate price range for "From $X" display
  const prices = variants.map((v) => parseFloat(v.price));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const hasRange = variants.length > 1 && minPrice !== maxPrice;

  // Serialize variant data for client-side availability checking
  const variantsJson = JSON.stringify(
    variants.map((v) => ({
      id: v.id,
      title: v.title,
      price: v.price,
      compareAtPrice: v.compareAtPrice ?? null,
      availableForSale: v.availableForSale ?? true,
      inventoryQuantity: v.inventoryQuantity ?? null,
    }))
  );

  return (
    <div
      class="space-y-6"
      data-variant-selector
      data-product-id={productId}
      data-product-type={productType}
      data-variants-json={variantsJson}
      data-currency-code={currencyCode}
    >
      {/* Variant selection */}
      {!isSingleVariant && (
        <div>
          <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Select Option
          </label>
          {variants.length <= 5 ? (
            <div class="flex flex-wrap gap-2">
              {variants.map((variant, idx) => (
                <label
                  key={variant.id}
                  class="relative cursor-pointer"
                >
                  <input
                    type="radio"
                    name="variant"
                    value={variant.id}
                    checked={idx === 0}
                    disabled={variant.availableForSale === false}
                    class="peer sr-only"
                    data-variant-radio
                    data-price={variant.price}
                    data-compare-price={variant.compareAtPrice || ""}
                  />
                  <div class={`px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-150 peer-checked:border-brand-500 peer-checked:bg-brand-50 dark:peer-checked:bg-brand-900/20 peer-checked:text-brand-700 dark:peer-checked:text-brand-400 ${
                    variant.availableForSale === false
                      ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                      : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}>
                    <span>{variant.title}</span>
                    <span class="ml-2 text-xs text-gray-500">{formatMoney(variant.price, currencyCode)}</span>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <select
              name="variant"
              class="w-full rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
              data-variant-select
              aria-label="Select product variant"
            >
              {variants.map((variant) => (
                <option
                  key={variant.id}
                  value={variant.id}
                  disabled={variant.availableForSale === false}
                  data-price={variant.price}
                  data-compare-price={variant.compareAtPrice || ""}
                >
                  {variant.title} - {formatMoney(variant.price, currencyCode)}
                  {variant.availableForSale === false ? " (Sold out)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Hidden input for single variant */}
      {isSingleVariant && (
        <input type="hidden" name="variant" value={defaultVariant.id} data-variant-radio data-price={defaultVariant.price} data-compare-price={defaultVariant.compareAtPrice || ""} />
      )}

      {/* Selected price display */}
      <div data-price-display>
        <PriceDisplay
          price={defaultVariant.price}
          compareAtPrice={defaultVariant.compareAtPrice}
          maxPrice={hasRange ? String(maxPrice) : undefined}
          currencyCode={currencyCode}
          size="lg"
        />
      </div>

      {/* Booking slot selector */}
      {isBookable && slots && slots.length > 0 && (
        <div>
          <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Select Date &amp; Time
          </label>
          <div class="space-y-2 max-h-64 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 p-3" role="radiogroup" aria-label="Available time slots">
            {slots.map((slot, idx) => {
              const available = (slot.totalCapacity - (slot.reservedCount || 0));
              const isFull = available <= 0 || slot.status === "full";
              const dateObj = new Date(`${slot.slotDate}T${slot.slotTime}`);
              const dateStr = dateObj.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const timeStr = dateObj.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });

              return (
                <label
                  key={slot.id}
                  class={`flex items-center justify-between p-3 rounded-xl border transition-all duration-150 ${
                    isFull
                      ? "border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-60"
                      : "border-gray-200 dark:border-gray-600 hover:border-brand-300 cursor-pointer"
                  }`}
                >
                  <div class="flex items-center gap-3">
                    <input
                      type="radio"
                      name="slot"
                      value={slot.id}
                      disabled={isFull}
                      checked={idx === 0 && !isFull}
                      class="text-brand-500 focus:ring-brand-300"
                      data-slot-radio
                      data-slot-id={slot.id}
                    />
                    <div>
                      <div class="text-sm font-medium text-gray-900 dark:text-gray-100">{dateStr}</div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">{timeStr}</div>
                    </div>
                  </div>
                  <div class="text-right">
                    {isFull ? (
                      <span class="text-xs font-medium text-red-500">Full</span>
                    ) : (
                      <span class="text-xs text-gray-400">{available} spots left</span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {/* Person type quantities for bookable */}
          {slots[0]?.prices && slots[0].prices.length > 0 && (
            <div class="mt-4 space-y-3">
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Participants
              </label>
              {slots[0].prices.map((p) => (
                <div key={p.personType} class="flex items-center justify-between gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <div>
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{p.personType}</span>
                    <span class="text-xs text-gray-400 ml-2">{formatMoney(p.price, currencyCode)} each</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      data-person-decrement={p.personType}
                      aria-label={`Decrease ${p.personType} count`}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      name={`person_${p.personType}`}
                      value="0"
                      min="0"
                      class="w-12 text-center rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 text-sm py-1 focus:outline-none focus:ring-2 focus:ring-brand-300"
                      data-person-qty={p.personType}
                      aria-label={`${p.personType} quantity`}
                    />
                    <button
                      type="button"
                      class="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      data-person-increment={p.personType}
                      aria-label={`Increase ${p.personType} count`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quantity (non-bookable) */}
      {!isBookable && (
        <div>
          <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Quantity
          </label>
          <div class="flex items-center gap-2 w-fit" role="group" aria-label="Quantity selector">
            <button
              type="button"
              class="w-10 h-10 rounded-xl border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
              data-qty-decrement
              aria-label="Decrease quantity"
            >
              -
            </button>
            <input
              type="number"
              name="quantity"
              value="1"
              min="1"
              class="w-16 text-center rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 text-sm py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
              data-qty-input
              aria-label="Product quantity"
            />
            <button
              type="button"
              class="w-10 h-10 rounded-xl border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
              data-qty-increment
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Add to Cart */}
      <Button
        variant="primary"
        size="lg"
        class="w-full"
        data-add-to-cart
      >
        <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
        Add to Cart
      </Button>
    </div>
  );
};
