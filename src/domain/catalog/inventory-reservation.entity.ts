export type ReservationStatus = "held" | "released" | "converted";

export interface InventoryReservation {
  id: string;
  variantId: string;
  cartItemId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: Date;
  createdAt: Date;
}

export function createInventoryReservation(
  params: Omit<InventoryReservation, "id" | "createdAt" | "status">,
): InventoryReservation {
  return {
    ...params,
    id: crypto.randomUUID(),
    status: "held",
    createdAt: new Date(),
  };
}
