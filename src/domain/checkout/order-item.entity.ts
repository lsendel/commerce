export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  bookingAvailabilityId: string | null;
}

export function createOrderItem(
  params: Omit<OrderItem, "totalPrice" | "bookingAvailabilityId"> & {
    totalPrice?: number;
    bookingAvailabilityId?: string | null;
  }
): OrderItem {
  return {
    ...params,
    totalPrice: params.totalPrice ?? params.unitPrice * params.quantity,
    bookingAvailabilityId: params.bookingAvailabilityId ?? null,
  };
}
