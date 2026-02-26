/**
 * JSON-LD structured data builders.
 * All functions return plain objects for JSON.stringify in Layout.
 */

interface StoreInfo {
  name: string;
  description?: string;
  url: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  socialUrls?: string[];
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface ProductVariant {
  price: string;
  compareAtPrice?: string | null;
  sku?: string;
  inventoryQuantity?: number;
}

interface ProductInfo {
  name: string;
  description?: string;
  slug: string;
  imageUrl?: string;
  images?: string[];
  brand?: string;
}

interface ReviewInfo {
  author: string;
  rating: number;
  content: string;
  datePublished: string;
}

interface ReviewSummary {
  averageRating: number;
  reviewCount: number;
}

interface EventInfo {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  imageUrl?: string;
  locationName?: string;
  locationAddress?: string;
  locationLat?: number;
  locationLng?: number;
}

interface EventAvailability {
  totalCapacity: number;
  bookedCount: number;
  price?: string;
  currency?: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface CollectionInfo {
  name: string;
  description?: string;
  url: string;
}

interface VenueInfo {
  name: string;
  description?: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  imageUrl?: string;
}

export function buildOrganization(store: StoreInfo): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: store.name,
    url: store.url,
    ...(store.logoUrl && { logo: store.logoUrl }),
    ...(store.description && { description: store.description }),
    ...(store.email && { email: store.email }),
    ...(store.phone && { telephone: store.phone }),
    ...(store.socialUrls?.length && { sameAs: store.socialUrls }),
  };
}

export function buildBreadcrumbList(crumbs: BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

export function buildProduct(
  product: ProductInfo,
  variants: ProductVariant[],
  reviews?: { summary?: ReviewSummary; items?: ReviewInfo[] },
  storeUrl?: string,
): Record<string, unknown> {
  const prices = variants.map((v) => parseFloat(v.price)).filter((p) => !isNaN(p));
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const inStock = variants.some((v) => (v.inventoryQuantity ?? 1) > 0);

  const result: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.description && { description: product.description }),
    ...(product.imageUrl && { image: product.images?.length ? product.images : product.imageUrl }),
    ...(product.brand && { brand: { "@type": "Brand", name: product.brand } }),
    ...(variants[0]?.sku && { sku: variants[0].sku }),
    offers: prices.length === 1 || minPrice === maxPrice
      ? {
          "@type": "Offer",
          price: minPrice.toFixed(2),
          priceCurrency: "USD",
          availability: inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          ...(storeUrl && { url: `${storeUrl}/products/${product.slug}` }),
        }
      : {
          "@type": "AggregateOffer",
          lowPrice: minPrice.toFixed(2),
          highPrice: maxPrice.toFixed(2),
          priceCurrency: "USD",
          offerCount: variants.length,
          availability: inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        },
  };

  if (reviews?.summary && reviews.summary.reviewCount > 0) {
    result.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: reviews.summary.averageRating.toFixed(1),
      reviewCount: reviews.summary.reviewCount,
    };
  }

  if (reviews?.items?.length) {
    result.review = reviews.items.map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      reviewRating: { "@type": "Rating", ratingValue: r.rating },
      reviewBody: r.content,
      datePublished: r.datePublished,
    }));
  }

  return result;
}

export function buildEvent(
  event: EventInfo,
  availability?: EventAvailability,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    startDate: event.startDate,
    ...(event.endDate && { endDate: event.endDate }),
    ...(event.description && { description: event.description }),
    ...(event.imageUrl && { image: event.imageUrl }),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
  };

  if (event.locationName) {
    result.location = {
      "@type": "Place",
      name: event.locationName,
      ...(event.locationAddress && {
        address: { "@type": "PostalAddress", streetAddress: event.locationAddress },
      }),
      ...(event.locationLat && event.locationLng && {
        geo: { "@type": "GeoCoordinates", latitude: event.locationLat, longitude: event.locationLng },
      }),
    };
  }

  if (availability) {
    const remaining = availability.totalCapacity - availability.bookedCount;
    result.offers = {
      "@type": "Offer",
      ...(availability.price && { price: availability.price }),
      priceCurrency: availability.currency || "USD",
      availability: remaining > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/SoldOut",
      ...(remaining > 0 && { inventoryLevel: { "@type": "QuantitativeValue", value: remaining } }),
    };
  }

  return result;
}

export function buildFAQPage(faqs: FAQItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function buildCollectionPage(
  collection: CollectionInfo,
  productCount: number,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.name,
    ...(collection.description && { description: collection.description }),
    url: collection.url,
    numberOfItems: productCount,
  };
}

export function buildWebSite(store: StoreInfo): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: store.name,
    url: store.url,
    ...(store.description && { description: store.description }),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${store.url}/products?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildPlace(venue: VenueInfo): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: venue.name,
    ...(venue.description && { description: venue.description }),
    ...(venue.imageUrl && { image: venue.imageUrl }),
    ...(venue.phone && { telephone: venue.phone }),
    address: {
      "@type": "PostalAddress",
      streetAddress: venue.address,
      ...(venue.city && { addressLocality: venue.city }),
      ...(venue.state && { addressRegion: venue.state }),
      ...(venue.zipCode && { postalCode: venue.zipCode }),
      ...(venue.country && { addressCountry: venue.country }),
    },
    ...(venue.latitude && venue.longitude && {
      geo: {
        "@type": "GeoCoordinates",
        latitude: venue.latitude,
        longitude: venue.longitude,
      },
    }),
  };
}

export function buildReview(review: ReviewInfo): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    author: { "@type": "Person", name: review.author },
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
    },
    reviewBody: review.content,
    datePublished: review.datePublished,
  };
}
