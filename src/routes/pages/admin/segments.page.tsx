import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Button } from "../../../components/ui/button";

interface SegmentRow {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  lastRefreshedAt: string | null;
  createdAt: string;
}

interface SegmentsPageProps {
  segments: SegmentRow[];
}

export const SegmentsPage: FC<SegmentsPageProps> = ({ segments }) => {
  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <nav class="text-xs text-gray-400 mb-1">
            <a href="/admin" class="hover:text-gray-600">Admin</a>
            <span class="mx-1">/</span>
            <a href="/admin/promotions" class="hover:text-gray-600">Promotions</a>
            <span class="mx-1">/</span>
            <span class="text-gray-600">Customer Segments</span>
          </nav>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Customer Segments</h1>
        </div>
        <button
          type="button"
          id="btn-add-segment"
          class="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Segment
        </button>
      </div>

      {/* Add Segment Form */}
      <div id="segment-form-section" class="hidden mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Create Customer Segment</h2>
        <form id="segment-form" onsubmit="return false;" class="space-y-4">
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-700 block mb-1">Segment Name</label>
              <input type="text" name="name" required placeholder="e.g. VIP Customers" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700 block mb-1">Description</label>
              <input type="text" name="description" placeholder="Optional description" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div class="flex gap-3 pt-2">
            <Button type="submit" variant="primary" id="segment-save-btn">Create Segment</Button>
            <Button type="button" variant="ghost" id="btn-cancel-segment">Cancel</Button>
          </div>
        </form>
      </div>

      {/* Segments Grid */}
      {segments.length === 0 ? (
        <div class="text-center py-12">
          <svg class="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 class="text-sm font-medium text-gray-900">No customer segments</h3>
          <p class="mt-1 text-sm text-gray-500">Create segments to target promotions at specific customer groups.</p>
        </div>
      ) : (
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map((seg) => (
            <div key={seg.id} class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
              <h3 class="font-semibold text-gray-900 dark:text-gray-100">{seg.name}</h3>
              {seg.description && (
                <p class="text-sm text-gray-500 mt-1">{seg.description}</p>
              )}
              <div class="mt-4 flex items-center justify-between">
                <div>
                  <p class="text-2xl font-bold text-gray-900">{seg.memberCount}</p>
                  <p class="text-xs text-gray-500">members</p>
                </div>
                <div class="text-right text-xs text-gray-400">
                  {seg.lastRefreshedAt ? `Refreshed ${seg.lastRefreshedAt}` : "Never refreshed"}
                </div>
              </div>
              <div class="mt-4 flex gap-2">
                <button type="button" class="refresh-btn text-xs text-brand-600 hover:text-brand-700 font-medium" data-segment-id={seg.id}>Refresh</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {html`
        <script>
          (function() {
            function showSegmentsError(message) {
              if (window.showToast) {
                window.showToast(message, 'error');
                return;
              }
              var banner = document.getElementById('admin-segments-flash');
              if (!banner) {
                banner = document.createElement('div');
                banner.id = 'admin-segments-flash';
                banner.className = 'fixed top-4 right-4 z-50 max-w-sm rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-lg';
                document.body.appendChild(banner);
              }
              banner.textContent = message;
              banner.classList.remove('hidden');
              setTimeout(function() { banner.classList.add('hidden'); }, 4000);
            }

            var formSection = document.getElementById('segment-form-section');
            var form = document.getElementById('segment-form');
            document.getElementById('btn-add-segment').addEventListener('click', function() {
              formSection.classList.remove('hidden');
            });
            document.getElementById('btn-cancel-segment').addEventListener('click', function() {
              formSection.classList.add('hidden');
              form.reset();
            });
            form.addEventListener('submit', async function(e) {
              e.preventDefault();
              var fd = new FormData(this);
              var body = {
                name: fd.get('name'),
                description: fd.get('description') || undefined,
                rules: {},
              };
              try {
                var res = await fetch('/api/promotions/segments', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                });
                if (!res.ok) {
                  var data = await res.json().catch(function() { return {}; });
                  throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to create segment') : (data.error || data.message || 'Failed to create segment'));
                }
                window.location.reload();
              } catch (err) { showSegmentsError(err.message || 'Failed to create segment'); }
            });

            document.querySelectorAll('.refresh-btn').forEach(function(btn) {
              btn.addEventListener('click', async function() {
                var segmentId = this.getAttribute('data-segment-id');
                if (!segmentId) return;
                this.setAttribute('disabled', 'true');
                try {
                  var res = await fetch('/api/promotions/segments/' + segmentId + '/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                  });
                  if (!res.ok) {
                    var data = await res.json().catch(function() { return {}; });
                    throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to refresh segment') : (data.error || data.message || 'Failed to refresh segment'));
                  }
                  window.location.reload();
                } catch (err) {
                  showSegmentsError(err.message || 'Failed to refresh segment');
                  this.removeAttribute('disabled');
                }
              });
            });
          })();
        </script>
      `}
    </div>
  );
};
