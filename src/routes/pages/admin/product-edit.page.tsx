import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { Textarea } from "../../../components/ui/textarea";
import { Badge } from "../../../components/ui/badge";

interface VariantRow {
  id: string;
  title: string;
  sku: string | null;
  price: string;
  compareAtPrice: string | null;
  inventoryQuantity: number;
  availableForSale: boolean;
  fulfillmentProvider: string | null;
}

interface ImageRow {
  id: string;
  url: string;
  altText: string | null;
  position: number;
}

interface ProductEditPageProps {
  product: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    descriptionHtml: string | null;
    type: string;
    status: string;
    availableForSale: boolean;
    featuredImageUrl: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
  };
  variants: VariantRow[];
  images: ImageRow[];
  isNew?: boolean;
}

const PRODUCT_TYPE_OPTIONS = [
  { value: "physical", label: "Physical" },
  { value: "digital", label: "Digital" },
  { value: "subscription", label: "Subscription" },
  { value: "bookable", label: "Bookable" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const PROVIDER_OPTIONS = [
  { value: "", label: "None" },
  { value: "printful", label: "Printful" },
  { value: "gooten", label: "Gooten" },
  { value: "prodigi", label: "Prodigi" },
  { value: "shapeways", label: "Shapeways" },
];

export const ProductEditPage: FC<ProductEditPageProps> = ({
  product,
  variants,
  images,
  isNew,
}) => {
  return (
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isNew ? "New Product" : `Edit: ${product.name}`}
          </h1>
          {!isNew && (
            <p class="mt-1 text-sm text-gray-500">
              /{product.slug}
            </p>
          )}
        </div>
        <a
          href="/admin/products"
          class="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          Back to Products
        </a>
      </div>

      <div id="product-success" class="hidden mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3" role="status" />
      <div id="product-error" class="hidden mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3" role="alert" />

      {/* Product Details */}
      <section class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">Details</h2>

        <form id="product-form" class="space-y-5" data-product-id={product.id}>
          <Input
            label="Product name"
            name="name"
            value={product.name}
            required
          />

          <Textarea
            label="Description"
            name="description"
            value={product.description || ""}
            rows={4}
          />

          <div class="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              name="type"
              options={PRODUCT_TYPE_OPTIONS}
              value={product.type}
              required
            />
            <Select
              label="Status"
              name="status"
              options={STATUS_OPTIONS}
              value={product.status}
              required
            />
          </div>

          <Input
            label="Featured image URL"
            name="featuredImageUrl"
            type="url"
            value={product.featuredImageUrl || ""}
          />

          <Button type="submit" variant="primary" id="product-save-btn">
            Save Product
          </Button>
        </form>
      </section>

      {/* SEO Section */}
      <section class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">SEO</h2>

        <form id="seo-form" class="space-y-5" data-product-id={product.id}>
          <Input
            label="SEO title"
            name="seoTitle"
            value={product.seoTitle || ""}
            helperText="Recommended: 50-60 characters"
          />

          <Textarea
            label="SEO description"
            name="seoDescription"
            value={product.seoDescription || ""}
            rows={2}
            helperText="Recommended: 120-160 characters"
          />

          <Input
            label="URL slug"
            name="slug"
            value={product.slug}
          />

          {/* SERP Preview */}
          <div class="rounded-xl border border-gray-200 p-4 bg-gray-50 dark:bg-gray-900">
            <p class="text-xs text-gray-400 mb-2 uppercase tracking-wide">Google Preview</p>
            <div>
              <p id="serp-title" class="text-blue-700 text-base font-medium truncate">
                {product.seoTitle || product.name}
              </p>
              <p id="serp-url" class="text-green-700 text-xs truncate">
                example.com/products/{product.slug}
              </p>
              <p id="serp-desc" class="text-gray-600 text-sm line-clamp-2 mt-0.5">
                {product.seoDescription || product.description || "No description set."}
              </p>
            </div>
          </div>

          <Button type="submit" variant="primary" id="seo-save-btn">
            Save SEO
          </Button>
        </form>
      </section>

      {/* Variants Section */}
      {!isNew && (
        <section class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Variants ({variants.length})
            </h2>
            <Button type="button" variant="secondary" id="add-variant-btn" size="sm">
              Add Variant
            </Button>
          </div>

          {variants.length === 0 ? (
            <p class="text-sm text-gray-400 text-center py-4">No variants yet.</p>
          ) : (
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="border-b border-gray-100">
                  <tr>
                    <th class="text-left px-3 py-2 font-medium text-gray-500">Title</th>
                    <th class="text-left px-3 py-2 font-medium text-gray-500">SKU</th>
                    <th class="text-left px-3 py-2 font-medium text-gray-500">Price</th>
                    <th class="text-left px-3 py-2 font-medium text-gray-500">Inventory</th>
                    <th class="text-left px-3 py-2 font-medium text-gray-500">Provider</th>
                    <th class="text-right px-3 py-2 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                  {variants.map((v) => (
                    <tr
                      data-variant-id={v.id}
                      data-title={v.title}
                      data-sku={v.sku || ""}
                      data-price={v.price}
                      data-compare-at-price={v.compareAtPrice || ""}
                      data-inventory={String(v.inventoryQuantity)}
                      data-provider={v.fulfillmentProvider || ""}
                    >
                      <td class="px-3 py-2 font-medium text-gray-900">{v.title}</td>
                      <td class="px-3 py-2 text-gray-500">{v.sku || "—"}</td>
                      <td class="px-3 py-2">
                        <span class="font-medium">${v.price}</span>
                        {v.compareAtPrice && (
                          <span class="ml-1 text-xs text-gray-400 line-through">${v.compareAtPrice}</span>
                        )}
                      </td>
                      <td class="px-3 py-2">
                        <span class={Number(v.inventoryQuantity) <= 0 ? "text-red-600" : ""}>
                          {v.inventoryQuantity}
                        </span>
                      </td>
                      <td class="px-3 py-2">
                        {v.fulfillmentProvider ? (
                          <Badge variant="info">{v.fulfillmentProvider}</Badge>
                        ) : (
                          <span class="text-gray-400">—</span>
                        )}
                      </td>
                      <td class="px-3 py-2 text-right">
                        <button
                          type="button"
                          class="p-1 text-gray-400 hover:text-brand-600 transition-colors"
                          data-edit-variant={v.id}
                          title="Edit"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Variant form (hidden by default) */}
          <div id="variant-form-section" class="hidden mt-5 p-4 rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-900">
            <h3 id="variant-form-title" class="text-sm font-semibold text-gray-900 mb-3">Add Variant</h3>
            <form id="variant-form" class="space-y-4">
              <input type="hidden" name="variantId" value="" />
              <div class="grid grid-cols-2 gap-4">
                <Input label="Title" name="title" required />
                <Input label="SKU" name="sku" />
              </div>
              <div class="grid grid-cols-3 gap-4">
                <Input label="Price" name="price" required placeholder="0.00" />
                <Input label="Compare at price" name="compareAtPrice" placeholder="0.00" />
                <Input label="Inventory" name="inventoryQuantity" type="number" value="0" />
              </div>
              <Select label="Fulfillment provider" name="fulfillmentProvider" options={PROVIDER_OPTIONS} />
              <div class="flex items-center gap-3">
                <Button type="submit" variant="primary" id="variant-save-btn" size="sm">
                  Save Variant
                </Button>
                <Button type="button" variant="ghost" id="variant-cancel-btn" size="sm">
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* Images Section */}
      {!isNew && (
        <section class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">
            Images ({images.length})
          </h2>

          <div class="grid grid-cols-4 gap-3 mb-4">
            {images.map((img) => (
              <div class="relative rounded-xl overflow-hidden border border-gray-200 aspect-square bg-gray-50">
                <img src={img.url} alt={img.altText || ""} class="w-full h-full object-cover" />
                <span class="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                  {img.position + 1}
                </span>
              </div>
            ))}
          </div>

          <p class="text-xs text-gray-400">Image management via API: POST /api/admin/products/{product.id}/images</p>
        </section>
      )}

      {/* Static trusted script — no user input interpolated */}
      {html`
        <script>
          (function() {
            /* Product form */
            var productForm = document.getElementById('product-form');
            if (productForm) {
              productForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                var btn = document.getElementById('product-save-btn');
                var successEl = document.getElementById('product-success');
                var errorEl = document.getElementById('product-error');
                btn.disabled = true;
                successEl.classList.add('hidden');
                errorEl.classList.add('hidden');

                var fd = new FormData(this);
                var productId = this.dataset.productId;

                try {
                  var res = await fetch('/api/admin/products/' + productId, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: fd.get('name'),
                      description: fd.get('description') || undefined,
                      type: fd.get('type'),
                      status: fd.get('status'),
                      featuredImageUrl: fd.get('featuredImageUrl') || null,
                    }),
                  });
                  if (!res.ok) {
                    var data = await res.json().catch(function() { return {}; });
                    throw new Error(data.message || 'Failed to save product');
                  }
                  successEl.textContent = 'Product saved.';
                  successEl.classList.remove('hidden');
                } catch (err) {
                  errorEl.textContent = err.message;
                  errorEl.classList.remove('hidden');
                } finally {
                  btn.disabled = false;
                }
              });
            }

            /* SEO form */
            var seoForm = document.getElementById('seo-form');
            if (seoForm) {
              seoForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                var btn = document.getElementById('seo-save-btn');
                var successEl = document.getElementById('product-success');
                var errorEl = document.getElementById('product-error');
                btn.disabled = true;
                successEl.classList.add('hidden');
                errorEl.classList.add('hidden');

                var fd = new FormData(this);
                var productId = this.dataset.productId;

                try {
                  var res = await fetch('/api/admin/products/' + productId, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      seoTitle: fd.get('seoTitle') || undefined,
                      seoDescription: fd.get('seoDescription') || undefined,
                      slug: fd.get('slug') || undefined,
                    }),
                  });
                  if (!res.ok) {
                    var data = await res.json().catch(function() { return {}; });
                    throw new Error(data.message || 'Failed to save SEO');
                  }
                  successEl.textContent = 'SEO updated.';
                  successEl.classList.remove('hidden');
                } catch (err) {
                  errorEl.textContent = err.message;
                  errorEl.classList.remove('hidden');
                } finally {
                  btn.disabled = false;
                }
              });

              /* Live SERP preview */
              var titleInput = seoForm.querySelector('[name="seoTitle"]');
              var descInput = seoForm.querySelector('[name="seoDescription"]');
              var slugInput = seoForm.querySelector('[name="slug"]');
              if (titleInput) titleInput.addEventListener('input', function() {
                var el = document.getElementById('serp-title');
                if (el) el.textContent = this.value || 'Untitled';
              });
              if (descInput) descInput.addEventListener('input', function() {
                var el = document.getElementById('serp-desc');
                if (el) el.textContent = this.value || 'No description set.';
              });
              if (slugInput) slugInput.addEventListener('input', function() {
                var el = document.getElementById('serp-url');
                if (el) el.textContent = 'example.com/products/' + this.value;
              });
            }

            /* Variant form */
            var variantFormSection = document.getElementById('variant-form-section');
            var variantForm = document.getElementById('variant-form');
            var addVariantBtn = document.getElementById('add-variant-btn');
            var cancelVariantBtn = document.getElementById('variant-cancel-btn');

            if (addVariantBtn) {
              addVariantBtn.addEventListener('click', function() {
                if (variantForm) variantForm.reset();
                if (variantForm) variantForm.querySelector('[name="variantId"]').value = '';
                document.getElementById('variant-form-title').textContent = 'Add Variant';
                variantFormSection.classList.remove('hidden');
              });
            }

            if (cancelVariantBtn) {
              cancelVariantBtn.addEventListener('click', function() {
                variantFormSection.classList.add('hidden');
              });
            }

            document.querySelectorAll('[data-edit-variant]').forEach(function(btn) {
              btn.addEventListener('click', function() {
                var row = this.closest('tr');
                if (!row || !variantForm) return;
                variantForm.querySelector('[name="variantId"]').value = row.dataset.variantId || '';
                variantForm.querySelector('[name="title"]').value = row.dataset.title || '';
                variantForm.querySelector('[name="sku"]').value = row.dataset.sku || '';
                variantForm.querySelector('[name="price"]').value = row.dataset.price || '';
                variantForm.querySelector('[name="compareAtPrice"]').value = row.dataset.compareAtPrice || '';
                variantForm.querySelector('[name="inventoryQuantity"]').value = row.dataset.inventory || '0';
                var providerSelect = variantForm.querySelector('[name="fulfillmentProvider"]');
                if (providerSelect) providerSelect.value = row.dataset.provider || '';
                document.getElementById('variant-form-title').textContent = 'Edit Variant';
                variantFormSection.classList.remove('hidden');
              });
            });

            if (variantForm) {
              variantForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                var btn = document.getElementById('variant-save-btn');
                var successEl = document.getElementById('product-success');
                var errorEl = document.getElementById('product-error');
                btn.disabled = true;
                successEl.classList.add('hidden');
                errorEl.classList.add('hidden');

                var fd = new FormData(this);
                var variantId = fd.get('variantId');
                var productId = document.getElementById('product-form').dataset.productId;
                var url = variantId
                  ? '/api/admin/products/' + productId + '/variants/' + variantId
                  : '/api/admin/products/' + productId + '/variants';
                var method = variantId ? 'PATCH' : 'POST';

                try {
                  var body = {
                    title: fd.get('title'),
                    price: fd.get('price'),
                    sku: fd.get('sku') || undefined,
                    compareAtPrice: fd.get('compareAtPrice') || undefined,
                    inventoryQuantity: Number(fd.get('inventoryQuantity')) || 0,
                    fulfillmentProvider: fd.get('fulfillmentProvider') || undefined,
                  };
                  var res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                  });
                  if (!res.ok) {
                    var data = await res.json().catch(function() { return {}; });
                    throw new Error(data.message || 'Failed to save variant');
                  }
                  window.location.reload();
                } catch (err) {
                  errorEl.textContent = err.message;
                  errorEl.classList.remove('hidden');
                  btn.disabled = false;
                }
              });
            }
          })();
        </script>
      `}
    </div>
  );
};
