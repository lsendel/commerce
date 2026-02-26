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
        {actions && (
          <div class="flex items-center gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
