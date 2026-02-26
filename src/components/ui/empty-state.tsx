import type { FC } from "hono/jsx";
import type { EmptyStateProps } from "./types";

export const EmptyState: FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}) => {
  return (
    <div class="flex flex-col items-center justify-center py-12 px-6 text-center">
      {icon && (
        <div class="mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 p-4" aria-hidden="true">
          <svg class="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d={icon} />
          </svg>
        </div>
      )}
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {description && (
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm">{description}</p>
      )}
      {actionLabel && actionHref && (
        <a
          href={actionHref}
          class="mt-4 inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-600 hover:shadow hover:-translate-y-0.5 active:translate-y-0 active:bg-brand-700"
        >
          {actionLabel}
        </a>
      )}
    </div>
  );
};
