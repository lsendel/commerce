import type { FC } from "hono/jsx";
import { ProductCard } from "./product-card";

interface ProductGridVariant {
  id: string;
  price: string;
  compareAtPrice?: string | null;
}

interface ProductGridItem {
  id: string;
  name: string;
  slug: string;
  type: "physical" | "digital" | "subscription" | "bookable";
  featuredImageUrl?: string | null;
  variants: ProductGridVariant[];
}

interface ProductGridProps {
  products: ProductGridItem[];
  currencyCode?: string;
}

export const ProductGrid: FC<ProductGridProps> = ({ products, currencyCode = "USD" }) => {
  if (products.length === 0) {
    return (
      <div class="py-16 text-center" role="status">
        <svg class="mx-auto w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p class="text-gray-500 dark:text-gray-400 text-lg">No products found</p>
        <p class="text-gray-400 dark:text-gray-500 text-sm mt-1">Try adjusting your filters or search criteria.</p>
      </div>
    );
  }

  return (
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" role="list" aria-label="Product list">
      {products.map((product) => (
        <div role="listitem" key={product.id}>
          <ProductCard product={product} currencyCode={currencyCode} />
        </div>
      ))}
    </div>
  );
};
