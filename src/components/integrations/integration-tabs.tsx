import type { FC } from "hono/jsx";

interface TabsProps {
  tabs: string[];
  activeTab: string;
  prefix: string;
}

export const IntegrationTabs: FC<TabsProps> = ({ tabs, activeTab, prefix }) => (
  <div class="border-b dark:border-gray-700 mb-6">
    <nav class="flex gap-4" role="tablist" aria-label="Integration categories">
      {tabs.map((tab) => (
        <button
          type="button"
          role="tab"
          aria-selected={tab === activeTab}
          data-tab-target={`${prefix}-${tab.toLowerCase()}`}
          class={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === activeTab
              ? "border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          {tab}
        </button>
      ))}
    </nav>
  </div>
);
