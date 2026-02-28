import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { and, count, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { analyticsEvents, cartItems, carts, users } from "../infrastructure/db/schema";

type RecoveryStage = {
  key: "recovery_1h" | "recovery_24h" | "recovery_72h";
  minHours: number;
  maxHours: number;
  incentiveCode?: string;
};

const RECOVERY_STAGES: RecoveryStage[] = [
  { key: "recovery_1h", minHours: 1, maxHours: 2 },
  { key: "recovery_24h", minHours: 24, maxHours: 25, incentiveCode: "COME_BACK10" },
  { key: "recovery_72h", minHours: 72, maxHours: 73, incentiveCode: "LAST_CHANCE15" },
];

function hoursAgo(base: Date, hours: number): Date {
  const next = new Date(base);
  next.setHours(next.getHours() - hours);
  return next;
}

export async function runAbandonedCartDetection(env: Env) {
  const db = createDb(env.DATABASE_URL);
  const now = new Date();

  try {
    let enqueued = 0;

    for (const stage of RECOVERY_STAGES) {
      const latestUpdatedAt = hoursAgo(now, stage.minHours);
      const earliestUpdatedAt = hoursAgo(now, stage.maxHours);

      const candidateCarts = await db
        .select({
          cartId: carts.id,
          storeId: carts.storeId,
          userId: users.id,
          userEmail: users.email,
          userName: users.name,
          cartUpdatedAt: carts.updatedAt,
        })
        .from(carts)
        .innerJoin(users, eq(carts.userId, users.id))
        .where(
          and(
            isNotNull(carts.userId),
            eq(users.marketingOptIn, true),
            isNotNull(users.emailVerifiedAt),
            lt(carts.updatedAt, latestUpdatedAt),
            gte(carts.updatedAt, earliestUpdatedAt),
          ),
        );

      for (const cart of candidateCarts) {
        const countResult = await db
          .select({ total: count() })
          .from(cartItems)
          .where(eq(cartItems.cartId, cart.cartId));

        const total = countResult[0]?.total;
        if (!total || total <= 0) continue;

        const recoveredPurchase = await db
          .select({ id: analyticsEvents.id })
          .from(analyticsEvents)
          .where(
            and(
              eq(analyticsEvents.storeId, cart.storeId),
              eq(analyticsEvents.userId, cart.userId),
              eq(analyticsEvents.eventType, "purchase"),
              gte(analyticsEvents.createdAt, cart.cartUpdatedAt ?? earliestUpdatedAt),
            ),
          )
          .limit(1);

        if (recoveredPurchase.length > 0) continue;

        const alreadySent = await db
          .select({ id: analyticsEvents.id })
          .from(analyticsEvents)
          .where(
            and(
              eq(analyticsEvents.storeId, cart.storeId),
              eq(analyticsEvents.eventType, "checkout_recovery_enqueued"),
              sql`${analyticsEvents.properties}->>'cartId' = ${cart.cartId}`,
              sql`${analyticsEvents.properties}->>'stage' = ${stage.key}`,
            ),
          )
          .limit(1);

        if (alreadySent.length > 0) continue;

        await env.NOTIFICATION_QUEUE.send({
          type: "checkout_recovery",
          data: {
            stage: stage.key,
            channel: "email",
            cartId: cart.cartId,
            storeId: cart.storeId,
            userId: cart.userId,
            userEmail: cart.userEmail,
            userName: cart.userName,
            itemCount: Number(total),
            idleHours: stage.minHours,
            recoveryUrl: `${env.APP_URL}/cart`,
            incentiveCode: stage.incentiveCode ?? null,
          },
        });

        await db.insert(analyticsEvents).values({
          storeId: cart.storeId,
          userId: cart.userId,
          eventType: "checkout_recovery_enqueued",
          properties: {
            stage: stage.key,
            channel: "email",
            cartId: cart.cartId,
            itemCount: Number(total),
            idleHours: stage.minHours,
            incentiveCode: stage.incentiveCode ?? null,
          },
        });

        enqueued++;
      }
    }

    console.log(`[abandoned-cart] Enqueued ${enqueued} checkout recovery notification(s)`);
  } catch (error) {
    console.error("[abandoned-cart] Detection failed:", error);
  }
}
