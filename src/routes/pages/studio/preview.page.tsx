import type { FC } from "hono/jsx";
import { ArtPreview } from "../../../components/studio/art-preview";
import { Button } from "../../../components/ui/button";

interface StudioPreviewPageProps {
  jobId: string;
  imageUrl?: string;
  svgMarkup?: string;
  templateName?: string;
  generationTime?: number;
  /** Product slug for the print product to order */
  printProductSlug?: string;
}

export const StudioPreviewPage: FC<StudioPreviewPageProps> = ({
  jobId,
  imageUrl,
  svgMarkup,
  templateName,
  generationTime,
  printProductSlug,
}) => {
  return (
    <div class="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Back link */}
      <div class="mb-6">
        <a
          href="/studio/gallery"
          class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Gallery
        </a>
      </div>

      {/* Header */}
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Your Pet Artwork</h1>
        <p class="mt-1 text-sm text-gray-500">
          Preview, download, or order a print of your creation
        </p>
      </div>

      {/* Full art preview */}
      <ArtPreview
        imageUrl={imageUrl}
        svgMarkup={svgMarkup}
        templateName={templateName}
        generationTime={generationTime}
        jobId={jobId}
        productSlug={printProductSlug}
      />

      {/* Additional actions */}
      <div class="mt-10 border-t border-gray-200 pt-8">
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Order as print */}
          <Button
            variant="primary"
            size="lg"
            href={
              printProductSlug
                ? `/products/${printProductSlug}?artJobId=${jobId}`
                : `/products?artJobId=${jobId}`
            }
          >
            <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m0 0a48.159 48.159 0 018.5 0m-8.5 0V6.75a2.25 2.25 0 012.25-2.25h3a2.25 2.25 0 012.25 2.25v1.284" />
            </svg>
            Order as Print
          </Button>

          {/* Create another */}
          <Button variant="outline" size="lg" href="/studio/create">
            <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Another
          </Button>
        </div>
      </div>
    </div>
  );
};
