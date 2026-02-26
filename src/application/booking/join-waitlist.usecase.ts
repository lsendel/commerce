import type { BookingRepository } from "../../infrastructure/repositories/booking.repository";
import { NotFoundError, ValidationError, ConflictError } from "../../shared/errors";

export class JoinWaitlistUseCase {
  constructor(private bookingRepo: BookingRepository) {}

  async execute(availabilityId: string, userId: string) {
    // 1. Find the slot
    const slot = await this.bookingRepo.findAvailabilityById(availabilityId);
    if (!slot) {
      throw new NotFoundError("Availability slot", availabilityId);
    }

    // 2. Verify slot is full (waitlist is only for full slots)
    const remaining = slot.totalCapacity - slot.reservedCount;
    if (remaining > 0) {
      throw new ValidationError("Slot still has availability — book directly instead of joining waitlist");
    }

    // 3. Verify waitlist is enabled for this product
    const settings = await this.bookingRepo.findSettingsByProductId(slot.productId);
    if (!settings?.enableWaitlist) {
      throw new ValidationError("Waitlist is not enabled for this experience");
    }

    // 4. Verify user is not already on the waitlist
    const existing = await this.bookingRepo.findWaitlistEntry(availabilityId, userId);
    if (existing) {
      throw new ConflictError("You are already on the waitlist for this slot");
    }

    // 5. Add to waitlist
    const entry = await this.bookingRepo.addToWaitlist(availabilityId, userId);
    if (!entry) {
      throw new Error("Failed to join waitlist");
    }

    return {
      id: entry.id,
      position: entry.position,
      availabilityId,
      status: entry.status,
      createdAt: entry.createdAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}
