import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Nav } from "./nav";

interface HeaderProps {
  activePath?: string;
  isAuthenticated?: boolean;
  cartCount?: number;
  storeName?: string;
  storeLogo?: string | null;
}

export const Header: FC<HeaderProps> = ({
  activePath,
  isAuthenticated = false,
  cartCount = 0,
  storeName = "petm8",
  storeLogo,
}) => {
  return (
    <header class="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md" role="banner">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="/" class="flex items-center gap-1.5 shrink-0" aria-label={`${storeName} home`}>
          {storeLogo ? (
            <img src={storeLogo} alt={storeName} class="h-8 w-auto" />
          ) : (
            <span class="text-2xl" aria-hidden="true">🐾</span>
          )}
          <span class="text-xl font-bold text-brand-500 tracking-tight">
            {storeName}
          </span>
        </a>

        {/* Desktop nav */}
        <div class="hidden lg:flex lg:items-center lg:gap-4">
          <Nav activePath={activePath} isAuthenticated={isAuthenticated} />

          {/* Dark mode toggle */}
          <button
            type="button"
            data-darkmode-toggle
            class="inline-flex items-center justify-center rounded-xl p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            aria-label="Switch to dark mode"
          >
            {/* Moon icon (shown in light mode) */}
            <svg data-darkmode-moon class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
            {/* Sun icon (shown in dark mode) */}
            <svg data-darkmode-sun class="h-5 w-5 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          </button>

          {/* Cart — opens slide-out drawer */}
          <button
            type="button"
            class="relative inline-flex items-center rounded-xl p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            aria-label="Shopping cart"
            data-cart-trigger
          >
            <svg
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
              />
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

          {/* Auth links (desktop) */}
          {!isAuthenticated && (
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
          {/* Mobile dark mode toggle */}
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
            <svg
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
              />
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
            <svg
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
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
        <Nav
          activePath={activePath}
          isAuthenticated={isAuthenticated}
          vertical
        />
        {!isAuthenticated && (
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
            // Close mobile menu on Escape
            document.addEventListener("keydown", function (e) {
              if (e.key === "Escape" && !menu.classList.contains("hidden")) {
                menu.classList.add("hidden");
                btn.setAttribute("aria-expanded", "false");
                btn.focus();
              }
            });
          })();
        </script>
      `}
    </header>
  );
};
