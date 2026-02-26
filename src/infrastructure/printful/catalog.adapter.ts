import { and, eq } from "drizzle-orm";
import type { PrintfulClient } from "./printful.client";
import type { Database } from "../db/client";
import {
  products,
  productVariants,
  printfulSyncProducts,
  printfulSyncVariants,
} from "../db/schema";

// ─── Printful API response shapes ──────────────────────────────────────────

interface PrintfulSyncProductListItem {
  id: number;
  external_id: string;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url: string;
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
  sync_variants: PrintfulSyncVariantDetail[];
}

interface PrintfulSyncVariantDetail {
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
  files: Array<{
    id: number;
    type: string;
    url: string;
    preview_url: string;
  }>;
}

// ─── Catalog Adapter ───────────────────────────────────────────────────────

export class PrintfulCatalogAdapter {
  /**
   * Fetch all sync products from Printful and upsert into local DB.
   * Returns counts of created and updated records.
   */
  async syncProducts(client: PrintfulClient, db: Database, storeId: string) {
    let offset = 0;
    const limit = 100;
    let total = 0;
    let created = 0;
    let updated = 0;

    // Paginate through all sync products
    do {
      const listResponse = await client.get<PrintfulSyncProductListItem[]>(
        `/store/products?offset=${offset}&limit=${limit}`,
      );

      const productList = listResponse.result;
      total = listResponse.paging?.total ?? productList.length;

      for (const item of productList) {
        const result = await this.syncSingleProduct(client, db, storeId, item.id);
        if (result.wasCreated) created++;
        else updated++;
      }

      offset += limit;
    } while (offset < total);

    return { synced: created + updated, created, updated };
  }

  /**
   * Sync a single Printful sync product (and its variants) into the local DB.
   */
  async syncSingleProduct(
    client: PrintfulClient,
    db: Database,
    storeId: string,
    printfulProductId: number,
  ): Promise<{ wasCreated: boolean }> {
    // 1. Fetch full product detail with variants from Printful
    const detail = await client.get<PrintfulSyncProductDetail>(
      `/store/products/${printfulProductId}`,
    );

    const syncProduct = detail.result.sync_product;
    const syncVariants = detail.result.sync_variants;

    // 2. Upsert into our products table
    const slug = this.slugify(syncProduct.name);

    const existingProducts = await db
      .select()
      .from(printfulSyncProducts)
      .where(
        and(
          eq(printfulSyncProducts.printfulId, syncProduct.id),
          eq(printfulSyncProducts.storeId, storeId),
        ),
      )
      .limit(1);

    let productId: string;
    let wasCreated = false;

    const existingProduct = existingProducts[0];
    if (existingProduct) {
      // Product already linked — update our product record
      productId = existingProduct.productId;
      await db
        .update(products)
        .set({
          name: syncProduct.name,
          featuredImageUrl: syncProduct.thumbnail_url,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId));

      // Update sync timestamp
      await db
        .update(printfulSyncProducts)
        .set({
          externalId: syncProduct.external_id,
          syncedAt: new Date(),
        })
        .where(eq(printfulSyncProducts.printfulId, syncProduct.id));
    } else {
      // Create new product
      const productRows = await db
        .insert(products)
        .values({
          storeId,
          name: syncProduct.name,
          slug: await this.uniqueSlug(db, slug),
          type: "physical",
          featuredImageUrl: syncProduct.thumbnail_url,
          availableForSale: true,
          printfulSyncProductId: syncProduct.id,
        })
        .returning();

      const newProduct = productRows[0];
      if (!newProduct) throw new Error("Failed to create product from Printful sync");
      productId = newProduct.id;
      wasCreated = true;

      // Create sync product link
      await db.insert(printfulSyncProducts).values({
        storeId,
        printfulId: syncProduct.id,
        productId,
        externalId: syncProduct.external_id,
        syncedAt: new Date(),
      });
    }

    // 3. Upsert variants
    for (const sv of syncVariants) {
      await this.upsertVariant(db, productId, sv);
    }

    return { wasCreated };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async upsertVariant(
    db: Database,
    productId: string,
    sv: PrintfulSyncVariantDetail,
  ) {
    const existingVariant = await db
      .select()
      .from(printfulSyncVariants)
      .where(eq(printfulSyncVariants.printfulId, sv.id))
      .limit(1);

    const existingVar = existingVariant[0];
    if (existingVar) {
      // Update existing variant
      const variantId = existingVar.variantId;
      await db
        .update(productVariants)
        .set({
          title: sv.name,
          sku: sv.sku || null,
          price: sv.retail_price,
          availableForSale: sv.synced,
        })
        .where(eq(productVariants.id, variantId));

      await db
        .update(printfulSyncVariants)
        .set({
          printfulProductId: sv.sync_product_id,
          syncedAt: new Date(),
        })
        .where(eq(printfulSyncVariants.printfulId, sv.id));
    } else {
      // Create new variant
      const variantRows = await db
        .insert(productVariants)
        .values({
          productId,
          title: sv.name,
          sku: sv.sku || null,
          price: sv.retail_price,
          availableForSale: sv.synced,
          printfulSyncVariantId: sv.id,
        })
        .returning();

      const newVariant = variantRows[0];
      if (!newVariant) throw new Error("Failed to create variant from Printful sync");
      await db.insert(printfulSyncVariants).values({
        printfulId: sv.id,
        variantId: newVariant.id,
        printfulProductId: sv.sync_product_id,
        syncedAt: new Date(),
      });
    }
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private async uniqueSlug(db: Database, baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 0;

    while (true) {
      const existing = await db
        .select()
        .from(products)
        .where(eq(products.slug, slug))
        .limit(1);

      if (existing.length === 0) return slug;
      counter++;
      slug = `${baseSlug}-${counter}`;
    }
  }
}
