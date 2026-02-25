export type PersonType = "adult" | "child" | "infant" | "senior" | "student";

export interface BookingItem {
  bookingId: string;
  personType: PersonType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export function createBookingItem(
  params: Omit<BookingItem, "totalPrice"> & { totalPrice?: number }
): BookingItem {
  return {
    ...params,
    totalPrice: params.totalPrice ?? params.unitPrice * params.quantity,
  };
}
