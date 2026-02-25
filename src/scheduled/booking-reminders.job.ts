import { eq, and } from "drizzle-orm";
import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import {
  bookings,
  bookingAvailability,
  users,
} from "../infrastructure/db/schema";

interface BookingReminderPayload {
  type: "booking_reminder";
  data: {
    bookingId: string;
    userId: string;
    userEmail: string;
    userName: string;
    slotDate: string;
    slotTime: string;
    productId: string;
  };
}

export async function runBookingReminders(env: Env): Promise<void> {
  const db = createDb(env.DATABASE_URL);

  // Calculate tomorrow's date in YYYY-MM-DD format (UTC)
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  // Find all availability slots for tomorrow
  const tomorrowSlots = await db
    .select()
    .from(bookingAvailability)
    .where(
      and(
        eq(bookingAvailability.slotDate, tomorrowStr),
        eq(bookingAvailability.isActive, true),
      ),
    );

  if (tomorrowSlots.length === 0) {
    console.log(`[booking-reminders] No slots found for ${tomorrowStr}`);
    return;
  }

  const slotIds = tomorrowSlots.map((s) => s.id);
  const slotMap = new Map(tomorrowSlots.map((s) => [s.id, s]));

  // Find all confirmed bookings for those slots
  const { inArray } = await import("drizzle-orm");

  const confirmedBookings = await db
    .select()
    .from(bookings)
    .where(
      and(
        inArray(bookings.bookingAvailabilityId, slotIds),
        eq(bookings.status, "confirmed"),
      ),
    );

  if (confirmedBookings.length === 0) {
    console.log(
      `[booking-reminders] No confirmed bookings for ${tomorrowStr}`,
    );
    return;
  }

  // Collect unique user IDs and fetch user details
  const userIds = [...new Set(confirmedBookings.map((b) => b.userId))];
  const userRows = await db
    .select()
    .from(users)
    .where(inArray(users.id, userIds));

  const userMap = new Map(userRows.map((u) => [u.id, u]));

  // Enqueue a notification for each booking
  let enqueued = 0;

  for (const booking of confirmedBookings) {
    const slot = slotMap.get(booking.bookingAvailabilityId);
    const user = userMap.get(booking.userId);

    if (!slot || !user) continue;

    const payload: BookingReminderPayload = {
      type: "booking_reminder",
      data: {
        bookingId: booking.id,
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        slotDate: slot.slotDate,
        slotTime: slot.slotTime,
        productId: slot.productId,
      },
    };

    await env.NOTIFICATION_QUEUE.send(payload);
    enqueued++;
  }

  console.log(
    `[booking-reminders] Enqueued ${enqueued} reminder(s) for ${tomorrowStr}`,
  );
}
