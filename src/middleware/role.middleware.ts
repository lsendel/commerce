import type { Context, Next } from "hono";
import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { eq, and } from "drizzle-orm";
import { users, storeMembers } from "../infrastructure/db/schema";

export function requireRole(role: string | string[]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const userId = c.get("userId");
    if (!userId) {
      return c.json({ error: "Authentication required", message: "Authentication required" }, 401);
    }

    const db = createDb(c.env.DATABASE_URL);
    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = userRows[0];
    const requestedRoles = Array.isArray(role) ? role : [role];
    const normalizedRoles = requestedRoles.flatMap((r) =>
      r === "admin" ? ["super_admin", "group_admin"] : [r],
    );

    if (!user || !normalizedRoles.includes(user.platformRole ?? "")) {
      return c.json({ error: "Insufficient permissions", message: "Insufficient permissions" }, 403);
    }

    await next();
  };
}

export function requireStoreMember(roles: string[] = ["owner", "admin"]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const userId = c.get("userId");
    const storeId = c.req.param("storeId");

    if (!userId || !storeId) {
      return c.json({ error: "Authentication required", message: "Authentication required" }, 401);
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

    const member = memberRows[0];
    if (!member || !roles.includes(member.role ?? "")) {
      return c.json({ error: "Insufficient store permissions", message: "Insufficient store permissions" }, 403);
    }

    await next();
  };
}
