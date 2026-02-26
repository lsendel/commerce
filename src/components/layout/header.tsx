import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Nav } from "./nav";

interface HeaderProps {
  activePath?: string;
  isAuthenticated?: boolean;
  cartCount?: number;
  storeName?: string;
  storeLogo?: string | null;
  userName?: string;
  userRole?: string;
  isAffiliate?: boolean;
}

export const Header: FC<HeaderProps> = ({
  activePath,
  isAuthenticated = false,
  cartCount = 0,
  storeName = "petm8",
  storeLogo,
  userName,
  userRole,
  isAffiliate,
}) => {
  const initials = userName
    ? userName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <header class="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md" role="banner">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="/" class="flex items-center gap-1.5 shrink-0" aria-label={`${storeName} home`}>
          {storeLogo ? (
            <img src={storeLogo} alt={storeName} class="h-8 w-auto" />
          ) : (
            <svg class="h-7 w-7 text-brand-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M4.5 11.5c-1.38 0-2.5-1.57-2.5-3.5S3.12 4.5 4.5 4.5 7 6.07 7 8s-1.12 3.5-2.5 3.5zm15 0c-1.38 0-2.5-1.57-2.5-3.5s1.12-3.5 2.5-3.5S22 6.07 22 8s-1.12 3.5-2.5 3.5zM12 21c-4.42 0-8-2.69-8-6 0-1.66.68-3.17 1.79-4.35C6.57 9.85 8 9.5 8 8.5c0-.28.22-.5.5-.5s.5.22.5.5c0 1-1.43 1.35-2.21 2.15C5.69 11.78 5 13.32 5 15c0 2.76 3.13 5 7 5s7-2.24 7-5c0-1.68-.69-3.22-1.79-4.35C16.43 9.85 15 9.5 15 8.5c0-.28.22-.5.5-.5s.5.22.5.5c0 1 1.43 1.35 2.21 2.15C19.32 11.83 20 13.34 20 15c0 3.31-3.58 6-8 6z"/>
            </svg>
          )}
          <span class="text-xl font-bold text-brand-500 tracking-tight">
            {storeName}
          </span>
        </a>

        {/* Desktop nav */}
        <div class="hidden lg:flex lg:items-center lg:gap-4">
          <Nav activePath={activePath} isAuthenticated={isAuthenticated} userRole={userRole} isAffiliate={isAffiliate} />

          {/* Dark mode toggle */}
          <button
            type="button"
            data-darkmode-toggle
            class="inline-flex items-center justify-center rounded-xl p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            aria-label="Switch to dark mode"
          >
            <svg data-darkmode-moon class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
            <svg data-darkmode-sun class="h-5 w-5 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          </button>

          {/* Cart */}
          <button
            type="button"
            class="relative inline-flex items-center rounded-xl p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            aria-label="Shopping cart"
            data-cart-trigger
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <span
              id="cart-count-badge"
              class={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white ${
                cartCount > 0 ? "" : "hidden"
              }`}
              data-cart-count={cartCount}
              aria-live="polite"
              aria-label={`${cartCount} items in cart`}
            >
              {cartCount > 0 ? cartCount : ""}
            </span>
          </button>

          {/* User menu or Sign in */}
          {isAuthenticated ? (
            <details class="relative" id="user-dropdown">
              <summary class="list-none cursor-pointer inline-flex items-center justify-center rounded-full h-9 w-9 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-sm font-semibold hover:ring-2 hover:ring-brand-500/30 transition-all" aria-label="User menu">
                {initials}
              </summary>
              <div class="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg py-1 z-50">
                {userName && (
                  <div class="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{userName}</p>
                  </div>
                )}
                <a href="/account" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Account</a>
                <a href="/account/orders" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Orders</a>
                <a href="/account/settings" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Settings</a>
                <div class="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
                  <button type="button" data-logout-btn class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    Sign Out
                  </button>
                </div>
              </div>
            </details>
          ) : (
            <a
              href="/auth/login"
              class="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Sign in
            </a>
          )}
        </div>

        {/* Mobile: dark mode + cart + hamburger */}
        <div class="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            data-darkmode-toggle
            class="inline-flex items-center justify-center rounded-xl p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Switch to dark mode"
          >
            <svg data-darkmode-moon class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
            <svg data-darkmode-sun class="h-5 w-5 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          </button>

          <button
            type="button"
            class="relative inline-flex items-center rounded-xl p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Shopping cart"
            data-cart-trigger
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <span
              class={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white cart-count-mobile ${
                cartCount > 0 ? "" : "hidden"
              }`}
              data-cart-count={cartCount}
            >
              {cartCount > 0 ? cartCount : ""}
            </span>
          </button>

          <button
            type="button"
            id="mobile-menu-btn"
            class="inline-flex items-center rounded-xl p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle menu"
            aria-expanded="false"
            aria-controls="mobile-menu"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        class="hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 pb-4 pt-2 lg:hidden"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <Nav activePath={activePath} isAuthenticated={isAuthenticated} userRole={userRole} isAffiliate={isAffiliate} vertical />
        {isAuthenticated ? (
          <button type="button" data-logout-btn class="mt-2 block w-full rounded-xl border border-red-200 dark:border-red-800 px-5 py-2.5 text-center text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            Sign Out
          </button>
        ) : (
          <a
            href="/auth/login"
            class="mt-2 block rounded-xl bg-brand-500 px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            Sign in
          </a>
        )}
      </div>

      {html`
        <script>
          (function () {
            var btn = document.getElementById("mobile-menu-btn");
            var menu = document.getElementById("mobile-menu");
            if (!btn || !menu) return;
            btn.addEventListener("click", function () {
              var open = !menu.classList.contains("hidden");
              menu.classList.toggle("hidden");
              btn.setAttribute("aria-expanded", String(!open));
            });
            document.addEventListener("keydown", function (e) {
              if (e.key === "Escape" && !menu.classList.contains("hidden")) {
                menu.classList.add("hidden");
                btn.setAttribute("aria-expanded", "false");
                btn.focus();
              }
            });
            // Close user dropdown on outside click
            var dropdown = document.getElementById("user-dropdown");
            if (dropdown) {
              document.addEventListener("click", function (e) {
                if (!dropdown.contains(e.target)) {
                  dropdown.removeAttribute("open");
                }
              });
            }
          })();
        </script>
      `}
    </header>
  );
};
