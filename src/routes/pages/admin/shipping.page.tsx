import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { PageHeader } from "../../../components/ui/page-header";
import { EmptyState } from "../../../components/ui/empty-state";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";

interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  rates: Array<{
    id: string;
    name: string;
    minWeight: string | null;
    maxWeight: string | null;
    price: string;
    currency: string;
    minDeliveryDays: number;
    maxDeliveryDays: number;
  }>;
}

interface ShippingPageProps {
  zones: ShippingZone[];
}

const COUNTRY_OPTIONS = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "JP", label: "Japan" },
  { value: "NL", label: "Netherlands" },
  { value: "IT", label: "Italy" },
  { value: "ES", label: "Spain" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "IN", label: "India" },
  { value: "KR", label: "South Korea" },
  { value: "SE", label: "Sweden" },
  { value: "NO", label: "Norway" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
  { value: "NZ", label: "New Zealand" },
  { value: "IE", label: "Ireland" },
  { value: "SG", label: "Singapore" },
  { value: "CH", label: "Switzerland" },
  { value: "AT", label: "Austria" },
  { value: "BE", label: "Belgium" },
  { value: "PT", label: "Portugal" },
  { value: "PL", label: "Poland" },
];

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "CAD", label: "CAD" },
  { value: "AUD", label: "AUD" },
  { value: "JPY", label: "JPY" },
];

const COUNTRY_LABELS: Record<string, string> = {};
for (const opt of COUNTRY_OPTIONS) {
  COUNTRY_LABELS[opt.value] = opt.label;
}

function formatWeight(min: string | null, max: string | null): string {
  if (!min && !max) return "Any weight";
  if (min && !max) return `${min}+ kg`;
  if (!min && max) return `Up to ${max} kg`;
  return `${min} - ${max} kg`;
}

function formatDelivery(min: number, max: number): string {
  if (min === max) return `${min} day${min !== 1 ? "s" : ""}`;
  return `${min}-${max} days`;
}

function formatPrice(price: string, currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "\u20AC",
    GBP: "\u00A3",
    CAD: "C$",
    AUD: "A$",
    JPY: "\u00A5",
  };
  const symbol = symbols[currency] ?? currency + " ";
  return `${symbol}${Number(price).toFixed(2)}`;
}

