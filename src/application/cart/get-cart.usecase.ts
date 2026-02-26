import type { CartRepository } from "../../infrastructure/repositories/cart.repository";
import type { Database } from "../../infrastructure/db/client";
import { eq, inArray } from "drizzle-orm";
import { productVariants } from "../../infrastructure/db/schema";
import { recalculate } from "../../domain/cart/cart-total.vo";

export class GetCartUseCase {
  constructor(
    private repo: CartRepository,
    private db: Database,
  ) {}

  async execute(sessionId: string, userId?: string) {
    const cart = await this.repo.findOrCreateCart(sessionId, userId);
    const cartWithItems = await this.repo.findCartWithItems(cart.id);
    const result = cartWithItems ?? { id: cart.id, items: [], subtotal: 0 };

    const warnings: string[] = [];

    // Check inventory levels for physical items
    if (result.items.length > 0) {
      const variantIds = result.items.map((i: any) => i.variantId);
      const freshVariants = await this.db
        .select({
          id: productVariants.id,
          price: productVariants.price,
          inventoryQuantity: productVariants.inventoryQuantity,
          availableForSale: productVariants.availableForSale,
        })
        .from(productVariants)
        .where(inArray(productVariants.id, variantIds));

      const variantMap = new Map(freshVariants.map((v) => [v.id, v]));

      for (const item of result.items) {
        const fresh = variantMap.get((item as any).variantId);
        if (!fresh) continue;

        const currentPrice = Number(fresh.price);
        const cartPrice = (item as any).variant?.price ?? 0;
        if (Math.abs(currentPrice - cartPrice) > 0.01) {
          warnings.push(
            `Price changed for "${(item as any).variant?.product?.name ?? "item"}": was $${cartPrice.toFixed(2)}, now $${currentPrice.toFixed(2)}`,
          );
        }

        const inv = fresh.inventoryQuantity ?? 0;
        const qty = (item as any).quantity ?? 1;
        if (inv > 0 && inv < qty) {
          warnings.push(
            `Only ${inv} left of "${(item as any).variant?.product?.name ?? "item"}"`,
          );
        }

        if (fresh.availableForSale === false) {
          warnings.push(
            `"${(item as any).variant?.product?.name ?? "item"}" is no longer available`,
          );
        }
      }
    }

    // Calculate totals
    const lineItems = result.items.map((i: any) => ({
      quantity: i.quantity,
      price: typeof i.variant?.price === "number" ? i.variant.price : Number(i.variant?.price ?? 0),
    }));

    const totals = recalculate(lineItems);

    return {
      ...result,
      totals,
      warnings,
    };
  }
}
