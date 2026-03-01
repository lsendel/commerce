import type { FC } from "hono/jsx";

interface SidebarLink {
  label: string;
  href: string;
  icon: string;
  count?: number;
}

interface SidebarSection {
  title: string;
  links: SidebarLink[];
}

interface AdminSidebarProps {
  activePath?: string;
}

const sections: SidebarSection[] = [
  {
    title: "Commerce",
    links: [
      { label: "Products", href: "/admin/products", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
      { label: "Collections", href: "/admin/collections", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
      { label: "Orders", href: "/admin/orders", icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" },
    ],
  },
  {
    title: "Marketing",
    links: [
      { label: "Promotions", href: "/admin/promotions", icon: "M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z M6 6h.008v.008H6V6z" },
      { label: "Pricing Labs", href: "/admin/pricing-experiments", icon: "M12 6v12m0-12a4.5 4.5 0 100 9m0-9a4.5 4.5 0 010 9m0 0a4.5 4.5 0 100 9m0-9a4.5 4.5 0 010 9" },
      { label: "Reviews", href: "/admin/reviews", icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" },
      { label: "Analytics", href: "/admin/analytics", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
      { label: "Affiliates", href: "/admin/affiliates", icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" },
    ],
  },
  {
    title: "Operations",
    links: [
      { label: "Fulfillment", href: "/admin/fulfillment", icon: "M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" },
      { label: "Incidents", href: "/admin/operations/incidents", icon: "M11.25 3.75h1.5m-1.5 5.25h1.5m-1.5 5.25h1.5m-7.5 6h12a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0016.5 3.75h-9A2.25 2.25 0 005.25 6v12a2.25 2.25 0 002.25 2.25z" },
      { label: "Workflows", href: "/admin/workflows", icon: "M4.5 6.75h15m-15 5.25h15m-15 5.25h15M3 6.75a.75.75 0 011.5 0 .75.75 0 01-1.5 0zm0 5.25a.75.75 0 011.5 0 .75.75 0 01-1.5 0zm0 5.25a.75.75 0 011.5 0 .75.75 0 01-1.5 0z" },
      { label: "Bookings", href: "/admin/bookings", icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" },
      { label: "Venues", href: "/admin/venues", icon: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" },
    ],
  },
  {
    title: "Settings",
    links: [
      { label: "Shipping", href: "/admin/shipping", icon: "M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V15m0 0l-2.25 1.313" },
      { label: "Tax", href: "/admin/tax", icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" },
      { label: "Integrations", href: "/admin/integrations", icon: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" },
      { label: "Marketplace", href: "/admin/integrations/marketplace", icon: "M3.75 4.5h16.5v3.75H3.75V4.5zm0 5.25h16.5v9.75H3.75V9.75zm3.75 2.25h3v3h-3v-3z" },
      { label: "Headless APIs", href: "/admin/headless", icon: "M16.5 7.5h-9m9 4.5h-9m9 4.5h-9M4.5 7.5h.008v.008H4.5V7.5zm0 4.5h.008v.008H4.5V12zm0 4.5h.008v.008H4.5v-.008z" },
      { label: "Store Templates", href: "/admin/store-templates", icon: "M4.5 3.75h15a.75.75 0 01.75.75v15a.75.75 0 01-.75.75h-15a.75.75 0 01-.75-.75v-15a.75.75 0 01.75-.75zm3 3.75h9m-9 3h9m-9 3h5.25" },
      { label: "Policies", href: "/admin/policies", icon: "M12 3l7.5 3v6c0 5.25-3.4 9.75-7.5 11.25C7.9 21.75 4.5 17.25 4.5 12V6L12 3z" },
      { label: "Control Tower", href: "/admin/control-tower", icon: "M3.75 19.5h16.5M6.75 16.5v-6m5.25 6V7.5m5.25 9V4.5" },
      { label: "Store", href: "/admin/settings", icon: "M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.528-.738a1.125 1.125 0 01.12-1.45l.774-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
    ],
  },
];

export const AdminSidebar: FC<AdminSidebarProps> = ({ activePath = "" }) => {
  return (
    <aside
      id="admin-sidebar"
      class="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto"
    >
      {/* Logo */}
      <div class="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <a href="/admin/products" class="flex items-center gap-2">
          <svg class="h-7 w-7 text-brand-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M4.5 11.5c-1.38 0-2.5-1.57-2.5-3.5S3.12 4.5 4.5 4.5 7 6.07 7 8s-1.12 3.5-2.5 3.5zm15 0c-1.38 0-2.5-1.57-2.5-3.5s1.12-3.5 2.5-3.5S22 6.07 22 8s-1.12 3.5-2.5 3.5zM12 21c-4.42 0-8-2.69-8-6 0-1.66.68-3.17 1.79-4.35C6.57 9.85 8 9.5 8 8.5c0-.28.22-.5.5-.5s.5.22.5.5c0 1-1.43 1.35-2.21 2.15C5.69 11.78 5 13.32 5 15c0 2.76 3.13 5 7 5s7-2.24 7-5c0-1.68-.69-3.22-1.79-4.35C16.43 9.85 15 9.5 15 8.5c0-.28.22-.5.5-.5s.5.22.5.5c0 1 1.43 1.35 2.21 2.15C19.32 11.83 20 13.34 20 15c0 3.31-3.58 6-8 6z"/>
          </svg>
          <span class="text-lg font-bold text-brand-500 tracking-tight">Admin</span>
        </a>
      </div>

      {/* Navigation */}
      <nav class="flex-1 px-3 py-4 space-y-6" aria-label="Admin navigation">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 class="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{section.title}</h3>
            <ul class="mt-2 space-y-0.5" role="list">
              {section.links.map((link) => {
                const isActive = activePath === link.href || activePath.startsWith(link.href + "/");
                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      class={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d={link.icon} />
                      </svg>
                      <span class="flex-1">{link.label}</span>
                      {link.count !== undefined && link.count > 0 && (
                        <span class="ml-auto inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                          {link.count}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Back to store */}
      <div class="p-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
        <a href="/" class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
          <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
          </svg>
          <span>Back to Store</span>
        </a>
      </div>
    </aside>
  );
};
