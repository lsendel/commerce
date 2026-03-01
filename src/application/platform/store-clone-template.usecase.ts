import { eq, inArray } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import {
  collectionProducts,
  collections,
  productImages,
  productVariants,
  products,
  storeMembers,
  storeSettings,
  stores,
} from "../../infrastructure/db/schema";
import { StoreTemplateRepository } from "../../infrastructure/repositories/store-template.repository";
import { createSlug } from "../../domain/catalog/slug.vo";
import { NotFoundError, ValidationError } from "../../shared/errors";

interface SnapshotSetting {
  key: string;
  value: string | null;
}

interface SnapshotProductVariant {
  title: string;
  sku: string | null;
  price: string;
  compareAtPrice: string | null;
  inventoryQuantity: number;
  options: Record<string, unknown>;
  availableForSale: boolean;
  fulfillmentProvider: "printful" | "gooten" | "prodigi" | "shapeways" | null;
  estimatedProductionDays: number | null;
}

interface SnapshotProductImage {
  url: string;
  altText: string | null;
  position: number;
}

interface SnapshotProduct {
  slug: string;
  name: string;
  description: string | null;
  descriptionHtml: string | null;
  type: "physical" | "digital" | "subscription" | "bookable";
  status: "draft" | "active" | "archived";
  availableForSale: boolean;
  downloadUrl: string | null;
  stripePriceId: string | null;
  featuredImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  variants: SnapshotProductVariant[];
  images: SnapshotProductImage[];
}

interface SnapshotCollection {
  slug: string;
  name: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  imageUrl: string | null;
  productSlugs: string[];
}

interface StoreTemplateSnapshot {
  version: 1;
  generatedAt: string;
  sourceStore: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    status: "trial" | "active" | "suspended" | "deactivated";
    planId: string | null;
  };
  settings: SnapshotSetting[];
  products: SnapshotProduct[];
  collections: SnapshotCollection[];
}

interface CreateTemplateInput {
  name: string;
  description?: string | null;
  userId?: string | null;
}

interface CloneStoreInput {
  name: string;
  slug: string;
  subdomain?: string | null;
  copySettings?: boolean;
  copyProducts?: boolean;
  copyCollections?: boolean;
  ownerUserId?: string | null;
}

