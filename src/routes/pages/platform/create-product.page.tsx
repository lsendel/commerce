import type { FC } from "hono/jsx";
import { Button } from "../../../components/ui/button";

interface Provider {
  id: string;
  name: string;
  type: string;
}

interface CreateProductPageProps {
  artJobId: string;
  artImageUrl: string | null;
  providers: Provider[];
  isPipelineEnabled?: boolean;
}

export const CreateProductPage: FC<CreateProductPageProps> = ({
  artJobId,
  artImageUrl,
  providers,
  isPipelineEnabled = false,
}) => {
  return (
    <div class="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <div class="mb-6">
        <a
          href={`/studio/preview/${artJobId}`}
          class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Preview
        </a>
      </div>

      <h1 class="text-2xl font-bold text-gray-900 mb-2">Create Product from Artwork</h1>
      <p class="text-sm text-gray-500 mb-8">Turn your AI-generated artwork into a sellable product.</p>

      <form id="create-product-form" class="space-y-8">
        <input type="hidden" name="artJobId" value={artJobId} />

        {/* Art Preview */}
        {artImageUrl && (
          <div class="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <img
              src={artImageUrl}
              alt="Artwork preview"
              class="w-full max-h-80 object-contain"
            />
          </div>
        )}

        {/* Product Details */}
        <fieldset class="space-y-4">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-gray-900">Product Details</h2>
            {isPipelineEnabled && (
              <Button type="button" variant="secondary" size="sm" id="auto-fill-btn">
                Auto-fill with AI
              </Button>
            )}
          </div>
          {isPipelineEnabled && (
            <p id="pipeline-status" class="text-xs text-gray-500">
              AI can prefill product copy and variant defaults from this artwork.
            </p>
          )}

          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder="e.g. Custom Pet Portrait Canvas"
            />
          </div>

          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              id="description"
              name="description"
              rows={3}
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder="Describe this product..."
            />
          </div>

          <div>
            <label for="type" class="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
            <select
              id="type"
              name="type"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              <option value="physical">Physical Product</option>
              <option value="digital">Digital Download</option>
            </select>
          </div>
        </fieldset>

        {/* Design Placement */}
        <fieldset class="space-y-4">
          <legend class="text-lg font-semibold text-gray-900">Design Placement</legend>
          <div>
            <label for="placement-area" class="block text-sm font-medium text-gray-700 mb-1">Placement Area</label>
            <select
              id="placement-area"
              name="placementArea"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              <option value="front">Front</option>
              <option value="back">Back</option>
              <option value="all_over">All Over</option>
              <option value="left_chest">Left Chest</option>
              <option value="right_chest">Right Chest</option>
            </select>
          </div>
        </fieldset>

        {/* Variants */}
        <fieldset class="space-y-4">
          <legend class="text-lg font-semibold text-gray-900">Variants</legend>
          <div id="variants-container">
            <div class="variant-row flex items-end gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
              <div class="flex-1">
                <label class="block text-xs font-medium text-gray-600 mb-1">Title</label>
                <input
                  type="text"
                  name="variant-title-0"
                  required
                  class="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
                  placeholder="e.g. Small Canvas 8x10"
                />
              </div>
              <div class="w-28">
                <label class="block text-xs font-medium text-gray-600 mb-1">Price ($)</label>
                <input
                  type="text"
                  name="variant-price-0"
                  required
                  pattern="^\d+(\.\d{1,2})?$"
                  class="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
                  placeholder="29.99"
                />
              </div>
            </div>
          </div>
          <button
            type="button"
            id="add-variant-btn"
            class="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Variant
          </button>
        </fieldset>

        {/* Fulfillment Provider */}
        {providers.length > 0 && (
          <fieldset class="space-y-4">
            <legend class="text-lg font-semibold text-gray-900">Fulfillment Provider</legend>
            <select
              id="provider"
              name="providerId"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              <option value="">None (self-fulfilled)</option>
              {providers.map((p) => (
                <option value={p.id}>
                  {p.name} ({p.type})
                </option>
              ))}
            </select>
          </fieldset>
        )}

        {/* Actions */}
        <div class="flex items-center gap-4 pt-4 border-t border-gray-200">
          <Button variant="primary" type="submit">
            Publish Product
          </Button>
          <Button variant="outline" type="button" id="save-draft-btn">
            Save as Draft
          </Button>
        </div>
      </form>

      <div id="form-error" class="hidden mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm"></div>
      <div id="form-success" class="hidden mt-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm"></div>

      <script src="/scripts/create-product.js" defer></script>
    </div>
  );
};
