import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { and, eq, lt } from "drizzle-orm";
import { promotions } from "../infrastructure/db/schema";

export async function runExpirePromotions(env: Env) {
  const db = createDb(env.DATABASE_URL);

  try {
    const now = new Date();

    const expired = await db
      .update(promotions)
      .set({ status: "expired", updatedAt: now })
      .where(
        and(
          eq(promotions.status, "active"),
          lt(promotions.endsAt, now),
        ),
      )
      .returning({ id: promotions.id });

    if (expired.length > 0) {
      console.log(
        `[expire-promotions] Expired ${expired.length} promotion(s)`,
      );
    }
  } catch (error) {
    console.error("[expire-promotions] Expiration check failed:", error);
  }
}
