import type { TaxProvider, TaxBreakdown } from "../../domain/tax/tax-provider.interface";

/**
 * TaxJar adapter implementing TaxProvider.
 * Stub: throws until a TaxJar API key is configured via platform integrations.
 */
export class TaxJarAdapter implements TaxProvider {
  async calculateTax(_input: {
    lineItems: Array<{ id: string; amount: number; productType: string }>;
    shippingAmount: number;
    address: { country: string; state?: string; zip: string };
  }): Promise<TaxBreakdown> {
    throw new Error(
      "TaxJar integration not configured. Add API key via platform integrations.",
    );
  }
}
