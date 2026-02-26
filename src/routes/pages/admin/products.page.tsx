import type { FC } from "hono/jsx";
import { Badge } from "../../../components/ui/badge";
import { Pagination } from "../../../components/ui/pagination";
import { PageHeader } from "../../../components/ui/page-header";
import { EmptyState } from "../../../components/ui/empty-state";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  featuredImageUrl: string | null;
  availableForSale: boolean;
  priceRange: { min: number; max: number };
  variantCount: number;
  totalInventory: number;
}

interface AdminProductsPageProps {
  products: ProductRow[];
  total: number;
  page: number;
  limit: number;
  filters: {
    status?: string;
    type?: string;
    search?: string;
  };
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "neutral"> = {
  active: "success",
  draft: "warning",
  archived: "neutral",
};

const TYPE_LABELS: Record<string, string> = {
  physical: "Physical",
  digital: "Digital",
  subscription: "Subscription",
  bookable: "Bookable",
};

export const AdminProductsPage: FC<AdminProductsPageProps> = ({
  products,
  total,
  page,
  limit,
  filters,
}) => {
  const totalPages = Math.ceil(total / limit);

  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <PageHeader
        title={`Products (${total})`}
        actions={
          <a
            href="/admin/products/new"
            class="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Product
          </a>
        }
      />

      {/* Filter bar */}
      <div class="flex flex-wrap items-center gap-3 mb-6">
        <form method="get" class="flex flex-wrap items-center gap-3 w-full">
          <select
            name="status"
            class="rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="" selected={!filters.status}>All Status</option>
            <option value="active" selected={filters.status === "active"}>Active</option>
            <option value="draft" selected={filters.status === "draft"}>Draft</option>
            <option value="archived" selected={filters.status === "archived"}>Archived</option>
          </select>

          <select
            name="type"
            class="rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="" selected={!filters.type}>All Types</option>
            <option value="physical" selected={filters.type === "physical"}>Physical</option>
            <option value="digital" selected={filters.type === "digital"}>Digital</option>
            <option value="subscription" selected={filters.type === "subscription"}>Subscription</option>
            <option value="bookable" selected={filters.type === "bookable"}>Bookable</option>
          </select>

          <input
            type="text"
            name="search"
            placeholder="Search products..."
            value={filters.search || ""}
            class="flex-1 min-w-[200px] rounded-xl border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
          />

          <button
            type="submit"
            class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="No products found"
          description={filters.search || filters.status || filters.type
            ? "Try adjusting your filters."
            : "Create your first product to get started."}
          actionLabel="Add Product"
          actionHref="/admin/products/new"
        />
      ) : (
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-gray-500">Product</th>
                <th class="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th class="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                <th class="text-left px-4 py-3 font-medium text-gray-500">Price</th>
                <th class="text-left px-4 py-3 font-medium text-gray-500">Inventory</th>
                <th class="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              {products.map((product) => (
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                        {product.featuredImageUrl ? (
                          <img src={product.featuredImageUrl} alt={product.name} class="w-full h-full object-cover" />
                        ) : (
                          <div class="w-full h-full flex items-center justify-center text-gray-300">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <a href={`/admin/products/${product.id}`} class="font-medium text-gray-900 dark:text-gray-100 hover:text-brand-600">
                          {product.name}
                        </a>
                        <p class="text-xs text-gray-400">{product.variantCount} variant{product.variantCount !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[product.status] || "neutral"}>
                      {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                    </Badge>
                  </td>
                  <td class="px-4 py-3">
                    <span class="text-gray-600 dark:text-gray-400">
                      {TYPE_LABELS[product.type] || product.type}
                    </span>
                  </td>
                  <td class="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {product.priceRange.min === product.priceRange.max
                      ? `$${product.priceRange.min.toFixed(2)}`
                      : `$${product.priceRange.min.toFixed(2)} – $${product.priceRange.max.toFixed(2)}`}
                  </td>
                  <td class="px-4 py-3">
                    <span class={product.totalInventory <= 0 ? "text-red-600 font-medium" : product.totalInventory <= 5 ? "text-yellow-600 font-medium" : "text-gray-600"}>
                      {product.totalInventory}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <a
                        href={`/admin/products/${product.id}`}
                        class="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        title="Edit"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </a>
                      <a
                        href={`/products/${product.slug}`}
                        target="_blank"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        title="View"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div class="mt-6">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            baseUrl={`/admin/products?status=${filters.status || ""}&type=${filters.type || ""}&search=${filters.search || ""}`}
          />
        </div>
      )}
    </div>
  );
};
