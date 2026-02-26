import type { OrderStatus } from "./order.entity";

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "processing", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

export function nextStatuses(status: OrderStatus): readonly OrderStatus[] {
  return TRANSITIONS[status];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function canCancel(status: OrderStatus): boolean {
  return TRANSITIONS[status].includes("cancelled");
}

export function canRefund(status: OrderStatus): boolean {
  return status === "delivered";
}

export function canShip(status: OrderStatus): boolean {
  return status === "processing";
}

export function isFinal(status: OrderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
