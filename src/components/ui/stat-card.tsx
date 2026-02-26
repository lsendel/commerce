import type { FC } from "hono/jsx";
import type { StatCardProps } from "./types";
import { TREND_COLORS, TREND_ICONS } from "./tokens";

export const StatCard: FC<StatCardProps> = ({
  icon,
  label,
  value,
  trend,
  trendValue,
}) => {
  return (
    <div class="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
        {icon && (
          <span class="text-gray-400 dark:text-gray-500" aria-hidden="true">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d={icon} />
            </svg>
          </span>
        )}
      </div>
      <div class="mt-2 flex items-baseline gap-2">
        <span class="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</span>
        {trend && trendValue && (
          <span class={`inline-flex items-center gap-0.5 text-xs font-medium ${TREND_COLORS[trend]}`}>
            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d={TREND_ICONS[trend]} />
            </svg>
            {trendValue}
          </span>
        )}
      </div>
    </div>
  );
};