export const ShippingPage: FC<ShippingPageProps> = ({ zones }) => {
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Shipping Zones" },
  ];

  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <PageHeader
        title="Shipping Zones"
        breadcrumbs={breadcrumbs}
        actions={
          <button
            type="button"
            id="btn-add-zone"
            class="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Zone
          </button>
        }
      />

      {/* Flash messages */}
      <div id="shipping-success" class="hidden mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3" role="status" />
      <div id="shipping-error" class="hidden mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3" role="alert" />

      {/* Add/Edit Zone Form (hidden by default) */}
      <div id="zone-form-section" class="hidden mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 id="zone-form-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">New Shipping Zone</h2>
        <form id="zone-form" class="space-y-5">
          <input type="hidden" name="zoneId" value="" />
          <Input label="Zone Name" name="zoneName" required placeholder="e.g. Domestic, Europe, Asia-Pacific" />

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Countries <span class="ml-0.5 text-red-500" aria-hidden="true">*</span>
            </label>
            <div id="zone-country-select" class="border border-gray-300 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-800">
              <div id="zone-selected-countries" class="flex flex-wrap gap-1.5 mb-3 min-h-[28px]" />
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
                {COUNTRY_OPTIONS.map((country) => (
                  <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 py-1 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      name="countries"
                      value={country.value}
                      class="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    {country.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" id="zone-save-btn">
              Save Zone
            </Button>
            <Button type="button" variant="ghost" id="btn-cancel-zone">
              Cancel
            </Button>
          </div>
        </form>
      </div>

      {/* Add/Edit Rate Form (hidden by default) */}
      <div id="rate-form-section" class="hidden mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 id="rate-form-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">New Shipping Rate</h2>
        <form id="rate-form" class="space-y-5">
          <input type="hidden" name="rateId" value="" />
          <input type="hidden" name="rateZoneId" value="" />

          <Input label="Rate Name" name="rateName" required placeholder="e.g. Standard, Express, Economy" />

          <div class="grid grid-cols-2 gap-4">
            <Input label="Min Weight (kg)" name="minWeight" type="number" placeholder="0" />
            <Input label="Max Weight (kg)" name="maxWeight" type="number" placeholder="No limit" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <Input label="Price" name="ratePrice" type="number" required placeholder="0.00" />
            <Select label="Currency" name="rateCurrency" options={CURRENCY_OPTIONS} value="USD" required />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <Input label="Min Delivery Days" name="minDeliveryDays" type="number" required placeholder="1" />
            <Input label="Max Delivery Days" name="maxDeliveryDays" type="number" required placeholder="5" />
          </div>

          <div class="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" id="rate-save-btn">
              Save Rate
            </Button>
            <Button type="button" variant="ghost" id="btn-cancel-rate">
              Cancel
            </Button>
          </div>
        </form>
      </div>

      {/* Zone Cards */}
      {zones.length === 0 ? (
        <EmptyState
          title="No shipping zones"
          description="Create your first shipping zone to configure delivery rates."
          icon="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ) : (
        <div class="space-y-6" id="zones-list">
          {zones.map((zone) => (
            <div
              class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
              data-zone-row
              data-zone-id={zone.id}
              data-zone-name={zone.name}
              data-zone-countries={zone.countries.join(",")}
            >
              {/* Zone header */}
              <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{zone.name}</h3>
                  <div class="flex flex-wrap items-center gap-1.5 mt-2">
                    {zone.countries.slice(0, 5).map((code) => (
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {COUNTRY_LABELS[code] ?? code}
                      </span>
                    ))}
                    {zone.countries.length > 5 && (
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                        +{zone.countries.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0 ml-4">
                  <button
                    type="button"
                    class="btn-add-rate p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    title="Add Rate"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="btn-edit-zone p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    title="Edit Zone"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="btn-delete-zone p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete Zone"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Rates table */}
              {zone.rates.length === 0 ? (
                <div class="px-6 py-8 text-center text-sm text-gray-400">
                  No rates configured.{" "}
                  <button type="button" class="btn-add-rate text-brand-600 hover:text-brand-700 font-medium">
                    Add a rate
                  </button>
                </div>
              ) : (
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                      <tr>
                        <th class="text-left px-6 py-2.5 font-medium text-gray-500 dark:text-gray-400">Name</th>
                        <th class="text-left px-6 py-2.5 font-medium text-gray-500 dark:text-gray-400">Weight Range</th>
                        <th class="text-left px-6 py-2.5 font-medium text-gray-500 dark:text-gray-400">Price</th>
                        <th class="text-left px-6 py-2.5 font-medium text-gray-500 dark:text-gray-400">Delivery</th>
                        <th class="text-right px-6 py-2.5 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                      {zone.rates.map((rate) => (
                        <tr
                          class="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                          data-rate-row
                          data-rate-id={rate.id}
                          data-rate-name={rate.name}
                          data-rate-min-weight={rate.minWeight ?? ""}
                          data-rate-max-weight={rate.maxWeight ?? ""}
                          data-rate-price={rate.price}
                          data-rate-currency={rate.currency}
                          data-rate-min-delivery={String(rate.minDeliveryDays)}
                          data-rate-max-delivery={String(rate.maxDeliveryDays)}
                        >
                          <td class="px-6 py-3 font-medium text-gray-900 dark:text-gray-100">{rate.name}</td>
                          <td class="px-6 py-3 text-gray-600 dark:text-gray-400">
                            {formatWeight(rate.minWeight, rate.maxWeight)}
                          </td>
                          <td class="px-6 py-3 font-medium text-gray-900 dark:text-gray-100">
                            {formatPrice(rate.price, rate.currency)}
                          </td>
                          <td class="px-6 py-3 text-gray-600 dark:text-gray-400">
                            {formatDelivery(rate.minDeliveryDays, rate.maxDeliveryDays)}
                          </td>
                          <td class="px-6 py-3 text-right">
                            <div class="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                class="btn-edit-rate p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                                title="Edit Rate"
                              >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                class="btn-delete-rate p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete Rate"
                              >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Test Shipping Calculator */}
      <section class="mt-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">
          <svg class="w-5 h-5 inline-block mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Test Shipping Calculator
        </h2>
        <form id="calc-form" class="flex flex-wrap items-end gap-4">
          <div class="flex-1 min-w-[180px]">
            <Select
              label="Destination Country"
              name="calcCountry"
              options={COUNTRY_OPTIONS}
              required
            />
          </div>
          <div class="w-40">
            <Input label="Weight (kg)" name="calcWeight" type="number" placeholder="1.0" required />
          </div>
          <Button type="submit" variant="primary" id="calc-btn">
            Calculate
          </Button>
        </form>
        <div id="calc-results" class="mt-4 hidden">
          <div class="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div class="bg-gray-50 dark:bg-gray-900 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Available Shipping Options</p>
            </div>
            <div id="calc-results-body" class="divide-y divide-gray-100 dark:divide-gray-700" />
          </div>
        </div>
        <div id="calc-no-results" class="mt-4 hidden">
          <div class="rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm px-4 py-3">
            No shipping options available for this destination and weight.
          </div>
        </div>
      </section>

      {html`
        <script>
          (function() {
            var zoneFormSection = document.getElementById('zone-form-section');
            var zoneFormTitle = document.getElementById('zone-form-title');
            var zoneForm = document.getElementById('zone-form');
            var rateFormSection = document.getElementById('rate-form-section');
            var rateFormTitle = document.getElementById('rate-form-title');
            var rateForm = document.getElementById('rate-form');
            var successEl = document.getElementById('shipping-success');
            var errorEl = document.getElementById('shipping-error');

            function flash(el, msg) {
              el.textContent = msg;
              el.classList.remove('hidden');
              setTimeout(function() { el.classList.add('hidden'); }, 4000);
            }

            function hideAllForms() {
              zoneFormSection.classList.add('hidden');
              rateFormSection.classList.add('hidden');
            }

            function showZoneForm(title) {
              hideAllForms();
              zoneFormTitle.textContent = title;
              zoneFormSection.classList.remove('hidden');
              zoneFormSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            function showRateForm(title) {
              hideAllForms();
              rateFormTitle.textContent = title;
              rateFormSection.classList.remove('hidden');
              rateFormSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            /* Update selected country pills in zone form */
            function updateCountryPills() {
              var container = document.getElementById('zone-selected-countries');
              while (container.firstChild) {
                container.removeChild(container.firstChild);
              }
              var checked = zoneForm.querySelectorAll('input[name="countries"]:checked');
              checked.forEach(function(cb) {
                var pill = document.createElement('span');
                pill.className = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200';
                pill.textContent = cb.parentElement.textContent.trim();
                var removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'ml-0.5 text-brand-400 hover:text-brand-600';
                removeBtn.textContent = '\u00d7';
                removeBtn.addEventListener('click', function() {
                  cb.checked = false;
                  updateCountryPills();
                });
                pill.appendChild(removeBtn);
                container.appendChild(pill);
              });
            }

            zoneForm.querySelectorAll('input[name="countries"]').forEach(function(cb) {
              cb.addEventListener('change', updateCountryPills);
            });

            /* Add Zone */
            document.getElementById('btn-add-zone').addEventListener('click', function() {
              zoneForm.reset();
              zoneForm.querySelector('[name="zoneId"]').value = '';
              updateCountryPills();
              showZoneForm('New Shipping Zone');
            });

            document.getElementById('btn-cancel-zone').addEventListener('click', function() {
              hideAllForms();
            });

            document.getElementById('btn-cancel-rate').addEventListener('click', function() {
              hideAllForms();
            });

            /* Edit Zone */
            document.querySelectorAll('.btn-edit-zone').forEach(function(btn) {
              btn.addEventListener('click', function() {
                var card = btn.closest('[data-zone-row]');
                var zoneId = card.dataset.zoneId;
                var zoneName = card.dataset.zoneName;
                var countries = card.dataset.zoneCountries ? card.dataset.zoneCountries.split(',') : [];

                zoneForm.reset();
                zoneForm.querySelector('[name="zoneId"]').value = zoneId;
                zoneForm.querySelector('[name="zoneName"]').value = zoneName;

                zoneForm.querySelectorAll('input[name="countries"]').forEach(function(cb) {
                  cb.checked = countries.indexOf(cb.value) !== -1;
                });

                updateCountryPills();
                showZoneForm('Edit Shipping Zone');
              });
            });

            /* Delete Zone */
            document.querySelectorAll('.btn-delete-zone').forEach(function(btn) {
              btn.addEventListener('click', function() {
                var card = btn.closest('[data-zone-row]');
                var zoneName = card.dataset.zoneName;
                if (!confirm('Delete shipping zone "' + zoneName + '" and all its rates?')) return;

                fetch('/api/admin/shipping/zones/' + card.dataset.zoneId, { method: 'DELETE' })
                  .then(function(r) {
                    if (!r.ok) throw new Error('Delete failed');
                    card.remove();
                    flash(successEl, 'Shipping zone deleted.');
                  })
                  .catch(function() { flash(errorEl, 'Failed to delete shipping zone.'); });
              });
            });

            /* Save Zone */
            zoneForm.addEventListener('submit', function(e) {
              e.preventDefault();
              var id = zoneForm.querySelector('[name="zoneId"]').value;
              var checkedCountries = [];
              zoneForm.querySelectorAll('input[name="countries"]:checked').forEach(function(cb) {
                checkedCountries.push(cb.value);
              });

              if (checkedCountries.length === 0) {
                flash(errorEl, 'Please select at least one country.');
                return;
              }

              var body = {
                name: zoneForm.querySelector('[name="zoneName"]').value,
                countries: checkedCountries,
              };

              var url = id ? '/api/admin/shipping/zones/' + id : '/api/admin/shipping/zones';
              var method = id ? 'PATCH' : 'POST';

              fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              })
                .then(function(r) {
                  if (!r.ok) throw new Error('Save failed');
                  return r.json();
                })
                .then(function() {
                  hideAllForms();
                  flash(successEl, id ? 'Shipping zone updated.' : 'Shipping zone created.');
                  setTimeout(function() { location.reload(); }, 800);
                })
                .catch(function() { flash(errorEl, 'Failed to save shipping zone.'); });
            });

            /* Add Rate */
            document.querySelectorAll('.btn-add-rate').forEach(function(btn) {
              btn.addEventListener('click', function() {
                var card = btn.closest('[data-zone-row]');
                rateForm.reset();
                rateForm.querySelector('[name="rateId"]').value = '';
                rateForm.querySelector('[name="rateZoneId"]').value = card.dataset.zoneId;
                showRateForm('New Shipping Rate');
              });
            });

            /* Edit Rate */
            document.querySelectorAll('.btn-edit-rate').forEach(function(btn) {
              btn.addEventListener('click', function() {
                var row = btn.closest('[data-rate-row]');
                var card = row.closest('[data-zone-row]');

                rateForm.reset();
                rateForm.querySelector('[name="rateId"]').value = row.dataset.rateId;
                rateForm.querySelector('[name="rateZoneId"]').value = card.dataset.zoneId;
                rateForm.querySelector('[name="rateName"]').value = row.dataset.rateName;
                rateForm.querySelector('[name="minWeight"]').value = row.dataset.rateMinWeight;
                rateForm.querySelector('[name="maxWeight"]').value = row.dataset.rateMaxWeight;
                rateForm.querySelector('[name="ratePrice"]').value = row.dataset.ratePrice;
                var currSelect = rateForm.querySelector('[name="rateCurrency"]');
                if (currSelect) currSelect.value = row.dataset.rateCurrency;
                rateForm.querySelector('[name="minDeliveryDays"]').value = row.dataset.rateMinDelivery;
                rateForm.querySelector('[name="maxDeliveryDays"]').value = row.dataset.rateMaxDelivery;

                showRateForm('Edit Shipping Rate');
              });
            });

            /* Delete Rate */
            document.querySelectorAll('.btn-delete-rate').forEach(function(btn) {
              btn.addEventListener('click', function() {
                var row = btn.closest('[data-rate-row]');
                var card = row.closest('[data-zone-row]');
                if (!confirm('Delete this shipping rate?')) return;

                fetch('/api/admin/shipping/zones/' + card.dataset.zoneId + '/rates/' + row.dataset.rateId, { method: 'DELETE' })
                  .then(function(r) {
                    if (!r.ok) throw new Error('Delete failed');
                    row.remove();
                    flash(successEl, 'Shipping rate deleted.');
                  })
                  .catch(function() { flash(errorEl, 'Failed to delete shipping rate.'); });
              });
            });

            /* Save Rate */
            rateForm.addEventListener('submit', function(e) {
              e.preventDefault();
              var rateId = rateForm.querySelector('[name="rateId"]').value;
              var zoneId = rateForm.querySelector('[name="rateZoneId"]').value;

              var body = {
                name: rateForm.querySelector('[name="rateName"]').value,
                minWeight: rateForm.querySelector('[name="minWeight"]').value || null,
                maxWeight: rateForm.querySelector('[name="maxWeight"]').value || null,
                price: rateForm.querySelector('[name="ratePrice"]').value,
                currency: rateForm.querySelector('[name="rateCurrency"]').value,
                minDeliveryDays: Number(rateForm.querySelector('[name="minDeliveryDays"]').value),
                maxDeliveryDays: Number(rateForm.querySelector('[name="maxDeliveryDays"]').value),
              };

              var url = rateId
                ? '/api/admin/shipping/zones/' + zoneId + '/rates/' + rateId
                : '/api/admin/shipping/zones/' + zoneId + '/rates';
              var method = rateId ? 'PATCH' : 'POST';

              fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              })
                .then(function(r) {
                  if (!r.ok) throw new Error('Save failed');
                  return r.json();
                })
                .then(function() {
                  hideAllForms();
                  flash(successEl, rateId ? 'Shipping rate updated.' : 'Shipping rate created.');
                  setTimeout(function() { location.reload(); }, 800);
                })
                .catch(function() { flash(errorEl, 'Failed to save shipping rate.'); });
            });

            /* Shipping Calculator */
            var calcForm = document.getElementById('calc-form');
            var calcResults = document.getElementById('calc-results');
            var calcResultsBody = document.getElementById('calc-results-body');
            var calcNoResults = document.getElementById('calc-no-results');

            calcForm.addEventListener('submit', function(e) {
              e.preventDefault();
              var country = calcForm.querySelector('[name="calcCountry"]').value;
              var weight = calcForm.querySelector('[name="calcWeight"]').value;

              if (!country || !weight) return;

              calcResults.classList.add('hidden');
              calcNoResults.classList.add('hidden');

              fetch('/api/admin/shipping/calculate?country=' + encodeURIComponent(country) + '&weight=' + encodeURIComponent(weight))
                .then(function(r) {
                  if (!r.ok) throw new Error('Calculation failed');
                  return r.json();
                })
                .then(function(data) {
                  var rates = data.rates || [];
                  if (rates.length === 0) {
                    calcNoResults.classList.remove('hidden');
                    return;
                  }

                  while (calcResultsBody.firstChild) {
                    calcResultsBody.removeChild(calcResultsBody.firstChild);
                  }

                  rates.forEach(function(rate) {
                    var row = document.createElement('div');
                    row.className = 'flex items-center justify-between px-4 py-3';

                    var infoDiv = document.createElement('div');
                    var nameP = document.createElement('p');
                    nameP.className = 'text-sm font-medium text-gray-900 dark:text-gray-100';
                    nameP.textContent = rate.name;
                    var detailP = document.createElement('p');
                    detailP.className = 'text-xs text-gray-500';
                    detailP.textContent = rate.zoneName + ' \u00b7 ' + rate.minDeliveryDays + '-' + rate.maxDeliveryDays + ' days';
                    infoDiv.appendChild(nameP);
                    infoDiv.appendChild(detailP);

                    var priceSpan = document.createElement('span');
                    priceSpan.className = 'text-sm font-semibold text-gray-900 dark:text-gray-100';
                    priceSpan.textContent = rate.formattedPrice;

                    row.appendChild(infoDiv);
                    row.appendChild(priceSpan);
                    calcResultsBody.appendChild(row);
                  });

                  calcResults.classList.remove('hidden');
                })
                .catch(function() {
                  flash(errorEl, 'Failed to calculate shipping rates.');
                });
            });
          })();
        </script>
      `}
    </div>
  );
};
