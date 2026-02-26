export interface TaxZone {
  id: string;
  storeId: string;
  name: string;
  countries: string[];
  regions: string[];
  postalCodes: string[];
  priority: number;
  createdAt: Date;
}

export function createTaxZone(
  params: Omit<TaxZone, "id" | "createdAt"> & { id: string },
): TaxZone {
  return {
    ...params,
    createdAt: new Date(),
  };
}
