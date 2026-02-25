export interface PrintfulSyncProduct {
  id: string;
  printfulId: string;
  productId: string;
  externalId: string;
  syncedAt: Date;
}

export interface PrintfulSyncVariant {
  id: string;
  printfulId: string;
  variantId: string;
  syncProductId: string;
  externalId: string;
  syncedAt: Date;
}

export function createPrintfulSyncProduct(
  params: Omit<PrintfulSyncProduct, "syncedAt"> & { syncedAt?: Date }
): PrintfulSyncProduct {
  return {
    ...params,
    syncedAt: params.syncedAt ?? new Date(),
  };
}

export function createPrintfulSyncVariant(
  params: Omit<PrintfulSyncVariant, "syncedAt"> & { syncedAt?: Date }
): PrintfulSyncVariant {
  return {
    ...params,
    syncedAt: params.syncedAt ?? new Date(),
  };
}
