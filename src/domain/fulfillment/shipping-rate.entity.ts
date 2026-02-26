export type ShippingRateType =
  | "flat"
  | "weight_based"
  | "price_based"
  | "carrier_calculated";

export interface ShippingRate {
  id: string;
  zoneId: string;
  name: string;
  type: ShippingRateType;
  price: number | null;
  minWeight: number | null;
  maxWeight: number | null;
  minOrderTotal: number | null;
  maxOrderTotal: number | null;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  carrierAccountId: string | null;
  isActive: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export function createShippingRate(
  params: Omit<
    ShippingRate,
    | "createdAt"
    | "updatedAt"
    | "isActive"
    | "position"
    | "price"
    | "minWeight"
    | "maxWeight"
    | "minOrderTotal"
    | "maxOrderTotal"
    | "estimatedDaysMin"
    | "estimatedDaysMax"
    | "carrierAccountId"
  > & {
    isActive?: boolean;
    position?: number;
    price?: number | null;
    minWeight?: number | null;
    maxWeight?: number | null;
    minOrderTotal?: number | null;
    maxOrderTotal?: number | null;
    estimatedDaysMin?: number | null;
    estimatedDaysMax?: number | null;
    carrierAccountId?: string | null;
  }
): ShippingRate {
  const now = new Date();
  return {
    ...params,
    isActive: params.isActive ?? true,
    position: params.position ?? 0,
    price: params.price ?? null,
    minWeight: params.minWeight ?? null,
    maxWeight: params.maxWeight ?? null,
    minOrderTotal: params.minOrderTotal ?? null,
    maxOrderTotal: params.maxOrderTotal ?? null,
    estimatedDaysMin: params.estimatedDaysMin ?? null,
    estimatedDaysMax: params.estimatedDaysMax ?? null,
    carrierAccountId: params.carrierAccountId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}
