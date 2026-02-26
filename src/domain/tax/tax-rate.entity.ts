export type TaxType = "sales_tax" | "vat" | "gst";

export type TaxAppliesTo = "all" | "physical" | "digital" | "shipping";

export interface TaxRate {
  id: string;
  taxZoneId: string;
  name: string;
  rate: number;
  type: TaxType;
  appliesTo: TaxAppliesTo;
  compound: boolean;
  createdAt: Date;
}

export function createTaxRate(
  params: Omit<TaxRate, "id" | "createdAt"> & { id: string },
): TaxRate {
  return {
    ...params,
    createdAt: new Date(),
  };
}
