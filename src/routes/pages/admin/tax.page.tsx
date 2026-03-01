import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { PageHeader } from "../../../components/ui/page-header";
import { EmptyState } from "../../../components/ui/empty-state";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

interface TaxZone {
  id: string;
  name: string;
  countries: string[];
  rates: Array<{
    id: string;
    name: string;
    rate: string;
    isCompound: boolean;
    priority: number;
  }>;
}

interface TaxPageProps {
  zones: TaxZone[];
}

const COUNTRIES: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "IN", name: "India" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "IE", name: "Ireland" },
  { code: "PT", name: "Portugal" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "PL", name: "Poland" },
  { code: "SG", name: "Singapore" },
  { code: "HK", name: "Hong Kong" },
  { code: "ZA", name: "South Africa" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "IL", name: "Israel" },
];

export const TaxPage: FC<TaxPageProps> = ({ zones }) => {
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Tax Settings" },
  ];

  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <PageHeader
        title="Tax Settings"
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
            Add Tax Zone
          </button>
        }
      />

      {/* Flash messages */}
      <div id="tax-success" class="hidden mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3" role="status" />
      <div id="tax-error" class="hidden mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3" role="alert" />

      {/* Zone Form (hidden by default) */}
      <div id="zone-form-section" class="hidden mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 id="zone-form-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">New Tax Zone</h2>
        <form id="zone-form" class="space-y-4">
          <input type="hidden" name="zoneId" value="" />
          <Input label="Zone Name" name="zoneName" required placeholder="e.g. US Sales Tax, EU VAT" />

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Countries <span class="ml-0.5 text-red-500" aria-hidden="true">*</span>
            </label>
            <div class="border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 p-3 max-h-48 overflow-y-auto">
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COUNTRIES.map((c) => (
                  <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2 py-1 transition-colors">
                    <input
                      type="checkbox"
                      name="countries"
                      value={c.code}
                      class="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <span class="truncate">{c.name} ({c.code})</span>
                  </label>
                ))}
              </div>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">Select one or more countries for this tax zone.</p>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <Button type="submit" id="zone-save-btn">Save Zone</Button>
            <button type="button" id="btn-cancel-zone" class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Rate Form (hidden by default) */}
      <div id="rate-form-section" class="hidden mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 id="rate-form-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">Add Tax Rate</h2>
        <form id="rate-form" class="space-y-4">
          <input type="hidden" name="rateId" value="" />
          <input type="hidden" name="rateZoneId" value="" />
          <div class="grid grid-cols-2 gap-4">
            <Input label="Rate Name" name="rateName" required placeholder="e.g. Standard, Reduced, Zero" />
            <Input label="Rate (%)" name="ratePercent" type="number" required placeholder="0.00" helperText="e.g. 20 for 20%" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Compound</label>
              <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  name="rateCompound"
                  class="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                Apply on top of other taxes
              </label>
              <p class="text-xs text-gray-500 dark:text-gray-400">Compound rates are calculated on the subtotal plus other taxes.</p>
            </div>
            <Input label="Priority" name="ratePriority" type="number" value="0" helperText="Lower = applied first. Rates with equal priority are summed." />
          </div>
          <div class="flex items-center gap-3 pt-2">
            <Button type="submit" id="rate-save-btn">Save Rate</Button>
            <button type="button" id="btn-cancel-rate" class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Zone Cards */}
      {zones.length === 0 ? (
        <EmptyState
          title="No tax zones configured"
          description="Create your first tax zone to start collecting taxes on orders."
          icon="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
        />
      ) : (
        <div class="space-y-6">
          {zones.map((zone) => (
            <div
              class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
              data-zone-card
              data-zone-id={zone.id}
              data-zone-name={zone.name}
              data-zone-countries={zone.countries.join(",")}
            >
              {/* Zone Header */}
              <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">{zone.name}</h3>
                  <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {zone.countries.slice(0, 5).map((code) => (
                      <span class="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                        {code}
                      </span>
                    ))}
                    {zone.countries.length > 5 && (
                      <span class="inline-flex items-center rounded-full bg-brand-50 dark:bg-brand-900/30 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
                        +{zone.countries.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="btn-edit-zone p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                    title="Edit Zone"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="btn-delete-zone p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete Zone"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Rates Table */}
              <div class="px-6 py-4">
                {zone.rates.length === 0 ? (
                  <p class="text-sm text-gray-400 dark:text-gray-500 text-center py-3">No rates defined for this zone.</p>
                ) : (
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead class="border-b border-gray-100 dark:border-gray-700">
                        <tr>
                          <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Name</th>
                          <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Rate</th>
                          <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Compound</th>
                          <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Priority</th>
                          <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-50 dark:divide-gray-700">
                        {zone.rates.map((rate) => (
                          <tr
                            data-rate-row
                            data-rate-id={rate.id}
                            data-rate-name={rate.name}
                            data-rate-percent={rate.rate}
                            data-rate-compound={String(rate.isCompound)}
                            data-rate-priority={String(rate.priority)}
                            data-rate-zone-id={zone.id}
                          >
                            <td class="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{rate.name}</td>
                            <td class="px-3 py-2 text-gray-700 dark:text-gray-300">{rate.rate}%</td>
                            <td class="px-3 py-2">
                              {rate.isCompound ? (
                                <span class="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                                  Yes
                                </span>
                              ) : (
                                <span class="text-gray-400 dark:text-gray-500 text-xs">No</span>
                              )}
                            </td>
                            <td class="px-3 py-2 text-gray-600 dark:text-gray-400">{rate.priority}</td>
                            <td class="px-3 py-2 text-right">
                              <div class="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  class="btn-edit-rate p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                                  title="Edit Rate"
                                >
                                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  class="btn-delete-rate p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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

                <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    class="btn-add-rate inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                    data-zone-id={zone.id}
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Rate
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tax Calculator */}
      <section class="mt-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Tax Calculator</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">Test how taxes will be calculated for a given country and subtotal.</p>

        <form id="tax-calc-form" class="flex flex-wrap items-end gap-4">
          <div class="flex-1 min-w-[180px]">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Country</label>
            <select
              name="calcCountry"
              class="block w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="">Select a country</option>
              {COUNTRIES.map((c) => (
                <option value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          <div class="w-40">
            <Input label="Subtotal" name="calcSubtotal" type="number" placeholder="0.00" required />
          </div>
          <Button type="submit" id="tax-calc-btn">Calculate</Button>
        </form>

        <div id="tax-calc-results" class="hidden mt-5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-4">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Results</h3>
          <div id="tax-calc-body" class="space-y-2 text-sm" />
        </div>
      </section>

      {/* Client-side scripts */}
      {html`
        <script>
          (function() {
            var successEl = document.getElementById('tax-success');
            var errorEl = document.getElementById('tax-error');

            /* --- Helpers --- */
            function flash(el, msg) {
              el.textContent = msg;
              el.classList.remove('hidden');
              setTimeout(function() { el.classList.add('hidden'); }, 4000);
            }

            function hideAll() {
              document.getElementById('zone-form-section').classList.add('hidden');
              document.getElementById('rate-form-section').classList.add('hidden');
            }

            function createEl(tag, attrs, text) {
              var el = document.createElement(tag);
              if (attrs) {
                Object.keys(attrs).forEach(function(k) { el.setAttribute(k, attrs[k]); });
              }
              if (text !== undefined) el.textContent = text;
              return el;
            }

            /* --- Zone Form --- */
            var zoneFormSection = document.getElementById('zone-form-section');
            var zoneFormTitle = document.getElementById('zone-form-title');
            var zoneForm = document.getElementById('zone-form');

            function showZoneForm(title) {
              hideAll();
              zoneFormTitle.textContent = title;
              zoneFormSection.classList.remove('hidden');
              zoneFormSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            function resetZoneForm() {
              zoneForm.reset();
              zoneForm.querySelector('[name=zoneId]').value = '';
              zoneForm.querySelectorAll('[name=countries]').forEach(function(cb) { cb.checked = false; });
            }

            document.getElementById('btn-add-zone').addEventListener('click', function() {
              resetZoneForm();
              showZoneForm('New Tax Zone');
            });

            document.getElementById('btn-cancel-zone').addEventListener('click', function() {
              zoneFormSection.classList.add('hidden');
            });

            document.querySelectorAll('.btn-edit-zone').forEach(function(btn) {
              btn.addEventListener('click', function() {
                var card = btn.closest('[data-zone-card]');
                resetZoneForm();
                zoneForm.querySelector('[name=zoneId]').value = card.dataset.zoneId;
                zoneForm.querySelector('[name=zoneName]').value = card.dataset.zoneName;
                var countries = card.dataset.zoneCountries ? card.dataset.zoneCountries.split(',') : [];
                zoneForm.querySelectorAll('[name=countries]').forEach(function(cb) {
                  cb.checked = countries.indexOf(cb.value) !== -1;
                });
                showZoneForm('Edit Tax Zone');
              });
            });

            document.querySelectorAll('.btn-delete-zone').forEach(function(btn) {
              btn.addEventListener('click', function() {
                var card = btn.closest('[data-zone-card]');
                if (!confirm('Delete tax zone "' + card.dataset.zoneName + '" and all its rates?')) return;
                fetch('/api/tax/zones/' + card.dataset.zoneId, { method: 'DELETE' })
                  .then(function(r) {
                    if (!r.ok) return r.json().then(function(d) {
                      throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(d, 'Delete failed') : (d.error || d.message || 'Delete failed'));
                    });
                    card.remove();
                    flash(successEl, 'Tax zone deleted.');
                  })
                  .catch(function(err) { flash(errorEl, (err && err.message) || 'Failed to delete tax zone.'); });
              });
            });

            zoneForm.addEventListener('submit', function(e) {
              e.preventDefault();
              var id = zoneForm.querySelector('[name=zoneId]').value;
              var selectedCountries = [];
              zoneForm.querySelectorAll('[name=countries]:checked').forEach(function(cb) {
                selectedCountries.push(cb.value);
              });
              if (selectedCountries.length === 0) {
                flash(errorEl, 'Please select at least one country.');
                return;
              }
              var body = {
                name: zoneForm.querySelector('[name=zoneName]').value,
                countries: selectedCountries,
              };
              var url = id ? '/api/tax/zones/' + id : '/api/tax/zones';
              var method = id ? 'PUT' : 'POST';

              fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              })
                .then(function(r) {
                  if (!r.ok) return r.json().then(function(d) {
                    throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(d, 'Save failed') : (d.error || d.message || 'Save failed'));
                  });
                  return r.json();
                })
                .then(function() {
                  zoneFormSection.classList.add('hidden');
                  flash(successEl, id ? 'Tax zone updated.' : 'Tax zone created.');
                  setTimeout(function() { location.reload(); }, 800);
                })
                .catch(function(err) { flash(errorEl, (err && err.message) || 'Failed to save tax zone.'); });
            });

            /* --- Rate Form --- */
            var rateFormSection = document.getElementById('rate-form-section');
            var rateFormTitle = document.getElementById('rate-form-title');
            var rateForm = document.getElementById('rate-form');

            function showRateForm(title) {
              hideAll();
              rateFormTitle.textContent = title;
              rateFormSection.classList.remove('hidden');
              rateFormSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            function resetRateForm() {
              rateForm.reset();
              rateForm.querySelector('[name=rateId]').value = '';
              rateForm.querySelector('[name=rateZoneId]').value = '';
            }

            document.querySelectorAll('.btn-add-rate').forEach(function(btn) {
              btn.addEventListener('click', function() {
                resetRateForm();
                rateForm.querySelector('[name=rateZoneId]').value = btn.dataset.zoneId;
                showRateForm('Add Tax Rate');
              });
            });

            document.getElementById('btn-cancel-rate').addEventListener('click', function() {
              rateFormSection.classList.add('hidden');
            });

            document.querySelectorAll('.btn-edit-rate').forEach(function(btn) {
              btn.addEventListener('click', function() {
                var row = btn.closest('[data-rate-row]');
                resetRateForm();
                rateForm.querySelector('[name=rateId]').value = row.dataset.rateId;
                rateForm.querySelector('[name=rateZoneId]').value = row.dataset.rateZoneId;
                rateForm.querySelector('[name=rateName]').value = row.dataset.rateName;
                rateForm.querySelector('[name=ratePercent]').value = row.dataset.ratePercent;
                rateForm.querySelector('[name=rateCompound]').checked = row.dataset.rateCompound === 'true';
                rateForm.querySelector('[name=ratePriority]').value = row.dataset.ratePriority;
                showRateForm('Edit Tax Rate');
              });
            });

            document.querySelectorAll('.btn-delete-rate').forEach(function(btn) {
              btn.addEventListener('click', function() {
                var row = btn.closest('[data-rate-row]');
                if (!confirm('Delete rate "' + row.dataset.rateName + '"?')) return;
                var zoneId = row.dataset.rateZoneId;
                var rateId = row.dataset.rateId;
                fetch('/api/tax/zones/' + zoneId + '/rates/' + rateId, { method: 'DELETE' })
                  .then(function(r) {
                    if (!r.ok) return r.json().then(function(d) {
                      throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(d, 'Delete failed') : (d.error || d.message || 'Delete failed'));
                    });
                    row.remove();
                    flash(successEl, 'Tax rate deleted.');
                  })
                  .catch(function(err) { flash(errorEl, (err && err.message) || 'Failed to delete tax rate.'); });
              });
            });

            rateForm.addEventListener('submit', function(e) {
              e.preventDefault();
              var rateId = rateForm.querySelector('[name=rateId]').value;
              var zoneId = rateForm.querySelector('[name=rateZoneId]').value;
              var body = {
                name: rateForm.querySelector('[name=rateName]').value,
                rate: Number(rateForm.querySelector('[name=ratePercent]').value),
                compound: rateForm.querySelector('[name=rateCompound]').checked,
                priority: Number(rateForm.querySelector('[name=ratePriority]').value) || 0,
              };
              var url = rateId
                ? '/api/tax/zones/' + zoneId + '/rates/' + rateId
                : '/api/tax/zones/' + zoneId + '/rates';
              var method = rateId ? 'PATCH' : 'POST';

              fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              })
                .then(function(r) {
                  if (!r.ok) return r.json().then(function(d) {
                    throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(d, 'Save failed') : (d.error || d.message || 'Save failed'));
                  });
                  return r.json();
                })
                .then(function() {
                  rateFormSection.classList.add('hidden');
                  flash(successEl, rateId ? 'Tax rate updated.' : 'Tax rate created.');
                  setTimeout(function() { location.reload(); }, 800);
                })
                .catch(function(err) { flash(errorEl, (err && err.message) || 'Failed to save tax rate.'); });
            });

            /* --- Tax Calculator --- */
            var calcForm = document.getElementById('tax-calc-form');
            var calcResults = document.getElementById('tax-calc-results');
            var calcBody = document.getElementById('tax-calc-body');

            function renderCalcResults(data, subtotalAmount) {
              while (calcBody.firstChild) calcBody.removeChild(calcBody.firstChild);

              if (data.lines && data.lines.length > 0) {
                var table = createEl('table', { class: 'w-full' });
                var tbody = createEl('tbody');
                for (var i = 0; i < data.lines.length; i++) {
                  var line = data.lines[i];
                  var tr = createEl('tr', { class: 'border-b border-gray-200 dark:border-gray-700' });
                  var tdName = createEl('td', { class: 'py-1.5 text-gray-700 dark:text-gray-300' },
                    (line.taxType || 'tax') + ' (' + (line.rate || 0) + '%)');
                  var tdAmount = createEl('td', { class: 'py-1.5 text-right font-medium text-gray-900 dark:text-gray-100' },
                    '$' + Number(line.taxAmount || 0).toFixed(2));
                  tr.appendChild(tdName);
                  tr.appendChild(tdAmount);
                  tbody.appendChild(tr);
                }
                table.appendChild(tbody);
                calcBody.appendChild(table);
              } else {
                calcBody.appendChild(createEl('p', { class: 'text-gray-500' }, 'No taxes apply to this country.'));
              }

              var totalDiv = createEl('div', { class: 'mt-3 pt-3 border-t border-gray-300 dark:border-gray-600 flex justify-between' });
              totalDiv.appendChild(createEl('span', { class: 'font-semibold text-gray-900 dark:text-gray-100' }, 'Total Tax'));
              totalDiv.appendChild(createEl('span', { class: 'font-semibold text-gray-900 dark:text-gray-100' },
                '$' + Number(data.totalTax || 0).toFixed(2)));
              calcBody.appendChild(totalDiv);

              var grandDiv = createEl('div', { class: 'flex justify-between mt-1' });
              grandDiv.appendChild(createEl('span', { class: 'text-gray-600 dark:text-gray-400' }, 'Estimated Total'));
              grandDiv.appendChild(createEl('span', { class: 'font-semibold text-gray-900 dark:text-gray-100' },
                '$' + (Number(subtotalAmount || 0) + Number(data.totalTax || 0)).toFixed(2)));
              calcBody.appendChild(grandDiv);
            }

            calcForm.addEventListener('submit', function(e) {
              e.preventDefault();
              var country = calcForm.querySelector('[name=calcCountry]').value;
              var subtotal = calcForm.querySelector('[name=calcSubtotal]').value;
              var subtotalAmount = Number(subtotal);

              if (!country) {
                flash(errorEl, 'Please select a country.');
                return;
              }

              var btn = document.getElementById('tax-calc-btn');
              btn.disabled = true;

              fetch('/api/tax/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  lineItems: [{
                    id: 'preview',
                    amount: subtotalAmount,
                    productType: 'physical',
                  }],
                  shippingAmount: 0,
                  address: {
                    country: country,
                    zip: '00000',
                  },
                }),
              })
                .then(function(r) {
                  if (!r.ok) return r.json().then(function(d) {
                    throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(d, 'Calculation failed') : (d.error || d.message || 'Calculation failed'));
                  });
                  return r.json();
                })
                .then(function(data) {
                  calcResults.classList.remove('hidden');
                  renderCalcResults(data, subtotalAmount);
                })
                .catch(function(err) {
                  calcResults.classList.remove('hidden');
                  while (calcBody.firstChild) calcBody.removeChild(calcBody.firstChild);
                  calcBody.appendChild(createEl('p', { class: 'text-red-600' }, (err && err.message) || 'Failed to calculate taxes. Check your configuration.'));
                })
                .finally(function() {
                  btn.disabled = false;
                });
            });
          })();
        </script>
      `}
    </div>
  );
};
