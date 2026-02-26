export interface TaxBreakdown {
  totalTax: number;
  lines: Array<{
    itemId: string;
    taxAmount: number;
    rate: number;
    taxType: string;
  }>;
}

export interface TaxProvider {
  calculateTax(input: {
    lineItems: Array<{ id: string; amount: number; productType: string }>;
    shippingAmount: number;
    address: { country: string; state?: string; zip: string };
  }): Promise<TaxBreakdown>;
}
