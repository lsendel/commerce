export type BookingRequestStatus =
  | "pending"
  | "confirmed"
  | "expired"
  | "cancelled";

export interface BookingRequest {
  id: string;
  availabilityId: string;
  userId: string;
  status: BookingRequestStatus;
  quantity: number;
  expiresAt: Date;
  orderId: string | null;
  cartItemId: string | null;
}

/**
 * Checks whether a booking request has expired based on the current time.
 */
export function isRequestExpired(request: BookingRequest): boolean {
  return new Date() > request.expiresAt;
}

export function createBookingRequest(
  params: Omit<BookingRequest, "status" | "orderId" | "cartItemId"> & {
    status?: BookingRequestStatus;
    orderId?: string | null;
    cartItemId?: string | null;
  }
): BookingRequest {
  return {
    ...params,
    status: params.status ?? "pending",
    orderId: params.orderId ?? null,
    cartItemId: params.cartItemId ?? null,
  };
}
