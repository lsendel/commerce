import type { BookingRepository } from "../../infrastructure/repositories/booking.repository";
import { WAITLIST_CLAIM_WINDOW_MINUTES } from "../../domain/booking/waitlist-entry.entity";

export interface NotificationsQueue {
  send(message: unknown): Promise<void>;
}

export class ProcessWaitlistUseCase {
  constructor(
    private bookingRepo: BookingRepository,
    private notificationsQueue?: NotificationsQueue,
  ) {}

  /**
   * When a cancellation opens a spot, notify the next waitlisted user.
   * Sets a claim window (default 30 min) before the entry expires.
   */
  async execute(availabilityId: string): Promise<{ notifiedUserId: string | null }> {
    // Find the next waiting entry by position
    const entry = await this.bookingRepo.findNextWaitlistEntry(availabilityId);
    if (!entry) {
      return { notifiedUserId: null };
    }

    const now = new Date();

    // Mark as notified with expiry window
    await this.bookingRepo.updateWaitlistStatus(entry.id, "notified", {
      notifiedAt: now,
      expiredAt: new Date(now.getTime() + WAITLIST_CLAIM_WINDOW_MINUTES * 60 * 1000),
    });

    // Send notification if queue is available
    if (this.notificationsQueue) {
      await this.notificationsQueue.send({
        type: "waitlist_spot_available",
        userId: entry.userId,
        availabilityId,
        claimDeadline: new Date(
          now.getTime() + WAITLIST_CLAIM_WINDOW_MINUTES * 60 * 1000,
        ).toISOString(),
      });
    }

    return { notifiedUserId: entry.userId };
  }
}
