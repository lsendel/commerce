import type { FC } from "hono/jsx";

interface AffiliateLink {
  id: string;
  targetUrl: string;
  shortCode: string;
  clickCount: number;
  createdAt: string;
}

interface LinksProps {
  links: AffiliateLink[];
  referralCode: string;
  baseUrl: string;
}

export const AffiliateLinksPage: FC<LinksProps> = ({
  links,
  referralCode,
  baseUrl,
}) => {
  return (
    <div class="max-w-4xl mx-auto py-8 px-4">
      <h1 class="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Affiliate Links</h1>

      {/* Quick share */}
      <div class="bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-700 rounded-lg p-4 mb-6">
        <h3 class="text-sm font-medium text-brand-800 dark:text-brand-300 mb-1">
          Quick Referral URL
        </h3>
        <code class="text-sm bg-white dark:bg-gray-800 dark:text-gray-300 px-3 py-1 rounded border border-gray-200 dark:border-gray-700">
          {baseUrl}?ref={referralCode}
        </code>
      </div>

      {/* Create link */}
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Create Tracking Link</h2>
        <form id="create-link-form" class="flex gap-4">
          <input
            type="url"
            name="targetUrl"
            placeholder="https://example.com/products/cool-product"
            required
            class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg"
          />
          <button
            type="submit"
            class="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700"
          >
            Create
          </button>
        </form>
      </div>

      {/* Links table */}
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Target URL
              </th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Short Code
              </th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Clicks
              </th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Created
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            {links.map((l) => (
              <tr>
                <td class="px-6 py-4 text-sm truncate max-w-xs text-gray-900 dark:text-gray-100">
                  {l.targetUrl}
                </td>
                <td class="px-6 py-4">
                  <code class="text-xs bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                    {l.shortCode}
                  </code>
                </td>
                <td class="px-6 py-4 text-sm">{l.clickCount}</td>
                <td class="px-6 py-4 text-sm text-gray-500">
                  {new Date(l.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {links.length === 0 && (
          <p class="text-center py-8 text-gray-500">
            No links yet. Create one above.
          </p>
        )}
      </div>

      <script src="/scripts/affiliates.js" />
    </div>
  );
};
