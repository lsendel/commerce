import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { Badge } from "../../../components/ui/badge";

interface Address {
  id: string;
  label?: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

interface AddressesPageProps {
  addresses: Address[];
}

const COUNTRY_OPTIONS = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "NL", label: "Netherlands" },
  { value: "JP", label: "Japan" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "IN", label: "India" },
  { value: "NZ", label: "New Zealand" },
  { value: "IE", label: "Ireland" },
  { value: "SE", label: "Sweden" },
  { value: "NO", label: "Norway" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
  { value: "CH", label: "Switzerland" },
  { value: "AT", label: "Austria" },
  { value: "BE", label: "Belgium" },
  { value: "PT", label: "Portugal" },
  { value: "SG", label: "Singapore" },
  { value: "KR", label: "South Korea" },
];

export const AddressesPage: FC<AddressesPageProps> = ({ addresses }) => {
  return (
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Addresses</h1>
          <p class="mt-1 text-sm text-gray-500">Manage your shipping and billing addresses.</p>
        </div>
        <a
          href="/account"
          class="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          Back to Account
        </a>
      </div>

      {/* Address Cards */}
      <div class="grid sm:grid-cols-2 gap-4 mb-8">
        {addresses.map((addr) => (
          <div
            class={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm p-5 relative ${
              addr.isDefault ? "border-brand-300 ring-1 ring-brand-100" : "border-gray-100"
            }`}
            data-address-card={addr.id}
            data-name={addr.name}
            data-line1={addr.line1}
            data-line2={addr.line2 || ""}
            data-city={addr.city}
            data-state={addr.state}
            data-zip={addr.zip}
            data-country={addr.country}
            data-phone={addr.phone || ""}
            data-label={addr.label || ""}
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-2">
                {addr.label && (
                  <span class="text-sm font-semibold text-gray-900">{addr.label}</span>
                )}
                {addr.isDefault && <Badge variant="success">Default</Badge>}
              </div>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  data-edit-address={addr.id}
                  title="Edit address"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                {!addr.isDefault && (
                  <button
                    type="button"
                    class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    data-delete-address={addr.id}
                    title="Delete address"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div class="text-sm text-gray-600 space-y-0.5">
              <p class="font-medium text-gray-900">{addr.name}</p>
              <p>{addr.line1}</p>
              {addr.line2 && <p>{addr.line2}</p>}
              <p>
                {addr.city}, {addr.state} {addr.zip}
              </p>
              <p>{addr.country}</p>
              {addr.phone && <p class="text-gray-400 mt-1">{addr.phone}</p>}
            </div>
            {!addr.isDefault && (
              <button
                type="button"
                class="mt-3 text-xs text-brand-600 hover:text-brand-700 font-medium"
                data-set-default={addr.id}
              >
                Set as default
              </button>
            )}
          </div>
        ))}

        {/* Add new address card */}
        <button
          type="button"
          id="add-address-trigger"
          class="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50/50 transition-all min-h-[180px] cursor-pointer"
        >
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
          </svg>
          <span class="text-sm font-medium">Add New Address</span>
        </button>
      </div>

      {/* Add/Edit Address Form (hidden by default) */}
      <div id="address-form-section" class="hidden">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 id="address-form-title" class="text-lg font-semibold text-gray-900">
              Add New Address
            </h2>
            <button
              type="button"
              id="address-form-close"
              class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div id="address-form-error" class="hidden mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3" role="alert"></div>

          <form id="address-form" class="space-y-4" onsubmit="return false;">
            <input type="hidden" name="addressId" value="" />

            <Input label="Label (optional)" name="label" placeholder="Home, Work, etc." />

            <Input label="Full name" name="name" required placeholder="Jane Smith" autocomplete="name" />

            <Input label="Address line 1" name="line1" required placeholder="123 Main St" autocomplete="address-line1" />

            <Input label="Address line 2" name="line2" placeholder="Apt, Suite, Unit" autocomplete="address-line2" />

            <div class="grid grid-cols-2 gap-4">
              <Input label="City" name="city" required placeholder="San Francisco" autocomplete="address-level2" />
              <Input label="State" name="state" required placeholder="CA" autocomplete="address-level1" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <Input label="ZIP / Postal code" name="zip" required placeholder="94102" autocomplete="postal-code" />
              <Select label="Country" name="country" required options={COUNTRY_OPTIONS} value="US" />
            </div>

            <Input label="Phone (optional)" name="phone" type="tel" placeholder="+1 (555) 123-4567" autocomplete="tel" />

            <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" name="isDefault" class="rounded border-gray-300 text-brand-500 focus:ring-brand-300" />
              Set as default address
            </label>

            <div class="flex items-center gap-3 pt-2">
              <Button type="submit" variant="primary" id="address-submit-btn">
                Save Address
              </Button>
              <Button type="button" variant="ghost" id="address-cancel-btn">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <div
        id="delete-confirm"
        class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      >
        <div class="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4 w-full">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Delete Address</h3>
          <p class="text-sm text-gray-500 mb-5">
            Are you sure you want to remove this address? This action cannot be undone.
          </p>
          <div class="flex items-center gap-3 justify-end">
            <Button type="button" variant="ghost" id="delete-cancel-btn">
              Cancel
            </Button>
            <Button type="button" variant="danger" id="delete-confirm-btn">
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Static trusted script — no user input interpolated */}
      {html`
        <script>
          (function() {
            var formSection = document.getElementById('address-form-section');
            var form = document.getElementById('address-form');
            var formTitle = document.getElementById('address-form-title');
            var formError = document.getElementById('address-form-error');
            var deleteConfirm = document.getElementById('delete-confirm');
            var pendingDeleteId = null;

            function showForm(title) {
              formTitle.textContent = title || 'Add New Address';
              formSection.classList.remove('hidden');
              formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            function hideForm() {
              formSection.classList.add('hidden');
              form.reset();
              form.querySelector('[name="addressId"]').value = '';
              formError.classList.add('hidden');
            }

            function populateForm(card) {
              form.querySelector('[name="label"]').value = card.dataset.label || '';
              form.querySelector('[name="name"]').value = card.dataset.name || '';
              form.querySelector('[name="line1"]').value = card.dataset.line1 || '';
              form.querySelector('[name="line2"]').value = card.dataset.line2 || '';
              form.querySelector('[name="city"]').value = card.dataset.city || '';
              form.querySelector('[name="state"]').value = card.dataset.state || '';
              form.querySelector('[name="zip"]').value = card.dataset.zip || '';
              form.querySelector('[name="phone"]').value = card.dataset.phone || '';
              var countrySelect = form.querySelector('[name="country"]');
              if (countrySelect) countrySelect.value = card.dataset.country || 'US';
            }

            document.getElementById('add-address-trigger').addEventListener('click', function() {
              showForm('Add New Address');
            });

            document.getElementById('address-form-close').addEventListener('click', hideForm);
            document.getElementById('address-cancel-btn').addEventListener('click', hideForm);

            document.querySelectorAll('[data-edit-address]').forEach(function(btn) {
              btn.addEventListener('click', function() {
                var id = this.getAttribute('data-edit-address');
                form.querySelector('[name="addressId"]').value = id;
                var card = document.querySelector('[data-address-card="' + id + '"]');
                if (card) populateForm(card);
                showForm('Edit Address');
              });
            });

            document.querySelectorAll('[data-delete-address]').forEach(function(btn) {
              btn.addEventListener('click', function() {
                pendingDeleteId = this.getAttribute('data-delete-address');
                deleteConfirm.classList.remove('hidden');
              });
            });

            document.getElementById('delete-cancel-btn').addEventListener('click', function() {
              deleteConfirm.classList.add('hidden');
              pendingDeleteId = null;
            });

            document.getElementById('delete-confirm-btn').addEventListener('click', async function() {
              if (!pendingDeleteId) return;
              try {
                var res = await fetch('/api/auth/addresses/' + pendingDeleteId, { method: 'DELETE' });
                if (!res.ok) throw new Error('Failed to delete');
                window.location.reload();
              } catch (err) {
                alert(err.message);
              } finally {
                deleteConfirm.classList.add('hidden');
                pendingDeleteId = null;
              }
            });

            document.querySelectorAll('[data-set-default]').forEach(function(btn) {
              btn.addEventListener('click', async function() {
                var id = this.getAttribute('data-set-default');
                try {
                  var res = await fetch('/api/auth/addresses/' + id, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isDefault: true }),
                  });
                  if (!res.ok) throw new Error('Failed to update');
                  window.location.reload();
                } catch (err) {
                  alert(err.message);
                }
              });
            });

            form.addEventListener('submit', async function(e) {
              e.preventDefault();
              var btn = document.getElementById('address-submit-btn');
              btn.disabled = true;
              formError.classList.add('hidden');

              var fd = new FormData(this);
              var addressId = fd.get('addressId');
              var url = addressId
                ? '/api/auth/addresses/' + addressId
                : '/api/auth/addresses';
              var method = addressId ? 'PATCH' : 'POST';

              try {
                var street = String(fd.get('line1') || '');
                var line2 = String(fd.get('line2') || '');
                if (line2) street = street + ', ' + line2;
                var res = await fetch(url, {
                  method: method,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    label: fd.get('label'),
                    street: street,
                    city: fd.get('city'),
                    state: fd.get('state'),
                    zip: fd.get('zip'),
                    country: String(fd.get('country') || 'US').toUpperCase().slice(0, 2),
                    isDefault: !!fd.get('isDefault'),
                  }),
                });

                if (!res.ok) {
                  var data = await res.json().catch(function() { return {}; });
                  throw new Error(data.error || data.message || 'Failed to save address');
                }

                window.location.reload();
              } catch (err) {
                formError.textContent = err.message;
                formError.classList.remove('hidden');
                btn.disabled = false;
              }
            });
          })();
        </script>
      `}
    </div>
  );
};
