import type { FC } from "hono/jsx";
import { html } from "hono/html";

interface ArtPreviewProps {
  /** The generated image URL (or inline SVG data URI) */
  imageUrl?: string;
  /** Pre-sanitized SVG markup from the server generation pipeline */
  svgMarkup?: string;
  /** The template name used */
  templateName?: string;
  /** Generation time in seconds */
  generationTime?: number;
  /** Job ID for reference */
  jobId?: string;
  /** Product slug to link "Apply to Product" */
  productSlug?: string;
}

export const ArtPreview: FC<ArtPreviewProps> = ({
  imageUrl,
  svgMarkup,
  templateName,
  generationTime,
  jobId,
  productSlug,
}) => {
  return (
    <div data-art-preview data-job-id={jobId || ""} class="w-full max-w-2xl mx-auto">
      {/* Preview area */}
      <div class="relative rounded-2xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div class="aspect-square flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          {svgMarkup ? (
            <div
              data-art-svg-container
              class="w-full h-full flex items-center justify-center"
            >
              {html([svgMarkup] as unknown as TemplateStringsArray)}
            </div>
          ) : imageUrl ? (
            <img
              data-art-image
              src={imageUrl}
              alt="Generated pet artwork"
              class="max-w-full max-h-full object-contain rounded-xl"
            />
          ) : (
            <div class="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
              <svg class="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <p class="text-sm">Your artwork will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Generation details */}
      {(templateName || generationTime !== undefined) && (
        <div class="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          {templateName && (
            <span class="inline-flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
              </svg>
              Style: {templateName}
            </span>
          )}
          {generationTime !== undefined && (
            <span class="inline-flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Generated in {generationTime}s
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div class="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        {/* Download */}
        <button
          type="button"
          data-download-art
          data-download-url={imageUrl || ""}
          class="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border-2 border-brand-500 text-brand-600 bg-transparent hover:bg-brand-50 active:bg-brand-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 w-full sm:w-auto"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download
        </button>

        {/* Apply to Product */}
        <a
          href={productSlug ? `/products/${productSlug}?artJobId=${jobId}` : "/products"}
          data-apply-to-product
          class="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 w-full sm:w-auto"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          Apply to Product
        </a>

        {/* Share (placeholder buttons) */}
        <div class="flex items-center gap-2">
          <button
            type="button"
            data-share-art="copy"
            class="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            title="Copy link"
            aria-label="Copy link"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-5.94a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L5.25 9.503" />
            </svg>
          </button>
          <button
            type="button"
            data-share-art="twitter"
            class="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            title="Share on X"
            aria-label="Share on X"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>
          <button
            type="button"
            data-share-art="facebook"
            class="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            title="Share on Facebook"
            aria-label="Share on Facebook"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
