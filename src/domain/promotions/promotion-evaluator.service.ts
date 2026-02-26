import type { ConditionNode, ConditionPredicate, Promotion } from "./promotion.entity";

export interface CartForEvaluation {
  items: Array<{
    variantId: string;
    productId: string;
    collectionIds: string[];
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  itemCount: number;
  customerId: string | null;
}

export interface DiscountBreakdown {
  promotionId: string;
  promotionName: string;
  strategyType: string;
  discountAmount: number;
  freeShipping: boolean;
  affectedItems: string[]; // variantIds
}

export interface EvaluationContext {
  isFirstPurchase: boolean;
  customerSegmentIds: string[];
}

export function evaluateCondition(
  node: ConditionNode,
  cart: CartForEvaluation,
  ctx: EvaluationContext,
): boolean {
  if ("operator" in node) {
    const results = node.children.map((child) =>
      evaluateCondition(child, cart, ctx),
    );
    return node.operator === "and"
      ? results.every(Boolean)
      : results.some(Boolean);
  }

  return evaluatePredicate(node, cart, ctx);
}

function evaluatePredicate(
  pred: ConditionPredicate,
  cart: CartForEvaluation,
  ctx: EvaluationContext,
): boolean {
  switch (pred.type) {
    case "cart_total":
      return pred.op === "gte"
        ? cart.subtotal >= pred.value
        : cart.subtotal <= pred.value;
    case "item_count":
      return pred.op === "gte"
        ? cart.itemCount >= pred.value
        : cart.itemCount <= pred.value;
    case "product_in":
      return cart.items.some((i) => pred.productIds.includes(i.productId));
    case "collection_in":
      return cart.items.some((i) =>
        i.collectionIds.some((cid) => pred.collectionIds.includes(cid)),
      );
    case "customer_segment":
      return ctx.customerSegmentIds.includes(pred.segmentId);
    case "first_purchase":
      return ctx.isFirstPurchase;
    case "min_quantity":
      return cart.items.some(
        (i) => i.productId === pred.productId && i.quantity >= pred.quantity,
      );
  }
}

export function applyStrategy(
  promotion: Promotion,
  cart: CartForEvaluation,
): DiscountBreakdown {
  const params = promotion.strategyParams as Record<string, number>;
  const allVariantIds = cart.items.map((i) => i.variantId);

  switch (promotion.strategyType) {
    case "percentage_off": {
      const pct = params.percentage ?? 0;
      const amount = Math.round(cart.subtotal * (pct / 100) * 100) / 100;
      return {
        promotionId: promotion.id,
        promotionName: promotion.name,
        strategyType: promotion.strategyType,
        discountAmount: amount,
        freeShipping: false,
        affectedItems: allVariantIds,
      };
    }
    case "fixed_amount": {
      const amount = Math.min(params.amount ?? 0, cart.subtotal);
      return {
        promotionId: promotion.id,
        promotionName: promotion.name,
        strategyType: promotion.strategyType,
        discountAmount: amount,
        freeShipping: false,
        affectedItems: allVariantIds,
      };
    }
    case "free_shipping":
      return {
        promotionId: promotion.id,
        promotionName: promotion.name,
        strategyType: promotion.strategyType,
        discountAmount: 0,
        freeShipping: true,
        affectedItems: allVariantIds,
      };
    case "bogo": {
      // Buy one get one: cheapest item free
      const sorted = [...cart.items].sort((a, b) => a.unitPrice - b.unitPrice);
      const cheapest = sorted[0];
      return {
        promotionId: promotion.id,
        promotionName: promotion.name,
        strategyType: promotion.strategyType,
        discountAmount: cheapest ? cheapest.unitPrice : 0,
        freeShipping: false,
        affectedItems: cheapest ? [cheapest.variantId] : [],
      };
    }
    case "buy_x_get_y": {
      const buyQty = params.buy_quantity ?? 2;
      const getQty = params.get_quantity ?? 1;
      const getPct = params.get_percentage ?? 100; // 100 = free
      // Find qualifying items and discount the cheapest get_quantity
      const qualifying = cart.items.filter((i) => i.quantity >= buyQty);
      if (qualifying.length === 0) {
        return { promotionId: promotion.id, promotionName: promotion.name, strategyType: promotion.strategyType, discountAmount: 0, freeShipping: false, affectedItems: [] };
      }
      const sorted = [...qualifying].sort((a, b) => a.unitPrice - b.unitPrice);
      let discountAmount = 0;
      const affected: string[] = [];
      for (let i = 0; i < Math.min(getQty, sorted.length); i++) {
        const item = sorted[i];
        if (item) {
          discountAmount += item.unitPrice * (getPct / 100);
          affected.push(item.variantId);
        }
      }
      return { promotionId: promotion.id, promotionName: promotion.name, strategyType: promotion.strategyType, discountAmount: Math.round(discountAmount * 100) / 100, freeShipping: false, affectedItems: affected };
    }
    case "tiered": {
      // Tiered percentage: different % based on cart total thresholds
      const tiers = (promotion.strategyParams as { tiers?: Array<{ min: number; percentage: number }> }).tiers ?? [];
      const sortedTiers = [...tiers].sort((a, b) => b.min - a.min);
      const matchedTier = sortedTiers.find((t) => cart.subtotal >= t.min);
      if (!matchedTier) {
        return { promotionId: promotion.id, promotionName: promotion.name, strategyType: promotion.strategyType, discountAmount: 0, freeShipping: false, affectedItems: [] };
      }
      const amount = Math.round(cart.subtotal * (matchedTier.percentage / 100) * 100) / 100;
      return { promotionId: promotion.id, promotionName: promotion.name, strategyType: promotion.strategyType, discountAmount: amount, freeShipping: false, affectedItems: allVariantIds };
    }
    case "bundle": {
      const bundlePrice = params.bundle_price ?? 0;
      const discount = Math.max(0, cart.subtotal - bundlePrice);
      return { promotionId: promotion.id, promotionName: promotion.name, strategyType: promotion.strategyType, discountAmount: Math.round(discount * 100) / 100, freeShipping: false, affectedItems: allVariantIds };
    }
    default:
      return { promotionId: promotion.id, promotionName: promotion.name, strategyType: promotion.strategyType, discountAmount: 0, freeShipping: false, affectedItems: [] };
  }
}

export function evaluatePromotions(
  promotionsList: Promotion[],
  cart: CartForEvaluation,
  ctx: EvaluationContext,
): DiscountBreakdown[] {
  const results: DiscountBreakdown[] = [];
  let hasNonStackable = false;

  for (const promo of promotionsList) {
    // Check usage limit
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) continue;

    // Evaluate conditions
    if (!evaluateCondition(promo.conditions, cart, ctx)) continue;

    // Apply strategy
    const breakdown = applyStrategy(promo, cart);
    if (breakdown.discountAmount === 0 && !breakdown.freeShipping) continue;

    // Stacking logic
    if (!promo.stackable) {
      if (hasNonStackable) continue; // Already have a non-stackable promo
      hasNonStackable = true;
    }

    results.push(breakdown);
  }

  return results;
}
