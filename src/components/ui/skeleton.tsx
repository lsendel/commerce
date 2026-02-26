import type { FC } from "hono/jsx";

/** Single skeleton block with configurable dimensions */
export const Skeleton: FC<{ class?: string }> = ({ class: className }) => (
  <div class={`skeleton ${className || ""}`} aria-hidden="true" />
);

/** Product card loading skeleton */
export const ProductCardSkeleton: FC = () => (
  <div
    class="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden"
    aria-hidden="true"
  >
    {/* Image placeholder */}
    <div class="aspect-square skeleton" />
    {/* Text placeholders */}
    <div class="p-4 space-y-2">
      <div class="skeleton skeleton-text w-3/4" />
      <div class="skeleton skeleton-text-sm w-1/2" />
    </div>
  </div>
);

/** Product grid loading skeleton - shows 4-8 skeleton cards */
export const ProductGridSkeleton: FC<{ count?: number }> = ({ count = 8 }) => (
  <div
    class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
    role="status"
    aria-label="Loading products"
  >
    {Array.from({ length: count }, (_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
    <span class="sr-only">Loading products...</span>
  </div>
);

/** Product detail page skeleton */
export const ProductDetailSkeleton: FC = () => (
  <div class="lg:grid lg:grid-cols-2 lg:gap-12" role="status" aria-label="Loading product details">
    {/* Image skeleton */}
    <div>
      <div class="aspect-square rounded-2xl skeleton" />
      <div class="mt-4 grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} class="aspect-square rounded-xl skeleton" />
        ))}
      </div>
    </div>
    {/* Info skeleton */}
    <div class="mt-8 lg:mt-0 space-y-4">
      <div class="skeleton skeleton-text-lg w-2/3" />
      <div class="skeleton skeleton-text w-1/3" />
      <div class="skeleton h-12 w-40 mt-4" />
      <div class="space-y-2 mt-6">
        <div class="skeleton skeleton-text w-full" />
        <div class="skeleton skeleton-text w-5/6" />
        <div class="skeleton skeleton-text w-4/6" />
      </div>
      <div class="skeleton h-12 w-full mt-6 rounded-xl" />
    </div>
    <span class="sr-only">Loading product details...</span>
  </div>
);

/** Cart drawer / page item skeleton */
export const CartItemSkeleton: FC = () => (
  <div
    class="flex gap-4 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
    aria-hidden="true"
  >
    <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-xl skeleton shrink-0" />
    <div class="flex-1 space-y-2">
      <div class="skeleton skeleton-text w-3/4" />
      <div class="skeleton skeleton-text-sm w-1/2" />
      <div class="skeleton skeleton-text-sm w-1/4 mt-3" />
    </div>
  </div>
);

/** Cart skeleton with multiple items */
export const CartSkeleton: FC<{ count?: number }> = ({ count = 3 }) => (
  <div class="space-y-4" role="status" aria-label="Loading cart">
    {Array.from({ length: count }, (_, i) => (
      <CartItemSkeleton key={i} />
    ))}
    <span class="sr-only">Loading cart items...</span>
  </div>
);
