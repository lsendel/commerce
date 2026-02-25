import { eq, isNotNull } from "drizzle-orm";
import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { PrintfulClient } from "../infrastructure/printful/printful.client";
import {
  productVariants,
  printfulSyncVariants,
} from "../infrastructure/db/schema";

interface PrintfulWarehouseProduct {
  id: number;
  name: string;
  quantity: number;
  in_stock: boolean;
}

interface PrintfulSyncVariantDetail {
  id: number;
  external_id: string;
  sync_product_id: number;
  name: string;
  synced: boolean;
  variant_id: number;
  warehouse_product_variant_id: number | null;
  retail_price: string;
  currency: string;
  sku: string;
  product: {
    variant_id: number;
    product_id: number;
    image: string;
    name: string;
  };
}

interface PrintfulSyncProductDetail {
  sync_product: {
    id: number;
    external_id: string;
    name: string;
  };
  sync_variants: PrintfulSyncVariantDetail[];
}

export async function runStockCheck(env: Env): Promise<void> {
  const db = createDb(env.DATABASE_URL);
  const printful = new PrintfulClient(env.PRINTFUL_API_KEY);

  // Find all product variants that have a Printful sync variant mapping
  const syncVariantRows = await db
    .select({
      syncVariantId: printfulSyncVariants.id,
      printfulId: printfulSyncVariants.printfulId,
      variantId: printfulSyncVariants.variantId,
      printfulProductId: printfulSyncVariants.printfulProductId,
    })
    .from(printfulSyncVariants);

  if (syncVariantRows.length === 0) {
    console.log("[stock-check] No Printful sync variants to check");
    return;
  }

  // Group variants by their sync product ID so we can batch API calls
  const variantsByProductId = new Map<
    number,
    Array<{
      syncVariantId: string;
      printfulId: number;
      variantId: string;
    }>
  >();

  for (const row of syncVariantRows) {
    if (row.printfulProductId === null) continue;

    const existing = variantsByProductId.get(row.printfulProductId) ?? [];
    existing.push({
      syncVariantId: row.syncVariantId,
      printfulId: row.printfulId,
      variantId: row.variantId,
    });
    variantsByProductId.set(row.printfulProductId, existing);
  }

  // Also handle variants without a known product ID -- fetch them individually
  const orphanVariants = syncVariantRows.filter(
    (r) => r.printfulProductId === null,
  );

  let updatedCount = 0;

  // For each Printful product, fetch the full sync product detail to get variant availability
  for (const [printfulProductId, variants] of variantsByProductId) {
    try {
      const response = await printful.get<PrintfulSyncProductDetail>(
        `/store/products/${printfulProductId}`,
      );

      const syncVariants = response.result.sync_variants;
      const printfulVariantMap = new Map(
        syncVariants.map((sv) => [sv.id, sv]),
      );

      for (const localVariant of variants) {
        const pfVariant = printfulVariantMap.get(localVariant.printfulId);
        if (!pfVariant) continue;

        // Printful print-on-demand products are generally always "in stock"
        // since they are produced on demand. We track availability based on
        // whether the variant is synced and active.
        const isAvailable = pfVariant.synced;

        await db
          .update(productVariants)
          .set({
            availableForSale: isAvailable,
          })
          .where(eq(productVariants.id, localVariant.variantId));

        updatedCount++;
      }
    } catch (error) {
      console.error(
        `[stock-check] Failed to check product ${printfulProductId}:`,
        error,
      );
    }
  }

  // Handle orphan variants that don't have a known Printful product ID
  // We need to look them up individually via the sync variant endpoint
  for (const orphan of orphanVariants) {
    try {
      // The Printful API doesn't have a direct single-variant endpoint for sync variants.
      // We can list all products and search, but that's expensive. Instead, mark these
      // as needing a catalog sync to populate their printfulProductId.
      console.log(
        `[stock-check] Variant ${orphan.variantId} (Printful ID ${orphan.printfulId}) has no product mapping -- run catalog-sync first`,
      );
    } catch (error) {
      console.error(
        `[stock-check] Failed to check orphan variant ${orphan.printfulId}:`,
        error,
      );
    }
  }

  console.log(
    `[stock-check] Updated availability for ${updatedCount} variant(s)`,
  );
}
