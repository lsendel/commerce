import type { FC } from "hono/jsx";
import type { TabsProps } from "./types";

export const Tabs: FC<TabsProps> = ({
  tabs,
  activeTab,
  baseUrl,
}) => {
  return (
    <nav class="border-b border-gray-200 dark:border-gray-700 mb-6" aria-label="Tabs">
      <div class="flex gap-0 -mb-px overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const href = tab.href || (baseUrl ? `${baseUrl}?tab=${tab.id}` : `?tab=${tab.id}`);

          return (
            <a
              key={tab.id}
              href={href}
              class={`inline-flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
};
