import { eq } from "drizzle-orm";
import type { CartRepository } from "../../infrastructure/repositories/cart.repository";
import type { Database } from "../../infrastructure/db/client";
import type { InventoryRepository } from "../../infrastructure/repositories/inventory.repository";
import {
  productVariants,
  products,
  bookingAvailability,
} from "../../infrastructure/db/schema";
import { NotFoundError, ValidationError } from "../../shared/errors";

export class AddToCartUseCase {
  constructor(
    private repo: CartRepository,
    private db: Database,
    private inventoryRepo: InventoryRepository,
  ) {}

  async execute(
    sessionId: string,
    data: {
      variantId: string;
      quantity: number;
      bookingAvailabilityId?: string;
      personTypeQuantities?: Record<string, number>;
    },
    userId?: string,
  ) {
    // 1. Validate variant exists and is available
    const variantRows = await this.db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, data.variantId))
      .limit(1);

    const variant = variantRows[0];
    if (!variant) {
      throw new NotFoundError("Variant", data.variantId);
    }

    if (variant.availableForSale === false) {
      throw new ValidationError("This variant is not available for sale");
    }

    // 2. Fetch the product to check type
    const productRows = await this.db
      .select()
      .from(products)
      .where(eq(products.id, variant.productId))
      .limit(1);

    const product = productRows[0];
    if (!product) {
      throw new NotFoundError("Product", variant.productId);
    }

    if (product.availableForSale === false) {
      throw new ValidationError("This product is not available for sale");
    }

    // 3. For bookable products, require bookingAvailabilityId
    if (product.type === "bookable") {
      if (!data.bookingAvailabilityId) {
        throw new ValidationError(
          "bookingAvailabilityId is required for bookable products",
        );
      }

      // Validate the availability slot exists and is available
      const availRows = await this.db
        .select()
        .from(bookingAvailability)
        .where(eq(bookingAvailability.id, data.bookingAvailabilityId))
        .limit(1);

      const avail = availRows[0];
      if (!avail) {
        throw new NotFoundError(
          "Booking availability",
          data.bookingAvailabilityId,
        );
      }

      if (avail.status !== "available") {
        throw new ValidationError(
          "This booking slot is no longer available",
        );
      }
    }

    // 4. Find or create the cart, then add the item
    const cart = await this.repo.findOrCreateCart(sessionId, userId);

    const addedItem = await this.repo.addItem(cart.id, {
      variantId: data.variantId,
      quantity: data.quantity,
      bookingAvailabilityId: data.bookingAvailabilityId,
      personTypeQuantities: data.personTypeQuantities,
    });

    // 5. Reserve inventory for physical products
    if (product.type === "physical" && addedItem) {
      // Check available stock and give a user-friendly message
      const stock = variant.inventoryQuantity ?? 0;
      if (stock <= 0) {
        await this.repo.removeItem(addedItem.id, cart.id);
        throw new ValidationError("This item is currently out of stock");
      }
      if (data.quantity > stock) {
        await this.repo.removeItem(addedItem.id, cart.id);
        throw new ValidationError(
          stock === 1
            ? "Only 1 left in stock — please reduce your quantity"
            : `Only ${stock} left in stock — please reduce your quantity`,
        );
      }

      const reservation = await this.inventoryRepo.reserve(
        data.variantId,
        addedItem.id,
        data.quantity,
      );
      if (!reservation) {
        await this.repo.removeItem(addedItem.id, cart.id);
        throw new ValidationError(
          `Not enough stock available. Only ${stock} left.`,
        );
      }
    }

    // 6. Return the full cart
    const cartWithItems = await this.repo.findCartWithItems(cart.id);
    return cartWithItems ?? { id: cart.id, items: [], subtotal: 0 };
  }
}
