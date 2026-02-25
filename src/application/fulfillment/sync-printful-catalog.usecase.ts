import { PrintfulClient } from "../../infrastructure/printful/printful.client";
import { PrintfulCatalogAdapter } from "../../infrastructure/printful/catalog.adapter";
import type { Database } from "../../infrastructure/db/client";

interface SyncCatalogInput {
  apiKey: string;
  db: Database;
  storeId: string;
  printfulProductIds?: number[];
}

export class SyncPrintfulCatalogUseCase {
  private adapter = new PrintfulCatalogAdapter();

  /**
   * Sync the Printful catalog into the local database.
   * If specific product IDs are provided, sync only those;
   * otherwise, sync all products from the store.
   */
  async execute(input: SyncCatalogInput) {
    const client = new PrintfulClient(input.apiKey);

    if (input.printfulProductIds && input.printfulProductIds.length > 0) {
      // Sync specific products
      let created = 0;
      let updated = 0;

      for (const printfulProductId of input.printfulProductIds) {
        const result = await this.adapter.syncSingleProduct(
          client,
          input.db,
          input.storeId,
          printfulProductId,
        );
        if (result.wasCreated) created++;
        else updated++;
      }

      return { synced: created + updated, created, updated };
    }

    // Sync all products
    return this.adapter.syncProducts(client, input.db, input.storeId);
  }
}
