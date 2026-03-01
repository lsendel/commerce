import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verifyJwt, type JwtPayload } from "../infrastructure/security/jwt";
import { AUTH_COOKIE_NAME } from "../shared/constants";
import type { Env } from "../env";

declare module "hono" {
  interface ContextVariableMap {
    user: JwtPayload;
    userId: string;
  }
}

export function requireAuth() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const token = getCookie(c, AUTH_COOKIE_NAME);
    if (!token) {
      return c.json({ error: "Authentication required", message: "Authentication required" }, 401);
    }

    const payload = await verifyJwt(token, c.env.JWT_SECRET);
    if (!payload) {
      return c.json({ error: "Invalid or expired token", message: "Invalid or expired token" }, 401);
    }

    c.set("user", payload);
    c.set("userId", payload.sub);
    await next();
  };
}

export function optionalAuth() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const token = getCookie(c, AUTH_COOKIE_NAME);
    if (token) {
      const payload = await verifyJwt(token, c.env.JWT_SECRET);
      if (payload) {
        c.set("user", payload);
        c.set("userId", payload.sub);
      }
    }
    await next();
  };
}
