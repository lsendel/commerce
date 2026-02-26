export interface VariantOption {
  name: string;
  value: string;
}

export type FulfillmentProviderType = "printful" | "gooten" | "prodigi" | "shapeways";

export interface Variant {
  id: string;
  productId: string;
  title: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  inventoryQuantity: number;
  options: VariantOption[];
  printfulSyncVariantId: string | null;
  availableForSale: boolean;
  fulfillmentProvider?: FulfillmentProviderType | null;
}

export function createVariant(
  params: Omit<Variant, "availableForSale" | "compareAtPrice" | "printfulSyncVariantId"> & {
    availableForSale?: boolean;
    compareAtPrice?: number | null;
    printfulSyncVariantId?: string | null;
  }
): Variant {
  return {
    ...params,
    availableForSale: params.availableForSale ?? true,
    compareAtPrice: params.compareAtPrice ?? null,
    printfulSyncVariantId: params.printfulSyncVariantId ?? null,
  };
}
