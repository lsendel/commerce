import type { FC } from "hono/jsx";

/**
 * Cart drawer overlay — slides in from the right.
 * Items are populated client-side via cart.js; the server renders the shell.
 */
export const CartDrawer: FC = () => {
  return (
    <>
      {/* Backdrop */}
      <div
        id="cart-drawer-backdrop"
        class="cart-drawer-backdrop"
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        id="cart-drawer"
        class="cart-drawer"
        role="dialog"
        aria-label="Shopping cart"
        aria-modal="true"
      >
        {/* Header */}
        <div class="cart-drawer__header">
          <h2 class="cart-drawer__title">Your Cart</h2>
          <button
            type="button"
            class="cart-drawer__close"
            id="cart-drawer-close"
            aria-label="Close cart"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body — items rendered client-side */}
        <div class="cart-drawer__body" id="cart-drawer-body">
          <div class="cart-drawer__loading" id="cart-drawer-loading">
            <span class="spinner spinner--lg" />
          </div>
        </div>

        {/* Footer — subtotal + checkout */}
        <div
          class="cart-drawer__footer"
          id="cart-drawer-footer"
          style="display: none;"
        >
          <div class="cart-drawer__subtotal">
            <span class="cart-drawer__subtotal-label">Subtotal</span>
            <span class="cart-drawer__subtotal-value" id="cart-drawer-subtotal">
              $0.00
            </span>
          </div>
          <p class="cart-drawer__shipping-note">
            Shipping calculated at checkout
          </p>
          <button
            type="button"
            class="cart-drawer__checkout-btn"
            id="cart-drawer-checkout"
            data-drawer-checkout-btn
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Checkout
          </button>
          <a href="/cart" class="cart-drawer__view-cart">
            View full cart
          </a>
        </div>
      </aside>
    </>
  );
};
