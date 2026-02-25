import type { FC } from "hono/jsx";
import { ProductGrid } from "../../components/product/product-grid";
import { Button } from "../../components/ui/button";

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

interface Collection {
  id: string;
  name: string;
  slug: string;
}

interface ProductListPageProps {
  products: ProductSummary[];
  total: number;
  page: number;
  limit: number;
  collections?: Collection[];
  filters?: {
    type?: string;
    collection?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
  };
}

const productTypes = [
  { value: "", label: "All Types" },
  { value: "physical", label: "Physical" },
  { value: "digital", label: "Digital" },
  { value: "subscription", label: "Subscription" },
  { value: "bookable", label: "Bookable" },
];

const sortOptions = [
  { value: "", label: "Default" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name", label: "Name: A-Z" },
];

export const ProductListPage: FC<ProductListPageProps> = ({
  products,
  total,
  page,
  limit,
  collections = [],
  filters = {},
}) => {
  const totalPages = Math.ceil(total / limit);

  const buildUrl = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = { ...filters, page: String(page), limit: String(limit), ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value !== undefined && value !== "" && value !== null) {
        params.set(key, String(value));
      }
    }
    return `/products?${params.toString()}`;
  };

  return (
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Products</h1>
        <p class="mt-1 text-gray-500 text-sm">{total} {total === 1 ? "product" : "products"} found</p>
      </div>

      <div class="lg:flex lg:gap-8">
        {/* Filter sidebar - desktop */}
        <aside class="hidden lg:block w-64 shrink-0">
          <form method="get" action="/products" class="space-y-6 sticky top-6">
            {/* Search */}
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Search</label>
              <input
                type="text"
                name="search"
                value={filters.search || ""}
                placeholder="Search products..."
                class="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 placeholder:text-gray-400"
              />
            </div>

            {/* Type filter */}
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Product Type</label>
              <div class="space-y-2">
                {productTypes.map((pt) => (
                  <label key={pt.value} class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value={pt.value}
                      checked={(filters.type || "") === pt.value}
                      class="text-brand-500 focus:ring-brand-300"
                    />
                    <span class="text-sm text-gray-700">{pt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Collection filter */}
            {collections.length > 0 && (
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Collection</label>
                <select
                  name="collection"
                  class="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
                >
                  <option value="">All Collections</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.slug} selected={filters.collection === c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Price range */}
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Price Range</label>
              <div class="flex items-center gap-2">
                <input
                  type="number"
                  name="minPrice"
                  value={filters.minPrice !== undefined ? String(filters.minPrice) : ""}
                  placeholder="Min"
                  min="0"
                  step="0.01"
                  class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
                <span class="text-gray-400 text-sm">-</span>
                <input
                  type="number"
                  name="maxPrice"
                  value={filters.maxPrice !== undefined ? String(filters.maxPrice) : ""}
                  placeholder="Max"
                  min="0"
                  step="0.01"
                  class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
            </div>

            {/* Sort */}
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
              <select
                name="sort"
                class="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} selected={(filters.sort || "") === opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" variant="primary" size="md" class="w-full">
              Apply Filters
            </Button>

            <a
              href="/products"
              class="block text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear all filters
            </a>
          </form>
        </aside>

        {/* Mobile filter bar */}
        <div class="lg:hidden mb-6">
          <details class="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <summary class="flex items-center justify-between p-4 cursor-pointer">
              <span class="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters & Sort
              </span>
              <svg class="w-4 h-4 text-gray-500 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div class="p-4 border-t border-gray-100">
              <form method="get" action="/products" class="space-y-4">
                <input
                  type="text"
                  name="search"
                  value={filters.search || ""}
                  placeholder="Search products..."
                  class="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 placeholder:text-gray-400"
                />
                <div class="grid grid-cols-2 gap-3">
                  <select
                    name="type"
                    class="rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    {productTypes.map((pt) => (
                      <option key={pt.value} value={pt.value} selected={(filters.type || "") === pt.value}>
                        {pt.label}
                      </option>
                    ))}
                  </select>
                  <select
                    name="sort"
                    class="rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    {sortOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} selected={(filters.sort || "") === opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {collections.length > 0 && (
                  <select
                    name="collection"
                    class="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    <option value="">All Collections</option>
                    {collections.map((c) => (
                      <option key={c.id} value={c.slug} selected={filters.collection === c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
                <div class="flex items-center gap-2">
                  <input
                    type="number"
                    name="minPrice"
                    value={filters.minPrice !== undefined ? String(filters.minPrice) : ""}
                    placeholder="Min $"
                    min="0"
                    step="0.01"
                    class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  <span class="text-gray-400 text-sm">-</span>
                  <input
                    type="number"
                    name="maxPrice"
                    value={filters.maxPrice !== undefined ? String(filters.maxPrice) : ""}
                    placeholder="Max $"
                    min="0"
                    step="0.01"
                    class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
                <div class="flex gap-2">
                  <Button type="submit" variant="primary" size="sm" class="flex-1">
                    Apply
                  </Button>
                  <Button variant="ghost" size="sm" href="/products">
                    Clear
                  </Button>
                </div>
              </form>
            </div>
          </details>
        </div>

        {/* Main content */}
        <div class="flex-1 min-w-0">
          <ProductGrid products={products} />

          {/* Pagination */}
          {totalPages > 1 && (
            <nav class="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
              {/* Previous */}
              {page > 1 ? (
                <a
                  href={buildUrl({ page: page - 1 })}
                  class="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Prev
                </a>
              ) : (
                <span class="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium text-gray-400 bg-gray-50 border border-gray-100 cursor-not-allowed">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Prev
                </span>
              )}

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                if (
                  totalPages <= 7 ||
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - page) <= 1
                ) {
                  return (
                    <a
                      key={p}
                      href={buildUrl({ page: p })}
                      class={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-medium transition-colors ${
                        p === page
                          ? "bg-brand-500 text-white shadow-sm"
                          : "text-gray-700 bg-white border border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </a>
                  );
                }
                if (p === 2 && page > 3) {
                  return <span key={p} class="px-1 text-gray-400">...</span>;
                }
                if (p === totalPages - 1 && page < totalPages - 2) {
                  return <span key={p} class="px-1 text-gray-400">...</span>;
                }
                return null;
              })}

              {/* Next */}
              {page < totalPages ? (
                <a
                  href={buildUrl({ page: page + 1 })}
                  class="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Next
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ) : (
                <span class="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium text-gray-400 bg-gray-50 border border-gray-100 cursor-not-allowed">
                  Next
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
};
