import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { affiliates } from "../infrastructure/db/schema";
import { createDb } from "../infrastructure/db/client";
import {
  AFFILIATE_COOKIE_NAME,
  AFFILIATE_COOKIE_MAX_AGE,
} from "../shared/constants";
import type { Env } from "../env";

declare module "hono" {
  interface ContextVariableMap {
    affiliateCode: string | null;
  }
}

export function affiliateMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Check for referral code in query params
    const ref =
      c.req.query("ref") ?? c.req.query("utm_medium") ?? null;

    if (ref) {
      // Validate the referral code exists
      const db = createDb(c.env.DATABASE_URL);
      const [affiliate] = await db
        .select({ id: affiliates.id, referralCode: affiliates.referralCode })
        .from(affiliates)
        .where(eq(affiliates.referralCode, ref))
        .limit(1);

      if (affiliate) {
        setCookie(c, AFFILIATE_COOKIE_NAME, ref, {
          maxAge: AFFILIATE_COOKIE_MAX_AGE,
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
          path: "/",
        });
        c.set("affiliateCode", ref);
        await next();
        return;
      }
    }

    // Check existing cookie
    const existingRef = getCookie(c, AFFILIATE_COOKIE_NAME) ?? null;
    c.set("affiliateCode", existingRef);
    await next();
  };
}
