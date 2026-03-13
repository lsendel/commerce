import type { FC } from "hono/jsx";
import type { PageHeaderProps } from "./types";

export const PageHeader: FC<PageHeaderProps> = ({
  title,
  breadcrumbs,
  actions,
}) => {
  return (
    <div class="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav class="mb-2" aria-label="Breadcrumb">
          <ol class="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            {breadcrumbs.map((crumb, idx) => (
              <li key={idx} class="flex items-center gap-1.5">
                {idx > 0 && (
                  <svg class="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
                {crumb.href ? (
                  <a href={crumb.href} class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                    {crumb.label}
                  </a>
                ) : (
                  <span class="text-gray-700 dark:text-gray-200 font-medium" aria-current="page">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div class="flex items-center justify-between gap-4">
        <h1 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{title}</h1>
        <div class="flex items-center gap-3 shrink-0">
          <button
            type="button"
            data-admin-quick-actions-btn
            class="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Open quick actions"
          >
            Quick Actions
            <span class="hidden sm:inline text-[11px] text-gray-400">Ctrl/Cmd+K</span>
          </button>
          {actions}
        </div>
      </div>
    </div>
  );
};
