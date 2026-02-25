import type { Context } from "hono";
import type { Env } from "../env";
import type { JwtPayload } from "../infrastructure/security/jwt";
import type { Database } from "../infrastructure/db/client";
import { createDb } from "../infrastructure/db/client";
import { verifyJwt } from "../infrastructure/security/jwt";
import { getCookie } from "hono/cookie";
import { AUTH_COOKIE_NAME, CART_COOKIE_NAME } from "../shared/constants";

export interface GraphQLContext {
  db: Database;
  user: JwtPayload | null;
  cartSessionId: string | null;
  env: Env;
}

export async function createGraphQLContext(c: Context<{ Bindings: Env }>): Promise<GraphQLContext> {
  const db = createDb(c.env.DATABASE_URL);

  let user: JwtPayload | null = null;
  const token = getCookie(c, AUTH_COOKIE_NAME);
  if (token) {
    user = await verifyJwt(token, c.env.JWT_SECRET);
  }

  const cartSessionId = getCookie(c, CART_COOKIE_NAME) ?? null;

  return { db, user, cartSessionId, env: c.env };
}
