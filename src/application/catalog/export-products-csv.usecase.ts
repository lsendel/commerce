import type { Database } from "../../infrastructure/db/client";
import { products, productVariants } from "../../infrastructure/db/schema";
import { eq, inArray } from "drizzle-orm";

export class ExportProductsCsvUseCase {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async execute(): Promise<string> {
    const allProducts = await this.db
      .select()
      .from(products)
      .where(eq(products.storeId, this.storeId));

    if (allProducts.length === 0)
      return "name,variant_title,sku,price,compare_at_price,inventory,type,available,weight,weight_unit\n";

    const productIds = allProducts.map((p) => p.id);
    const variants = await this.db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.productId, productIds));

    const rows: string[] = [
      "name,variant_title,sku,price,compare_at_price,inventory,type,available,weight,weight_unit",
    ];

    for (const product of allProducts) {
      const productVariantsList = variants.filter(
        (v) => v.productId === product.id,
      );
      for (const variant of productVariantsList) {
        const row = [
          csvEscape(product.name),
          csvEscape(variant.title),
          csvEscape(variant.sku ?? ""),
          variant.price,
          variant.compareAtPrice ?? "",
          String(variant.inventoryQuantity ?? 0),
          product.type,
          String(variant.availableForSale ?? true),
          variant.weight ?? "",
          variant.weightUnit ?? "oz",
        ].join(",");
        rows.push(row);
      }
    }

    return rows.join("\n");
  }
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
