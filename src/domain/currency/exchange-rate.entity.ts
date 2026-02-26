export interface ExchangeRate {
  id: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  source: string;
  fetchedAt: Date;
  createdAt: Date;
}

export function createExchangeRate(
  params: Omit<ExchangeRate, "createdAt"> & { createdAt?: Date },
): ExchangeRate {
  return {
    ...params,
    createdAt: params.createdAt ?? new Date(),
  };
}
