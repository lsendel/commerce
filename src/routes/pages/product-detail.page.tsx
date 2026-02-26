import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { PriceDisplay } from "../../components/product/price-display";
import { VariantSelector } from "../../components/product/variant-selector";
import { ProductCard } from "../../components/product/product-card";
import { ImageGallery } from "../../components/product/image-gallery";
import { Button } from "../../components/ui/button";

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

interface Review {
  id: string;
  rating: number;
  title?: string | null;
  content?: string | null;
  authorName: string;
  verified: boolean;
  storeResponse?: string | null;
  createdAt: string;
}

interface ReviewSummary {
  averageRating: number;
  totalCount: number;
  distribution: Record<number, number>;
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
  reviews?: Review[];
  reviewSummary?: ReviewSummary | null;
  isAuthenticated?: boolean;
  siteUrl?: string;
}

export const ProductDetailPage: FC<ProductDetailPageProps> = ({
  product,
  slots = [],
  relatedProducts = [],
  reviews = [],
  reviewSummary,
  isAuthenticated = false,
  siteUrl = "",
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

  const productUrl = siteUrl ? `${siteUrl}/products/${product.slug}` : `/products/${product.slug}`;
  const lowestPrice = variants.length > 0 ? Math.min(...variants.map((v) => parseFloat(v.price))) : 0;

  // Breadcrumb JSON-LD
  const breadcrumbJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl || "/" },
      { "@type": "ListItem", position: 2, name: "Products", item: `${siteUrl}/products` },
      { "@type": "ListItem", position: 3, name },
    ],
  });

  // Product JSON-LD with optional AggregateRating
  const productJsonLdObj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: description ?? undefined,
    image: featuredImageUrl ?? undefined,
    url: productUrl,
    offers: {
      "@type": "Offer",
      price: lowestPrice.toFixed(2),
      priceCurrency: "USD",
      availability: product.availableForSale !== false
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
  if (reviewSummary && reviewSummary.totalCount > 0) {
    productJsonLdObj.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: reviewSummary.averageRating.toFixed(1),
      reviewCount: reviewSummary.totalCount,
    };
  }
  const productJsonLd = JSON.stringify(productJsonLdObj);

  return (
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Structured data — server-generated from trusted admin content, safe for raw rendering */}
      {html`<script type="application/ld+json">${breadcrumbJsonLd}</script>`}
      {html`<script type="application/ld+json">${productJsonLd}</script>`}

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

          {/* Share + Notify */}
          <div class="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              id="share-btn"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>

            {product.availableForSale === false && (
              <form id="notify-form" class="flex items-center gap-2">
                <input
                  type="email"
                  name="email"
                  placeholder="Notify me when available"
                  required
                  class="rounded-xl border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm w-52 focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
                />
                <Button type="submit" variant="secondary" size="sm">Notify</Button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Reviews section */}
      {(reviews.length > 0 || isAuthenticated) && (
        <section class="mt-16 pt-12 border-t border-gray-100 dark:border-gray-700" id="reviews">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Customer Reviews</h2>

          {/* Summary bar */}
          {reviewSummary && reviewSummary.totalCount > 0 && (
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl">
              <div class="text-center">
                <div class="text-4xl font-bold text-gray-900 dark:text-gray-100">
                  {reviewSummary.averageRating.toFixed(1)}
                </div>
                <div class="flex items-center gap-0.5 mt-1 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      class={`w-5 h-5 ${star <= Math.round(reviewSummary.averageRating) ? "text-yellow-400" : "text-gray-300"}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p class="text-sm text-gray-500 mt-1">{reviewSummary.totalCount} review{reviewSummary.totalCount !== 1 ? "s" : ""}</p>
              </div>

              {/* Distribution histogram */}
              <div class="flex-1 space-y-1.5 w-full">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = reviewSummary.distribution[stars] ?? 0;
                  const pct = reviewSummary.totalCount > 0 ? (count / reviewSummary.totalCount) * 100 : 0;
                  return (
                    <div key={stars} class="flex items-center gap-2">
                      <span class="text-xs text-gray-500 w-6 text-right">{stars}</span>
                      <svg class="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <div class="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div class="h-full rounded-full bg-yellow-400" style={`width: ${pct}%`} />
                      </div>
                      <span class="text-xs text-gray-400 w-8">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Individual reviews */}
          {reviews.length > 0 && (
            <div class="space-y-6 mb-8">
              {reviews.map((review) => (
                <div key={review.id} class="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <div class="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            class={`w-4 h-4 ${star <= review.rating ? "text-yellow-400" : "text-gray-300"}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{review.authorName}</span>
                      {review.verified && (
                        <span class="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Verified
                        </span>
                      )}
                    </div>
                    <time class="text-xs text-gray-400">{review.createdAt}</time>
                  </div>
                  {review.title && (
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{review.title}</h4>
                  )}
                  {review.content && (
                    <p class="text-sm text-gray-600 dark:text-gray-400">{review.content}</p>
                  )}
                  {review.storeResponse && (
                    <div class="mt-3 pl-4 border-l-2 border-brand-300">
                      <p class="text-xs font-semibold text-brand-600 mb-1">Store Response</p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">{review.storeResponse}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Review submission form */}
          {isAuthenticated && (
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Write a Review</h3>
              <div id="review-success" class="hidden mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3" role="status" />
              <div id="review-error" class="hidden mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3" role="alert" />
              <form id="review-form" class="space-y-4" data-product-id={product.id}>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rating</label>
                  <div id="star-rating" class="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        data-star={star}
                        class="star-btn text-gray-300 hover:text-yellow-400 transition-colors"
                      >
                        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                  <input type="hidden" name="rating" id="rating-input" value="0" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title (optional)</label>
                  <input
                    type="text"
                    name="title"
                    class="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
                    maxlength={100}
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Review</label>
                  <textarea
                    name="content"
                    rows={4}
                    class="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
                    maxlength={2000}
                  />
                </div>
                <Button type="submit" variant="primary">Submit Review</Button>
              </form>
            </div>
          )}
        </section>
      )}

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
      {html`
        <script>
          (function() {
            /* Share button */
            var shareBtn = document.getElementById('share-btn');
            if (shareBtn) {
              shareBtn.addEventListener('click', function() {
                var url = window.location.href;
                if (navigator.share) {
                  navigator.share({ title: document.title, url: url }).catch(function() {});
                } else if (navigator.clipboard) {
                  navigator.clipboard.writeText(url).then(function() {
                    shareBtn.textContent = 'Link copied!';
                    setTimeout(function() { shareBtn.textContent = 'Share'; }, 2000);
                  });
                }
              });
            }

            /* Star rating selector */
            var starButtons = document.querySelectorAll('.star-btn');
            var ratingInput = document.getElementById('rating-input');
            var selectedRating = 0;

            starButtons.forEach(function(btn) {
              btn.addEventListener('click', function() {
                selectedRating = parseInt(btn.dataset.star);
                ratingInput.value = selectedRating;
                starButtons.forEach(function(b) {
                  var star = parseInt(b.dataset.star);
                  b.classList.toggle('text-yellow-400', star <= selectedRating);
                  b.classList.toggle('text-gray-300', star > selectedRating);
                });
              });
            });

            /* Review form submit */
            var reviewForm = document.getElementById('review-form');
            if (reviewForm) {
              reviewForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var productId = reviewForm.dataset.productId;
                var fd = new FormData(reviewForm);
                var rating = parseInt(fd.get('rating'));
                if (!rating || rating < 1) {
                  document.getElementById('review-error').textContent = 'Please select a rating.';
                  document.getElementById('review-error').classList.remove('hidden');
                  return;
                }
                var body = { productId: productId, rating: rating };
                var title = fd.get('title');
                var content = fd.get('content');
                if (title) body.title = title;
                if (content) body.content = content;

                fetch('/api/reviews', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                })
                  .then(function(r) {
                    if (!r.ok) return r.json().then(function(d) { throw new Error(d.message || 'Failed'); });
                    document.getElementById('review-success').textContent = 'Review submitted!';
                    document.getElementById('review-success').classList.remove('hidden');
                    reviewForm.reset();
                    selectedRating = 0;
                    starButtons.forEach(function(b) {
                      b.classList.remove('text-yellow-400');
                      b.classList.add('text-gray-300');
                    });
                  })
                  .catch(function(err) {
                    document.getElementById('review-error').textContent = err.message;
                    document.getElementById('review-error').classList.remove('hidden');
                  });
              });
            }

            /* Notify form */
            var notifyForm = document.getElementById('notify-form');
            if (notifyForm) {
              notifyForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var email = notifyForm.querySelector('[name=email]').value;
                fetch('/api/analytics/events', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ eventName: 'notify_restock', payload: { email: email, productId: '${product.id}' } }),
                }).then(function() {
                  notifyForm.querySelector('[name=email]').value = '';
                  notifyForm.querySelector('[name=email]').placeholder = 'We will notify you!';
                });
              });
            }
          })();
        </script>
      `}
    </div>
  );
};
