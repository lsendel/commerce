import type { FC } from "hono/jsx";

interface LinksProps {
  links: any[];
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
      <h1 class="text-3xl font-bold mb-8">Affiliate Links</h1>

      {/* Quick share */}
      <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
        <h3 class="text-sm font-medium text-indigo-800 mb-1">
          Quick Referral URL
        </h3>
        <code class="text-sm bg-white px-3 py-1 rounded border">
          {baseUrl}?ref={referralCode}
        </code>
      </div>

      {/* Create link */}
      <div class="bg-white border rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4">Create Tracking Link</h2>
        <form id="create-link-form" class="flex gap-4">
          <input
            type="url"
            name="targetUrl"
            placeholder="https://example.com/products/cool-product"
            required
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          />
          <button
            type="submit"
            class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Create
          </button>
        </form>
      </div>

      {/* Links table */}
      <div class="bg-white border rounded-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Target URL
              </th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Short Code
              </th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Clicks
              </th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Created
              </th>
            </tr>
          </thead>
          <tbody class="divide-y">
            {links.map((l: any) => (
              <tr>
                <td class="px-6 py-4 text-sm truncate max-w-xs">
                  {l.targetUrl}
                </td>
                <td class="px-6 py-4">
                  <code class="text-xs bg-gray-100 px-2 py-0.5 rounded">
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
