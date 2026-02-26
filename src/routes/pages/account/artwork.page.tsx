import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Button } from "../../../components/ui/button";

interface ArtworkItem {
  id: string;
  templateId: string | null;
  outputRasterUrl: string | null;
  outputSvgUrl: string | null;
  prompt: string | null;
  createdAt: string;
}

interface ArtworkPageProps {
  artwork: ArtworkItem[];
  total: number;
  page: number;
  limit: number;
  isAdmin?: boolean;
}

export const ArtworkPage: FC<ArtworkPageProps> = ({
  artwork,
  total,
  page,
  limit,
  isAdmin,
}) => {
  const totalPages = Math.ceil(total / limit);

  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Your Artwork</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {total} {total === 1 ? "creation" : "creations"} so far
          </p>
        </div>
        <Button variant="primary" href="/studio/create">
          Create New
        </Button>
      </div>

      {artwork.length === 0 ? (
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-12 text-center">
          <div class="w-16 h-16 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">No artwork yet</h2>
          <p class="text-sm text-gray-400 mb-4">Create your first AI pet artwork in the studio.</p>
          <Button variant="primary" href="/studio/create">
            Get Started
          </Button>
        </div>
      ) : (
        <>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {artwork.map((item) => (
              <div class="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                {/* Image */}
                <a href={`/studio/preview/${item.id}`} class="block aspect-square bg-gray-100 overflow-hidden">
                  {item.outputRasterUrl ? (
                    <img
                      src={item.outputRasterUrl}
                      alt="AI generated pet artwork"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div class="w-full h-full flex items-center justify-center bg-brand-50">
                      <svg class="w-12 h-12 text-brand-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                    </div>
                  )}
                </a>

                {/* Info & actions */}
                <div class="p-4">
                  <p class="text-xs text-gray-400 dark:text-gray-500 mb-3">
                    {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>

                  <div class="flex items-center gap-2">
                    <a
                      href={`/studio/preview/${item.id}`}
                      class="flex-1 text-center px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
                    >
                      View
                    </a>
                    {item.outputRasterUrl && (
                      <a
                        href={item.outputRasterUrl}
                        download
                        class="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        Download
                      </a>
                    )}
                    <button
                      type="button"
                      data-delete-artwork={item.id}
                      class="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>

                  {isAdmin && (
                    <a
                      href={`/products/create/${item.id}`}
                      class="mt-2 block text-center px-3 py-1.5 text-xs font-medium rounded-lg border border-brand-200 text-brand-600 hover:bg-brand-50 transition-colors"
                    >
                      Create Product
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div class="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <a
                  href={`/account/artwork?page=${page - 1}`}
                  class="px-3 py-2 text-sm font-medium rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </a>
              )}
              <span class="text-sm text-gray-500">Page {page} of {totalPages}</span>
              {page < totalPages && (
                <a
                  href={`/account/artwork?page=${page + 1}`}
                  class="px-3 py-2 text-sm font-medium rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors"
                >
                  Next
                </a>
              )}
            </div>
          )}
        </>
      )}

      {html`<script>
        document.addEventListener('click', async (e) => {
          var btn = e.target.closest('[data-delete-artwork]');
          if (!btn) return;
          if (!confirm('Delete this artwork permanently?')) return;
          var id = btn.dataset.deleteArtwork;
          btn.disabled = true;
          btn.textContent = 'Deleting...';
          try {
            var res = await fetch('/api/studio/jobs/' + id, { method: 'DELETE' });
            if (res.ok) location.reload();
            else alert('Failed to delete artwork');
          } catch {
            alert('Failed to delete artwork');
          }
          btn.disabled = false;
          btn.textContent = 'Delete';
        });
      </script>`}
    </div>
  );
};
