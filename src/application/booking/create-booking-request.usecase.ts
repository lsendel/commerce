import type { BookingRepository } from "../../infrastructure/repositories/booking.repository";
import { NotFoundError, ValidationError, ConflictError } from "../../shared/errors";
import { BOOKING_REQUEST_TTL_MINUTES } from "../../shared/constants";

interface CreateBookingRequestInput {
  availabilityId: string;
  userId: string;
  personTypeQuantities: Record<string, number>;
}

export class CreateBookingRequestUseCase {
  constructor(private bookingRepo: BookingRepository) {}

  async execute(input: CreateBookingRequestInput) {
    const { availabilityId, userId, personTypeQuantities } = input;

    // 1. Find the availability slot
    const slot = await this.bookingRepo.findAvailabilityById(availabilityId);
    if (!slot) {
      throw new NotFoundError("Availability slot", availabilityId);
    }

    // 2. Validate slot is bookable
    if (slot.status !== "available") {
      throw new ConflictError(`Slot is not available (status: ${slot.status})`);
    }

    const now = new Date();
    const slotStart = new Date(`${slot.slotDate}T${slot.slotTime}:00Z`);
    if (slotStart <= now) {
      throw new ConflictError("Cannot book a slot that has already started");
    }

    // 3. Calculate total quantity from person type quantities
    const totalQuantity = Object.values(personTypeQuantities).reduce(
      (sum, qty) => sum + qty,
      0,
    );

    if (totalQuantity <= 0) {
      throw new ValidationError("Total quantity must be at least 1");
    }

    // 4. Validate capacity
    const remaining = slot.totalCapacity - slot.reservedCount;
    if (totalQuantity > remaining) {
      throw new ConflictError(
        `Not enough capacity. Requested: ${totalQuantity}, available: ${remaining}`,
      );
    }

    // 5. Validate person types match available prices
    const availablePriceTypes = new Set(slot.prices.map((p) => p.personType));
    for (const [personType, qty] of Object.entries(personTypeQuantities)) {
      if (qty > 0 && !availablePriceTypes.has(personType as any)) {
        throw new ValidationError(
          `Price not available for person type: ${personType}`,
        );
      }
    }

    // 6. Calculate total price
    const priceMap = new Map(
      slot.prices.map((p) => [p.personType, p.price]),
    );

    let totalPrice = 0;
    for (const [personType, qty] of Object.entries(personTypeQuantities)) {
      if (qty <= 0) continue;
      const unitPrice = priceMap.get(personType as any) ?? 0;
      totalPrice += unitPrice * qty;
    }

    // 7. Create booking request with TTL expiry
    const expiresAt = new Date(
      now.getTime() + BOOKING_REQUEST_TTL_MINUTES * 60 * 1000,
    );

    const bookingRequest = await this.bookingRepo.createBookingRequest({
      availabilityId,
      userId,
      quantity: totalQuantity,
      expiresAt,
    });

    // 8. Atomically increment reserved count on the slot
    await this.bookingRepo.incrementReservedCount(availabilityId, totalQuantity);

    return {
      id: bookingRequest.id,
      userId: bookingRequest.userId,
      availabilityId: bookingRequest.availabilityId,
      status: bookingRequest.status ?? "pending_payment",
      personTypeQuantities,
      totalPrice,
      availability: {
        slotDate: slot.slotDate,
        slotTime: slot.slotTime,
        product: { name: "", slug: "", featuredImageUrl: null },
      },
      createdAt: bookingRequest.createdAt?.toISOString() ?? now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }
}
