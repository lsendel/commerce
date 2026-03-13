import { inArray } from "drizzle-orm";
import type { CartRepository } from "../../infrastructure/repositories/cart.repository";
import type { ProductRepository } from "../../infrastructure/repositories/product.repository";
import type { Database } from "../../infrastructure/db/client";
import { productVariants, products } from "../../infrastructure/db/schema";
import {
  rankUpsellCandidates,
  type RecommendationCandidate,
} from "../../infrastructure/marketing/recommendation-ranking";

export interface UpsellRecommendation {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  variantId: string;
  price: number;
  score: number;
  reasons: string[];
}

interface UpsellCandidate {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  variantId: string;
  price: number;
  source: "related" | "catalog";
  compareAtPrice: number | null;
  inventoryQuantity: number | null;
  createdAt: Date | null;
  sharedCollectionCount: number;
  baseScore: number;
  reasons: Set<string>;
}

export class GetUpsellRecommendationsUseCase {
  constructor(
    private cartRepo: CartRepository,
    private productRepo: ProductRepository,
    private db: Database,
  ) {}

  async execute(input: {
    sessionId: string;
    userId?: string;
    limit?: number;
  }): Promise<UpsellRecommendation[]> {
    const limit = Math.min(Math.max(input.limit ?? 4, 1), 12);
    const cart = await this.cartRepo.findOrCreateCart(input.sessionId, input.userId);
    const cartWithItems = await this.cartRepo.findCartWithItems(cart.id);
    const cartItems = cartWithItems?.items ?? [];

    if (cartItems.length === 0) {
      return [];
    }

    const variantIds = [...new Set(cartItems.map((item) => item.variantId))];
    if (variantIds.length === 0) {
      return [];
    }

    const variantRows = await this.db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        price: productVariants.price,
      })
      .from(productVariants)
      .where(inArray(productVariants.id, variantIds));

    const cartProductIds = new Set(
      variantRows.map((row) => row.productId),
    );

    if (cartProductIds.size === 0) {
      return [];
    }

    const cartAveragePrice = this.calculateCartAveragePrice(cartItems);
    const candidates = new Map<string, UpsellCandidate>();
    const cartProductTypeRows = await this.db
      .select({
        id: products.id,
        type: products.type,
      })
      .from(products)
      .where(inArray(products.id, [...cartProductIds]));
    const preferredType = this.resolvePreferredType(cartProductTypeRows.map((row) => row.type));

    for (const cartProductId of cartProductIds) {
      const relatedProducts = await this.productRepo.findRelatedProducts(
        cartProductId,
        Math.max(limit * 3, 8),
      );

      for (const product of relatedProducts) {
        if (cartProductIds.has(product.id)) continue;

        const primaryVariant = product.variants?.[0];
        if (!primaryVariant?.id) continue;

        const candidatePrice = Number(primaryVariant.price ?? 0);
        if (!Number.isFinite(candidatePrice) || candidatePrice < 0) continue;
        const inventoryQuantity =
          typeof primaryVariant.inventoryQuantity === "number"
            ? primaryVariant.inventoryQuantity
            : null;

        const existing = candidates.get(product.id);
        if (existing) {
          existing.baseScore += 1.25;
          existing.sharedCollectionCount += 1;
          existing.reasons.add("co_purchase_signal");
          if (candidatePrice < existing.price) {
            existing.price = candidatePrice;
            existing.variantId = primaryVariant.id;
            existing.compareAtPrice =
              typeof primaryVariant.compareAtPrice === "number"
                ? primaryVariant.compareAtPrice
                : existing.compareAtPrice;
            existing.inventoryQuantity = inventoryQuantity;
          }
          continue;
        }

        const reasons = new Set<string>(["co_purchase_signal"]);

        candidates.set(product.id, {
          productId: product.id,
          name: product.name,
          slug: product.slug,
          imageUrl: product.featuredImageUrl ?? null,
          variantId: primaryVariant.id,
          source: "related",
          price: candidatePrice,
          compareAtPrice:
            typeof primaryVariant.compareAtPrice === "number"
              ? primaryVariant.compareAtPrice
              : null,
          inventoryQuantity,
          createdAt: product.createdAt ?? null,
          sharedCollectionCount: 1,
          baseScore: 1.5,
          reasons,
        });
      }
    }

    if (candidates.size === 0) {
      const typeFallback = preferredType
        ? await this.productRepo.findAll({
            page: 1,
            limit: Math.max(limit * 2, 8),
            status: "active",
            available: true,
            type: preferredType,
            sort: "newest",
          })
        : { products: [] as Array<any> };

      for (const product of typeFallback.products) {
        if (cartProductIds.has(product.id)) continue;
        const primaryVariant = product.variants?.[0];
        if (!primaryVariant?.id) continue;

        candidates.set(product.id, {
          productId: product.id,
          name: product.name,
          slug: product.slug,
          imageUrl: product.featuredImageUrl ?? product.images?.[0]?.url ?? null,
          variantId: primaryVariant.id,
          source: "catalog",
          price: Number(primaryVariant.price ?? product.priceRange?.min ?? 0),
          compareAtPrice:
            typeof primaryVariant.compareAtPrice === "number"
              ? primaryVariant.compareAtPrice
              : null,
          inventoryQuantity:
            typeof primaryVariant.inventoryQuantity === "number"
              ? primaryVariant.inventoryQuantity
              : null,
          createdAt: null,
          sharedCollectionCount: 0,
          baseScore: 0.8,
          reasons: new Set(["same_type_fallback"]),
        });
      }
    }

    if (candidates.size === 0) {
      const catalog = await this.productRepo.findAll({
        page: 1,
        limit: Math.max(limit * 3, 12),
        status: "active",
        available: true,
        sort: "newest",
      });

      for (const product of catalog.products) {
        if (cartProductIds.has(product.id)) continue;
        const primaryVariant = product.variants?.[0];
        if (!primaryVariant?.id) continue;

        candidates.set(product.id, {
          productId: product.id,
          name: product.name,
          slug: product.slug,
          imageUrl: product.featuredImageUrl ?? product.images?.[0]?.url ?? null,
          variantId: primaryVariant.id,
          source: "catalog",
          price: Number(primaryVariant.price ?? product.priceRange?.min ?? 0),
          compareAtPrice:
            typeof primaryVariant.compareAtPrice === "number"
              ? primaryVariant.compareAtPrice
              : null,
          inventoryQuantity:
            typeof primaryVariant.inventoryQuantity === "number"
              ? primaryVariant.inventoryQuantity
              : null,
          createdAt: null,
          sharedCollectionCount: 0,
          baseScore: 0.6,
          reasons: new Set(["catalog_fallback"]),
        });
      }
    }

    const rankingInput: RecommendationCandidate[] = [...candidates.values()].map((candidate) => ({
      productId: candidate.productId,
      source: candidate.source,
      price: candidate.price,
      compareAtPrice: candidate.compareAtPrice,
      inventoryQuantity: candidate.inventoryQuantity,
      createdAt: candidate.createdAt,
      sharedCollectionCount: candidate.sharedCollectionCount,
      baseScore: candidate.baseScore,
      reasons: candidate.reasons,
    }));
    const ranked = rankUpsellCandidates(rankingInput, {
      cartAveragePrice,
      limit,
    });

    return ranked.map((rankedCandidate) => {
      const candidate = candidates.get(rankedCandidate.productId);
      if (!candidate) {
        throw new Error("Ranked recommendation missing candidate payload");
      }
      return {
        productId: candidate.productId,
        name: candidate.name,
        slug: candidate.slug,
        imageUrl: candidate.imageUrl,
        variantId: candidate.variantId,
        price: candidate.price,
        score: rankedCandidate.score,
        reasons: rankedCandidate.reasons,
      };
    });
  }

  private calculateCartAveragePrice(
    cartItems: Array<{ quantity: number; variant?: { price?: number } }>,
  ): number {
    if (cartItems.length === 0) return 0;

    let totalQuantity = 0;
    let weightedTotal = 0;

    for (const item of cartItems) {
      const quantity = Math.max(1, item.quantity);
      totalQuantity += quantity;
      const linePrice = Number(item.variant?.price ?? 0);
      if (Number.isFinite(linePrice) && linePrice >= 0) {
        weightedTotal += linePrice * quantity;
      }
    }

    if (totalQuantity === 0) return 0;
    return weightedTotal / totalQuantity;
  }

  private resolvePreferredType(types: Array<string | null | undefined>): string | undefined {
    const scoreByType = new Map<string, number>();
    for (const rawType of types) {
      if (!rawType) continue;
      scoreByType.set(rawType, (scoreByType.get(rawType) ?? 0) + 1);
    }
    const sorted = [...scoreByType.entries()].sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0];
  }
}
