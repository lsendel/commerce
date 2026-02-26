import type { FC } from "hono/jsx";
import type { Breadcrumb } from "../ui/types";

interface AdminTopbarProps {
  storeName: string;
  userName?: string;
  breadcrumbs?: Breadcrumb[];
}

export const AdminTopbar: FC<AdminTopbarProps> = ({
  storeName,
  userName,
  breadcrumbs,
}) => {
  const initials = userName
    ? userName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <header class="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-4 lg:px-8">
      <div class="flex items-center gap-4">
        {/* Mobile sidebar toggle */}
        <button
          type="button"
          id="admin-sidebar-toggle"
          class="lg:hidden inline-flex items-center justify-center rounded-xl p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb">
            <ol class="flex items-center gap-1.5 text-sm">
              <li>
                <a href="/admin/products" class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">{storeName}</a>
              </li>
              {breadcrumbs.map((crumb, idx) => (
                <li key={idx} class="flex items-center gap-1.5">
                  <svg class="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  {crumb.href ? (
                    <a href={crumb.href} class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">{crumb.label}</a>
                  ) : (
                    <span class="text-gray-700 dark:text-gray-200 font-medium">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>

      <div class="flex items-center gap-3">
        {/* Dark mode toggle */}
        <button
          type="button"
          data-darkmode-toggle
          class="inline-flex items-center justify-center rounded-xl p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle dark mode"
        >
          <svg data-darkmode-moon class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
          </svg>
          <svg data-darkmode-sun class="h-5 w-5 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
        </button>

        {/* User */}
        <details class="relative" id="admin-user-dropdown">
          <summary class="list-none cursor-pointer inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="User menu">
            <span class="inline-flex items-center justify-center rounded-full h-7 w-7 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-xs font-semibold">
              {initials}
            </span>
            {userName && <span class="hidden sm:inline">{userName}</span>}
          </summary>
          <div class="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg py-1 z-50">
            <a href="/account" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">My Account</a>
            <a href="/" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">View Store</a>
            <div class="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
              <button type="button" data-logout-btn class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                Sign Out
              </button>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
};
