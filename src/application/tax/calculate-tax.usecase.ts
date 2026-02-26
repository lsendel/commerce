import type { Database } from "../../infrastructure/db/client";
import type { TaxBreakdown } from "../../domain/tax/tax-provider.interface";
import { TaxCalculator } from "../../domain/tax/tax-calculator.service";
import { TaxJarAdapter } from "../../infrastructure/tax/taxjar.adapter";
import { TaxRepository } from "../../infrastructure/repositories/tax.repository";
import { IntegrationRepository } from "../../infrastructure/repositories/integration.repository";

interface CalculateTaxInput {
  db: Database;
  storeId: string;
  lineItems: Array<{ id: string; amount: number; productType: string }>;
  shippingAmount: number;
  address: { country: string; state?: string; zip: string };
}

export class CalculateTaxUseCase {
  async execute(input: CalculateTaxInput): Promise<TaxBreakdown> {
    const { db, storeId, lineItems, shippingAmount, address } = input;

    // Check if an external tax provider is configured
    const integrationRepo = new IntegrationRepository(db);
    const taxjarIntegration = await integrationRepo.findByProvider(
      "taxjar" as any,
      storeId,
    );

    // If TaxJar is connected, use the external adapter
    if (taxjarIntegration && taxjarIntegration.status === "connected") {
      const adapter = new TaxJarAdapter();
      return adapter.calculateTax({ lineItems, shippingAmount, address });
    }

    // Also check for Avalara (future provider)
    const avalaraIntegration = await integrationRepo.findByProvider(
      "avalara" as any,
      storeId,
    );

    if (avalaraIntegration && avalaraIntegration.status === "connected") {
      // Avalara adapter would go here when implemented
      throw new Error(
        "Avalara integration not configured. Add API key via platform integrations.",
      );
    }

    // Default: use built-in tax calculator with local zones/rates
    const taxRepo = new TaxRepository(db, storeId);
    const calculator = new TaxCalculator(taxRepo);
    return calculator.calculateTax({ lineItems, shippingAmount, address });
  }
}
