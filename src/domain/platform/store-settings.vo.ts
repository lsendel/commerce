export interface StoreSetting {
  id: string;
  storeId: string;
  key: string;
  value: string | null;
}

export function createStoreSetting(params: StoreSetting): StoreSetting {
  return { ...params };
}
