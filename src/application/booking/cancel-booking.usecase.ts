import type { BookingRepository } from "../../infrastructure/repositories/booking.repository";
import { NotFoundError, ConflictError } from "../../shared/errors";

export class CancelBookingUseCase {
  constructor(private bookingRepo: BookingRepository) {}

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

    // 4. Calculate total quantity from person type quantities
    const totalQuantity = Object.values(booking.personTypeQuantities).reduce(
      (sum, qty) => sum + qty,
      0,
    );

    // 5. Update booking status to cancelled
    const updated = await this.bookingRepo.updateBookingStatus(bookingId, "cancelled");
    if (!updated) {
      throw new NotFoundError("Booking", bookingId);
    }

    // 6. Decrement reserved count on availability slot to free capacity
    if (totalQuantity > 0) {
      await this.bookingRepo.decrementReservedCount(
        booking.availabilityId,
        totalQuantity,
      );
    }

    // TODO: Trigger Stripe refund via payment intent if applicable
    // This would integrate with the Stripe API to issue a refund
    // for the booking's associated order item.

    return updated;
  }
}
