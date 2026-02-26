import type { FC } from "hono/jsx";
import { PriceDisplay } from "../../components/product/price-display";
import { VariantSelector } from "../../components/product/variant-selector";
import { ProductCard } from "../../components/product/product-card";
import { ImageGallery } from "../../components/product/image-gallery";

interface ProductImage {
  id: string;
  url: string;
  altText?: string | null;
  position?: number | null;
}

interface Variant {
  id: string;
  title: string;
  price: string;
  compareAtPrice?: string | null;
  availableForSale?: boolean | null;
  inventoryQuantity?: number | null;
  status?: string | null;
  options?: Record<string, string> | null;
}

interface BookingSlot {
  id: string;
  slotDate: string;
  slotTime: string;
  totalCapacity: number;
  reservedCount?: number | null;
  status?: string | null;
  prices?: Array<{
    personType: "adult" | "child" | "pet";
    price: string;
  }>;
}

interface BookingConfig {
  location?: string | null;
  included?: string[] | null;
  notIncluded?: string[] | null;
  cancellationPolicy?: string | null;
}

interface BookingSettings {
  duration: number;
  durationUnit?: string | null;
  capacityType?: string | null;
  capacityPerSlot: number;
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  type: "physical" | "digital" | "subscription" | "bookable";
  featuredImageUrl?: string | null;
  variants: Array<{
    id: string;
    price: string;
    compareAtPrice?: string | null;
  }>;
}

interface ProductDetailPageProps {
  product: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    descriptionHtml?: string | null;
    type: "physical" | "digital" | "subscription" | "bookable";
    featuredImageUrl?: string | null;
    availableForSale?: boolean | null;
    variants: Variant[];
    images: ProductImage[];
    bookingSettings?: BookingSettings | null;
    bookingConfig?: BookingConfig | null;
  };
  slots?: BookingSlot[];
  relatedProducts?: RelatedProduct[];
}

export const ProductDetailPage: FC<ProductDetailPageProps> = ({
  product,
  slots = [],
  relatedProducts = [],
}) => {
  const {
    name,
    type,
    descriptionHtml,
    description,
    variants,
    images,
    featuredImageUrl,
    bookingSettings,
    bookingConfig,
  } = product;

  const isBookable = type === "bookable";

  const sortedImages = [...images].sort((a, b) => (a.position || 0) - (b.position || 0));
  const allImages = sortedImages.length > 0
    ? sortedImages
    : featuredImageUrl
      ? [{ id: "featured", url: featuredImageUrl, altText: name, position: 0 }]
      : [];

  // Build gallery images array for the ImageGallery component
  const galleryImages = allImages.map((img) => ({
    url: img.url,
    alt: img.altText || name,
  }));

  // Product descriptionHtml is admin-authored trusted content stored in the
  // database.  It is NOT user-generated input and is safe for server-side
  // rendering.  If you later accept user HTML, sanitize with DOMPurify first.
  const descriptionMarkup = descriptionHtml
    ? { __html: descriptionHtml }
    : null;

  return (
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav class="mb-6 text-sm" aria-label="Breadcrumb">
        <ol class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <li><a href="/" class="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Home</a></li>
          <li><span class="text-gray-300 dark:text-gray-600">/</span></li>
          <li><a href="/products" class="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Products</a></li>
          <li><span class="text-gray-300 dark:text-gray-600">/</span></li>
          <li class="text-gray-900 dark:text-gray-100 font-medium truncate max-w-[200px]">{name}</li>
        </ol>
      </nav>

      <div class="lg:grid lg:grid-cols-2 lg:gap-12">
        {/* Image gallery */}
        <div>
          <ImageGallery images={galleryImages} productName={name} />
        </div>

        {/* Product info */}
        <div class="mt-8 lg:mt-0">
          {/* Type badge */}
          {type !== "physical" && (
            <span class={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${type === "digital"
                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                : type === "subscription"
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  : "bg-pet-teal/20 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400"
              }`}>
              {type === "digital" ? "Digital" : type === "subscription" ? "Subscription" : "Bookable Event"}
            </span>
          )}

          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{name}</h1>

          {/* Availability & Urgency Indicator */}
          {product.availableForSale === false ? (
            <div class="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-xs font-medium">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Currently unavailable
            </div>
          ) : product.type === "physical" && variants[0]?.inventoryQuantity !== undefined && variants[0].inventoryQuantity !== null && variants[0].inventoryQuantity < 5 ? (
            <div class="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 text-orange-600 text-xs font-medium animate-pulse">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Hurry! Only {variants[0].inventoryQuantity} left in stock.
            </div>
          ) : null}

          {/* Variant selector */}
          <div class="mt-6">
            <VariantSelector
              productId={product.id}
              productType={type}
              variants={variants}
              slots={isBookable ? slots : undefined}
            />
          </div>

          {/* Booking info section */}
          {isBookable && (bookingSettings || bookingConfig) && (
            <div class="mt-8 space-y-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">Booking Details</h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bookingSettings && (
                  <>
                    <div class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                      <div class="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                        <svg class="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">Duration</div>
                        <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {bookingSettings.duration} {bookingSettings.durationUnit || "minutes"}
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                      <div class="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                        <svg class="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">Capacity</div>
                        <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {bookingSettings.capacityPerSlot} {bookingSettings.capacityType === "group" ? "per group" : "per slot"}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {bookingConfig?.location && (
                  <div class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 sm:col-span-2">
                    <div class="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                      <svg class="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">Location</div>
                      <div class="text-sm font-medium text-gray-900 dark:text-gray-100">{bookingConfig.location}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* What's included */}
              {bookingConfig?.included && Array.isArray(bookingConfig.included) && bookingConfig.included.length > 0 && (
                <div class="mt-4">
                  <h4 class="text-sm font-semibold text-gray-700 mb-2">What's Included</h4>
                  <ul class="space-y-1.5">
                    {(bookingConfig.included as string[]).map((item, idx) => (
                      <li key={idx} class="flex items-start gap-2 text-sm text-gray-600">
                        <svg class="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {bookingConfig?.notIncluded && Array.isArray(bookingConfig.notIncluded) && bookingConfig.notIncluded.length > 0 && (
                <div class="mt-3">
                  <h4 class="text-sm font-semibold text-gray-700 mb-2">Not Included</h4>
                  <ul class="space-y-1.5">
                    {(bookingConfig.notIncluded as string[]).map((item, idx) => (
                      <li key={idx} class="flex items-start gap-2 text-sm text-gray-600">
                        <svg class="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cancellation policy */}
              {bookingConfig?.cancellationPolicy && (
                <div class="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <div class="flex items-start gap-2">
                    <svg class="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div class="text-xs font-semibold text-amber-700">Cancellation Policy</div>
                      <p class="text-xs text-amber-600 mt-0.5">{bookingConfig.cancellationPolicy}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {(descriptionMarkup || description) && (
            <div class="mt-8">
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Description</h3>
              {descriptionMarkup ? (
                <div
                  class="prose prose-sm prose-gray dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 leading-relaxed"
                  dangerouslySetInnerHTML={descriptionMarkup}
                />
              ) : (
                <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{description}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <section class="mt-16 pt-12 border-t border-gray-100 dark:border-gray-700">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">You May Also Like</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {relatedProducts.map((rp) => (
              <ProductCard key={rp.id} product={rp} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
