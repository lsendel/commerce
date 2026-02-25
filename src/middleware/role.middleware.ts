import type { Context, Next } from "hono";
import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { eq, and } from "drizzle-orm";
import { users, storeMembers } from "../infrastructure/db/schema";

export function requireRole(role: string) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const userId = c.get("userId");
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const db = createDb(c.env.DATABASE_URL);
    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userRows.length === 0 || userRows[0].platformRole !== role) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }

    await next();
  };
}

export function requireStoreMember(roles: string[] = ["owner", "admin"]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const userId = c.get("userId");
    const storeId = c.req.param("storeId");

    if (!userId || !storeId) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const db = createDb(c.env.DATABASE_URL);
    const memberRows = await db
      .select()
      .from(storeMembers)
      .where(
        and(
          eq(storeMembers.storeId, storeId),
          eq(storeMembers.userId, userId),
        ),
      )
      .limit(1);

    if (
      memberRows.length === 0 ||
      !roles.includes(memberRows[0].role ?? "")
    ) {
      return c.json({ error: "Insufficient store permissions" }, 403);
    }

    await next();
  };
}
