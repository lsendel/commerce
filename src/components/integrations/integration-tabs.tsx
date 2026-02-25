import type { FC } from "hono/jsx";

interface TabsProps {
  tabs: string[];
  activeTab: string;
  prefix: string;
}

export const IntegrationTabs: FC<TabsProps> = ({ tabs, activeTab, prefix }) => (
  <div class="border-b mb-6">
    <nav class="flex gap-4" role="tablist">
      {tabs.map((tab) => (
        <button
          type="button"
          role="tab"
          data-tab-target={`${prefix}-${tab.toLowerCase()}`}
          class={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === activeTab
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          {tab}
        </button>
      ))}
    </nav>
  </div>
);
