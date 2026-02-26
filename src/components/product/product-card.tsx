import type { FC } from "hono/jsx";

interface ProductCardVariant {
  id: string;
  price: string;
  compareAtPrice?: string | null;
}

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    type: "physical" | "digital" | "subscription" | "bookable";
    featuredImageUrl?: string | null;
    variants: ProductCardVariant[];
  };
}

const typeBadgeConfig: Record<string, { label: string; classes: string }> = {
  digital: { label: "Digital", classes: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  subscription: { label: "Subscription", classes: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  bookable: { label: "Event", classes: "bg-pet-teal/20 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  physical: { label: "", classes: "" },
};

export const ProductCard: FC<ProductCardProps> = ({ product }) => {
  const { name, slug, type, featuredImageUrl, variants } = product;

  const prices = variants.map((v) => parseFloat(v.price));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const isMultiVariant = variants.length > 1 && minPrice !== maxPrice;

  const lowestVariant = variants.reduce((a, b) =>
    parseFloat(a.price) <= parseFloat(b.price) ? a : b,
  );
  const compareAtPrice = lowestVariant.compareAtPrice;
  const compareNum = compareAtPrice ? parseFloat(compareAtPrice) : null;
  const isOnSale = compareNum !== null && compareNum > minPrice;

  const badge = typeBadgeConfig[type];

  return (
    <a
      href={`/products/${slug}`}
      class="group block rounded-2xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-gray-100 dark:border-gray-700"
      aria-label={`${name} - $${minPrice.toFixed(2)}`}
    >
      {/* Image */}
      <div class="relative aspect-square overflow-hidden bg-gray-50 dark:bg-gray-700">
        {featuredImageUrl ? (
          <img
            src={featuredImageUrl}
            alt={name}
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div class="w-full h-full flex items-center justify-center bg-brand-50 dark:bg-brand-900/20">
            <svg class="w-16 h-16 text-brand-200 dark:text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Type badge */}
        {badge && badge.label && (
          <span class={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${badge.classes}`}>
            {badge.label}
          </span>
        )}

        {/* Sale badge */}
        {isOnSale && (
          <span class="absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Sale
          </span>
        )}
      </div>

      {/* Info */}
      <div class="p-4">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors duration-200 line-clamp-2 mb-2">
          {name}
        </h3>
        <div class="flex items-center gap-2 flex-wrap">
          {isMultiVariant ? (
            <span class="text-sm font-bold text-gray-900 dark:text-gray-100">
              From ${minPrice.toFixed(2)}
            </span>
          ) : (
            <span class={`text-sm font-bold ${isOnSale ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>
              ${minPrice.toFixed(2)}
            </span>
          )}
          {isOnSale && !isMultiVariant && compareNum !== null && (
            <span class="text-xs text-gray-400 dark:text-gray-500 line-through">
              ${compareNum.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </a>
  );
};
