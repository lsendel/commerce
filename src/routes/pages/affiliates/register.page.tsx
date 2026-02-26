import type { FC } from "hono/jsx";

export const AffiliateRegisterPage: FC<{
  isAuthenticated: boolean;
  storeName: string;
}> = ({ isAuthenticated, storeName }) => {
  return (
    <div class="max-w-2xl mx-auto py-12 px-4">
      <h1 class="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">Become an Affiliate</h1>
      <p class="text-gray-600 dark:text-gray-400 mb-8">
        Earn commissions by promoting {storeName} products. Share your unique
        referral link and earn on every sale.
      </p>

      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">How It Works</h2>
        <ol class="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <li class="flex gap-3">
            <span class="bg-brand-100 dark:bg-brand-900 text-brand-800 dark:text-brand-300 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              1
            </span>
            <span>Sign up and get your unique referral link</span>
          </li>
          <li class="flex gap-3">
            <span class="bg-brand-100 dark:bg-brand-900 text-brand-800 dark:text-brand-300 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              2
            </span>
            <span>Share your link with your audience</span>
          </li>
          <li class="flex gap-3">
            <span class="bg-brand-100 dark:bg-brand-900 text-brand-800 dark:text-brand-300 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              3
            </span>
            <span>
              Earn commission on every purchase (30-day cookie window)
            </span>
          </li>
          <li class="flex gap-3">
            <span class="bg-brand-100 dark:bg-brand-900 text-brand-800 dark:text-brand-300 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              4
            </span>
            <span>Get paid monthly via Stripe</span>
          </li>
        </ol>
      </div>

      {!isAuthenticated ? (
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p class="text-yellow-800">
            Please{" "}
            <a href="/auth/login" class="underline font-medium">
              sign in
            </a>{" "}
            to register as an affiliate.
          </p>
        </div>
      ) : (
        <form id="affiliate-register-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Custom Slug (optional)
            </label>
            <input
              type="text"
              name="customSlug"
              pattern="[a-z0-9-]+"
              minLength={2}
              maxLength={50}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg"
              placeholder="my-brand"
            />
            <p class="text-xs text-gray-500 mt-1">
              Used in your referral URL. Leave blank for auto-generated code.
            </p>
          </div>
          <button
            type="submit"
            class="w-full bg-brand-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-brand-700"
          >
            Register as Affiliate
          </button>
        </form>
      )}

      <script src="/scripts/affiliates.js" />
    </div>
  );
};
