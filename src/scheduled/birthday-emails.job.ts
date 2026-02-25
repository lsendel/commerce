import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { petProfiles, users } from "../infrastructure/db/schema";

export async function runBirthdayEmails(env: Env) {
  const db = createDb(env.DATABASE_URL);

  try {
    const now = new Date();
    const monthDay = now.toISOString().slice(5, 10); // MM-DD in UTC
    const yearToken = now.getUTCFullYear();

    const birthdayRows = await db
      .select({
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
          sql`to_char(${petProfiles.dateOfBirth}, 'MM-DD') = ${monthDay}`,
        ),
      );

    let enqueued = 0;

    for (const birthday of birthdayRows) {
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

      enqueued++;
    }

    console.log(`[birthday-emails] Enqueued ${enqueued} birthday offer notification(s) for ${monthDay}`);
  } catch (error) {
    console.error("[birthday-emails] Campaign failed:", error);
  }
}
