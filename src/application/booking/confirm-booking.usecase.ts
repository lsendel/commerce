import type { BookingRepository } from "../../infrastructure/repositories/booking.repository";
import { NotFoundError, ConflictError } from "../../shared/errors";

interface ConfirmBookingInput {
  requestId: string;
  orderItemId: string | null;
  userId: string;
  personTypeQuantities: Record<string, number>;
}

/**
 * ConfirmBookingUseCase — called after payment succeeds (from FulfillOrderUseCase).
 *
 * Lifecycle: pending_payment -> confirmed
 * - Updates the booking request status to 'confirmed'
 * - Creates a booking record with booking items (person-type line items)
 * - Returns the confirmed booking
 */
export class ConfirmBookingUseCase {
  constructor(private bookingRepo: BookingRepository) {}

  async execute(input: ConfirmBookingInput) {
    const { requestId, orderItemId, userId, personTypeQuantities } = input;

    // 1. Find the booking request
    const request = await this.bookingRepo.findRequestById(requestId);
    if (!request) {
      throw new NotFoundError("Booking request", requestId);
    }

    // 2. Validate request is in a confirmable state
    if (request.status !== "pending_payment") {
      throw new ConflictError(
        `Booking request is not pending payment (status: ${request.status})`,
      );
    }

    // 3. Update request status to confirmed
    await this.bookingRepo.updateRequestStatus(requestId, "confirmed");

    // 4. Fetch the availability slot to get prices
    const slot = await this.bookingRepo.findAvailabilityById(request.availabilityId);
    if (!slot) {
      throw new NotFoundError("Availability slot", request.availabilityId);
    }

    // 5. Build booking items from person type quantities and prices
    const priceMap = new Map(
      slot.prices.map((p) => [p.personType, p.price]),
    );

    const items: Array<{
      personType: "adult" | "child" | "pet";
      quantity: number;
      unitPrice: string;
      totalPrice: string;
    }> = [];

    for (const [personType, qty] of Object.entries(personTypeQuantities)) {
      if (qty <= 0) continue;
      const unitPrice = priceMap.get(personType as any) ?? 0;
      items.push({
        personType: personType as "adult" | "child" | "pet",
        quantity: qty,
        unitPrice: unitPrice.toFixed(2),
        totalPrice: (unitPrice * qty).toFixed(2),
      });
    }

    // 6. Create the booking record with items
    const booking = await this.bookingRepo.createBooking(
      {
        orderItemId,
        userId,
        bookingAvailabilityId: request.availabilityId,
      },
      items,
    );

    // 7. Return enriched booking
    return await this.bookingRepo.findBookingById(booking.id);
  }
}
