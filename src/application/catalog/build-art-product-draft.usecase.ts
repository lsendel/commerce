import type { AiJobRepository } from "../../infrastructure/repositories/ai-job.repository";
import { AiMerchandisingCopilotUseCase } from "./ai-merchandising-copilot.usecase";
import { ForbiddenError, NotFoundError, ValidationError } from "../../shared/errors";

type ProductType = "physical" | "digital";
type FulfillmentProviderType = "printful" | "gooten" | "prodigi" | "shapeways";

interface BuildArtProductDraftInput {
  userId: string;
  artJobId: string;
  productType?: ProductType;
  providerType?: FulfillmentProviderType;
}

export interface ArtProductDraft {
  name: string;
  description: string;
  descriptionHtml: string;
  type: ProductType;
  status: "draft";
  availableForSale: false;
  featuredImageUrl: string | null;
  variants: Array<{
    title: string;
    price: string;
    fulfillmentProvider?: FulfillmentProviderType;
    estimatedProductionDays?: number;
    digitalAssetKey?: string;
  }>;
  placements: Array<{
    area: string;
    imageUrl: string;
  }>;
  imageUrls: string[];
  warnings: string[];
}

export class BuildArtProductDraftUseCase {
  constructor(
    private readonly aiJobRepo: AiJobRepository,
    private readonly merchCopilot: AiMerchandisingCopilotUseCase,
  ) {}

  async execute(input: BuildArtProductDraftInput): Promise<ArtProductDraft> {
    const productType = input.productType ?? "physical";
    const artJob = await this.aiJobRepo.findById(input.artJobId);
    if (!artJob) {
      throw new NotFoundError("Art job", input.artJobId);
    }
    if (artJob.userId !== input.userId) {
      throw new ForbiddenError("Art job does not belong to user");
    }
    if (artJob.status !== "completed") {
      throw new ValidationError("Art job must be completed before creating a product draft");
    }

    const artPrompt = String(artJob.prompt ?? "").trim();
    const brief = [
      `Turn this generated pet artwork into a sellable ${productType} product.`,
      artPrompt ? `Artwork prompt: ${artPrompt}` : "",
      "Focus on clear value proposition, personalization, and gifting angle.",
    ]
      .filter(Boolean)
      .join(" ");

    const copy = await this.merchCopilot.execute({
      mode: "draft",
      productType,
      brief,
      audience: "pet owners and gift shoppers",
      tone: "warm",
      keyFeatures:
        productType === "physical"
          ? ["Premium print quality", "Pet-personalized artwork", "Gift-ready presentation"]
          : ["Instant digital delivery", "High-resolution artwork", "Reusable keepsake file"],
    });

    const imageUrl = artJob.outputRasterUrl ?? artJob.outputSvgUrl ?? null;
    const variants = this.buildDefaultVariants({
      productType,
      providerType: input.providerType,
      artJobId: artJob.id,
    });

    return {
      name: copy.name,
      description: copy.description,
      descriptionHtml: `<p>${copy.description.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n+/g, "</p><p>")}</p>`,
      type: productType,
      status: "draft",
      availableForSale: false,
      featuredImageUrl: imageUrl,
      variants,
      placements: imageUrl ? [{ area: "front", imageUrl }] : [],
      imageUrls: imageUrl ? [imageUrl] : [],
      warnings: copy.warnings,
    };
  }

  private buildDefaultVariants(input: {
    productType: ProductType;
    providerType?: FulfillmentProviderType;
    artJobId: string;
  }): ArtProductDraft["variants"] {
    if (input.productType === "digital") {
      return [
        {
          title: "Digital Download",
          price: "14.00",
          digitalAssetKey: `ai-studio/${input.artJobId}`,
        },
      ];
    }

    const provider = input.providerType;
    const baseVariants: ArtProductDraft["variants"] = [
      {
        title: "Standard Print",
        price: "29.00",
      },
      {
        title: "Premium Canvas",
        price: "49.00",
      },
    ];

    if (!provider) {
      return baseVariants;
    }

    return baseVariants.map((variant) => ({
      ...variant,
      fulfillmentProvider: provider,
      estimatedProductionDays: 3,
    }));
  }
}
