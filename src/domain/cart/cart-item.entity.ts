import type { Variant } from "@/domain/catalog/variant.entity";

export interface CartItem {
  id: string;
  cartId: string;
  variantId: string;
  quantity: number;
  bookingAvailabilityId: string | null;
  personTypeQuantities: Record<string, number> | null;

  /** Optional include */
  variant?: Variant;
}

export function createCartItem(
  params: Omit<CartItem, "bookingAvailabilityId" | "personTypeQuantities" | "variant"> & {
    bookingAvailabilityId?: string | null;
    personTypeQuantities?: Record<string, number> | null;
  }
): CartItem {
  return {
    ...params,
    bookingAvailabilityId: params.bookingAvailabilityId ?? null,
    personTypeQuantities: params.personTypeQuantities ?? null,
  };
}
