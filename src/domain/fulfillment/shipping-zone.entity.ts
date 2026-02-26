export interface ShippingZone {
  id: string;
  storeId: string;
  name: string;
  countries: string[];
  regions: string[];
  postalCodes: string[];
  isRestOfWorld: boolean;
  isActive: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export function createShippingZone(
  params: Omit<ShippingZone, "createdAt" | "updatedAt" | "isActive" | "isRestOfWorld" | "position" | "regions" | "postalCodes"> & {
    isActive?: boolean;
    isRestOfWorld?: boolean;
    position?: number;
    regions?: string[];
    postalCodes?: string[];
  }
): ShippingZone {
  const now = new Date();
  return {
    ...params,
    isActive: params.isActive ?? true,
    isRestOfWorld: params.isRestOfWorld ?? false,
    position: params.position ?? 0,
    regions: params.regions ?? [],
    postalCodes: params.postalCodes ?? [],
    createdAt: now,
    updatedAt: now,
  };
}
