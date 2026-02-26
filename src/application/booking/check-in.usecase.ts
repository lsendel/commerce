import type { BookingRepository } from "../../infrastructure/repositories/booking.repository";
import { NotFoundError, ConflictError } from "../../shared/errors";

export class CheckInUseCase {
  constructor(private bookingRepo: BookingRepository) {}

  async execute(bookingId: string) {
    // 1. Find the booking
    const booking = await this.bookingRepo.findBookingById(bookingId);
    if (!booking) {
      throw new NotFoundError("Booking", bookingId);
    }

    // 2. Validate status allows check-in
    if (booking.status !== "confirmed") {
      throw new ConflictError(
        `Cannot check in booking with status "${booking.status}". Only confirmed bookings can be checked in.`,
      );
    }

    // 3. Validate booking is for today (within a reasonable window)
    const slotDate = booking.availability?.slotDate;
    if (slotDate) {
      const today = new Date().toISOString().slice(0, 10);
      if (slotDate !== today) {
        throw new ConflictError(
          `Cannot check in: booking is for ${slotDate}, not today (${today}).`,
        );
      }
    }

    // 4. Update to checked_in
    const updated = await this.bookingRepo.updateBookingStatus(bookingId, "checked_in");
    if (!updated) {
      throw new NotFoundError("Booking", bookingId);
    }

    return updated;
  }
}
