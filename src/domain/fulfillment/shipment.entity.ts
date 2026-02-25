export type ShipmentStatus =
  | "pending"
  | "in_transit"
  | "delivered"
  | "returned"
  | "failed"
  | "cancelled";

export interface Shipment {
  id: string;
  orderId: string;
  carrier: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: ShipmentStatus;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  printfulShipmentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createShipment(
  params: Omit<
    Shipment,
    | "createdAt"
    | "updatedAt"
    | "status"
    | "trackingNumber"
    | "trackingUrl"
    | "shippedAt"
    | "deliveredAt"
    | "printfulShipmentId"
  > & {
    status?: ShipmentStatus;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    shippedAt?: Date | null;
    deliveredAt?: Date | null;
    printfulShipmentId?: string | null;
  }
): Shipment {
  const now = new Date();
  return {
    ...params,
    status: params.status ?? "pending",
    trackingNumber: params.trackingNumber ?? null,
    trackingUrl: params.trackingUrl ?? null,
    shippedAt: params.shippedAt ?? null,
    deliveredAt: params.deliveredAt ?? null,
    printfulShipmentId: params.printfulShipmentId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}
