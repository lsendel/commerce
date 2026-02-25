export interface Address {
  id: string;
  userId: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  isDefault: boolean;
}

export function createAddress(
  params: Omit<Address, "isDefault"> & { isDefault?: boolean }
): Address {
  return {
    ...params,
    isDefault: params.isDefault ?? false,
  };
}
