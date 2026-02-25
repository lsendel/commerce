import { eq, and, or, like, gte, lte, desc, asc, sql, inArray } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  products,
  productVariants,
  productImages,
  collections,
  collectionProducts,
} from "../db/schema";

export interface ProductFilters {
  page?: number;
  limit?: number;
  type?: string;
  collection?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
  sort?: string;
}

export class ProductRepository {
  constructor(private db: Database) {}

  async findAll(filters: ProductFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    // Build WHERE conditions for products table
    const conditions: ReturnType<typeof eq>[] = [];

    if (filters.type) {
      conditions.push(eq(products.type, filters.type as any));
    }

    if (filters.available !== undefined) {
      conditions.push(eq(products.availableForSale, filters.available));
    }

    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(like(products.name, term), like(products.description, term))!,
      );
    }

    // If filtering by collection, get product IDs in that collection first
    let collectionProductIds: string[] | null = null;
    if (filters.collection) {
      const collectionRow = await this.db
        .select({ id: collections.id })
        .from(collections)
        .where(eq(collections.slug, filters.collection))
        .limit(1);

      if (collectionRow.length > 0) {
        const cpRows = await this.db
          .select({ productId: collectionProducts.productId })
          .from(collectionProducts)
          .where(eq(collectionProducts.collectionId, collectionRow[0].id));

        collectionProductIds = cpRows.map((r) => r.productId);
        if (collectionProductIds.length === 0) {
          return { products: [], total: 0, page, limit };
        }
        conditions.push(inArray(products.id, collectionProductIds));
      } else {
        return { products: [], total: 0, page, limit };
      }
    }

    // If filtering by price range, get qualifying product IDs via variants
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const priceConditions: ReturnType<typeof eq>[] = [];
      if (filters.minPrice !== undefined) {
        priceConditions.push(
          gte(productVariants.price, String(filters.minPrice)),
        );
      }
      if (filters.maxPrice !== undefined) {
        priceConditions.push(
          lte(productVariants.price, String(filters.maxPrice)),
        );
      }

      const priceRows = await this.db
        .selectDistinct({ productId: productVariants.productId })
        .from(productVariants)
        .where(
          priceConditions.length > 1
            ? and(...priceConditions)
            : priceConditions[0],
        );

      const priceProductIds = priceRows.map((r) => r.productId);
      if (priceProductIds.length === 0) {
        return { products: [], total: 0, page, limit };
      }
      conditions.push(inArray(products.id, priceProductIds));
    }

    // Determine ORDER BY
    let orderBy: any;
    switch (filters.sort) {
      case "price_asc":
        orderBy = asc(products.name); // will re-sort after price computation
        break;
      case "price_desc":
        orderBy = desc(products.name);
        break;
      case "newest":
        orderBy = desc(products.createdAt);
        break;
      case "name":
        orderBy = asc(products.name);
        break;
      default:
        orderBy = desc(products.createdAt);
    }

    // Count total
    const whereClause =
      conditions.length > 0
        ? conditions.length === 1
          ? conditions[0]
          : and(...conditions)
        : undefined;

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(whereClause);

    const total = Number(countResult[0].count);

    // Fetch products
    const productRows = await this.db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    if (productRows.length === 0) {
      return { products: [], total, page, limit };
    }

    const productIds = productRows.map((p) => p.id);

    // Fetch variants and images for these products
    const [variantRows, imageRows] = await Promise.all([
      this.db
        .select()
        .from(productVariants)
        .where(inArray(productVariants.productId, productIds)),
      this.db
        .select()
        .from(productImages)
        .where(inArray(productImages.productId, productIds)),
    ]);

    // Group by product
    const variantsByProduct = new Map<string, (typeof variantRows)[number][]>();
    for (const v of variantRows) {
      const arr = variantsByProduct.get(v.productId) ?? [];
      arr.push(v);
      variantsByProduct.set(v.productId, arr);
    }

    const imagesByProduct = new Map<string, (typeof imageRows)[number][]>();
    for (const img of imageRows) {
      const arr = imagesByProduct.get(img.productId) ?? [];
      arr.push(img);
      imagesByProduct.set(img.productId, arr);
    }

    const result = productRows.map((p) => {
      const variants = (variantsByProduct.get(p.id) ?? []).map((v) => ({
        id: v.id,
        title: v.title,
        price: Number(v.price),
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
        sku: v.sku,
        availableForSale: v.availableForSale ?? true,
        options: (v.options as Record<string, string>) ?? {},
      }));

      const prices = variants.map((v) => v.price);
      const priceRange = {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0,
      };

      const images = (imagesByProduct.get(p.id) ?? [])
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((img) => ({
          id: img.id,
          url: img.url,
          altText: img.altText ?? null,
          width: null,
          height: null,
        }));

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description ?? null,
        descriptionHtml: p.descriptionHtml ?? null,
        type: p.type,
        availableForSale: p.availableForSale ?? true,
        featuredImageUrl: p.featuredImageUrl ?? null,
        seoTitle: p.seoTitle ?? null,
        seoDescription: p.seoDescription ?? null,
        priceRange,
        variants,
        images,
      };
    });

    // If sorting by price, re-sort in memory since price lives on variants
    if (filters.sort === "price_asc") {
      result.sort((a, b) => a.priceRange.min - b.priceRange.min);
    } else if (filters.sort === "price_desc") {
      result.sort((a, b) => b.priceRange.max - a.priceRange.max);
    }

    return { products: result, total, page, limit };
  }

  async findBySlug(slug: string) {
    const rows = await this.db
      .select()
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    const product = rows[0];
    if (!product) return null;

    const [variantRows, imageRows, cpRows] = await Promise.all([
      this.db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, product.id)),
      this.db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id)),
      this.db
        .select({ collectionId: collectionProducts.collectionId })
        .from(collectionProducts)
        .where(eq(collectionProducts.productId, product.id)),
    ]);

    let productCollections: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      imageUrl: string | null;
    }[] = [];

    if (cpRows.length > 0) {
      const collectionIds = cpRows.map((r) => r.collectionId);
      const collectionRows = await this.db
        .select()
        .from(collections)
        .where(inArray(collections.id, collectionIds));
      productCollections = collectionRows.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description ?? null,
        imageUrl: c.imageUrl ?? null,
      }));
    }

    const variants = variantRows.map((v) => ({
      id: v.id,
      title: v.title,
      price: Number(v.price),
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
      sku: v.sku,
      availableForSale: v.availableForSale ?? true,
      options: (v.options as Record<string, string>) ?? {},
    }));

    const prices = variants.map((v) => v.price);
    const priceRange = {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
    };

    const images = imageRows
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((img) => ({
        id: img.id,
        url: img.url,
        altText: img.altText ?? null,
        width: null,
        height: null,
      }));

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description ?? null,
      descriptionHtml: product.descriptionHtml ?? null,
      type: product.type,
      availableForSale: product.availableForSale ?? true,
      featuredImageUrl: product.featuredImageUrl ?? null,
      seoTitle: product.seoTitle ?? null,
      seoDescription: product.seoDescription ?? null,
      priceRange,
      variants,
      images,
      collections: productCollections,
    };
  }

  async findById(id: string) {
    const rows = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    const product = rows[0];
    if (!product) return null;

    const [variantRows, imageRows] = await Promise.all([
      this.db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, product.id)),
      this.db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id)),
    ]);

    const variants = variantRows.map((v) => ({
      id: v.id,
      title: v.title,
      price: Number(v.price),
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
      sku: v.sku,
      availableForSale: v.availableForSale ?? true,
      options: (v.options as Record<string, string>) ?? {},
    }));

    const prices = variants.map((v) => v.price);
    const priceRange = {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
    };

    const images = imageRows
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((img) => ({
        id: img.id,
        url: img.url,
        altText: img.altText ?? null,
        width: null,
        height: null,
      }));

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description ?? null,
      descriptionHtml: product.descriptionHtml ?? null,
      type: product.type,
      availableForSale: product.availableForSale ?? true,
      featuredImageUrl: product.featuredImageUrl ?? null,
      seoTitle: product.seoTitle ?? null,
      seoDescription: product.seoDescription ?? null,
      priceRange,
      variants,
      images,
    };
  }

  async findCollections() {
    const rows = await this.db.select().from(collections);
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description ?? null,
      imageUrl: c.imageUrl ?? null,
    }));
  }

  async findCollectionBySlug(
    slug: string,
    pagination?: { page?: number; limit?: number },
  ) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const offset = (page - 1) * limit;

    const rows = await this.db
      .select()
      .from(collections)
      .where(eq(collections.slug, slug))
      .limit(1);

    const collection = rows[0];
    if (!collection) return null;

    // Count total products in this collection
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(collectionProducts)
      .where(eq(collectionProducts.collectionId, collection.id));

    const total = Number(countResult[0].count);

    // Get product IDs for this collection (paginated)
    const cpRows = await this.db
      .select({
        productId: collectionProducts.productId,
        position: collectionProducts.position,
      })
      .from(collectionProducts)
      .where(eq(collectionProducts.collectionId, collection.id))
      .orderBy(asc(collectionProducts.position))
      .limit(limit)
      .offset(offset);

    if (cpRows.length === 0) {
      return {
        collection: {
          id: collection.id,
          name: collection.name,
          slug: collection.slug,
          description: collection.description ?? null,
          imageUrl: collection.imageUrl ?? null,
        },
        products: [],
        total,
        page,
        limit,
      };
    }

    const productIds = cpRows.map((r) => r.productId);

    // Fetch products
    const productRows = await this.db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    // Fetch variants and images
    const [variantRows, imageRows] = await Promise.all([
      this.db
        .select()
        .from(productVariants)
        .where(inArray(productVariants.productId, productIds)),
      this.db
        .select()
        .from(productImages)
        .where(inArray(productImages.productId, productIds)),
    ]);

    const variantsByProduct = new Map<string, (typeof variantRows)[number][]>();
    for (const v of variantRows) {
      const arr = variantsByProduct.get(v.productId) ?? [];
      arr.push(v);
      variantsByProduct.set(v.productId, arr);
    }

    const imagesByProduct = new Map<string, (typeof imageRows)[number][]>();
    for (const img of imageRows) {
      const arr = imagesByProduct.get(img.productId) ?? [];
      arr.push(img);
      imagesByProduct.set(img.productId, arr);
    }

    // Maintain collection ordering
    const productMap = new Map(productRows.map((p) => [p.id, p]));
    const collectionProducts_ = productIds
      .map((id) => productMap.get(id))
      .filter(Boolean)
      .map((p) => {
        const variants = (variantsByProduct.get(p!.id) ?? []).map((v) => ({
          id: v.id,
          title: v.title,
          price: Number(v.price),
          compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
          sku: v.sku,
          availableForSale: v.availableForSale ?? true,
          options: (v.options as Record<string, string>) ?? {},
        }));

        const prices = variants.map((v) => v.price);
        const priceRange = {
          min: prices.length > 0 ? Math.min(...prices) : 0,
          max: prices.length > 0 ? Math.max(...prices) : 0,
        };

        const images = (imagesByProduct.get(p!.id) ?? [])
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((img) => ({
            id: img.id,
            url: img.url,
            altText: img.altText ?? null,
            width: null,
            height: null,
          }));

        return {
          id: p!.id,
          name: p!.name,
          slug: p!.slug,
          description: p!.description ?? null,
          descriptionHtml: p!.descriptionHtml ?? null,
          type: p!.type,
          availableForSale: p!.availableForSale ?? true,
          featuredImageUrl: p!.featuredImageUrl ?? null,
          seoTitle: p!.seoTitle ?? null,
          seoDescription: p!.seoDescription ?? null,
          priceRange,
          variants,
          images,
        };
      });

    return {
      collection: {
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
        description: collection.description ?? null,
        imageUrl: collection.imageUrl ?? null,
      },
      products: collectionProducts_,
      total,
      page,
      limit,
    };
  }

  async createProduct(data: {
    name: string;
    slug: string;
    description?: string;
    descriptionHtml?: string;
    type: "physical" | "digital" | "subscription" | "bookable";
    availableForSale?: boolean;
    downloadUrl?: string;
    stripePriceId?: string;
    featuredImageUrl?: string;
    seoTitle?: string;
    seoDescription?: string;
  }) {
    const result = await this.db.insert(products).values(data).returning();
    return result[0];
  }

  async createVariant(data: {
    productId: string;
    title: string;
    sku?: string;
    price: string;
    compareAtPrice?: string;
    inventoryQuantity?: number;
    options?: Record<string, string>;
    availableForSale?: boolean;
  }) {
    const result = await this.db
      .insert(productVariants)
      .values(data)
      .returning();
    return result[0];
  }

  async updateInventory(variantId: string, delta: number) {
    const result = await this.db
      .update(productVariants)
      .set({
        inventoryQuantity: sql`${productVariants.inventoryQuantity} + ${delta}`,
      })
      .where(eq(productVariants.id, variantId))
      .returning();
    return result[0] ?? null;
  }
}
