import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Nav } from "./nav";

interface HeaderProps {
  activePath?: string;
  isAuthenticated?: boolean;
  cartCount?: number;
}

export const Header: FC<HeaderProps> = ({
  activePath,
  isAuthenticated = false,
  cartCount = 0,
}) => {
  return (
    <header class="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="/" class="flex items-center gap-1.5 shrink-0">
          <span class="text-2xl" aria-hidden="true">
            🐾
          </span>
          <span class="text-xl font-bold text-brand-500 tracking-tight">
            petm8
          </span>
        </a>

        {/* Desktop nav */}
        <div class="hidden lg:flex lg:items-center lg:gap-6">
          <Nav activePath={activePath} isAuthenticated={isAuthenticated} />

          {/* Cart */}
          <a
            href="/cart"
            class="relative inline-flex items-center rounded-xl p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            aria-label="Shopping cart"
            data-cart-trigger
          >
            <svg
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
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
            >
              {cartCount > 0 ? cartCount : ""}
            </span>
          </a>

          {/* Auth links (desktop) */}
          {!isAuthenticated && (
            <a
              href="/login"
              class="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Sign in
            </a>
          )}
        </div>

        {/* Mobile: cart + hamburger */}
        <div class="flex items-center gap-2 lg:hidden">
          <a
            href="/cart"
            class="relative inline-flex items-center rounded-xl p-2 text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Shopping cart"
            data-cart-trigger
          >
            <svg
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
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
          </a>

          <button
            type="button"
            id="mobile-menu-btn"
            class="inline-flex items-center rounded-xl p-2 text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
            aria-expanded="false"
          >
            <svg
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
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
        class="hidden border-t border-gray-200 bg-white px-4 pb-4 pt-2 lg:hidden"
      >
        <Nav
          activePath={activePath}
          isAuthenticated={isAuthenticated}
          vertical
        />
        {!isAuthenticated && (
          <a
            href="/login"
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
          })();
        </script>
      `}
    </header>
  );
};
