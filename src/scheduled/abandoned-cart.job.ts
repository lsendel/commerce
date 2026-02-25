import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { and, count, eq, gte, isNotNull, lt } from "drizzle-orm";
import { cartItems, carts, users } from "../infrastructure/db/schema";

export async function runAbandonedCartDetection(env: Env) {
  const db = createDb(env.DATABASE_URL);

  const twoHoursAgo = new Date();
  twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
  const threeHoursAgo = new Date();
  threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

  try {
    // Hourly dedupe window: carts idle for 2-3 hours are emailed once.
    const candidateCarts = await db
      .select({
        cartId: carts.id,
        userId: users.id,
        userEmail: users.email,
        userName: users.name,
      })
      .from(carts)
      .innerJoin(users, eq(carts.userId, users.id))
      .where(
        and(
          isNotNull(carts.userId),
          lt(carts.updatedAt, twoHoursAgo),
          gte(carts.updatedAt, threeHoursAgo),
        ),
      );

    let enqueued = 0;

    for (const cart of candidateCarts) {
      const [{ total }] = await db
        .select({ total: count() })
        .from(cartItems)
        .where(eq(cartItems.cartId, cart.cartId));

      if (!total || total <= 0) continue;

      await env.NOTIFICATION_QUEUE.send({
        type: "abandoned_cart",
        data: {
          cartId: cart.cartId,
          userId: cart.userId,
          userEmail: cart.userEmail,
          userName: cart.userName,
          itemCount: Number(total),
        },
      });

      enqueued++;
    }

    console.log(`[abandoned-cart] Enqueued ${enqueued} abandoned cart notification(s)`);
  } catch (error) {
    console.error("[abandoned-cart] Detection failed:", error);
  }
}
