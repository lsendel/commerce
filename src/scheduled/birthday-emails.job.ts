import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { and, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { analyticsEvents, petProfiles, users } from "../infrastructure/db/schema";

export async function runBirthdayEmails(env: Env) {
  const db = createDb(env.DATABASE_URL);

  try {
    const now = new Date();
    const monthDay = now.toISOString().slice(5, 10); // MM-DD in UTC
    const yearToken = now.getUTCFullYear();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));

    const birthdayRows = await db
      .select({
        storeId: petProfiles.storeId,
        userId: users.id,
        userEmail: users.email,
        userName: users.name,
        petName: petProfiles.name,
      })
      .from(petProfiles)
      .innerJoin(users, eq(petProfiles.userId, users.id))
      .where(
        and(
          isNotNull(petProfiles.dateOfBirth),
          eq(users.marketingOptIn, true),
          isNotNull(users.emailVerifiedAt),
          sql`to_char(${petProfiles.dateOfBirth}, 'MM-DD') = ${monthDay}`,
        ),
      );

    let enqueued = 0;

    for (const birthday of birthdayRows) {
      const alreadySent = await db
        .select({ id: analyticsEvents.id })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.storeId, birthday.storeId),
            eq(analyticsEvents.userId, birthday.userId),
            eq(analyticsEvents.eventType, "birthday_offer_sent"),
            sql`${analyticsEvents.properties}->>'petName' = ${birthday.petName}`,
            gte(analyticsEvents.createdAt, dayStart),
            lt(analyticsEvents.createdAt, dayEnd),
          ),
        )
        .limit(1);

      if (alreadySent.length > 0) {
        continue;
      }

      const normalizedPet = birthday.petName.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6);
      const offerCode = `BDAY${yearToken}${normalizedPet}`;

      await env.NOTIFICATION_QUEUE.send({
        type: "birthday_offer",
        data: {
          userId: birthday.userId,
          userEmail: birthday.userEmail,
          userName: birthday.userName,
          petName: birthday.petName,
          offerCode,
        },
      });

      await db.insert(analyticsEvents).values({
        storeId: birthday.storeId,
        userId: birthday.userId,
        eventType: "birthday_offer_sent",
        properties: {
          petName: birthday.petName,
          offerCode,
        },
      });

      enqueued++;
    }

    console.log(`[birthday-emails] Enqueued ${enqueued} birthday offer notification(s) for ${monthDay}`);
  } catch (error) {
    console.error("[birthday-emails] Campaign failed:", error);
  }
}
