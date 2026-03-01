import type { FC } from "hono/jsx";

interface HeadlessApiPackRow {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  scopes: Array<"catalog:read" | "products:read" | "collections:read">;
  status: "active" | "revoked";
  rateLimitPerMinute: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
}

interface HeadlessApiPacksPageProps {
  packs: HeadlessApiPackRow[];
}

function statusClasses(status: HeadlessApiPackRow["status"]): string {
  return status === "active"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-rose-100 text-rose-700";
}

export const HeadlessApiPacksPage: FC<HeadlessApiPacksPageProps> = ({ packs }) => {
  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="mb-8 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50 px-6 py-5">
        <nav class="text-xs text-sky-700/80 mb-1">
          <a href="/admin" class="hover:text-sky-900">Admin</a>
          <span class="mx-1">/</span>
          <span class="text-sky-900">Headless API Packs</span>
        </nav>
        <h1 class="text-2xl font-bold text-slate-900">Headless API Packs</h1>
        <p class="mt-1 text-sm text-slate-600">
          Create scoped API keys for storefront channels, composable frontends, and partner syndication.
        </p>
      </div>

      <section class="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900">Create API Pack</h2>
        <p class="text-sm text-gray-500 mt-1">The full key is shown once after creation.</p>

        <form id="headless-pack-form" class="mt-4 grid lg:grid-cols-4 gap-4 items-end">
          <div class="lg:col-span-2">
            <label for="headless-pack-name" class="block text-xs font-medium text-gray-600 mb-1">Pack Name</label>
            <input
              id="headless-pack-name"
              name="name"
              type="text"
              required
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Next.js storefront"
            />
          </div>

          <div class="lg:col-span-2">
            <label for="headless-pack-description" class="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input
              id="headless-pack-description"
              name="description"
              type="text"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Public product catalog channel"
            />
          </div>

          <div>
            <label for="headless-rate-limit" class="block text-xs font-medium text-gray-600 mb-1">Rate Limit / min</label>
            <input
              id="headless-rate-limit"
              name="rateLimitPerMinute"
              type="number"
              min={10}
              max={10000}
              value={240}
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div class="lg:col-span-3">
            <p class="block text-xs font-medium text-gray-600 mb-1">Scopes</p>
            <div class="flex items-center gap-4 flex-wrap text-xs text-gray-700">
              <label class="inline-flex items-center gap-2">
                <input type="checkbox" name="scopes" value="catalog:read" checked />
                <span>catalog:read</span>
              </label>
              <label class="inline-flex items-center gap-2">
                <input type="checkbox" name="scopes" value="products:read" />
                <span>products:read</span>
              </label>
              <label class="inline-flex items-center gap-2">
                <input type="checkbox" name="scopes" value="collections:read" />
                <span>collections:read</span>
              </label>
            </div>
          </div>
        </form>

        <div class="mt-4 flex items-center gap-2">
          <button type="button" id="headless-pack-create-btn" class="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100">
            Create API Pack
          </button>
          <button type="button" id="headless-pack-refresh-btn" class="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            Refresh
          </button>
          <p id="headless-pack-status" class="text-xs text-gray-500" />
        </div>

        <div id="headless-pack-error" class="hidden mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" />

        <div id="headless-key-output" class="hidden mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p class="text-xs font-semibold text-amber-800">New API key (save now, it will not be shown again)</p>
          <div class="mt-2 flex items-center gap-2">
            <code id="headless-key-value" class="block flex-1 rounded bg-white px-2 py-1 text-xs text-gray-800 border border-amber-200" />
            <button type="button" id="headless-key-copy-btn" class="rounded border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100">Copy</button>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-gray-200 bg-white p-6">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Issued Packs</h2>
            <p class="text-sm text-gray-500 mt-1">Active and revoked keys with scope and last-use telemetry.</p>
          </div>
        </div>

        <div id="headless-pack-list" class="mt-4 space-y-2">
          {packs.length === 0 ? (
            <p class="text-sm text-gray-400">No headless packs created yet.</p>
          ) : (
            packs.map((pack) => (
              <article class="rounded-lg border border-gray-200 px-3 py-3" data-pack-id={pack.id}>
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="font-medium text-gray-900">{pack.name}</p>
                    {pack.description && <p class="text-xs text-gray-600 mt-0.5">{pack.description}</p>}
                    <p class="text-xs text-gray-500 mt-1">
                      Prefix {pack.keyPrefix} · scopes {pack.scopes.join(", ")} · limit {pack.rateLimitPerMinute}/min
                    </p>
                    <p class="text-xs text-gray-400 mt-1">Last used: {pack.lastUsedAt ?? "never"}</p>
                  </div>
                  <span class={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClasses(pack.status)}`}>
                    {pack.status}
                  </span>
                </div>

                {pack.status === "active" ? (
                  <div class="mt-2">
                    <button
                      type="button"
                      class="headless-pack-revoke-btn rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                      data-pack-id={pack.id}
                    >
                      Revoke
                    </button>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <script src="/scripts/admin-headless-packs.js" defer></script>
    </div>
  );
};
