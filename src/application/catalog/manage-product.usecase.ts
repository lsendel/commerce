import { eq, and } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import {
  products,
  productVariants,
  productImages,
} from "../../infrastructure/db/schema";
import { createSlug } from "../../domain/catalog/slug.vo";
import { generateDefaults } from "../../domain/catalog/seo-metadata.vo";
import { NotFoundError, ValidationError } from "../../shared/errors";

interface CreateProductInput {
  name: string;
  description?: string;
  descriptionHtml?: string;
  type: "physical" | "digital" | "subscription" | "bookable";
  status?: "draft" | "active" | "archived";
  availableForSale?: boolean;
  featuredImageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  downloadUrl?: string;
  stripePriceId?: string;
}

interface UpdateProductInput {
  name?: string;
  description?: string;
  descriptionHtml?: string;
  type?: "physical" | "digital" | "subscription" | "bookable";
  status?: "draft" | "active" | "archived";
  availableForSale?: boolean;
  featuredImageUrl?: string | null;
  seoTitle?: string;
  seoDescription?: string;
  slug?: string;
}

interface VariantInput {
  title: string;
  price: string;
  sku?: string;
  compareAtPrice?: string;
  inventoryQuantity?: number;
  options?: Record<string, string>;
  availableForSale?: boolean;
  fulfillmentProvider?: "printful" | "gooten" | "prodigi" | "shapeways";
  estimatedProductionDays?: number;
}

export class ManageProductUseCase {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async create(input: CreateProductInput) {
    if (!input.name?.trim()) {
      throw new ValidationError("Product name is required");
    }

    const slug = createSlug(input.name) + "-" + Date.now();
    const seo = generateDefaults(input.name, input.description);

    const rows = await this.db
      .insert(products)
      .values({
        storeId: this.storeId,
        name: input.name.trim(),
        slug,
        description: input.description ?? null,
        descriptionHtml: input.descriptionHtml ?? null,
        type: input.type,
        status: input.status ?? "draft",
        availableForSale: input.availableForSale ?? true,
        featuredImageUrl: input.featuredImageUrl ?? null,
        seoTitle: input.seoTitle ?? seo.title ?? null,
        seoDescription: input.seoDescription ?? seo.description ?? null,
        downloadUrl: input.downloadUrl ?? null,
        stripePriceId: input.stripePriceId ?? null,
      })
      .returning();

    return rows[0]!;
  }

  async update(id: string, input: UpdateProductInput) {
    const existing = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.storeId, this.storeId)))
      .limit(1);

    if (!existing[0]) {
      throw new NotFoundError("Product", id);
    }

    const oldSlug = existing[0].slug;
    const newSlug = input.slug ?? (input.name ? createSlug(input.name) + "-" + Date.now() : undefined);

    const rows = await this.db
      .update(products)
      .set({
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.descriptionHtml !== undefined && { descriptionHtml: input.descriptionHtml }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.availableForSale !== undefined && { availableForSale: input.availableForSale }),
        ...(input.featuredImageUrl !== undefined && { featuredImageUrl: input.featuredImageUrl }),
        ...(input.seoTitle !== undefined && { seoTitle: input.seoTitle }),
        ...(input.seoDescription !== undefined && { seoDescription: input.seoDescription }),
        ...(newSlug && { slug: newSlug }),
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, id), eq(products.storeId, this.storeId)))
      .returning();

    return { product: rows[0]!, oldSlug, newSlug };
  }

  async archive(id: string) {
    const rows = await this.db
      .update(products)
      .set({ status: "archived", updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.storeId, this.storeId)))
      .returning();

    if (!rows[0]) {
      throw new NotFoundError("Product", id);
    }
    return rows[0];
  }

  async addVariant(productId: string, input: VariantInput) {
    const rows = await this.db
      .insert(productVariants)
      .values({
        productId,
        title: input.title,
        price: input.price,
        sku: input.sku,
        compareAtPrice: input.compareAtPrice,
        inventoryQuantity: input.inventoryQuantity ?? 0,
        options: input.options,
        availableForSale: input.availableForSale ?? true,
        fulfillmentProvider: input.fulfillmentProvider,
        estimatedProductionDays: input.estimatedProductionDays,
      })
      .returning();

    return rows[0]!;
  }

  async updateVariant(variantId: string, data: Partial<VariantInput>) {
    const rows = await this.db
      .update(productVariants)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.compareAtPrice !== undefined && { compareAtPrice: data.compareAtPrice }),
        ...(data.inventoryQuantity !== undefined && { inventoryQuantity: data.inventoryQuantity }),
        ...(data.options !== undefined && { options: data.options }),
        ...(data.availableForSale !== undefined && { availableForSale: data.availableForSale }),
        ...(data.fulfillmentProvider !== undefined && { fulfillmentProvider: data.fulfillmentProvider }),
        ...(data.estimatedProductionDays !== undefined && { estimatedProductionDays: data.estimatedProductionDays }),
      })
      .where(eq(productVariants.id, variantId))
      .returning();

    if (!rows[0]) {
      throw new NotFoundError("Variant", variantId);
    }
    return rows[0];
  }

  async removeVariant(variantId: string) {
    const rows = await this.db
      .delete(productVariants)
      .where(eq(productVariants.id, variantId))
      .returning();

    if (!rows[0]) {
      throw new NotFoundError("Variant", variantId);
    }
    return rows[0];
  }

  async updateImages(productId: string, images: { url: string; altText?: string }[]) {
    // Remove existing images
    await this.db
      .delete(productImages)
      .where(eq(productImages.productId, productId));

    // Insert new images in order
    if (images.length > 0) {
      await this.db.insert(productImages).values(
        images.map((img, i) => ({
          productId,
          url: img.url,
          altText: img.altText ?? null,
          position: i,
        })),
      );
    }
  }
}
