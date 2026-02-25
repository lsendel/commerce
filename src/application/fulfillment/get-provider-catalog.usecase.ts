import type { Database } from "../../infrastructure/db/client";
import { fulfillmentProviders } from "../../infrastructure/db/schema";
import { eq, and } from "drizzle-orm";
import { createFulfillmentProvider } from "../../infrastructure/fulfillment/provider-factory";
import type { FulfillmentProviderType } from "../../shared/types";

export class GetProviderCatalogUseCase {
  constructor(private db: Database) {}

  async execute(storeId: string, providerType: FulfillmentProviderType) {
    const providerConfig = await this.db
      .select()
      .from(fulfillmentProviders)
      .where(
        and(
          eq(fulfillmentProviders.storeId, storeId),
          eq(fulfillmentProviders.type, providerType),
          eq(fulfillmentProviders.isActive, true),
        ),
      )
      .limit(1);

    if (!providerConfig[0]) {
      throw new Error(`Provider "${providerType}" not configured for this store`);
    }

    const provider = createFulfillmentProvider(providerType, {
      apiKey: providerConfig[0].apiKey!,
      apiSecret: providerConfig[0].apiSecret ?? undefined,
    });

    return provider.getCatalog();
  }
}
