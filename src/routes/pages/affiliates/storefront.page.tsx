import type { FC } from "hono/jsx";

interface CreatorProfile {
  id: string;
  name: string;
  customSlug: string;
  referralCode: string;
  commissionRate: string;
  totalClicks: number;
  totalConversions: number;
}

interface FeaturedLink {
  id: string;
  shortCode: string;
  clickCount: number;
  targetUrl: string;
  referralUrl: string;
}

interface FeaturedProduct {
  id: string;
  name: string;
  slug: string;
  featuredImageUrl: string | null;
  price: string;
  referralUrl: string;
}

interface CreatorStorefrontPageProps {
  creator: CreatorProfile;
  featuredLinks: FeaturedLink[];
  featuredProducts: FeaturedProduct[];
}

export const CreatorStorefrontPage: FC<CreatorStorefrontPageProps> = ({
  creator,
  featuredLinks,
  featuredProducts,
}) => {
  return (
    <div class="max-w-6xl mx-auto py-8 px-4 space-y-8">
      <section class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 md:p-8">
        <p class="text-xs uppercase tracking-wide text-brand-600 dark:text-brand-300 font-semibold mb-2">
          Creator Storefront
        </p>
        <h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">{creator.name}</h1>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Shop picks from @{creator.customSlug}. Referral code: <span class="font-semibold">{creator.referralCode}</span>
        </p>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div class="rounded-xl bg-gray-50 dark:bg-gray-900 p-3">
            <p class="text-xs text-gray-500 dark:text-gray-400">Commission</p>
            <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{creator.commissionRate}%</p>
          </div>
          <div class="rounded-xl bg-gray-50 dark:bg-gray-900 p-3">
            <p class="text-xs text-gray-500 dark:text-gray-400">Total Clicks</p>
            <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{creator.totalClicks}</p>
          </div>
          <div class="rounded-xl bg-gray-50 dark:bg-gray-900 p-3">
            <p class="text-xs text-gray-500 dark:text-gray-400">Conversions</p>
            <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{creator.totalConversions}</p>
          </div>
          <div class="rounded-xl bg-gray-50 dark:bg-gray-900 p-3">
            <p class="text-xs text-gray-500 dark:text-gray-400">Creator URL</p>
            <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">/creators/{creator.customSlug}</p>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Featured Products</h2>
        {featuredProducts.length === 0 ? (
          <p class="text-sm text-gray-500 dark:text-gray-400">No featured products yet.</p>
        ) : (
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredProducts.map((product) => (
              <a href={product.referralUrl} class="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:border-brand-300 transition-colors bg-white dark:bg-gray-900">
                <div class="aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  {product.featuredImageUrl ? (
                    <img src={product.featuredImageUrl} alt={product.name} class="w-full h-full object-cover" />
                  ) : (
                    <div class="w-full h-full flex items-center justify-center text-sm text-gray-400">No image</div>
                  )}
                </div>
                <div class="p-4">
                  <p class="font-medium text-gray-900 dark:text-gray-100">{product.name}</p>
                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">${product.price}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <section class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Tracked Creator Links</h2>
        {featuredLinks.length === 0 ? (
          <p class="text-sm text-gray-500 dark:text-gray-400">No tracked links yet.</p>
        ) : (
          <div class="space-y-3">
            {featuredLinks.map((link) => (
              <div class="rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p class="text-xs uppercase tracking-wide text-gray-400">{link.shortCode}</p>
                  <p class="text-sm text-gray-700 dark:text-gray-300 break-all">{link.targetUrl}</p>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-xs text-gray-500 dark:text-gray-400">{link.clickCount} clicks</span>
                  <a href={link.referralUrl} class="text-sm text-brand-600 dark:text-brand-300 hover:underline">Open</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
