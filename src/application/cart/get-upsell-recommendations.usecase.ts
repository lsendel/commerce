import { inArray } from "drizzle-orm";
import type { CartRepository } from "../../infrastructure/repositories/cart.repository";
import type { ProductRepository } from "../../infrastructure/repositories/product.repository";
import type { Database } from "../../infrastructure/db/client";
import { productVariants } from "../../infrastructure/db/schema";

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
  score: number;
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

        const priceFitScore =
          cartAveragePrice > 0 && candidatePrice <= cartAveragePrice * 1.2 ? 1 : 0;
        const increment = 2 + priceFitScore;

        const existing = candidates.get(product.id);
        if (existing) {
          existing.score += increment;
          existing.reasons.add("co_purchase_signal");
          if (priceFitScore > 0) {
            existing.reasons.add("price_fit");
          }
          if (candidatePrice < existing.price) {
            existing.price = candidatePrice;
            existing.variantId = primaryVariant.id;
          }
          continue;
        }

        const reasons = new Set<string>(["co_purchase_signal"]);
        if (priceFitScore > 0) {
          reasons.add("price_fit");
        }

        candidates.set(product.id, {
          productId: product.id,
          name: product.name,
          slug: product.slug,
          imageUrl: product.featuredImageUrl ?? null,
          variantId: primaryVariant.id,
          price: candidatePrice,
          score: increment,
          reasons,
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
          price: Number(primaryVariant.price ?? product.priceRange?.min ?? 0),
          score: 1,
          reasons: new Set(["catalog_fallback"]),
        });
      }
    }

    return [...candidates.values()]
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.price - b.price;
      })
      .slice(0, limit)
      .map((candidate) => ({
        productId: candidate.productId,
        name: candidate.name,
        slug: candidate.slug,
        imageUrl: candidate.imageUrl,
        variantId: candidate.variantId,
        price: candidate.price,
        score: candidate.score,
        reasons: [...candidate.reasons],
      }));
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
}
