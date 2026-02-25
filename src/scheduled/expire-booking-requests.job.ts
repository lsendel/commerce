import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { BookingRepository } from "../infrastructure/repositories/booking.repository";

export async function runExpireBookingRequests(env: Env): Promise<void> {
  const db = createDb(env.DATABASE_URL);
  const bookingRepo = new BookingRepository(db, env.DEFAULT_STORE_ID);

  const result = await bookingRepo.expireStaleRequests();

  console.log(
    `[expire-booking-requests] Expired ${result.expired} stale booking request(s)`,
  );
}
