import type { FC } from "hono/jsx";
import { Button } from "../../components/ui/button";
import { ProductCard } from "../../components/product/product-card";

interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
}

interface ProductSummary {
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

interface HomePageProps {
  featuredCollections: Collection[];
  featuredProducts: ProductSummary[];
}

export const HomePage: FC<HomePageProps> = ({
  featuredCollections,
  featuredProducts,
}) => {
  return (
    <div>
      {/* Hero */}
      <section class="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-pet-teal/10">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <div class="max-w-2xl">
            <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-brand-100 text-brand-700 mb-6">
              Welcome to petm8.io
            </span>
            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
              Everything for your{" "}
              <span class="text-brand-500">furry friend</span>
            </h1>
            <p class="mt-6 text-lg text-gray-600 leading-relaxed max-w-lg">
              From premium supplies and custom AI pet portraits to grooming bookings
              and subscription boxes -- we have everything your pet needs to thrive.
            </p>
            <div class="mt-8 flex flex-wrap gap-4">
              <Button variant="primary" size="lg" href="/products">
                Shop Now
              </Button>
              <Button variant="outline" size="lg" href="/collections">
                Browse Collections
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative paw prints */}
        <div class="absolute top-10 right-10 opacity-5">
          <svg class="w-64 h-64 text-brand-500" viewBox="0 0 100 100" fill="currentColor">
            <circle cx="35" cy="25" r="8" />
            <circle cx="65" cy="25" r="8" />
            <circle cx="22" cy="45" r="7" />
            <circle cx="78" cy="45" r="7" />
            <ellipse cx="50" cy="65" rx="18" ry="15" />
          </svg>
        </div>
        <div class="absolute bottom-5 left-20 opacity-5 rotate-12">
          <svg class="w-40 h-40 text-pet-teal" viewBox="0 0 100 100" fill="currentColor">
            <circle cx="35" cy="25" r="8" />
            <circle cx="65" cy="25" r="8" />
            <circle cx="22" cy="45" r="7" />
            <circle cx="78" cy="45" r="7" />
            <ellipse cx="50" cy="65" rx="18" ry="15" />
          </svg>
        </div>
      </section>

      {/* Featured Collections */}
      {featuredCollections.length > 0 && (
        <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div class="flex items-center justify-between mb-8">
            <div>
              <h2 class="text-2xl sm:text-3xl font-bold text-gray-900">Shop by Collection</h2>
              <p class="mt-1 text-gray-500 text-sm">Find exactly what you are looking for</p>
            </div>
            <a
              href="/collections"
              class="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors hidden sm:inline-flex items-center gap-1"
            >
              View all
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCollections.map((collection) => (
              <a
                key={collection.id}
                href={`/collections/${collection.slug}`}
                class="group relative overflow-hidden rounded-2xl aspect-[4/3] bg-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300"
              >
                {collection.imageUrl ? (
                  <img
                    src={collection.imageUrl}
                    alt={collection.name}
                    class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div class="w-full h-full bg-gradient-to-br from-brand-100 to-brand-200" />
                )}
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div class="absolute bottom-0 left-0 right-0 p-6">
                  <h3 class="text-white font-bold text-lg group-hover:text-brand-200 transition-colors">
                    {collection.name}
                  </h3>
                  {collection.description && (
                    <p class="text-white/70 text-sm mt-1 line-clamp-2">{collection.description}</p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div class="flex items-center justify-between mb-8">
            <div>
              <h2 class="text-2xl sm:text-3xl font-bold text-gray-900">Featured Products</h2>
              <p class="mt-1 text-gray-500 text-sm">Our top picks for your pet</p>
            </div>
            <a
              href="/products"
              class="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors hidden sm:inline-flex items-center gap-1"
            >
              View all
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* AI Studio Promo Banner */}
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-brand-600 to-brand-500 p-8 sm:p-12 lg:p-16">
          <div class="relative z-10 max-w-xl">
            <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white mb-4">
              AI-Powered
            </span>
            <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
              Turn Your Pet Into Art
            </h2>
            <p class="mt-4 text-white/80 text-base sm:text-lg leading-relaxed">
              Upload a photo of your pet and our AI will create stunning custom artwork.
              Choose from dozens of styles -- from renaissance portraits to pop art.
            </p>
            <div class="mt-6">
              <Button
                variant="secondary"
                size="lg"
                href="/studio"
                class="bg-white text-brand-700 hover:bg-brand-50"
              >
                <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Try AI Studio
              </Button>
            </div>
          </div>

          {/* Decorative elements */}
          <div class="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
          <div class="absolute bottom-0 right-20 w-48 h-48 bg-white/5 rounded-full translate-y-1/4" />
          <div class="absolute top-1/2 right-8 opacity-10 hidden lg:block">
            <svg class="w-48 h-48 text-white" viewBox="0 0 100 100" fill="currentColor">
              <circle cx="35" cy="25" r="8" />
              <circle cx="65" cy="25" r="8" />
              <circle cx="22" cy="45" r="7" />
              <circle cx="78" cy="45" r="7" />
              <ellipse cx="50" cy="65" rx="18" ry="15" />
            </svg>
          </div>
        </div>
      </section>
    </div>
  );
};
