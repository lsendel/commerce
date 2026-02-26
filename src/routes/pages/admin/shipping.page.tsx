import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

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
];

export const ShippingPage: FC<ShippingPageProps> = ({ zones }) => {
  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <nav class="text-xs text-gray-400 mb-1">
            <a href="/admin" class="hover:text-gray-600">Admin</a>
            <span class="mx-1">/</span>
            <span class="text-gray-600">Shipping Zones</span>
          </nav>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Shipping Zones</h1>
        </div>
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
      </div>

      {/* Add/Edit Zone Form */}
      <div id="zone-form-section" class="hidden mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 id="zone-form-title" class="text-lg font-semibold text-gray-900 mb-4">Add Shipping Zone</h2>
        <form id="zone-form" onsubmit="return false;" class="space-y-4">
          <input type="hidden" name="zoneId" value="" />
          <Input label="Zone Name" name="zoneName" required placeholder="e.g. North America" />
          <div>
            <label class="text-sm font-medium text-gray-700 block mb-1.5">Countries</label>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto border rounded-lg p-3">
              {COUNTRY_OPTIONS.map((c) => (
                <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" name="countries" value={c.value} class="rounded" />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
          <div class="flex gap-3 pt-2">
            <Button type="submit" variant="primary" id="zone-save-btn">Save Zone</Button>
            <Button type="button" variant="ghost" id="btn-cancel-zone">Cancel</Button>
          </div>
        </form>
      </div>

      {/* Zone Cards */}
      {zones.length === 0 ? (
        <div class="text-center py-12">
          <svg class="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="text-sm font-medium text-gray-900">No shipping zones</h3>
          <p class="mt-1 text-sm text-gray-500">Create your first shipping zone to configure delivery rates.</p>
        </div>
      ) : (
        <div class="space-y-6">
          {zones.map((zone) => (
            <div key={zone.id} class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden" data-zone-id={zone.id}>
              <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">{zone.name}</h3>
                  <div class="flex flex-wrap gap-1 mt-1">
                    {zone.countries.slice(0, 5).map((c) => (
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">{c}</span>
                    ))}
                    {zone.countries.length > 5 && (
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-brand-50 text-brand-700">+{zone.countries.length - 5} more</span>
                    )}
                  </div>
                </div>
                <div class="flex gap-2">
                  <button type="button" class="text-xs text-brand-600 hover:text-brand-700 font-medium" data-edit-zone={zone.id}>Edit</button>
                  <button type="button" class="text-xs text-red-600 hover:text-red-700 font-medium" data-delete-zone={zone.id}>Delete</button>
                </div>
              </div>
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Delivery</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                  {zone.rates.length === 0 ? (
                    <tr><td colspan={4} class="px-4 py-4 text-center text-sm text-gray-400">No rates configured</td></tr>
                  ) : (
                    zone.rates.map((rate) => (
                      <tr key={rate.id}>
                        <td class="px-4 py-2 text-sm">{rate.name}</td>
                        <td class="px-4 py-2 text-sm text-gray-500">{rate.minWeight ?? "0"} - {rate.maxWeight ?? "Any"} kg</td>
                        <td class="px-4 py-2 text-sm font-medium">${Number(rate.price).toFixed(2)} {rate.currency}</td>
                        <td class="px-4 py-2 text-sm text-gray-500">{rate.minDeliveryDays}-{rate.maxDeliveryDays} days</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {html`
        <script>
          (function() {
            var formSection = document.getElementById('zone-form-section');
            var form = document.getElementById('zone-form');
            document.getElementById('btn-add-zone').addEventListener('click', function() {
              formSection.classList.remove('hidden');
            });
            document.getElementById('btn-cancel-zone').addEventListener('click', function() {
              formSection.classList.add('hidden');
              form.reset();
            });
            form.addEventListener('submit', async function(e) {
              e.preventDefault();
              var fd = new FormData(this);
              var zoneId = fd.get('zoneId');
              var countries = fd.getAll('countries');
              var url = zoneId ? '/api/admin/shipping/zones/' + zoneId : '/api/admin/shipping/zones';
              var method = zoneId ? 'PATCH' : 'POST';
              try {
                var res = await fetch(url, {
                  method: method,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: fd.get('zoneName'), countries: countries }),
                });
                if (!res.ok) throw new Error('Failed to save zone');
                window.location.reload();
              } catch (err) { alert(err.message); }
            });
            document.querySelectorAll('[data-delete-zone]').forEach(function(btn) {
              btn.addEventListener('click', async function() {
                if (!confirm('Delete this shipping zone?')) return;
                var id = this.getAttribute('data-delete-zone');
                try {
                  var res = await fetch('/api/admin/shipping/zones/' + id, { method: 'DELETE' });
                  if (!res.ok) throw new Error('Failed to delete');
                  window.location.reload();
                } catch (err) { alert(err.message); }
              });
            });
          })();
        </script>
      `}
    </div>
  );
};