interface TemplateView {
  id: string;
  name: string;
  description: string | null;
  sourceStoreId: string;
  snapshotVersion: number;
  productCount: number;
  collectionCount: number;
  settingCount: number;
  createdAt: string;
  updatedAt: string;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function normalizeSnapshot(value: unknown): StoreTemplateSnapshot {
  const raw = toRecord(value);
  const sourceStoreRaw = toRecord(raw.sourceStore);

  const settings = Array.isArray(raw.settings)
    ? raw.settings
        .map((row) => {
          const item = toRecord(row);
          const key = String(item.key ?? "").trim();
          if (!key) return null;
          return {
            key,
            value: item.value == null ? null : String(item.value),
          } as SnapshotSetting;
        })
        .filter((row): row is SnapshotSetting => !!row)
    : [];

  const productsSnapshot = Array.isArray(raw.products)
    ? raw.products
        .map((row) => {
          const item = toRecord(row);
          const variants = Array.isArray(item.variants)
            ? item.variants
                .map((variantRow) => {
                  const variant = toRecord(variantRow);
                  const title = String(variant.title ?? "").trim();
                  if (!title) return null;

                  return {
                    title,
                    sku: variant.sku == null ? null : String(variant.sku),
                    price: String(variant.price ?? "0"),
                    compareAtPrice:
                      variant.compareAtPrice == null ? null : String(variant.compareAtPrice),
                    inventoryQuantity: Number(variant.inventoryQuantity ?? 0) || 0,
                    options: toRecord(variant.options),
                    availableForSale: variant.availableForSale !== false,
                    fulfillmentProvider:
                      variant.fulfillmentProvider === "printful" ||
                      variant.fulfillmentProvider === "gooten" ||
                      variant.fulfillmentProvider === "prodigi" ||
                      variant.fulfillmentProvider === "shapeways"
                        ? variant.fulfillmentProvider
                        : null,
                    estimatedProductionDays:
                      variant.estimatedProductionDays == null
                        ? null
                        : Number(variant.estimatedProductionDays) || null,
                  } as SnapshotProductVariant;
                })
                .filter((variant): variant is SnapshotProductVariant => !!variant)
            : [];

          const images = Array.isArray(item.images)
            ? item.images
                .map((imageRow) => {
                  const image = toRecord(imageRow);
                  const url = String(image.url ?? "").trim();
                  if (!url) return null;
                  return {
                    url,
                    altText: image.altText == null ? null : String(image.altText),
                    position: Number(image.position ?? 0) || 0,
                  } as SnapshotProductImage;
                })
                .filter((image): image is SnapshotProductImage => !!image)
            : [];

          const name = String(item.name ?? "").trim();
          if (!name) return null;

          const productType = String(item.type ?? "physical");
          const productStatus = String(item.status ?? "draft");

          return {
            slug: String((item.slug ?? createSlug(name)) || `product-${Date.now()}`),
            name,
            description: item.description == null ? null : String(item.description),
            descriptionHtml: item.descriptionHtml == null ? null : String(item.descriptionHtml),
            type:
              productType === "digital" ||
              productType === "subscription" ||
              productType === "bookable"
                ? productType
                : "physical",
            status:
              productStatus === "active" || productStatus === "archived"
                ? productStatus
                : "draft",
            availableForSale: item.availableForSale !== false,
            downloadUrl: item.downloadUrl == null ? null : String(item.downloadUrl),
            stripePriceId: item.stripePriceId == null ? null : String(item.stripePriceId),
            featuredImageUrl:
              item.featuredImageUrl == null ? null : String(item.featuredImageUrl),
            seoTitle: item.seoTitle == null ? null : String(item.seoTitle),
            seoDescription:
              item.seoDescription == null ? null : String(item.seoDescription),
            variants,
            images,
          } as SnapshotProduct;
        })
        .filter((row): row is SnapshotProduct => !!row)
    : [];

  const collectionsSnapshot = Array.isArray(raw.collections)
    ? raw.collections
        .map((row) => {
          const item = toRecord(row);
          const name = String(item.name ?? "").trim();
          if (!name) return null;

          const productSlugs = Array.isArray(item.productSlugs)
            ? item.productSlugs.map((slug) => String(slug).trim()).filter(Boolean)
            : [];

          return {
            slug: String((item.slug ?? createSlug(name)) || `collection-${Date.now()}`),
            name,
            description: item.description == null ? null : String(item.description),
            seoTitle: item.seoTitle == null ? null : String(item.seoTitle),
            seoDescription:
              item.seoDescription == null ? null : String(item.seoDescription),
            imageUrl: item.imageUrl == null ? null : String(item.imageUrl),
            productSlugs,
          } as SnapshotCollection;
        })
        .filter((row): row is SnapshotCollection => !!row)
    : [];

  return {
    version: 1,
    generatedAt: String(raw.generatedAt ?? new Date().toISOString()),
    sourceStore: {
      id: String(sourceStoreRaw.id ?? ""),
      name: String(sourceStoreRaw.name ?? ""),
      slug: String(sourceStoreRaw.slug ?? ""),
      logo: sourceStoreRaw.logo == null ? null : String(sourceStoreRaw.logo),
      primaryColor:
        sourceStoreRaw.primaryColor == null ? null : String(sourceStoreRaw.primaryColor),
      secondaryColor:
        sourceStoreRaw.secondaryColor == null
          ? null
          : String(sourceStoreRaw.secondaryColor),
      status:
        sourceStoreRaw.status === "active" ||
        sourceStoreRaw.status === "suspended" ||
        sourceStoreRaw.status === "deactivated"
          ? sourceStoreRaw.status
          : "trial",
      planId: sourceStoreRaw.planId == null ? null : String(sourceStoreRaw.planId),
    },
    settings,
    products: productsSnapshot,
    collections: collectionsSnapshot,
  };
}

function buildTemplateSummary(row: any): TemplateView {
  const snapshot = normalizeSnapshot(row.snapshot);

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    sourceStoreId: row.sourceStoreId,
    snapshotVersion: snapshot.version,
    productCount: snapshot.products.length,
    collectionCount: snapshot.collections.length,
    settingCount: snapshot.settings.length,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function uniqueCloneSlug(base: string, cloneStoreSlug: string, index: number): string {
  const normalizedBase = createSlug(base) || `item-${index + 1}`;
  const normalizedStore = createSlug(cloneStoreSlug) || "clone";
  return `${normalizedBase}-${normalizedStore}-${index + 1}`;
}

export class StoreCloneTemplateUseCase {
  constructor(
    private readonly db: Database,
    private readonly storeId: string,
    private readonly repository: StoreTemplateRepository,
  ) {}

  async listTemplates(limit = 100): Promise<TemplateView[]> {
    const rows = await this.repository.list(limit);
    return rows.map((row) => buildTemplateSummary(row));
  }

  async createTemplate(input: CreateTemplateInput): Promise<TemplateView> {
    const name = String(input.name ?? "").trim();
    if (!name) {
      throw new ValidationError("Template name is required");
    }

    const snapshot = await this.captureStoreSnapshot();

    const row = await this.repository.create({
      sourceStoreId: this.storeId,
      name,
      description: input.description?.trim() ? input.description.trim() : null,
      snapshot,
      createdBy: input.userId ?? null,
    });

    if (!row) {
      throw new ValidationError("Failed to create store template");
    }

    return buildTemplateSummary(row);
  }

  async deleteTemplate(id: string): Promise<void> {
    const row = await this.repository.delete(id);
    if (!row) {
      throw new NotFoundError("Store template", id);
    }
  }

  async cloneFromTemplate(templateId: string, input: CloneStoreInput) {
    const template = await this.repository.findById(templateId);
    if (!template) {
      throw new NotFoundError("Store template", templateId);
    }

    const snapshot = normalizeSnapshot(template.snapshot);

    const name = String(input.name ?? "").trim();
    const slug = createSlug(String(input.slug ?? "").trim());
    const subdomainRaw = String(input.subdomain ?? "").trim();
    const subdomain = subdomainRaw ? createSlug(subdomainRaw) : null;

    if (!name) {
      throw new ValidationError("Store name is required");
    }
    if (!slug) {
      throw new ValidationError("Store slug is required");
    }

    const existingSlug = await this.db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.slug, slug))
      .limit(1);
    if (existingSlug[0]) {
      throw new ValidationError(`Store slug already exists: ${slug}`);
    }

    if (subdomain) {
      const existingSubdomain = await this.db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.subdomain, subdomain))
        .limit(1);
      if (existingSubdomain[0]) {
        throw new ValidationError(`Store subdomain already exists: ${subdomain}`);
      }
    }

    const cloneStoreRows = await this.db
      .insert(stores)
      .values({
        name,
        slug,
        subdomain,
        logo: snapshot.sourceStore.logo,
        primaryColor: snapshot.sourceStore.primaryColor,
        secondaryColor: snapshot.sourceStore.secondaryColor,
        status: "trial",
        planId: snapshot.sourceStore.planId,
      })
      .returning();

    const cloneStore = cloneStoreRows[0];
    if (!cloneStore) {
      throw new ValidationError("Failed to create cloned store");
    }

    if (input.ownerUserId) {
      await this.db.insert(storeMembers).values({
        storeId: cloneStore.id,
        userId: input.ownerUserId,
        role: "owner",
      });
    }

    const copySettings = input.copySettings ?? true;
    const copyProducts = input.copyProducts ?? true;
    const copyCollections = input.copyCollections ?? true;

    if (copySettings && snapshot.settings.length > 0) {
      await this.db.insert(storeSettings).values(
        snapshot.settings.map((setting) => ({
          storeId: cloneStore.id,
          key: setting.key,
          value: setting.value,
        })),
      );
    }

    const sourceSlugToCloneProductId = new Map<string, string>();

    if (copyProducts && snapshot.products.length > 0) {
      for (let index = 0; index < snapshot.products.length; index += 1) {
        const product = snapshot.products[index];
        if (!product) continue;

        const cloneSlug = uniqueCloneSlug(product.slug || product.name, slug, index);

        const cloneProductRows = await this.db
          .insert(products)
          .values({
            storeId: cloneStore.id,
            name: product.name,
            slug: cloneSlug,
            description: product.description,
            descriptionHtml: product.descriptionHtml,
            type: product.type,
            status: product.status,
            availableForSale: product.availableForSale,
            downloadUrl: product.downloadUrl,
            stripePriceId: product.stripePriceId,
            featuredImageUrl: product.featuredImageUrl,
            seoTitle: product.seoTitle,
            seoDescription: product.seoDescription,
          })
          .returning();

        const cloneProduct = cloneProductRows[0];
        if (!cloneProduct) continue;

        sourceSlugToCloneProductId.set(product.slug, cloneProduct.id);

        if (product.variants.length > 0) {
          await this.db.insert(productVariants).values(
            product.variants.map((variant, variantIndex) => ({
              productId: cloneProduct.id,
              title: variant.title,
              sku: variant.sku
                ? `${variant.sku}-${slug}-${index + 1}-${variantIndex + 1}`
                : null,
              price: variant.price,
              compareAtPrice: variant.compareAtPrice,
              inventoryQuantity: variant.inventoryQuantity,
              options: variant.options,
              availableForSale: variant.availableForSale,
              fulfillmentProvider: variant.fulfillmentProvider,
              estimatedProductionDays: variant.estimatedProductionDays,
            })),
          );
        }

        if (product.images.length > 0) {
          await this.db.insert(productImages).values(
            product.images.map((image) => ({
              productId: cloneProduct.id,
              url: image.url,
              altText: image.altText,
              position: image.position,
            })),
          );
        }
      }
    }

    if (copyCollections && snapshot.collections.length > 0) {
      for (let index = 0; index < snapshot.collections.length; index += 1) {
        const collection = snapshot.collections[index];
        if (!collection) continue;

        const cloneCollectionRows = await this.db
          .insert(collections)
          .values({
            storeId: cloneStore.id,
            name: collection.name,
            slug: uniqueCloneSlug(collection.slug || collection.name, slug, index),
            description: collection.description,
            seoTitle: collection.seoTitle,
            seoDescription: collection.seoDescription,
            imageUrl: collection.imageUrl,
          })
          .returning();

        const cloneCollection = cloneCollectionRows[0];
        if (!cloneCollection) continue;

        const mappedProductIds = collection.productSlugs
          .map((productSlug) => sourceSlugToCloneProductId.get(productSlug))
          .filter((productId): productId is string => Boolean(productId));

        if (mappedProductIds.length > 0) {
          await this.db.insert(collectionProducts).values(
            mappedProductIds.map((productId, position) => ({
              collectionId: cloneCollection.id,
              productId,
              position,
            })),
          );
        }
      }
    }

    return {
      templateId: template.id,
      store: {
        id: cloneStore.id,
        name: cloneStore.name,
        slug: cloneStore.slug,
        subdomain: cloneStore.subdomain ?? null,
      },
      copied: {
        settings: copySettings ? snapshot.settings.length : 0,
        products: copyProducts ? snapshot.products.length : 0,
        collections: copyCollections ? snapshot.collections.length : 0,
      },
    };
  }

  private async captureStoreSnapshot(): Promise<StoreTemplateSnapshot> {
    const sourceStoreRows = await this.db
      .select()
      .from(stores)
      .where(eq(stores.id, this.storeId))
      .limit(1);

    const sourceStore = sourceStoreRows[0];
    if (!sourceStore) {
      throw new NotFoundError("Store", this.storeId);
    }

    const [settingsRows, productRows, collectionRows] = await Promise.all([
      this.db.select().from(storeSettings).where(eq(storeSettings.storeId, this.storeId)),
      this.db.select().from(products).where(eq(products.storeId, this.storeId)),
      this.db.select().from(collections).where(eq(collections.storeId, this.storeId)),
    ]);

    const productIds = productRows.map((row) => row.id);
    const collectionIds = collectionRows.map((row) => row.id);

    const [variantRows, imageRows, collectionProductRows] = await Promise.all([
      productIds.length > 0
        ? this.db
            .select()
            .from(productVariants)
            .where(inArray(productVariants.productId, productIds))
        : Promise.resolve([]),
      productIds.length > 0
        ? this.db
            .select()
            .from(productImages)
            .where(inArray(productImages.productId, productIds))
        : Promise.resolve([]),
      collectionIds.length > 0
        ? this.db
            .select()
            .from(collectionProducts)
            .where(inArray(collectionProducts.collectionId, collectionIds))
        : Promise.resolve([]),
    ]);

    const variantsByProduct = new Map<string, typeof variantRows>();
    for (const variant of variantRows) {
      const rows = variantsByProduct.get(variant.productId) ?? [];
      rows.push(variant);
      variantsByProduct.set(variant.productId, rows);
    }

    const imagesByProduct = new Map<string, typeof imageRows>();
    for (const image of imageRows) {
      const rows = imagesByProduct.get(image.productId) ?? [];
      rows.push(image);
      imagesByProduct.set(image.productId, rows);
    }

    const collectionProductsByCollection = new Map<string, typeof collectionProductRows>();
    for (const row of collectionProductRows) {
      const rows = collectionProductsByCollection.get(row.collectionId) ?? [];
      rows.push(row);
      collectionProductsByCollection.set(row.collectionId, rows);
    }

    const productIdToSlug = new Map(productRows.map((row) => [row.id, row.slug]));

    const snapshotProducts: SnapshotProduct[] = productRows.map((product) => ({
      slug: product.slug,
      name: product.name,
      description: product.description ?? null,
      descriptionHtml: product.descriptionHtml ?? null,
      type: product.type,
      status: product.status ?? "active",
      availableForSale: product.availableForSale ?? true,
      downloadUrl: product.downloadUrl ?? null,
      stripePriceId: product.stripePriceId ?? null,
      featuredImageUrl: product.featuredImageUrl ?? null,
      seoTitle: product.seoTitle ?? null,
      seoDescription: product.seoDescription ?? null,
      variants: (variantsByProduct.get(product.id) ?? []).map((variant) => ({
        title: variant.title,
        sku: variant.sku ?? null,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice ?? null,
        inventoryQuantity: variant.inventoryQuantity ?? 0,
        options: toRecord(variant.options),
        availableForSale: variant.availableForSale ?? true,
        fulfillmentProvider: variant.fulfillmentProvider ?? null,
        estimatedProductionDays: variant.estimatedProductionDays ?? null,
      })),
      images: (imagesByProduct.get(product.id) ?? [])
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((image) => ({
          url: image.url,
          altText: image.altText ?? null,
          position: image.position ?? 0,
        })),
    }));

    const snapshotCollections: SnapshotCollection[] = collectionRows.map((collection) => {
      const collectionItems = (collectionProductsByCollection.get(collection.id) ?? [])
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

      return {
        slug: collection.slug,
        name: collection.name,
        description: collection.description ?? null,
        seoTitle: collection.seoTitle ?? null,
        seoDescription: collection.seoDescription ?? null,
        imageUrl: collection.imageUrl ?? null,
        productSlugs: collectionItems
          .map((item) => productIdToSlug.get(item.productId) ?? "")
          .filter(Boolean),
      };
    });

    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      sourceStore: {
        id: sourceStore.id,
        name: sourceStore.name,
        slug: sourceStore.slug,
        logo: sourceStore.logo ?? null,
        primaryColor: sourceStore.primaryColor ?? null,
        secondaryColor: sourceStore.secondaryColor ?? null,
        status: sourceStore.status ?? "trial",
        planId: sourceStore.planId ?? null,
      },
      settings: settingsRows.map((setting) => ({
        key: setting.key,
        value: setting.value ?? null,
      })),
      products: snapshotProducts,
      collections: snapshotCollections,
    };
  }
}
