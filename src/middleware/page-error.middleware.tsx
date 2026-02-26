import type { Context } from "hono";
import type { Env } from "../env";
import { ErrorPage } from "../components/ui/error-page";
import { Layout } from "../routes/pages/_layout";
import { verifyJwt } from "../infrastructure/security/jwt";
import { getCookie } from "hono/cookie";
import { AUTH_COOKIE_NAME, CART_COOKIE_NAME } from "../shared/constants";
import { CartRepository } from "../infrastructure/repositories/cart.repository";
import { createDb } from "../infrastructure/db/client";
import {
  NotFoundError,
  AuthError,
  ForbiddenError,
  ValidationError,
} from "../shared/errors";

type PageHandler = (c: Context<{ Bindings: Env }>) => Promise<Response>;

/**
 * Build a minimal page context for rendering error pages.
 * This is intentionally resilient -- if any step fails, it falls back gracefully.
 */
async function getSafePageContext(c: Context<{ Bindings: Env }>) {
  let isAuthenticated = false;
  let cartCount = 0;
  let storeName = "petm8";
  let storeLogo: string | null = null;
  let primaryColor: string | null = null;
  let secondaryColor: string | null = null;

  try {
    const token = getCookie(c, AUTH_COOKIE_NAME);
    if (token) {
      const user = await verifyJwt(token, c.env.JWT_SECRET);
      isAuthenticated = !!user;
    }
  } catch { /* auth check not critical */ }

  try {
    const store = c.get("store") as any;
    storeName = store?.name ?? "petm8";
    storeLogo = store?.logo ?? null;
    primaryColor = store?.primaryColor ?? null;
    secondaryColor = store?.secondaryColor ?? null;
  } catch { /* store context not critical */ }

  try {
    const storeId = c.get("storeId") as string;
    const cartSessionId = getCookie(c, CART_COOKIE_NAME);
    if (cartSessionId && storeId) {
      const db = createDb(c.env.DATABASE_URL);
      const cartRepo = new CartRepository(db, storeId);
      const cart = await cartRepo.findOrCreateCart(cartSessionId);
      const cartData = await cartRepo.findCartWithItems(cart.id);
      cartCount = (cartData as any)?.items?.length ?? 0;
    }
  } catch { /* cart not critical */ }

  return { isAuthenticated, cartCount, storeName, storeLogo, primaryColor, secondaryColor };
}

/**
 * Map domain errors to HTTP status codes.
 */
function getStatusFromError(err: unknown): number {
  if (err instanceof NotFoundError) return 404;
  if (err instanceof AuthError) return 401;
  if (err instanceof ForbiddenError) return 403;
  if (err instanceof ValidationError) return 400;
  return 500;
}

/**
 * Higher-order function that wraps a page route handler with error handling.
 * On failure, renders the ErrorPage component within the Layout at the appropriate HTTP status.
 *
 * Usage:
 *   app.get("/some-page", withErrorHandling(async (c) => {
 *     // page logic that may throw
 *     return c.html(<Layout ...>...</Layout>);
 *   }));
 */
export function withErrorHandling(handler: PageHandler): PageHandler {
  return async (c: Context<{ Bindings: Env }>) => {
    try {
      return await handler(c);
    } catch (err) {
      const status = getStatusFromError(err);
      const pageTitle = status === 404 ? "Not Found" : status === 401 ? "Sign In Required" : "Error";

      console.error(`[page-error] ${c.req.method} ${c.req.path} -> ${status}:`, err);

      try {
        const ctx = await getSafePageContext(c);
        return c.html(
          <Layout
            title={pageTitle}
            isAuthenticated={ctx.isAuthenticated}
            cartCount={ctx.cartCount}
            storeName={ctx.storeName}
            storeLogo={ctx.storeLogo}
            primaryColor={ctx.primaryColor}
            secondaryColor={ctx.secondaryColor}
          >
            <ErrorPage status={status} />
          </Layout>,
          status as any,
        );
      } catch (layoutErr) {
        // If even the layout rendering fails, return a bare HTML error page
        console.error("[page-error] Layout rendering failed:", layoutErr);
        return c.html(
          `<html><body style="font-family:sans-serif;text-align:center;padding:4rem">
            <h1>Error ${status}</h1>
            <p>Something went wrong. <a href="/">Go home</a></p>
          </body></html>`,
          status as any,
        );
      }
    }
  };
}
