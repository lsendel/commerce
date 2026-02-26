import type { BookingRepository } from "../../infrastructure/repositories/booking.repository";
import { NotFoundError, ConflictError } from "../../shared/errors";

export class MarkNoShowUseCase {
  constructor(private bookingRepo: BookingRepository) {}

  /**
   * Admin marks a booking as no-show after the event time has passed.
   */
  async execute(bookingId: string) {
    const booking = await this.bookingRepo.findBookingById(bookingId);
    if (!booking) {
      throw new NotFoundError("Booking", bookingId);
    }

    if (booking.status !== "confirmed") {
      throw new ConflictError(
        `Cannot mark as no-show: booking status is "${booking.status}". Only confirmed bookings can be marked as no-show.`,
      );
    }

    // Verify the slot time has passed
    const slotDate = booking.availability.slotDate;
    const slotTime = booking.availability.slotTime;
    if (slotDate && slotTime) {
      const slotStart = new Date(`${slotDate}T${slotTime}:00Z`);
      if (slotStart > new Date()) {
        throw new ConflictError("Cannot mark as no-show before the event time");
      }
    }

    const updated = await this.bookingRepo.updateBookingStatus(bookingId, "no_show");
    if (!updated) {
      throw new NotFoundError("Booking", bookingId);
    }

    return updated;
  }
}
