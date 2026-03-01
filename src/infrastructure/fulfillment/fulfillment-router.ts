import { eq, and, inArray } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  providerProductMappings,
  fulfillmentProviders,
} from "../db/schema";

export type FulfillmentProviderType =
  | "printful"
  | "gooten"
  | "prodigi"
  | "shapeways";

export interface RoutingResult {
  providerId: string;
  providerType: FulfillmentProviderType;
  providerName: string;
  mappingId: string;
  externalProductId: string | null;
  externalVariantId: string | null;
  costPrice: string | null;
}

const providerPriority: FulfillmentProviderType[] = [
  "printful",
  "gooten",
  "prodigi",
  "shapeways",
];

function normalizeProviderType(
  value: string | null | undefined,
): FulfillmentProviderType | null {
  if (!value) return null;
  if (value === "printful") return value;
  if (value === "gooten") return value;
  if (value === "prodigi") return value;
  if (value === "shapeways") return value;
  return null;
}

function toNumericCost(value: string | null | undefined): number | null {
  if (!value) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
}

function shouldPreferCandidate(
  existing: RoutingResult,
  candidate: RoutingResult,
  optimizeByCost: boolean,
): boolean {
  if (!optimizeByCost) return false;

  const existingCost = toNumericCost(existing.costPrice);
  const candidateCost = toNumericCost(candidate.costPrice);

  if (candidateCost !== null && existingCost === null) return true;
  if (candidateCost !== null && existingCost !== null && candidateCost < existingCost) {
    return true;
  }
  if (candidateCost !== null && existingCost !== null && candidateCost === existingCost) {
    const existingPriority = providerPriority.indexOf(existing.providerType);
    const candidatePriority = providerPriority.indexOf(candidate.providerType);
    return candidatePriority >= 0
      && (existingPriority < 0 || candidatePriority < existingPriority);
  }
  return false;
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
    if (!r) return null;
    const providerType = normalizeProviderType(r.providerType);
    if (!providerType) return null;

    return {
      providerId: r.providerId,
      providerType,
      providerName: r.providerName,
      mappingId: r.mappingId,
      externalProductId: r.externalProductId,
      externalVariantId: r.externalVariantId,
      costPrice: r.costPrice,
    };
  }

  async selectProvidersForVariants(
    variantIds: string[],
    options?: { optimizeByCost?: boolean },
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

    // Default strategy: first active mapping per variant.
    // With split shipment optimization enabled, prefer lower cost mappings.
    const result = new Map<string, RoutingResult>();
    const optimizeByCost = options?.optimizeByCost ?? false;

    for (const r of rows) {
      const providerType = normalizeProviderType(r.providerType);
      if (!providerType) continue;

      const candidate: RoutingResult = {
        providerId: r.providerId,
        providerType,
        providerName: r.providerName,
        mappingId: r.mappingId,
        externalProductId: r.externalProductId,
        externalVariantId: r.externalVariantId,
        costPrice: r.costPrice,
      };

      const existing = result.get(r.variantId);
      if (!existing) {
        result.set(r.variantId, candidate);
        continue;
      }

      if (shouldPreferCandidate(existing, candidate, optimizeByCost)) {
        result.set(r.variantId, candidate);
      }
    }

    return result;
  }
}
