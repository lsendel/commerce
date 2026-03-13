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
  providerId?: string | null;
  externalProductId?: string | null;
  externalVariantId?: string | null;
  costPrice?: string | null;
}

interface ImageRow {
  id: string;
  url: string;
  altText: string | null;
  position: number;
}

interface ProviderOption {
  id: string;
  name: string;
  type: string;
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
  providers?: ProviderOption[];
  printfulSyncProductId?: number | null;
  isNew?: boolean;
  isMerchCopilotEnabled?: boolean;
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
  providers = [],
  printfulSyncProductId = null,
  isNew,
  isMerchCopilotEnabled = false,
}) => {
  const providerSelectOptions = providers.map((provider) => ({
    value: provider.id,
    label: `${provider.name} (${provider.type})`,
  }));
  const defaultMockupImageUrl =
    product.featuredImageUrl || images[0]?.url || "";
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

      {/* Merchandising Copilot */}
      {isMerchCopilotEnabled && (
        <section class="bg-white dark:bg-gray-800 rounded-2xl border border-brand-100 dark:border-brand-900/50 shadow-sm p-6 mb-6">
          <div class="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Merchandising Copilot</h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Draft or enrich product copy and SEO fields with built-in copy guardrails.
              </p>
            </div>
            <Badge variant="info">Phase 1</Badge>
          </div>

          <div class="space-y-4">
            <Textarea
              label="Brief"
              name="copilotBrief"
              value=""
              rows={3}
              helperText="Describe product intent, outcomes, and differentiators."
              required
            />

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Audience"
                name="copilotAudience"
                value=""
                placeholder="e.g. first-time dog owners"
              />
              <Select
                label="Tone"
                name="copilotTone"
                options={[
                  { value: "warm", label: "Warm" },
                  { value: "playful", label: "Playful" },
                  { value: "premium", label: "Premium" },
                  { value: "minimal", label: "Minimal" },
                  { value: "clinical", label: "Clinical" },
                ]}
                value="warm"
              />
            </div>

            <Input
              label="Key features (comma separated)"
              name="copilotFeatures"
              value=""
              placeholder="e.g. scratch-resistant, machine washable, odor-resistant"
            />

            <div class="flex flex-wrap items-center gap-3">
              <Button type="button" variant="secondary" id="copilot-generate-btn" size="sm">
                Generate Suggestions
              </Button>
              <Button type="button" variant="primary" id="copilot-apply-btn" size="sm" class="hidden">
                Apply to Forms
              </Button>
              <p id="copilot-status" class="text-sm text-gray-500 dark:text-gray-400" />
            </div>
          </div>

          <div id="copilot-output" class="hidden mt-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Suggestions</h3>
            <div class="space-y-2 text-sm">
              <p><strong>Name:</strong> <span id="copilot-name" /></p>
              <p><strong>SEO Title:</strong> <span id="copilot-seo-title" /></p>
              <p><strong>SEO Description:</strong> <span id="copilot-seo-description" /></p>
              <p><strong>Slug:</strong> <span id="copilot-slug" /></p>
              <p><strong>Description:</strong></p>
              <p id="copilot-description" class="whitespace-pre-wrap text-gray-700 dark:text-gray-300" />
              <div>
                <p><strong>Highlights:</strong></p>
                <ul id="copilot-highlights" class="list-disc pl-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div id="copilot-warnings" class="hidden rounded-lg border border-amber-200 bg-amber-50 text-amber-700 px-3 py-2" />
            </div>
          </div>
        </section>
      )}

      {/* Variants Section */}
      {!isNew && (
        <section class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Variants (<span id="variants-count">{variants.length}</span>)
            </h2>
            <Button type="button" variant="secondary" id="add-variant-btn" size="sm">
              Add Variant
            </Button>
          </div>

          <p id="variants-empty-state" class={`text-sm text-gray-400 text-center py-4 ${variants.length === 0 ? "" : "hidden"}`}>No variants yet.</p>

          <div id="variants-table-wrap" class={`overflow-x-auto ${variants.length === 0 ? "hidden" : ""}`}>
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
              <tbody id="variants-tbody" class="divide-y divide-gray-50">
                {variants.map((v) => (
                  <tr
                    data-variant-row
                    data-variant-id={v.id}
                    data-title={v.title}
                    data-sku={v.sku || ""}
                    data-price={v.price}
                    data-compare-at-price={v.compareAtPrice || ""}
                    data-inventory={String(v.inventoryQuantity)}
                    data-provider={v.fulfillmentProvider || ""}
                    data-provider-id={v.providerId || ""}
                    data-external-product-id={v.externalProductId || ""}
                    data-external-variant-id={v.externalVariantId || ""}
                    data-cost-price={v.costPrice || ""}
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
                        <div class="space-y-1">
                          <Badge variant="info">{v.fulfillmentProvider}</Badge>
                          {(v.externalProductId || v.externalVariantId || v.costPrice) && (
                            <div class="text-[11px] leading-4 text-gray-500">
                              {v.externalProductId && <div>Product ID: {v.externalProductId}</div>}
                              {v.externalVariantId && <div>Variant ID: {v.externalVariantId}</div>}
                              {v.costPrice && <div>Cost: ${v.costPrice}</div>}
                            </div>
                          )}
                        </div>
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
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div class="flex flex-col gap-1.5">
                  <label for="variant-provider-id" class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Connected provider
                  </label>
                  <select
                    id="variant-provider-id"
                    name="providerId"
                    class="block w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm shadow-sm transition-all duration-200 ease-out focus:outline-none focus:ring-4 focus:border-brand-500 focus:ring-brand-500/20 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  >
                    <option value="">None</option>
                    {providerSelectOptions.map((option) => {
                      const provider = providers.find((candidate) => candidate.id === option.value);
                      return (
                        <option
                          value={option.value}
                          data-provider-type={provider?.type || ""}
                        >
                          {option.label}
                        </option>
                      );
                    })}
                  </select>
                  <p class="text-xs text-gray-500">
                    Choose the active provider connection for this variant before saving mapping ids.
                  </p>
                </div>
                <Input
                  label="Provider product ID"
                  name="externalProductId"
                  placeholder="e.g. 12345"
                />
              </div>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Provider variant ID"
                  name="externalVariantId"
                  placeholder="e.g. 4012"
                />
                <Input
                  label="Cost price"
                  name="costPrice"
                  placeholder="0.00"
                />
              </div>
              <p class="text-xs text-gray-500">
                Printful variants require both product and variant ids. Leaving the connected provider empty clears fulfillment linkage for this variant.
              </p>
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

      {!isNew && (
        <section class="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <div class="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Printful Mockups</h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Generate storefront-ready mockups after provider mapping is connected.
              </p>
            </div>
            <span id="printful-link-badge">
              {printfulSyncProductId ? (
                <Badge variant="info">Linked Product {String(printfulSyncProductId)}</Badge>
              ) : (
                <Badge variant="warning">No Printful link yet</Badge>
              )}
            </span>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Artwork image URL"
              name="mockupImageUrl"
              value={defaultMockupImageUrl}
              placeholder="https://..."
            />
            <Input
              label="Printful product ID override"
              name="mockupPrintfulProductId"
              value={printfulSyncProductId ? String(printfulSyncProductId) : ""}
              placeholder="Optional if product is already linked"
            />
          </div>

          <div class="mt-4 flex items-center gap-3">
            <Button type="button" variant="secondary" id="generate-mockup-btn" size="sm">
              Generate Mockups
            </Button>
            <p id="mockup-status" class="text-sm text-gray-500 dark:text-gray-400" />
          </div>
        </section>
      )}

      {/* Static trusted script — no user input interpolated */}
      {html`
        <script>
          (function() {
            var isMerchCopilotEnabled = ${isMerchCopilotEnabled ? "true" : "false"};
            var latestCopilotPatch = null;

            function parseFeatures(raw) {
              if (!raw) return [];
              return String(raw)
                .split(',')
                .map(function(part) { return part.trim(); })
                .filter(Boolean)
                .slice(0, 10);
            }

            function setCopilotStatus(message, isError) {
              var statusEl = document.getElementById('copilot-status');
              if (!statusEl) return;
              statusEl.textContent = message || '';
              statusEl.className = isError
                ? 'text-sm text-red-600'
                : 'text-sm text-gray-500 dark:text-gray-400';
            }

            async function runCopilot() {
              if (!isMerchCopilotEnabled) return;

              var productForm = document.getElementById('product-form');
              var seoForm = document.getElementById('seo-form');
              var generateBtn = document.getElementById('copilot-generate-btn');
              var applyBtn = document.getElementById('copilot-apply-btn');
              if (!productForm || !seoForm || !generateBtn || !applyBtn) return;

              var briefInput = document.querySelector('[name="copilotBrief"]');
              var audienceInput = document.querySelector('[name="copilotAudience"]');
              var toneInput = document.querySelector('[name="copilotTone"]');
              var featuresInput = document.querySelector('[name="copilotFeatures"]');
              var typeInput = productForm.querySelector('[name="type"]');

              var brief = briefInput ? String(briefInput.value || '').trim() : '';
              if (brief.length < 10) {
                setCopilotStatus('Add a brief (at least 10 characters) before generating.', true);
                return;
              }

              var productId = productForm.dataset.productId;
              var endpoint = productId === 'new'
                ? '/api/admin/products/copilot/draft'
                : '/api/admin/products/' + productId + '/copilot/enrich';

              var payload = {
                brief: brief,
                productType: typeInput ? String(typeInput.value || 'physical') : 'physical',
                audience: audienceInput ? String(audienceInput.value || '').trim() || undefined : undefined,
                tone: toneInput ? String(toneInput.value || '').trim() || undefined : undefined,
                keyFeatures: featuresInput ? parseFeatures(featuresInput.value) : [],
              };

              generateBtn.disabled = true;
              applyBtn.classList.add('hidden');
              setCopilotStatus('Generating suggestions...', false);

              try {
                var res = await fetch(endpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });

                var data = await res.json().catch(function() { return {}; });
                if (!res.ok) {
                  throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to generate suggestions') : (data.error || data.message || 'Failed to generate suggestions'));
                }

                var copilot = data && data.copilot ? data.copilot : null;
                if (!copilot || !copilot.applyPatch) {
                  throw new Error('Copilot returned an invalid response.');
                }

                latestCopilotPatch = copilot.applyPatch;

                var outputEl = document.getElementById('copilot-output');
                if (outputEl) outputEl.classList.remove('hidden');
                var nameEl = document.getElementById('copilot-name');
                var seoTitleEl = document.getElementById('copilot-seo-title');
                var seoDescEl = document.getElementById('copilot-seo-description');
                var slugEl = document.getElementById('copilot-slug');
                var descriptionEl = document.getElementById('copilot-description');
                if (nameEl) nameEl.textContent = copilot.name || '';
                if (seoTitleEl) seoTitleEl.textContent = copilot.seoTitle || '';
                if (seoDescEl) seoDescEl.textContent = copilot.seoDescription || '';
                if (slugEl) slugEl.textContent = copilot.slugSuggestion || '';
                if (descriptionEl) descriptionEl.textContent = copilot.description || '';

                var highlightsEl = document.getElementById('copilot-highlights');
                if (highlightsEl) {
                  highlightsEl.innerHTML = '';
                  (copilot.highlights || []).forEach(function(highlight) {
                    var li = document.createElement('li');
                    li.textContent = String(highlight);
                    highlightsEl.appendChild(li);
                  });
                }

                var warningsEl = document.getElementById('copilot-warnings');
                if (warningsEl) {
                  var warnings = Array.isArray(copilot.warnings) ? copilot.warnings : [];
                  if (warnings.length > 0) {
                    warningsEl.textContent = warnings.join(' ');
                    warningsEl.classList.remove('hidden');
                  } else {
                    warningsEl.textContent = '';
                    warningsEl.classList.add('hidden');
                  }
                }

                applyBtn.classList.remove('hidden');
                setCopilotStatus('Suggestions ready. Review and apply.', false);
              } catch (err) {
                setCopilotStatus(err && err.message ? err.message : 'Failed to generate suggestions.', true);
              } finally {
                generateBtn.disabled = false;
              }
            }

            function applyCopilotPatch() {
              if (!latestCopilotPatch) return;
              var productForm = document.getElementById('product-form');
              var seoForm = document.getElementById('seo-form');
              if (!productForm || !seoForm) return;

              var nameInput = productForm.querySelector('[name="name"]');
              var descriptionInput = productForm.querySelector('[name="description"]');
              var seoTitleInput = seoForm.querySelector('[name="seoTitle"]');
              var seoDescriptionInput = seoForm.querySelector('[name="seoDescription"]');
              var slugInput = seoForm.querySelector('[name="slug"]');

              if (nameInput) nameInput.value = latestCopilotPatch.name || '';
              if (descriptionInput) descriptionInput.value = latestCopilotPatch.description || '';
              if (seoTitleInput) seoTitleInput.value = latestCopilotPatch.seoTitle || '';
              if (seoDescriptionInput) seoDescriptionInput.value = latestCopilotPatch.seoDescription || '';
              if (slugInput) slugInput.value = latestCopilotPatch.slug || '';

              var serpTitle = document.getElementById('serp-title');
              var serpDesc = document.getElementById('serp-desc');
              var serpUrl = document.getElementById('serp-url');
              if (serpTitle && seoTitleInput) serpTitle.textContent = seoTitleInput.value || 'Untitled';
              if (serpDesc && seoDescriptionInput) serpDesc.textContent = seoDescriptionInput.value || 'No description set.';
              if (serpUrl && slugInput) serpUrl.textContent = 'example.com/products/' + (slugInput.value || '');

              setCopilotStatus('Suggestions applied to form fields.', false);
            }

            var generateCopilotBtn = document.getElementById('copilot-generate-btn');
            if (generateCopilotBtn) {
              generateCopilotBtn.addEventListener('click', function() {
                runCopilot();
              });
            }

            var applyCopilotBtn = document.getElementById('copilot-apply-btn');
            if (applyCopilotBtn) {
              applyCopilotBtn.addEventListener('click', function() {
                applyCopilotPatch();
              });
            }

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
                    throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to save product') : (data.error || data.message || 'Failed to save product'));
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
                    throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to save SEO') : (data.error || data.message || 'Failed to save SEO'));
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
            var variantsTableWrap = document.getElementById('variants-table-wrap');
            var variantsEmptyState = document.getElementById('variants-empty-state');
            var variantsCountEl = document.getElementById('variants-count');
            var variantsTbody = document.getElementById('variants-tbody');

            function setButtonLoading(button, loading, loadingText, idleText) {
              if (!button) return;
              if (loading) {
                if (!button.dataset.originalLabel) button.dataset.originalLabel = button.textContent || '';
                button.textContent = loadingText;
                button.setAttribute('disabled', 'true');
                return;
              }
              button.textContent = idleText || button.dataset.originalLabel || button.textContent;
              button.removeAttribute('disabled');
            }

            function escapeHtml(value) {
              return String(value == null ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
            }

            function syncProviderTypeFromConnection(form) {
              if (!form) return;
              var providerSelect = form.querySelector('[name="providerId"]');
              var typeSelect = form.querySelector('[name="fulfillmentProvider"]');
              if (!providerSelect || !typeSelect) return;
              var option = providerSelect.selectedOptions && providerSelect.selectedOptions[0]
                ? providerSelect.selectedOptions[0]
                : null;
              var providerType = option ? option.getAttribute('data-provider-type') : '';
              if (providerType) {
                typeSelect.value = providerType;
              } else if (!providerSelect.value) {
                typeSelect.value = '';
              }
            }

            function normalizeVariant(raw) {
              if (!raw || typeof raw !== 'object') return null;
              var id = raw.id ? String(raw.id) : '';
              if (!id) return null;
              return {
                id: id,
                title: raw.title ? String(raw.title) : 'Untitled variant',
                sku: raw.sku ? String(raw.sku) : '',
                price: raw.price != null ? String(raw.price) : '0.00',
                compareAtPrice: raw.compareAtPrice != null ? String(raw.compareAtPrice) : '',
                inventoryQuantity: Number(raw.inventoryQuantity || 0),
                fulfillmentProvider: raw.fulfillmentProvider ? String(raw.fulfillmentProvider) : '',
                providerId: raw.providerId ? String(raw.providerId) : '',
                externalProductId: raw.externalProductId ? String(raw.externalProductId) : '',
                externalVariantId: raw.externalVariantId ? String(raw.externalVariantId) : '',
                costPrice: raw.costPrice != null ? String(raw.costPrice) : '',
              };
            }

            function renderProvider(provider) {
              if (!provider) return '<span class="text-gray-400">—</span>';
              return '<span class="inline-flex items-center rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 px-2.5 py-0.5 text-xs">' + escapeHtml(provider) + '</span>';
            }

            function renderVariantRow(variant) {
              var compareAt = variant.compareAtPrice
                ? '<span class="ml-1 text-xs text-gray-400 line-through">$' + escapeHtml(variant.compareAtPrice) + '</span>'
                : '';
              var mappingMeta = '';
              if (variant.externalProductId || variant.externalVariantId || variant.costPrice) {
                mappingMeta = '<div class="text-[11px] leading-4 text-gray-500">';
                if (variant.externalProductId) {
                  mappingMeta += '<div>Product ID: ' + escapeHtml(variant.externalProductId) + '</div>';
                }
                if (variant.externalVariantId) {
                  mappingMeta += '<div>Variant ID: ' + escapeHtml(variant.externalVariantId) + '</div>';
                }
                if (variant.costPrice) {
                  mappingMeta += '<div>Cost: $' + escapeHtml(variant.costPrice) + '</div>';
                }
                mappingMeta += '</div>';
              }
              return '' +
                '<tr data-variant-row data-variant-id="' + escapeHtml(variant.id) + '" data-title="' + escapeHtml(variant.title) + '" data-sku="' + escapeHtml(variant.sku) + '" data-price="' + escapeHtml(variant.price) + '" data-compare-at-price="' + escapeHtml(variant.compareAtPrice) + '" data-inventory="' + variant.inventoryQuantity + '" data-provider="' + escapeHtml(variant.fulfillmentProvider) + '" data-provider-id="' + escapeHtml(variant.providerId) + '" data-external-product-id="' + escapeHtml(variant.externalProductId) + '" data-external-variant-id="' + escapeHtml(variant.externalVariantId) + '" data-cost-price="' + escapeHtml(variant.costPrice) + '">' +
                  '<td class="px-3 py-2 font-medium text-gray-900">' + escapeHtml(variant.title) + '</td>' +
                  '<td class="px-3 py-2 text-gray-500">' + (variant.sku ? escapeHtml(variant.sku) : '—') + '</td>' +
                  '<td class="px-3 py-2"><span class="font-medium">$' + escapeHtml(variant.price) + '</span>' + compareAt + '</td>' +
                  '<td class="px-3 py-2"><span class="' + (variant.inventoryQuantity <= 0 ? 'text-red-600' : '') + '">' + variant.inventoryQuantity + '</span></td>' +
                  '<td class="px-3 py-2">' + renderProvider(variant.fulfillmentProvider) + mappingMeta + '</td>' +
                  '<td class="px-3 py-2 text-right">' +
                    '<button type="button" class="p-1 text-gray-400 hover:text-brand-600 transition-colors" data-edit-variant="' + escapeHtml(variant.id) + '" title="Edit">' +
                      '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>' +
                      '</svg>' +
                    '</button>' +
                  '</td>' +
                '</tr>';
            }

            function syncVariantTableState() {
              if (!variantsTbody) return;
              var count = variantsTbody.querySelectorAll('[data-variant-row]').length;
              if (variantsCountEl) variantsCountEl.textContent = String(count);
              if (variantsTableWrap) variantsTableWrap.classList.toggle('hidden', count === 0);
              if (variantsEmptyState) variantsEmptyState.classList.toggle('hidden', count !== 0);
            }

            function upsertVariantRow(variant) {
              if (!variantsTbody) return;
              var existing = variantsTbody.querySelector('[data-variant-row][data-variant-id="' + variant.id + '"]');
              if (existing) {
                existing.outerHTML = renderVariantRow(variant);
              } else {
                variantsTbody.insertAdjacentHTML('afterbegin', renderVariantRow(variant));
              }
              syncVariantTableState();
            }

            if (addVariantBtn) {
              addVariantBtn.addEventListener('click', function() {
                if (variantForm) variantForm.reset();
                if (variantForm) variantForm.querySelector('[name="variantId"]').value = '';
                syncProviderTypeFromConnection(variantForm);
                document.getElementById('variant-form-title').textContent = 'Add Variant';
                variantFormSection.classList.remove('hidden');
              });
            }

            if (cancelVariantBtn) {
              cancelVariantBtn.addEventListener('click', function() {
                variantFormSection.classList.add('hidden');
              });
            }

            document.addEventListener('click', function(event) {
              var editVariantBtn = event.target && event.target.closest ? event.target.closest('[data-edit-variant]') : null;
              if (!editVariantBtn) return;
              var row = editVariantBtn.closest('tr');
              if (!row || !variantForm) return;
              variantForm.querySelector('[name="variantId"]').value = row.dataset.variantId || '';
              variantForm.querySelector('[name="title"]').value = row.dataset.title || '';
              variantForm.querySelector('[name="sku"]').value = row.dataset.sku || '';
              variantForm.querySelector('[name="price"]').value = row.dataset.price || '';
              variantForm.querySelector('[name="compareAtPrice"]').value = row.dataset.compareAtPrice || '';
              variantForm.querySelector('[name="inventoryQuantity"]').value = row.dataset.inventory || '0';
              var providerSelect = variantForm.querySelector('[name="fulfillmentProvider"]');
              if (providerSelect) providerSelect.value = row.dataset.provider || '';
              var providerConnectionSelect = variantForm.querySelector('[name="providerId"]');
              if (providerConnectionSelect) providerConnectionSelect.value = row.dataset.providerId || '';
              var externalProductIdInput = variantForm.querySelector('[name="externalProductId"]');
              if (externalProductIdInput) externalProductIdInput.value = row.dataset.externalProductId || '';
              var externalVariantIdInput = variantForm.querySelector('[name="externalVariantId"]');
              if (externalVariantIdInput) externalVariantIdInput.value = row.dataset.externalVariantId || '';
              var costPriceInput = variantForm.querySelector('[name="costPrice"]');
              if (costPriceInput) costPriceInput.value = row.dataset.costPrice || '';
              syncProviderTypeFromConnection(variantForm);
              document.getElementById('variant-form-title').textContent = 'Edit Variant';
              variantFormSection.classList.remove('hidden');
            });

            if (variantForm) {
              var providerConnectionSelect = variantForm.querySelector('[name="providerId"]');
              if (providerConnectionSelect) {
                providerConnectionSelect.addEventListener('change', function() {
                  syncProviderTypeFromConnection(variantForm);
                });
              }
            }

            if (variantForm) {
              variantForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                var btn = document.getElementById('variant-save-btn');
                var successEl = document.getElementById('product-success');
                var errorEl = document.getElementById('product-error');
                setButtonLoading(btn, true, 'Saving...', 'Save Variant');
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
                  var connectedProviderId = fd.get('providerId') ? String(fd.get('providerId')) : '';
                  var externalProductId = fd.get('externalProductId') ? String(fd.get('externalProductId')).trim() : '';
                  var externalVariantId = fd.get('externalVariantId') ? String(fd.get('externalVariantId')).trim() : '';
                  var costPrice = fd.get('costPrice') ? String(fd.get('costPrice')).trim() : '';
                  var body = {
                    title: fd.get('title'),
                    price: fd.get('price'),
                    sku: fd.get('sku') || undefined,
                    compareAtPrice: fd.get('compareAtPrice') || undefined,
                    inventoryQuantity: Number(fd.get('inventoryQuantity')) || 0,
                    fulfillmentProvider: fd.get('fulfillmentProvider') || undefined,
                    providerId: connectedProviderId || undefined,
                    externalProductId: externalProductId || undefined,
                    externalVariantId: externalVariantId || undefined,
                    costPrice: costPrice || undefined,
                    clearProviderMapping: !connectedProviderId,
                  };
                  var res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                  });
                  var data = await res.json().catch(function() { return {}; });
                  if (!res.ok) {
                    throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to save variant') : (data.error || data.message || 'Failed to save variant'));
                  }
                  var variant = normalizeVariant(data);
                  if (variant) {
                    upsertVariantRow(variant);
                    if (variant.fulfillmentProvider === 'printful' && variant.externalProductId) {
                      var mockupProductIdInput = document.querySelector('[name="mockupPrintfulProductId"]');
                      if (mockupProductIdInput) {
                        mockupProductIdInput.value = variant.externalProductId;
                      }
                      var printfulLinkBadge = document.getElementById('printful-link-badge');
                      if (printfulLinkBadge) {
                        printfulLinkBadge.innerHTML = '<span class="inline-flex items-center rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 px-2.5 py-0.5 text-xs">Linked Product ' + escapeHtml(variant.externalProductId) + '</span>';
                      }
                    }
                  }
                  successEl.textContent = variantId ? 'Variant updated.' : 'Variant created.';
                  successEl.classList.remove('hidden');
                  variantFormSection.classList.add('hidden');
                  variantForm.reset();
                  variantForm.querySelector('[name="variantId"]').value = '';
                  syncProviderTypeFromConnection(variantForm);
                  document.getElementById('variant-form-title').textContent = 'Add Variant';
                } catch (err) {
                  errorEl.textContent = err.message;
                  errorEl.classList.remove('hidden');
                } finally {
                  setButtonLoading(btn, false, null, 'Save Variant');
                }
              });
            }

            var generateMockupBtn = document.getElementById('generate-mockup-btn');
            if (generateMockupBtn) {
              generateMockupBtn.addEventListener('click', async function() {
                var productForm = document.getElementById('product-form');
                var successEl = document.getElementById('product-success');
                var errorEl = document.getElementById('product-error');
                var statusEl = document.getElementById('mockup-status');
                if (!productForm) return;

                var productId = productForm.dataset.productId;
                var imageUrlInput = document.querySelector('[name="mockupImageUrl"]');
                var printfulProductIdInput = document.querySelector('[name="mockupPrintfulProductId"]');
                var imageUrl = imageUrlInput ? String(imageUrlInput.value || '').trim() : '';
                var printfulProductIdRaw = printfulProductIdInput
                  ? String(printfulProductIdInput.value || '').trim()
                  : '';

                successEl.classList.add('hidden');
                errorEl.classList.add('hidden');
                if (statusEl) statusEl.textContent = '';

                if (!imageUrl) {
                  errorEl.textContent = 'Enter an artwork image URL before generating mockups.';
                  errorEl.classList.remove('hidden');
                  return;
                }
                if (printfulProductIdRaw && !/^\\d+$/.test(printfulProductIdRaw)) {
                  errorEl.textContent = 'Printful product ID override must be a positive integer.';
                  errorEl.classList.remove('hidden');
                  return;
                }

                setButtonLoading(generateMockupBtn, true, 'Generating...', 'Generate Mockups');
                if (statusEl) statusEl.textContent = 'Submitting Printful mockup task...';

                try {
                  var payload = {
                    imageUrl: imageUrl,
                    waitAndApply: true,
                  };
                  if (printfulProductIdRaw) {
                    payload.printfulProductId = Number(printfulProductIdRaw);
                  }

                  var res = await fetch('/api/admin/products/' + productId + '/mockup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  });
                  var data = await res.json().catch(function() { return {}; });
                  if (!res.ok) {
                    throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to generate mockups') : (data.error || data.message || 'Failed to generate mockups'));
                  }

                  if (statusEl) {
                    statusEl.textContent = data.status === 'completed'
                      ? 'Mockups generated and applied to product images.'
                      : (data.message || 'Mockup task created.');
                  }
                  successEl.textContent = data.status === 'completed'
                    ? 'Printful mockups generated and applied.'
                    : 'Printful mockup job submitted.';
                  successEl.classList.remove('hidden');
                } catch (err) {
                  errorEl.textContent = err.message;
                  errorEl.classList.remove('hidden');
                  if (statusEl) statusEl.textContent = 'Mockup generation failed.';
                } finally {
                  setButtonLoading(generateMockupBtn, false, null, 'Generate Mockups');
                }
              });
            }
          })();
        </script>
      `}
    </div>
  );
};
