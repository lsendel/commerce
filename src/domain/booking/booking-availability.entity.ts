import type { PersonTypePrice } from "./person-type-price.vo";

export type AvailabilityStatus = "open" | "full" | "closed" | "cancelled";

export interface BookingAvailability {
  id: string;
  productId: string;
  totalCapacity: number;
  slotDate: string;
  slotTime: string;
  slotDatetime: Date;
  reservedCount: number;
  status: AvailabilityStatus;
  isActive: boolean;
  prices: PersonTypePrice[];
}

/**
 * Checks whether a booking slot is available.
 * A slot is available when it is active, has "open" status,
 * and the reserved count is below total capacity.
 */
export function isSlotAvailable(slot: BookingAvailability): boolean {
  return (
    slot.isActive &&
    slot.status === "open" &&
    slot.reservedCount < slot.totalCapacity
  );
}

/**
 * Returns the number of remaining spots in a booking slot.
 */
export function getRemainingCapacity(slot: BookingAvailability): number {
  return Math.max(0, slot.totalCapacity - slot.reservedCount);
}

export function createBookingAvailability(
  params: Omit<BookingAvailability, "reservedCount" | "status" | "isActive" | "prices"> & {
    reservedCount?: number;
    status?: AvailabilityStatus;
    isActive?: boolean;
    prices?: PersonTypePrice[];
  }
): BookingAvailability {
  return {
    ...params,
    reservedCount: params.reservedCount ?? 0,
    status: params.status ?? "open",
    isActive: params.isActive ?? true,
    prices: params.prices ?? [],
  };
}
