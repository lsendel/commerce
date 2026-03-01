import type { FC } from "hono/jsx";

interface StoreTemplateRow {
  id: string;
  name: string;
  description: string | null;
  sourceStoreId: string;
  snapshotVersion: number;
  productCount: number;
  collectionCount: number;
  settingCount: number;
  createdAt: string;
  updatedAt: string;
}

interface StoreTemplatesPageProps {
  templates: StoreTemplateRow[];
}

export const StoreTemplatesPage: FC<StoreTemplatesPageProps> = ({ templates }) => {
  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="mb-8 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 px-6 py-5">
        <nav class="text-xs text-orange-700/80 mb-1">
          <a href="/admin" class="hover:text-orange-900">Admin</a>
          <span class="mx-1">/</span>
          <span class="text-orange-900">Store Templates</span>
        </nav>
        <h1 class="text-2xl font-bold text-slate-900">Store Templates and Clone</h1>
        <p class="mt-1 text-sm text-slate-600">
          Capture reusable store snapshots and bootstrap new stores in one step.
        </p>
      </div>

      <section class="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900">Capture Template</h2>
        <p class="text-sm text-gray-500 mt-1">Creates a snapshot of current store settings, products, variants, images, and collections.</p>

        <form id="store-template-form" class="mt-4 grid lg:grid-cols-3 gap-4 items-end">
          <div>
            <label for="store-template-name" class="block text-xs font-medium text-gray-600 mb-1">Template Name</label>
            <input
              id="store-template-name"
              name="name"
              type="text"
              required
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Holiday US storefront"
            />
          </div>
          <div class="lg:col-span-2">
            <label for="store-template-description" class="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input
              id="store-template-description"
              name="description"
              type="text"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Preconfigured launch stack for Q4"
            />
          </div>
        </form>

        <div class="mt-4 flex items-center gap-2">
          <button type="button" id="store-template-create-btn" class="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100">
            Create Template
          </button>
          <button type="button" id="store-template-refresh-btn" class="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            Refresh
          </button>
          <p id="store-template-status" class="text-xs text-gray-500" />
        </div>

        <div id="store-template-error" class="hidden mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" />
      </section>

      <section class="rounded-2xl border border-gray-200 bg-white p-6">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Saved Templates</h2>
            <p class="text-sm text-gray-500 mt-1">Clone a new store from any template with a unique slug/subdomain.</p>
          </div>
        </div>

        <div id="store-template-list" class="mt-4 space-y-2">
          {templates.length === 0 ? (
            <p class="text-sm text-gray-400">No templates saved yet.</p>
          ) : (
            templates.map((template) => (
              <article class="rounded-lg border border-gray-200 px-4 py-3" data-template-id={template.id}>
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="font-medium text-gray-900">{template.name}</p>
                    {template.description && <p class="text-xs text-gray-600 mt-0.5">{template.description}</p>}
                    <p class="text-xs text-gray-500 mt-1">
                      Snapshot v{template.snapshotVersion} · {template.productCount} products · {template.collectionCount} collections · {template.settingCount} settings
                    </p>
                  </div>
                  <button type="button" class="store-template-delete-btn rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700" data-template-id={template.id}>
                    Delete
                  </button>
                </div>

                <div class="mt-3 grid lg:grid-cols-4 gap-2 items-end">
                  <div>
                    <label class="block text-[11px] font-medium text-gray-500 mb-1">Store Name</label>
                    <input type="text" class="store-template-clone-name w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs" placeholder="Acme Clone" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-medium text-gray-500 mb-1">Store Slug</label>
                    <input type="text" class="store-template-clone-slug w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs" placeholder="acme-clone" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-medium text-gray-500 mb-1">Subdomain (optional)</label>
                    <input type="text" class="store-template-clone-subdomain w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs" placeholder="acme-clone" />
                  </div>
                  <div class="flex items-center gap-2">
                    <button type="button" class="store-template-clone-btn rounded-md border border-cyan-300 bg-cyan-50 px-2 py-1.5 text-xs font-semibold text-cyan-700" data-template-id={template.id}>
                      Clone Store
                    </button>
                  </div>
                </div>

                <div class="mt-2 flex items-center gap-3 text-[11px] text-gray-600">
                  <label class="inline-flex items-center gap-1">
                    <input type="checkbox" class="store-template-copy-settings" checked />
                    <span>copy settings</span>
                  </label>
                  <label class="inline-flex items-center gap-1">
                    <input type="checkbox" class="store-template-copy-products" checked />
                    <span>copy products</span>
                  </label>
                  <label class="inline-flex items-center gap-1">
                    <input type="checkbox" class="store-template-copy-collections" checked />
                    <span>copy collections</span>
                  </label>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <script src="/scripts/admin-store-templates.js" defer></script>
    </div>
  );
};
