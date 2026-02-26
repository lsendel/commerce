import type { TaxProvider, TaxBreakdown } from "./tax-provider.interface";
import type { TaxRate, TaxAppliesTo } from "./tax-rate.entity";
import type { TaxRepository } from "../../infrastructure/repositories/tax.repository";

/**
 * Built-in TaxCalculator that implements TaxProvider using local tax zones/rates.
 *
 * For each matching zone (ordered by priority DESC):
 *   - Fetches applicable rates
 *   - Filters by appliesTo (all, physical, digital, shipping)
 *   - Calculates tax per item: amount * rate (percentage-based)
 *   - Handles compound tax: if compound=true, applies rate on (amount + prior accumulated tax)
 */
export class TaxCalculator implements TaxProvider {
  constructor(private taxRepo: TaxRepository) {}

  async calculateTax(input: {
    lineItems: Array<{ id: string; amount: number; productType: string }>;
    shippingAmount: number;
    address: { country: string; state?: string; zip: string };
  }): Promise<TaxBreakdown> {
    const { lineItems, shippingAmount, address } = input;

    // Find matching zones for the given address
    const zones = await this.taxRepo.findZonesForAddress(
      address.country,
      address.state,
      address.zip,
    );

    if (zones.length === 0) {
      return {
        totalTax: 0,
        lines: lineItems.map((item) => ({
          itemId: item.id,
          taxAmount: 0,
          rate: 0,
          taxType: "none",
        })),
      };
    }

    // Collect all rates from all matching zones
    const allRates: TaxRate[] = [];
    for (const zone of zones) {
      const rates = await this.taxRepo.listRatesByZone(zone.id);
      allRates.push(...rates);
    }

    // Sort rates: non-compound first, then compound
    allRates.sort((a, b) => {
      if (a.compound !== b.compound) return a.compound ? 1 : -1;
      return 0;
    });

    // Build a virtual "shipping" line item for tax calculation
    const allItems = [
      ...lineItems.map((item) => ({
        id: item.id,
        amount: item.amount,
        productType: item.productType,
      })),
      ...(shippingAmount > 0
        ? [{ id: "__shipping__", amount: shippingAmount, productType: "shipping" }]
        : []),
    ];

    // Calculate tax for each item across all applicable rates
    const taxByItem = new Map<string, { taxAmount: number; rate: number; taxType: string }>();

    for (const item of allItems) {
      let accumulatedTax = 0;

      for (const rate of allRates) {
        if (!this.rateAppliesTo(rate.appliesTo, item.productType)) {
          continue;
        }

        let taxableAmount: number;
        if (rate.compound) {
          // Compound: apply on (original amount + previously accumulated tax)
          taxableAmount = item.amount + accumulatedTax;
        } else {
          taxableAmount = item.amount;
        }

        // All rates are percentage-based (sales_tax, vat, gst)
        const taxAmount = taxableAmount * (rate.rate / 100);
        accumulatedTax += taxAmount;
      }

      // Round to 2 decimal places
      accumulatedTax = Math.round(accumulatedTax * 100) / 100;

      // Use the first applicable rate's info for the line summary
      const primaryRate = allRates.find((r) =>
        this.rateAppliesTo(r.appliesTo, item.productType),
      );

      taxByItem.set(item.id, {
        taxAmount: accumulatedTax,
        rate: primaryRate?.rate ?? 0,
        taxType: primaryRate?.type ?? "none",
      });
    }

    // Build the result
    const lines: TaxBreakdown["lines"] = [];
    let totalTax = 0;

    for (const item of allItems) {
      const info = taxByItem.get(item.id);
      if (info) {
        totalTax += info.taxAmount;
        lines.push({
          itemId: item.id,
          taxAmount: info.taxAmount,
          rate: info.rate,
          taxType: info.taxType,
        });
      }
    }

    totalTax = Math.round(totalTax * 100) / 100;

    return { totalTax, lines };
  }

  private rateAppliesTo(appliesTo: TaxAppliesTo, productType: string): boolean {
    if (appliesTo === "all") return true;
    if (appliesTo === "shipping") return productType === "shipping";
    if (appliesTo === "physical") return productType === "physical";
    if (appliesTo === "digital") return productType === "digital";
    return false;
  }
}
