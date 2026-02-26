import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { PageHeader } from "../../../components/ui/page-header";
import { EmptyState } from "../../../components/ui/empty-state";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";

interface CollectionRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
}

interface AdminCollectionsPageProps {
  collections: CollectionRow[];
}

export const AdminCollectionsPage: FC<AdminCollectionsPageProps> = ({
  collections,
}) => {
  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <PageHeader
        title="Collections"
        actions={
          <button
            type="button"
            id="btn-new-collection"
            class="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New Collection
          </button>
        }
      />

      <div id="collection-success" class="hidden mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3" role="status" />
      <div id="collection-error" class="hidden mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3" role="alert" />

      {/* Collection Form (hidden by default) */}
      <div id="collection-form-section" class="hidden mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h2 id="collection-form-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">New Collection</h2>
        <form id="collection-form" class="space-y-4">
          <input type="hidden" name="collectionId" value="" />
          <Input label="Name" name="name" required />
          <Textarea label="Description" name="description" rows={3} />
          <Input label="Image URL" name="imageUrl" type="url" />
          <Input label="SEO Title" name="seoTitle" />
          <Input label="SEO Description" name="seoDescription" />
          <div class="flex items-center gap-3 pt-2">
            <Button type="submit">Save Collection</Button>
            <button type="button" id="btn-cancel-collection" class="text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </form>
      </div>

      {collections.length === 0 ? (
        <EmptyState
          title="No collections yet"
          description="Create your first collection to organize products."
        />
      ) : (
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-gray-500">Collection</th>
                <th class="text-left px-4 py-3 font-medium text-gray-500">Slug</th>
                <th class="text-left px-4 py-3 font-medium text-gray-500">Products</th>
                <th class="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              {collections.map((col) => (
                <tr
                  class="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  data-collection-row
                  data-id={col.id}
                  data-name={col.name}
                  data-slug={col.slug}
                  data-description={col.description ?? ""}
                  data-image-url={col.imageUrl ?? ""}
                >
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                        {col.imageUrl ? (
                          <img src={col.imageUrl} alt={col.name} class="w-full h-full object-cover" />
                        ) : (
                          <div class="w-full h-full flex items-center justify-center text-gray-300">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <span class="font-medium text-gray-900 dark:text-gray-100">{col.name}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-gray-500">/{col.slug}</td>
                  <td class="px-4 py-3 text-gray-600">{col.productCount}</td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        class="btn-edit-collection p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        title="Edit"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        class="btn-delete-collection p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
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

      {html`
        <script>
          (function() {
            var formSection = document.getElementById('collection-form-section');
            var formTitle = document.getElementById('collection-form-title');
            var form = document.getElementById('collection-form');
            var successEl = document.getElementById('collection-success');
            var errorEl = document.getElementById('collection-error');

            function showForm(title) {
              formTitle.textContent = title;
              formSection.classList.remove('hidden');
              formSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            function hideForm() {
              formSection.classList.add('hidden');
              form.reset();
              form.querySelector('[name=collectionId]').value = '';
            }

            function flash(el, msg) {
              el.textContent = msg;
              el.classList.remove('hidden');
              setTimeout(function() { el.classList.add('hidden'); }, 4000);
            }

            document.getElementById('btn-new-collection').addEventListener('click', function() {
              hideForm();
              showForm('New Collection');
            });

            document.getElementById('btn-cancel-collection').addEventListener('click', hideForm);

            document.querySelectorAll('.btn-edit-collection').forEach(function(btn) {
              btn.addEventListener('click', function() {
                var row = btn.closest('[data-collection-row]');
                form.querySelector('[name=collectionId]').value = row.dataset.id;
                form.querySelector('[name=name]').value = row.dataset.name;
                form.querySelector('[name=description]').value = row.dataset.description;
                form.querySelector('[name=imageUrl]').value = row.dataset.imageUrl;
                showForm('Edit Collection');
              });
            });

            document.querySelectorAll('.btn-delete-collection').forEach(function(btn) {
              btn.addEventListener('click', function() {
                var row = btn.closest('[data-collection-row]');
                if (!confirm('Delete collection "' + row.dataset.name + '"?')) return;
                fetch('/api/admin/collections/' + row.dataset.id, { method: 'DELETE' })
                  .then(function(r) {
                    if (!r.ok) throw new Error('Delete failed');
                    row.remove();
                    flash(successEl, 'Collection deleted.');
                  })
                  .catch(function() { flash(errorEl, 'Failed to delete collection.'); });
              });
            });

            form.addEventListener('submit', function(e) {
              e.preventDefault();
              var id = form.querySelector('[name=collectionId]').value;
              var body = {
                name: form.querySelector('[name=name]').value,
                description: form.querySelector('[name=description]').value || undefined,
                imageUrl: form.querySelector('[name=imageUrl]').value || undefined,
                seoTitle: form.querySelector('[name=seoTitle]').value || undefined,
                seoDescription: form.querySelector('[name=seoDescription]').value || undefined,
              };
              var url = id ? '/api/admin/collections/' + id : '/api/admin/collections';
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
                  hideForm();
                  flash(successEl, id ? 'Collection updated.' : 'Collection created.');
                  setTimeout(function() { location.reload(); }, 800);
                })
                .catch(function() { flash(errorEl, 'Failed to save collection.'); });
            });
          })();
        </script>
      `}
    </div>
  );
};
