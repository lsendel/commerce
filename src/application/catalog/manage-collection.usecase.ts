import { eq, and, inArray } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import { collections, collectionProducts } from "../../infrastructure/db/schema";
import { createSlug } from "../../domain/catalog/slug.vo";
import { generateDefaults } from "../../domain/catalog/seo-metadata.vo";
import { NotFoundError, ValidationError } from "../../shared/errors";

interface CreateCollectionInput {
  name: string;
  description?: string;
  imageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
}

interface UpdateCollectionInput {
  name?: string;
  description?: string;
  imageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  slug?: string;
}

export class ManageCollectionUseCase {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async create(input: CreateCollectionInput) {
    if (!input.name?.trim()) {
      throw new ValidationError("Collection name is required");
    }

    const slug = createSlug(input.name) + "-" + Date.now();
    const seo = generateDefaults(input.name, input.description);

    const rows = await this.db
      .insert(collections)
      .values({
        storeId: this.storeId,
        name: input.name.trim(),
        slug,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        seoTitle: input.seoTitle ?? seo.title ?? null,
        seoDescription: input.seoDescription ?? seo.description ?? null,
      })
      .returning();

    return rows[0]!;
  }

  async update(id: string, input: UpdateCollectionInput) {
    const existing = await this.db
      .select()
      .from(collections)
      .where(and(eq(collections.id, id), eq(collections.storeId, this.storeId)))
      .limit(1);

    if (!existing[0]) {
      throw new NotFoundError("Collection", id);
    }

    const oldSlug = existing[0].slug;
    const newSlug = input.slug ?? (input.name ? createSlug(input.name) + "-" + Date.now() : undefined);

    const rows = await this.db
      .update(collections)
      .set({
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
        ...(input.seoTitle !== undefined && { seoTitle: input.seoTitle }),
        ...(input.seoDescription !== undefined && { seoDescription: input.seoDescription }),
        ...(newSlug && { slug: newSlug }),
      })
      .where(and(eq(collections.id, id), eq(collections.storeId, this.storeId)))
      .returning();

    return { collection: rows[0]!, oldSlug, newSlug };
  }

  async remove(id: string) {
    // Delete junction records first
    await this.db
      .delete(collectionProducts)
      .where(eq(collectionProducts.collectionId, id));

    const rows = await this.db
      .delete(collections)
      .where(and(eq(collections.id, id), eq(collections.storeId, this.storeId)))
      .returning();

    if (!rows[0]) {
      throw new NotFoundError("Collection", id);
    }
    return rows[0];
  }

  async addProducts(collectionId: string, productIds: string[]) {
    if (productIds.length === 0) return;

    // Get current max position
    const existing = await this.db
      .select({ productId: collectionProducts.productId })
      .from(collectionProducts)
      .where(eq(collectionProducts.collectionId, collectionId));

    const existingIds = new Set(existing.map((r) => r.productId));
    const newIds = productIds.filter((id) => !existingIds.has(id));
    if (newIds.length === 0) return;

    const startPosition = existing.length;
    await this.db.insert(collectionProducts).values(
      newIds.map((productId, i) => ({
        collectionId,
        productId,
        position: startPosition + i,
      })),
    );
  }

  async removeProducts(collectionId: string, productIds: string[]) {
    if (productIds.length === 0) return;

    await this.db
      .delete(collectionProducts)
      .where(
        and(
          eq(collectionProducts.collectionId, collectionId),
          inArray(collectionProducts.productId, productIds),
        ),
      );
  }

  async reorderProducts(collectionId: string, orderedProductIds: string[]) {
    for (let i = 0; i < orderedProductIds.length; i++) {
      const productId = orderedProductIds[i];
      if (!productId) continue;
      await this.db
        .update(collectionProducts)
        .set({ position: i })
        .where(
          and(
            eq(collectionProducts.collectionId, collectionId),
            eq(collectionProducts.productId, productId),
          ),
        );
    }
  }
}
