import type { BookingRepository } from "../../infrastructure/repositories/booking.repository";
import type { OrderRepository } from "../../infrastructure/repositories/order.repository";
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

    // Issue Stripe refund if configured and booking has an associated order
    if (this.orderRepo && this.stripeSecretKey) {
      try {
        // Refund logic placeholder — requires mapping from booking→order→paymentIntent
        // In production: look up the order's stripePaymentIntentId and call Stripe Refunds API
        console.log(`[cancel-booking] Refund would be issued for booking ${bookingId}`);
      } catch (err) {
        console.error(`[cancel-booking] Failed to issue refund for booking ${bookingId}:`, err);
      }
    }

    return updated;
  }
}
