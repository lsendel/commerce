export type DisplayFormat = "symbol" | "code" | "symbol_code";

export interface StoreCurrency {
  id: string;
  storeId: string;
  baseCurrency: string;
  enabledCurrencies: string[];
  displayFormat: DisplayFormat;
  autoDetectLocale: boolean;
  createdAt: Date;
}

export function createStoreCurrency(
  params: Omit<StoreCurrency, "createdAt" | "displayFormat" | "autoDetectLocale"> & {
    displayFormat?: DisplayFormat;
    autoDetectLocale?: boolean;
    createdAt?: Date;
  },
): StoreCurrency {
  return {
    ...params,
    displayFormat: params.displayFormat ?? "symbol",
    autoDetectLocale: params.autoDetectLocale ?? true,
    createdAt: params.createdAt ?? new Date(),
  };
}
