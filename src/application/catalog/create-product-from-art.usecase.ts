import type { Database } from "../../infrastructure/db/client";
import type { AiJobRepository } from "../../infrastructure/repositories/ai-job.repository";
import {
  products,
  productVariants,
  productImages,
  providerProductMappings,
  designPlacements,
} from "../../infrastructure/db/schema";
import { NotFoundError, ValidationError, ForbiddenError } from "../../shared/errors";

interface VariantInput {
  title: string;
  price: string;
  sku?: string;
  compareAtPrice?: string;
  options?: Record<string, string>;
  digitalAssetKey?: string;
  fulfillmentProvider?: string;
  estimatedProductionDays?: number;
  providerId?: string;
  externalProductId?: string;
  externalVariantId?: string;
  costPrice?: string;
}

interface PlacementInput {
  area: string;
  imageUrl: string;
  x?: number;
  y?: number;
  scale?: string;
  rotation?: number;
  printAreaId?: string;
  providerMeta?: Record<string, unknown>;
}

interface CreateProductFromArtInput {
  userId: string;
  storeId: string;
  artJobId: string;
  name: string;
  description?: string;
  descriptionHtml?: string;
  type: "physical" | "digital";
  availableForSale?: boolean;
  featuredImageUrl?: string;
  variants: VariantInput[];
  placements?: PlacementInput[];
  imageUrls?: string[];
}

export class CreateProductFromArtUseCase {
  constructor(
    private db: Database,
    private aiJobRepo: AiJobRepository,
  ) {}

  async execute(input: CreateProductFromArtInput) {
    const { userId, storeId, artJobId, name, variants: variantInputs } = input;

    if (!name?.trim()) {
      throw new ValidationError("Product name is required");
    }
    if (!variantInputs || variantInputs.length === 0) {
      throw new ValidationError("At least one variant is required");
    }

    // 1. Verify art job exists, belongs to user, is completed
    const artJob = await this.aiJobRepo.findById(artJobId);
    if (!artJob) {
      throw new NotFoundError("Art job", artJobId);
    }
    if (artJob.userId !== userId) {
      throw new ForbiddenError("Art job does not belong to user");
    }
    if (artJob.status !== "completed") {
      throw new ValidationError("Art job must be completed before creating a product");
    }

    // 2. Generate slug
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`;

    // 3. Create product
    const productRows = await this.db
      .insert(products)
      .values({
        storeId,
        name: name.trim(),
        slug,
        description: input.description ?? null,
        descriptionHtml: input.descriptionHtml ?? null,
        type: input.type,
        availableForSale: input.availableForSale ?? true,
        featuredImageUrl: input.featuredImageUrl ?? artJob.outputRasterUrl ?? null,
        artJobId,
      })
      .returning();

    const product = productRows[0];
    if (!product) throw new Error("Failed to create product");

    // 4. Create variants + optional provider mappings
    const createdVariants = [];
    for (const v of variantInputs) {
      const variantRows = await this.db
        .insert(productVariants)
        .values({
          productId: product.id,
          title: v.title,
          price: v.price,
          sku: v.sku,
          compareAtPrice: v.compareAtPrice,
          options: v.options,
          digitalAssetKey: v.digitalAssetKey,
          fulfillmentProvider: v.fulfillmentProvider,
          estimatedProductionDays: v.estimatedProductionDays,
          availableForSale: true,
        })
        .returning();

      const variant = variantRows[0];
      if (!variant) throw new Error("Failed to create variant");

      // 5. Create provider mapping if provider info given
      if (v.providerId && v.externalVariantId) {
        await this.db.insert(providerProductMappings).values({
          variantId: variant.id,
          providerId: v.providerId,
          externalProductId: v.externalProductId,
          externalVariantId: v.externalVariantId,
          costPrice: v.costPrice,
        });
      }

      createdVariants.push(variant);
    }

    // 6. Create design placements
    let placementCount = 0;
    if (input.placements && input.placements.length > 0) {
      for (const p of input.placements) {
        await this.db.insert(designPlacements).values({
          productId: product.id,
          area: p.area,
          imageUrl: p.imageUrl,
          x: p.x ?? 0,
          y: p.y ?? 0,
          scale: p.scale ?? "1.000",
          rotation: p.rotation ?? 0,
          printAreaId: p.printAreaId,
          providerMeta: p.providerMeta,
        });
        placementCount++;
      }
    }

    // 7. Create product images from mockup URLs or art URL
    let imageCount = 0;
    const imageUrlList = input.imageUrls ?? [];
    if (imageUrlList.length === 0 && artJob.outputRasterUrl) {
      imageUrlList.push(artJob.outputRasterUrl);
    }
    for (let i = 0; i < imageUrlList.length; i++) {
      const imageUrl = imageUrlList[i];
      if (!imageUrl) continue;
      await this.db.insert(productImages).values({
        productId: product.id,
        url: imageUrl,
        altText: `${name} - image ${i + 1}`,
        position: i,
      });
      imageCount++;
    }

    return {
      product,
      variants: createdVariants,
      placementCount,
      imageCount,
    };
  }
}
