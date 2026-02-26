export type PromotionType = "coupon" | "automatic" | "flash_sale";
export type PromotionStatus = "active" | "scheduled" | "expired" | "disabled";
export type PromotionStrategy =
  | "percentage_off"
  | "fixed_amount"
  | "free_shipping"
  | "bogo"
  | "buy_x_get_y"
  | "tiered"
  | "bundle";

export interface Promotion {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  type: PromotionType;
  status: PromotionStatus;
  priority: number;
  stackable: boolean;
  strategyType: PromotionStrategy;
  strategyParams: Record<string, unknown>;
  conditions: ConditionNode;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ConditionOperator = "and" | "or";
export type ConditionPredicate =
  | { type: "cart_total"; op: "gte" | "lte"; value: number }
  | { type: "item_count"; op: "gte" | "lte"; value: number }
  | { type: "product_in"; productIds: string[] }
  | { type: "collection_in"; collectionIds: string[] }
  | { type: "customer_segment"; segmentId: string }
  | { type: "first_purchase" }
  | { type: "min_quantity"; productId: string; quantity: number };

export type ConditionNode =
  | { operator: ConditionOperator; children: ConditionNode[] }
  | ConditionPredicate;

export function createPromotion(
  params: Omit<Promotion, "id" | "createdAt" | "updatedAt" | "usageCount">,
): Promotion {
  const now = new Date();
  return {
    ...params,
    id: crypto.randomUUID(),
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}
