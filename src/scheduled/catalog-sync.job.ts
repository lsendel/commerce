import { eq } from "drizzle-orm";
import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { PrintfulClient } from "../infrastructure/printful/printful.client";
import {
  products,
  productVariants,
  printfulSyncProducts,
  printfulSyncVariants,
} from "../infrastructure/db/schema";

interface PrintfulSyncProductResult {
  id: number;
  external_id: string;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url: string;
}

interface PrintfulSyncVariantResult {
  id: number;
  external_id: string;
  sync_product_id: number;
  name: string;
  synced: boolean;
  variant_id: number;
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
    variants: number;
    synced: number;
    thumbnail_url: string;
  };
  sync_variants: PrintfulSyncVariantResult[];
}

export async function runCatalogSync(env: Env): Promise<void> {
  const db = createDb(env.DATABASE_URL);
  const printful = new PrintfulClient(env.PRINTFUL_API_KEY);

  // Fetch all sync products from Printful
  const listResponse = await printful.get<PrintfulSyncProductResult[]>(
    "/store/products",
  );
  const syncProducts = listResponse.result;

  if (!syncProducts || syncProducts.length === 0) {
    console.log("[catalog-sync] No Printful sync products found");
    return;
  }

  let productsSynced = 0;
  let variantsSynced = 0;

  for (const syncProduct of syncProducts) {
    // Fetch full product details including variants
    const detailResponse = await printful.get<PrintfulSyncProductDetail>(
      `/store/products/${syncProduct.id}`,
    );
    const detail = detailResponse.result;

    // Check if we already have a mapping for this Printful product
    const existingSync = await db
      .select()
      .from(printfulSyncProducts)
      .where(eq(printfulSyncProducts.printfulId, syncProduct.id))
      .limit(1);

    if (existingSync.length === 0) {
      // No local mapping exists -- skip; product must be created through admin
      console.log(
        `[catalog-sync] No local mapping for Printful product ${syncProduct.id} (${syncProduct.name}) -- skipping`,
      );
      continue;
    }

    const localSync = existingSync[0];
    const productId = localSync.productId;

    // Update product name and featured image from Printful
    await db
      .update(products)
      .set({
        name: detail.sync_product.name,
        featuredImageUrl: detail.sync_product.thumbnail_url || undefined,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    // Update synced timestamp
    await db
      .update(printfulSyncProducts)
      .set({ syncedAt: new Date() })
      .where(eq(printfulSyncProducts.id, localSync.id));

    productsSynced++;

    // Sync variants
    for (const syncVariant of detail.sync_variants) {
      const existingVariantSync = await db
        .select()
        .from(printfulSyncVariants)
        .where(eq(printfulSyncVariants.printfulId, syncVariant.id))
        .limit(1);

      if (existingVariantSync.length === 0) {
        // No local variant mapping -- skip
        continue;
      }

      const localVariantSync = existingVariantSync[0];

      // Update variant price and title from Printful
      await db
        .update(productVariants)
        .set({
          title: syncVariant.name,
          price: syncVariant.retail_price,
          sku: syncVariant.sku || undefined,
        })
        .where(eq(productVariants.id, localVariantSync.variantId));

      // Update synced timestamp
      await db
        .update(printfulSyncVariants)
        .set({
          syncedAt: new Date(),
          printfulProductId: syncVariant.product?.product_id ?? null,
        })
        .where(eq(printfulSyncVariants.id, localVariantSync.id));

      variantsSynced++;
    }
  }

  console.log(
    `[catalog-sync] Synced ${productsSynced} product(s), ${variantsSynced} variant(s)`,
  );
}
