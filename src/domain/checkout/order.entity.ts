import type { OrderItem } from "./order-item.entity";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface Order {
  id: string;
  userId: string;
  email: string;
  status: OrderStatus;
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  currency: string;
  exchangeRate: number | null;
  couponCode: string | null;
  stripePaymentIntentId: string | null;
  shippingName: string;
  shippingStreet: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry: string;
  notes: string | null;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export function createOrder(
  params: Omit<Order, "createdAt" | "updatedAt" | "status" | "notes" | "stripePaymentIntentId" | "items" | "exchangeRate" | "couponCode"> & {
    status?: OrderStatus;
    notes?: string | null;
    stripePaymentIntentId?: string | null;
    exchangeRate?: number | null;
    couponCode?: string | null;
    items?: OrderItem[];
  }
): Order {
  const now = new Date();
  return {
    ...params,
    status: params.status ?? "pending",
    notes: params.notes ?? null,
    stripePaymentIntentId: params.stripePaymentIntentId ?? null,
    exchangeRate: params.exchangeRate ?? null,
    couponCode: params.couponCode ?? null,
    items: params.items ?? [],
    createdAt: now,
    updatedAt: now,
  };
}
