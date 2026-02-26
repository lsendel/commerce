import type { FC } from "hono/jsx";
import { Button } from "../ui/button";

interface PersonType {
  key: string;
  label: string;
  unitPrice: string;
  min?: number;
  max?: number;
}

interface BookingFormProps {
  /** Selected slot information */
  slotId: string;
  date: string;
  time: string;
  location: string;
  /** Person types with pricing */
  personTypes: PersonType[];
  /** Product variant ID for the add-to-cart action */
  variantId: string;
}

export const BookingForm: FC<BookingFormProps> = ({
  slotId,
  date,
  time,
  location,
  personTypes,
  variantId,
}) => {
  return (
    <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Book This Slot</h3>

      {/* Selected slot info */}
      <div class="rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 p-4 mb-5">
        <div class="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p class="text-xs font-medium text-brand-500 dark:text-brand-400 uppercase tracking-wide">Date</p>
            <p class="font-semibold text-brand-800 dark:text-brand-300 mt-0.5">{date}</p>
          </div>
          <div>
            <p class="text-xs font-medium text-brand-500 dark:text-brand-400 uppercase tracking-wide">Time</p>
            <p class="font-semibold text-brand-800 dark:text-brand-300 mt-0.5">{time}</p>
          </div>
          <div>
            <p class="text-xs font-medium text-brand-500 dark:text-brand-400 uppercase tracking-wide">Location</p>
            <p class="font-semibold text-brand-800 dark:text-brand-300 mt-0.5">{location}</p>
          </div>
        </div>
      </div>

      <form id="booking-form" onsubmit="return false;">
        <input type="hidden" name="slotId" value={slotId} />
        <input type="hidden" name="variantId" value={variantId} />

        {/* Person type quantity selectors */}
        <div class="space-y-4 mb-5">
          {personTypes.map((pt) => (
            <div class="flex items-center justify-between" data-person-type={pt.key}>
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{pt.label}</p>
                <p class="text-xs text-gray-400 dark:text-gray-500">${pt.unitPrice} each</p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  data-decrement={pt.key}
                  aria-label={`Decrease ${pt.label}`}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                  </svg>
                </button>
                <input
                  type="number"
                  name={`qty_${pt.key}`}
                  value="0"
                  min={pt.min ?? 0}
                  max={pt.max ?? 99}
                  class="w-12 text-center text-sm font-semibold border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  data-qty={pt.key}
                  data-price={pt.unitPrice}
                  readonly
                />
                <button
                  type="button"
                  class="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  data-increment={pt.key}
                  aria-label={`Increase ${pt.label}`}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Price breakdown */}
        <div class="border-t border-gray-100 dark:border-gray-700 pt-4 mb-5">
          <div id="price-breakdown" class="space-y-2">
            {personTypes.map((pt) => (
              <div class="flex justify-between text-sm text-gray-500 hidden" data-line={pt.key}>
                <span>
                  <span data-line-label={pt.key}>{pt.label}</span>{" "}
                  <span class="text-gray-400">
                    x <span data-line-qty={pt.key}>0</span>
                  </span>
                </span>
                <span data-line-total={pt.key}>$0.00</span>
              </div>
            ))}
          </div>

          <div class="flex justify-between text-base font-bold text-gray-900 dark:text-gray-100 pt-3 mt-3 border-t border-gray-100 dark:border-gray-700">
            <span>Total</span>
            <span id="booking-total">$0.00</span>
          </div>
        </div>

        {/* Error display */}
        <div id="booking-error" class="hidden mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3" role="alert"></div>

        <Button type="submit" variant="primary" size="lg" class="w-full" id="add-to-cart-btn" disabled>
          Add to Cart
        </Button>
      </form>

      {/* Client-side quantity handling -- all content is static, no user-generated HTML */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var form = document.getElementById('booking-form');
              var totalEl = document.getElementById('booking-total');
              var addBtn = document.getElementById('add-to-cart-btn');
              var errorEl = document.getElementById('booking-error');

              function updateTotals() {
                var grandTotal = 0;
                var hasQty = false;
                var qtyInputs = form.querySelectorAll('[data-qty]');
                qtyInputs.forEach(function(input) {
                  var key = input.getAttribute('data-qty');
                  var qty = parseInt(input.value) || 0;
                  var price = parseFloat(input.getAttribute('data-price')) || 0;
                  var lineTotal = qty * price;
                  var lineEl = document.querySelector('[data-line="' + key + '"]');
                  var lineQtyEl = document.querySelector('[data-line-qty="' + key + '"]');
                  var lineTotalEl = document.querySelector('[data-line-total="' + key + '"]');

                  if (qty > 0) {
                    hasQty = true;
                    lineEl.classList.remove('hidden');
                    lineQtyEl.textContent = qty;
                    lineTotalEl.textContent = '$' + lineTotal.toFixed(2);
                  } else {
                    lineEl.classList.add('hidden');
                  }
                  grandTotal += lineTotal;
                });

                totalEl.textContent = '$' + grandTotal.toFixed(2);
                addBtn.disabled = !hasQty;
              }

              document.querySelectorAll('[data-increment]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                  var key = this.getAttribute('data-increment');
                  var input = form.querySelector('[data-qty="' + key + '"]');
                  var max = parseInt(input.getAttribute('max')) || 99;
                  var val = parseInt(input.value) || 0;
                  if (val < max) {
                    input.value = val + 1;
                    updateTotals();
                  }
                });
              });

              document.querySelectorAll('[data-decrement]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                  var key = this.getAttribute('data-decrement');
                  var input = form.querySelector('[data-qty="' + key + '"]');
                  var min = parseInt(input.getAttribute('min')) || 0;
                  var val = parseInt(input.value) || 0;
                  if (val > min) {
                    input.value = val - 1;
                    updateTotals();
                  }
                });
              });

              form.addEventListener('submit', async function(e) {
                e.preventDefault();
                addBtn.disabled = true;
                addBtn.textContent = 'Adding...';
                errorEl.classList.add('hidden');

                var items = {};
                var totalQty = 0;
                form.querySelectorAll('[data-qty]').forEach(function(input) {
                  var key = input.getAttribute('data-qty');
                  var qty = parseInt(input.value) || 0;
                  if (qty > 0) {
                    items[key] = qty;
                    totalQty += qty;
                  }
                });

                try {
                  var res = await fetch('/api/cart/items', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      variantId: form.querySelector('[name="variantId"]').value,
                      quantity: totalQty,
                      bookingAvailabilityId: form.querySelector('[name="slotId"]').value,
                      personTypeQuantities: items,
                    }),
                  });

                  if (!res.ok) {
                    var data = await res.json().catch(function() { return {}; });
                    throw new Error(data.error || data.message || 'Failed to add to cart');
                  }

                  addBtn.textContent = 'Added!';
                  setTimeout(function() {
                    addBtn.textContent = 'Add to Cart';
                    addBtn.disabled = false;
                  }, 2000);
                } catch (err) {
                  errorEl.textContent = err.message;
                  errorEl.classList.remove('hidden');
                  addBtn.disabled = false;
                  addBtn.textContent = 'Add to Cart';
                }
              });
            })();
          `,
        }}
      />
    </div>
  );
};
