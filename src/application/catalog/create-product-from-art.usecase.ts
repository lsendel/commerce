import { and, eq, inArray } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import type { AiJobRepository } from "../../infrastructure/repositories/ai-job.repository";
import { PrintfulRepository } from "../../infrastructure/repositories/printful.repository";
import {
  products,
  productVariants,
  productImages,
  providerProductMappings,
  designPlacements,
  printfulSyncProducts,
  printfulSyncVariants,
} from "../../infrastructure/db/schema";
import { NotFoundError, ValidationError, ForbiddenError } from "../../shared/errors";
import { generateDefaults } from "../../domain/catalog/seo-metadata.vo";

interface VariantInput {
  title: string;
  price: string;
  sku?: string;
  compareAtPrice?: string;
  options?: Record<string, string>;
  digitalAssetKey?: string;
  fulfillmentProvider?: "printful" | "gooten" | "prodigi" | "shapeways";
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
  status?: "draft" | "active" | "archived";
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

    const printfulLinkage = await this.validatePrintfulMappings(storeId, variantInputs);

    // 2. Generate slug + SEO defaults
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`;
    const seo = generateDefaults(name, input.description);

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
        status: input.status ?? "draft",
        availableForSale: input.availableForSale ?? true,
        featuredImageUrl: input.featuredImageUrl ?? artJob.outputRasterUrl ?? null,
        seoTitle: seo.title ?? null,
        seoDescription: seo.description ?? null,
        artJobId,
      })
      .returning();

    const product = productRows[0];
    if (!product) throw new Error("Failed to create product");

    // 4. Create variants + optional provider mappings
    const createdVariants = [];
    const printfulRepo =
      printfulLinkage.productId || printfulLinkage.variantIds.length > 0
        ? new PrintfulRepository(this.db, storeId)
        : null;

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

      const printfulVariantId =
        v.fulfillmentProvider === "printful"
          ? parsePositiveInt(v.externalVariantId)
          : null;
      if (printfulRepo && printfulVariantId) {
        await printfulRepo.upsertSyncVariant({
          printfulId: printfulVariantId,
          variantId: variant.id,
          printfulProductId: printfulLinkage.productId ?? undefined,
        });
      }

      createdVariants.push(variant);
    }

    if (printfulRepo && printfulLinkage.productId) {
      await printfulRepo.upsertSyncProduct({
        printfulId: printfulLinkage.productId,
        productId: product.id,
        externalId: String(printfulLinkage.productId),
      });
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

  private async validatePrintfulMappings(
    storeId: string,
    variants: VariantInput[],
  ): Promise<{
    productId: number | null;
    variantIds: number[];
  }> {
    const printfulProductIds = new Set<number>();
    const printfulVariantIds = new Set<number>();

    for (const variant of variants) {
      if (variant.fulfillmentProvider !== "printful") continue;

      const productId = parsePositiveInt(variant.externalProductId);
      const variantId = parsePositiveInt(variant.externalVariantId);

      if (productId) {
        printfulProductIds.add(productId);
      }
      if (variantId) {
        printfulVariantIds.add(variantId);
      }
    }

    if (printfulProductIds.size > 1) {
      throw new ValidationError(
        "All Printful variants for a product must use the same external product ID",
      );
    }

    const [printfulProductId] = [...printfulProductIds];
    const printfulVariantIdList = [...printfulVariantIds];

    if (printfulProductId) {
      const existingProducts = await this.db
        .select()
        .from(printfulSyncProducts)
        .where(
          and(
            eq(printfulSyncProducts.storeId, storeId),
            eq(printfulSyncProducts.printfulId, printfulProductId),
          ),
        )
        .limit(1);

      if (existingProducts[0]) {
        throw new ValidationError(
          `Printful product ${printfulProductId} is already linked in this store`,
        );
      }
    }

    if (printfulVariantIdList.length > 0) {
      const existingVariants = await this.db
        .select()
        .from(printfulSyncVariants)
        .where(inArray(printfulSyncVariants.printfulId, printfulVariantIdList));

      if (existingVariants.length > 0) {
        const linkedIds = existingVariants.map((variant) => variant.printfulId).join(", ");
        throw new ValidationError(
          `Printful variants already linked elsewhere: ${linkedIds}`,
        );
      }
    }

    return {
      productId: printfulProductId ?? null,
      variantIds: printfulVariantIdList,
    };
  }
}

function parsePositiveInt(value?: string | null) {
  if (!value) return null;
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
