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
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Your Pet Artwork</h1>
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
      <div class="mt-10 border-t border-gray-200 dark:border-gray-700 pt-8">
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Create product from art */}
          <Button
            variant="primary"
            size="lg"
            href={`/products/create/${jobId}`}
          >
            <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Product
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
