export type BookingStatus = "confirmed" | "checked_in" | "cancelled" | "no_show";

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: [],
  cancelled: [],
  no_show: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function canCancel(status: BookingStatus): boolean {
  return status === "confirmed";
}

export function canCheckIn(status: BookingStatus): boolean {
  return status === "confirmed";
}

export function canMarkNoShow(status: BookingStatus): boolean {
  return status === "confirmed";
}

export function canShip(_status: BookingStatus): boolean {
  return false; // bookings are not shippable
}

export function nextStatuses(status: BookingStatus): BookingStatus[] {
  return TRANSITIONS[status] ?? [];
}
