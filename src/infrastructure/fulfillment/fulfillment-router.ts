import { eq, and, inArray } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  providerProductMappings,
  fulfillmentProviders,
} from "../db/schema";

export interface RoutingResult {
  providerId: string;
  providerType: string;
  providerName: string;
  mappingId: string;
  externalProductId: string | null;
  externalVariantId: string | null;
  costPrice: string | null;
}

export class FulfillmentRouter {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async selectProvider(variantId: string): Promise<RoutingResult | null> {
    const rows = await this.db
      .select({
        mappingId: providerProductMappings.id,
        providerId: fulfillmentProviders.id,
        providerType: fulfillmentProviders.type,
        providerName: fulfillmentProviders.name,
        externalProductId: providerProductMappings.externalProductId,
        externalVariantId: providerProductMappings.externalVariantId,
        costPrice: providerProductMappings.costPrice,
      })
      .from(providerProductMappings)
      .innerJoin(
        fulfillmentProviders,
        eq(providerProductMappings.providerId, fulfillmentProviders.id),
      )
      .where(
        and(
          eq(providerProductMappings.variantId, variantId),
          eq(fulfillmentProviders.storeId, this.storeId),
          eq(fulfillmentProviders.isActive, true),
        ),
      )
      .limit(1);

    if (rows.length === 0) return null;

    const r = rows[0];
    return {
      providerId: r.providerId,
      providerType: r.providerType,
      providerName: r.providerName,
      mappingId: r.mappingId,
      externalProductId: r.externalProductId,
      externalVariantId: r.externalVariantId,
      costPrice: r.costPrice,
    };
  }

  async selectProvidersForVariants(
    variantIds: string[],
  ): Promise<Map<string, RoutingResult>> {
    if (variantIds.length === 0) return new Map();

    const rows = await this.db
      .select({
        variantId: providerProductMappings.variantId,
        mappingId: providerProductMappings.id,
        providerId: fulfillmentProviders.id,
        providerType: fulfillmentProviders.type,
        providerName: fulfillmentProviders.name,
        externalProductId: providerProductMappings.externalProductId,
        externalVariantId: providerProductMappings.externalVariantId,
        costPrice: providerProductMappings.costPrice,
      })
      .from(providerProductMappings)
      .innerJoin(
        fulfillmentProviders,
        eq(providerProductMappings.providerId, fulfillmentProviders.id),
      )
      .where(
        and(
          inArray(providerProductMappings.variantId, variantIds),
          eq(fulfillmentProviders.storeId, this.storeId),
          eq(fulfillmentProviders.isActive, true),
        ),
      );

    // Default strategy: first active mapping per variant
    const result = new Map<string, RoutingResult>();
    for (const r of rows) {
      if (!result.has(r.variantId)) {
        result.set(r.variantId, {
          providerId: r.providerId,
          providerType: r.providerType,
          providerName: r.providerName,
          mappingId: r.mappingId,
          externalProductId: r.externalProductId,
          externalVariantId: r.externalVariantId,
          costPrice: r.costPrice,
        });
      }
    }

    return result;
  }
}
