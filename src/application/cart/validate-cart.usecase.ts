import { eq, inArray } from "drizzle-orm";
import type { CartRepository } from "../../infrastructure/repositories/cart.repository";
import type { Database } from "../../infrastructure/db/client";
import { productVariants, products } from "../../infrastructure/db/schema";

interface CartProblem {
  itemId: string;
  type: "out_of_stock" | "low_stock" | "unavailable" | "price_changed" | "expired_slot";
  message: string;
}

export class ValidateCartUseCase {
  constructor(
    private repo: CartRepository,
    private db: Database,
  ) {}

  async execute(sessionId: string, userId?: string) {
    const cart = await this.repo.findOrCreateCart(sessionId, userId);
    const cartWithItems = await this.repo.findCartWithItems(cart.id);
    const items = cartWithItems?.items ?? [];

    if (items.length === 0) {
      return { valid: false, problems: [{ itemId: "", type: "out_of_stock" as const, message: "Your cart is empty" }] };
    }

    const problems: CartProblem[] = [];

    const variantIds = items.map((i: any) => i.variantId);
    const freshVariants = await this.db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.id, variantIds));

    const productIds = [...new Set(freshVariants.map((v) => v.productId))];
    const freshProducts = await this.db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    const variantMap = new Map(freshVariants.map((v) => [v.id, v]));
    const productMap = new Map(freshProducts.map((p) => [p.id, p]));

    for (const item of items) {
      const itemAny = item as any;
      const variant = variantMap.get(itemAny.variantId);
      if (!variant) {
        problems.push({
          itemId: itemAny.id,
          type: "unavailable",
          message: "This item is no longer available",
        });
        continue;
      }

      const product = productMap.get(variant.productId);

      if (variant.availableForSale === false || product?.availableForSale === false) {
        problems.push({
          itemId: itemAny.id,
          type: "unavailable",
          message: `"${product?.name ?? "Item"}" is no longer available for sale`,
        });
      }

      const inv = variant.inventoryQuantity ?? 0;
      if (product?.type === "physical") {
        if (inv <= 0) {
          problems.push({
            itemId: itemAny.id,
            type: "out_of_stock",
            message: `"${product.name}" is out of stock`,
          });
        } else if (inv < itemAny.quantity) {
          problems.push({
            itemId: itemAny.id,
            type: "low_stock",
            message: `Only ${inv} of "${product.name}" available (you have ${itemAny.quantity})`,
          });
        }
      }

      const currentPrice = Number(variant.price);
      const cartPrice = typeof itemAny.variant?.price === "number"
        ? itemAny.variant.price
        : Number(itemAny.variant?.price ?? 0);
      if (Math.abs(currentPrice - cartPrice) > 0.01) {
        problems.push({
          itemId: itemAny.id,
          type: "price_changed",
          message: `Price of "${product?.name ?? "item"}" changed from $${cartPrice.toFixed(2)} to $${currentPrice.toFixed(2)}`,
        });
      }
    }

    return { valid: problems.length === 0, problems };
  }
}
