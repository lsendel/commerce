import type { Database } from "../../infrastructure/db/client";
import { fulfillmentProviders } from "../../infrastructure/db/schema";
import { eq, and } from "drizzle-orm";
import type { FulfillmentProviderType } from "../../shared/types";

interface ConfigureProviderInput {
  storeId: string;
  type: FulfillmentProviderType;
  apiKey: string;
  apiSecret?: string;
  config?: Record<string, unknown>;
}

export class ConfigureProviderUseCase {
  constructor(private db: Database) {}

  async execute(input: ConfigureProviderInput) {
    const existing = await this.db
      .select()
      .from(fulfillmentProviders)
      .where(
        and(
          eq(fulfillmentProviders.storeId, input.storeId),
          eq(fulfillmentProviders.type, input.type),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const updated = await this.db
        .update(fulfillmentProviders)
        .set({
          apiKey: input.apiKey,
          apiSecret: input.apiSecret ?? null,
          config: input.config ?? null,
          isActive: true,
        })
        .where(eq(fulfillmentProviders.id, existing[0].id))
        .returning();
      return updated[0];
    }

    const inserted = await this.db
      .insert(fulfillmentProviders)
      .values({
        storeId: input.storeId,
        name: input.type,
        type: input.type,
        apiKey: input.apiKey,
        apiSecret: input.apiSecret ?? null,
        config: input.config ?? null,
        isActive: true,
      })
      .returning();

    return inserted[0];
  }
}
