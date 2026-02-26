import type { FC } from "hono/jsx";

interface GalleryImage {
  url: string;
  alt: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  productName: string;
}

export const ImageGallery: FC<ImageGalleryProps> = ({ images, productName }) => {
  if (images.length === 0) {
    return (
      <div class="aspect-square rounded-2xl overflow-hidden bg-brand-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center">
        <svg class="w-24 h-24 text-brand-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  const galleryData = JSON.stringify(images);
  const firstImage = images[0];
  if (!firstImage) return null;

  return (
    <div
      data-image-gallery
      data-gallery-images={galleryData}
      class="select-none"
    >
      {/* Main image container */}
      <div class="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 group">
        <img
          src={firstImage.url}
          alt={firstImage.alt || productName}
          class="w-full h-full object-cover transition-opacity duration-300 ease-in-out"
          data-gallery-main
        />

        {/* Previous / Next arrows (only show if multiple images) */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              class="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-md flex items-center justify-center text-gray-700 hover:bg-white hover:text-gray-900 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand-300"
              data-gallery-prev
              aria-label="Previous image"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-md flex items-center justify-center text-gray-700 hover:bg-white hover:text-gray-900 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand-300"
              data-gallery-next
              aria-label="Next image"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Image counter */}
            <div class="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span data-gallery-counter>1</span> / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div class="mt-4 grid grid-cols-4 sm:grid-cols-5 gap-2 sm:gap-3" data-gallery-thumbs>
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              class={`aspect-square rounded-xl overflow-hidden border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-300 ${
                idx === 0
                  ? "border-brand-500 ring-2 ring-brand-200"
                  : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
              }`}
              data-gallery-thumb={idx}
              aria-label={`View image ${idx + 1}`}
            >
              <img
                src={img.url}
                alt={img.alt || `${productName} thumbnail ${idx + 1}`}
                class="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
