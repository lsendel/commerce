import type { Database } from "../../infrastructure/db/client";
import { PromotionRepository } from "../../infrastructure/repositories/promotion.repository";
import {
  evaluatePromotions,
  type CartForEvaluation,
  type DiscountBreakdown,
  type EvaluationContext,
} from "../../domain/promotions/promotion-evaluator.service";
import { orders, collectionProducts } from "../../infrastructure/db/schema";
import { eq, inArray } from "drizzle-orm";

export class EvaluateCartPromotionsUseCase {
  constructor(
    private promoRepo: PromotionRepository,
    private db: Database,
  ) {}

  async execute(
    cartItems: Array<{
      variantId: string;
      productId: string;
      quantity: number;
      unitPrice: number;
    }>,
    customerId: string | null,
  ): Promise<DiscountBreakdown[]> {
    // 1. Get all active promotions for this store
    const activePromotions = await this.promoRepo.listActive();
    if (activePromotions.length === 0) return [];

    // 2. Build cart for evaluation -- enrich with collection IDs
    const productIds = [...new Set(cartItems.map((i) => i.productId))];
    const collectionRows = productIds.length > 0
      ? await this.db
          .select()
          .from(collectionProducts)
          .where(inArray(collectionProducts.productId, productIds))
      : [];

    const productCollections = new Map<string, string[]>();
    for (const row of collectionRows) {
      const existing = productCollections.get(row.productId) ?? [];
      existing.push(row.collectionId);
      productCollections.set(row.productId, existing);
    }

    const cart: CartForEvaluation = {
      items: cartItems.map((i) => ({
        ...i,
        collectionIds: productCollections.get(i.productId) ?? [],
        lineTotal: i.unitPrice * i.quantity,
      })),
      subtotal: cartItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      itemCount: cartItems.reduce((sum, i) => sum + i.quantity, 0),
      customerId,
    };

    // 3. Build evaluation context
    let isFirstPurchase = false;
    const customerSegmentIds: string[] = [];

    if (customerId) {
      const orderCount = await this.db
        .select()
        .from(orders)
        .where(eq(orders.userId, customerId))
        .limit(1);
      isFirstPurchase = orderCount.length === 0;

      // Get customer segments
      const segments = await this.promoRepo.getCustomerSegments(customerId);
      customerSegmentIds.push(...segments);
    }

    const ctx: EvaluationContext = { isFirstPurchase, customerSegmentIds };

    // 4. Evaluate and return applicable discounts
    return evaluatePromotions(activePromotions as any, cart, ctx);
  }
}
