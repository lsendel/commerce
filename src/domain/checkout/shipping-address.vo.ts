import { ValidationError } from "@/shared/errors";

export interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

/**
 * Validates that all required shipping address fields are present and non-empty.
 * Throws ValidationError if any field is missing or blank.
 */
export function validateShippingAddress(address: ShippingAddress): void {
  const requiredFields: (keyof ShippingAddress)[] = [
    "name",
    "street",
    "city",
    "state",
    "zip",
    "country",
  ];

  for (const field of requiredFields) {
    const value = address[field];
    if (!value || value.trim().length === 0) {
      throw new ValidationError(
        `Shipping address field "${field}" is required`
      );
    }
  }
}
