import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { CART_COOKIE_NAME, CART_COOKIE_MAX_AGE } from "../shared/constants";
import type { Env } from "../env";

declare module "hono" {
  interface ContextVariableMap {
    cartSessionId: string;
  }
}

export function cartSession() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    let sessionId = getCookie(c, CART_COOKIE_NAME);

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      setCookie(c, CART_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        maxAge: CART_COOKIE_MAX_AGE,
        path: "/",
      });
    }

    c.set("cartSessionId", sessionId);
    await next();
  };
}
