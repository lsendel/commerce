import type { BookingRepository } from "../../infrastructure/repositories/booking.repository";

interface ListAvailabilityInput {
  productId: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class ListAvailabilityUseCase {
  constructor(private bookingRepo: BookingRepository) {}

  async execute(input: ListAvailabilityInput) {
    const result = await this.bookingRepo.findAvailability({
      productId: input.productId,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      status: input.status,
      page: input.page,
      limit: input.limit,
    });

    // Compute effective status for each slot based on capacity and time
    const now = new Date();
    const slots = result.slots.map((slot) => {
      const effectiveStatus = this.computeEffectiveStatus(slot, now);

      return {
        id: slot.id,
        productId: slot.productId,
        slotDate: slot.slotDate,
        slotTime: slot.slotTime,
        totalCapacity: slot.totalCapacity,
        bookedCount: slot.reservedCount,
        status: effectiveStatus,
        prices: slot.prices.map((p) => ({
          personType: p.personType,
          price: p.price,
        })),
      };
    });

    return {
      slots,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /**
   * Compute the effective display status of a slot based on:
   * - stored status (admin overrides like "canceled", "closed")
   * - capacity (full when reservedCount >= totalCapacity)
   * - time (in_progress if slot time has passed, completed if slot is well past)
   */
  private computeEffectiveStatus(
    slot: {
      slotDate: string;
      slotTime: string;
      totalCapacity: number;
      reservedCount: number;
      status: string | null;
    },
    now: Date,
  ): string {
    const stored = slot.status ?? "available";

    // Admin-level overrides always win
    if (stored === "canceled" || stored === "closed" || stored === "completed") {
      return stored;
    }

    const slotStart = new Date(`${slot.slotDate}T${slot.slotTime}:00Z`);

    // If the slot has started, it's in progress or completed
    if (slotStart <= now) {
      // Give a 4-hour window for "in_progress" before marking "completed"
      const fourHoursLater = new Date(slotStart.getTime() + 4 * 60 * 60 * 1000);
      if (now > fourHoursLater) {
        return "completed";
      }
      return "in_progress";
    }

    // Future slot: check capacity
    if (slot.reservedCount >= slot.totalCapacity) {
      return "full";
    }

    return "available";
  }
}
