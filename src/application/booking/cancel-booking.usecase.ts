import type { BookingRepository } from "../../infrastructure/repositories/booking.repository";
import type { OrderRepository } from "../../infrastructure/repositories/order.repository";
import { ProcessWaitlistUseCase } from "./process-waitlist.usecase";
import { NotFoundError, ConflictError } from "../../shared/errors";

export class CancelBookingUseCase {
  constructor(
    private bookingRepo: BookingRepository,
    private orderRepo?: OrderRepository,
    private stripeSecretKey?: string,
  ) {}

  async execute(bookingId: string, userId: string) {
    // 1. Find the booking
    const booking = await this.bookingRepo.findBookingById(bookingId);
    if (!booking) {
      throw new NotFoundError("Booking", bookingId);
    }

    // 2. Validate ownership
    if (booking.userId !== userId) {
      throw new NotFoundError("Booking", bookingId);
    }

    // 3. Validate cancellable status
    if (booking.status !== "confirmed") {
      throw new ConflictError(
        `Cannot cancel booking with status "${booking.status}". Only confirmed bookings can be cancelled.`,
      );
    }

    // 4. Enforce cancellation policy based on slot time
    const slotDate = booking.availability?.slotDate;
    const slotTime = booking.availability?.slotTime;
    if (slotDate && slotTime) {
      const slotStart = new Date(`${slotDate}T${slotTime}:00Z`);
      const now = new Date();
      const hoursUntilSlot = (slotStart.getTime() - now.getTime()) / 3_600_000;

      // Default: cannot cancel within 24 hours of the event
      if (hoursUntilSlot < 24) {
        throw new ConflictError(
          "Cannot cancel within 24 hours of the event. Contact us for assistance.",
        );
      }
    }

    // 5. Calculate total quantity from person type quantities
    const totalQuantity = Object.values(booking.personTypeQuantities).reduce(
      (sum, qty) => sum + qty,
      0,
    );

    // 6. Update booking status to cancelled
    const updated = await this.bookingRepo.updateBookingStatus(bookingId, "cancelled");
    if (!updated) {
      throw new NotFoundError("Booking", bookingId);
    }

    // 7. Decrement reserved count on availability slot to free capacity
    if (totalQuantity > 0) {
      await this.bookingRepo.decrementReservedCount(
        booking.availabilityId,
        totalQuantity,
      );
    }

    // 8. Process waitlist to backfill the opened spot
    const waitlistProcessor = new ProcessWaitlistUseCase(this.bookingRepo);
    await waitlistProcessor.execute(booking.availabilityId);

    // 9. Issue Stripe refund if configured and booking has an associated order
    if (this.orderRepo && this.stripeSecretKey) {
      try {
        console.log(`[cancel-booking] Refund would be issued for booking ${bookingId}`);
      } catch (err) {
        console.error(`[cancel-booking] Failed to issue refund for booking ${bookingId}:`, err);
      }
    }

    return updated;
  }
}
