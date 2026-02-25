import type { Database } from "../../infrastructure/db/client";
import { providerProductMappings } from "../../infrastructure/db/schema";
import { eq, and } from "drizzle-orm";

interface MappingInput {
  variantId: string;
  providerId: string;
  externalProductId: string;
  externalVariantId: string;
  costPrice: string;
}

export class MapProductToProviderUseCase {
  constructor(private db: Database) {}

  async execute(input: MappingInput) {
    const existing = await this.db
      .select()
      .from(providerProductMappings)
      .where(
        and(
          eq(providerProductMappings.variantId, input.variantId),
          eq(providerProductMappings.providerId, input.providerId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const updated = await this.db
        .update(providerProductMappings)
        .set({
          externalProductId: input.externalProductId,
          externalVariantId: input.externalVariantId,
          costPrice: input.costPrice,
        })
        .where(eq(providerProductMappings.id, existing[0].id))
        .returning();
      return updated[0];
    }

    const inserted = await this.db
      .insert(providerProductMappings)
      .values(input)
      .returning();

    return inserted[0];
  }
}
