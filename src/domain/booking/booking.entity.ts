import type { BookingItem } from "./booking-item.entity";

export type BookingStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "completed"
  | "no_show";

export interface Booking {
  id: string;
  orderId: string;
  userId: string;
  availabilityId: string;
  productId: string;
  status: BookingStatus;
  totalPrice: number;
  guestName: string | null;
  guestEmail: string | null;
  specialRequests: string | null;
  items: BookingItem[];
  createdAt: Date;
  updatedAt: Date;
}

export function createBooking(
  params: Omit<
    Booking,
    | "createdAt"
    | "updatedAt"
    | "status"
    | "guestName"
    | "guestEmail"
    | "specialRequests"
    | "items"
  > & {
    status?: BookingStatus;
    guestName?: string | null;
    guestEmail?: string | null;
    specialRequests?: string | null;
    items?: BookingItem[];
  }
): Booking {
  const now = new Date();
  return {
    ...params,
    status: params.status ?? "confirmed",
    guestName: params.guestName ?? null,
    guestEmail: params.guestEmail ?? null,
    specialRequests: params.specialRequests ?? null,
    items: params.items ?? [],
    createdAt: now,
    updatedAt: now,
  };
}
