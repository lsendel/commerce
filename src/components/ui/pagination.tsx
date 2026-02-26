import type { FC } from "hono/jsx";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export const Pagination: FC<PaginationProps> = ({
  currentPage,
  totalPages,
  baseUrl,
}) => {
  if (totalPages <= 1) return null;

  const buildUrl = (page: number): string => {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}page=${page}`;
  };

  // Build visible page range: show up to 5 pages centered on current
  const pages: (number | "ellipsis")[] = [];
  const delta = 2;
  const rangeStart = Math.max(2, currentPage - delta);
  const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

  pages.push(1);
  if (rangeStart > 2) pages.push("ellipsis");
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
  if (rangeEnd < totalPages - 1) pages.push("ellipsis");
  if (totalPages > 1) pages.push(totalPages);

  const linkBase =
    "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors duration-150 h-10 min-w-[2.5rem] px-2";
  const activeClass = "bg-brand-500 text-white shadow-sm";
  const inactiveClass = "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800";
  const disabledClass = "text-gray-300 dark:text-gray-600 cursor-not-allowed pointer-events-none";

  return (
    <nav class="flex items-center justify-center gap-1" aria-label="Pagination">
      {/* Previous */}
      {currentPage > 1 ? (
        <a
          href={buildUrl(currentPage - 1)}
          class={`${linkBase} ${inactiveClass}`}
          aria-label="Previous page"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </a>
      ) : (
        <span class={`${linkBase} ${disabledClass}`} aria-disabled="true" aria-label="Previous page">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </span>
      )}

      {/* Page numbers */}
      {pages.map((page, idx) => {
        if (page === "ellipsis") {
          return (
            <span key={`e-${idx}`} class={`${linkBase} ${disabledClass}`} aria-hidden="true">
              ...
            </span>
          );
        }

        const isActive = page === currentPage;
        return (
          <a
            key={page}
            href={buildUrl(page)}
            class={`${linkBase} ${isActive ? activeClass : inactiveClass}`}
            aria-current={isActive ? "page" : undefined}
            aria-label={`Page ${page}`}
          >
            {page}
          </a>
        );
      })}

      {/* Next */}
      {currentPage < totalPages ? (
        <a
          href={buildUrl(currentPage + 1)}
          class={`${linkBase} ${inactiveClass}`}
          aria-label="Next page"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      ) : (
        <span class={`${linkBase} ${disabledClass}`} aria-disabled="true" aria-label="Next page">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      )}
    </nav>
  );
};
