import type { FC } from "hono/jsx";
import type { TableProps } from "./types";
import { Pagination } from "./pagination";
import { EmptyState } from "./empty-state";

export const Table: FC<TableProps> = ({
  columns,
  data,
  emptyMessage = "No items found",
  emptyIcon,
  pagination,
  baseUrl = "",
  sortKey,
  sortDir = "asc",
}) => {
  if (data.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyMessage} />;
  }

  const buildSortUrl = (key: string): string => {
    const url = new URL(baseUrl, "http://localhost");
    url.searchParams.set("sort", key);
    url.searchParams.set("dir", sortKey === key && sortDir === "asc" ? "desc" : "asc");
    if (pagination) url.searchParams.set("page", "1");
    return `${url.pathname}${url.search}`;
  };

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit)
    : 0;

  return (
    <div class="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  {col.sortable ? (
                    <a
                      href={buildSortUrl(col.key)}
                      class="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                      {col.label}
                      {sortKey === col.key && (
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" d={sortDir === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                        </svg>
                      )}
                    </a>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {data.map((row, rowIdx) => (
              <tr key={rowIdx} class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div class="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <Pagination
            currentPage={pagination.page}
            totalPages={totalPages}
            baseUrl={baseUrl}
          />
        </div>
      )}
    </div>
  );
};
