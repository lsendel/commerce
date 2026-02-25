import { eq, and, sql, inArray } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import type { OrderRepository } from "../../infrastructure/repositories/order.repository";
import type { CartRepository } from "../../infrastructure/repositories/cart.repository";
import {
  carts,
  cartItems,
  products,
  productVariants,
  bookingRequests,
  bookingAvailability,
  bookings,
  bookingItems,
  bookingAvailabilityPrices,
} from "../../infrastructure/db/schema";
import type Stripe from "stripe";

interface FulfillOrderInput {
  session: Stripe.Checkout.Session;
  fulfillmentQueue?: Queue;
}

export class FulfillOrderUseCase {
  constructor(
    private orderRepo: OrderRepository,
    private cartRepo: CartRepository,
    private db: Database,
  ) {}

  async execute(input: FulfillOrderInput) {
    const { session, fulfillmentQueue } = input;
    const cartId = session.metadata?.cartId;
    const userId = session.metadata?.userId;

    if (!cartId || !userId) {
      throw new Error("Missing cartId or userId in session metadata");
    }

    // 1. Check if order already exists for this session (idempotency)
    const existingOrder = await this.orderRepo.findByStripeSessionId(session.id);
    if (existingOrder) {
      return existingOrder;
    }

    // 2. Get cart with items to build the order
    const cartWithItems = await this.cartRepo.findCartWithItems(cartId);
    if (!cartWithItems || cartWithItems.items.length === 0) {
      throw new Error(`Cart ${cartId} is empty or not found`);
    }

    // 3. Fetch product types to distinguish physical vs bookable
    const variantIds = [...new Set(cartWithItems.items.map((i) => i.variantId))];
    const variantRows = await this.db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.id, variantIds));

    const productIds = [...new Set(variantRows.map((v) => v.productId))];
    const productRows = await this.db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    const variantMap = new Map(variantRows.map((v) => [v.id, v]));
    const productMap = new Map(productRows.map((p) => [p.id, p]));

    // 4. Create order with denormalized item data
    const orderItems = cartWithItems.items.map((item) => {
      const variant = variantMap.get(item.variantId);
      const product = variant ? productMap.get(variant.productId) : null;
      const unitPrice = item.variant.price;
      const totalPrice = unitPrice * item.quantity;

      return {
        variantId: item.variantId,
        productName: product?.name ?? item.variant.product.name,
        variantTitle: variant?.title ?? item.variant.title,
        quantity: item.quantity,
        unitPrice: unitPrice.toFixed(2),
        totalPrice: totalPrice.toFixed(2),
        bookingAvailabilityId: item.bookingAvailabilityId ?? null,
      };
    });

    const subtotal = cartWithItems.subtotal;
    const total = session.amount_total
      ? (session.amount_total / 100)
      : subtotal;

    const order = await this.orderRepo.create(
      {
        userId,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        status: "processing",
        subtotal: subtotal.toFixed(2),
        tax: "0",
        shippingCost: "0",
        total: total.toFixed(2),
        shippingAddress: null,
      },
      orderItems,
    );

    // 5. Handle bookable items: confirm booking requests and create bookings
    const bookableItems = cartWithItems.items.filter(
      (item) => item.bookingAvailabilityId,
    );

    for (const item of bookableItems) {
      await this.confirmBooking(item, userId, order.id, order.items);
    }

    // 6. Decrement inventory for physical products
    const physicalItems = cartWithItems.items.filter((item) => {
      const variant = variantMap.get(item.variantId);
      const product = variant ? productMap.get(variant.productId) : null;
      return product?.type === "physical";
    });

    for (const item of physicalItems) {
      await this.db
        .update(productVariants)
        .set({
          inventoryQuantity: sql`GREATEST(${productVariants.inventoryQuantity} - ${item.quantity}, 0)`,
        })
        .where(eq(productVariants.id, item.variantId));
    }

    // 7. Clear the cart
    await this.cartRepo.clearCart(cartId);

    // 8. Queue fulfillment for physical items
    if (fulfillmentQueue && physicalItems.length > 0) {
      await fulfillmentQueue.send({
        type: "order.fulfill",
        orderId: order.id,
        items: physicalItems.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      });
    }

    return order;
  }

  /**
   * Confirm a booking request and create a booking record for a bookable order item.
   */
  private async confirmBooking(
    cartItem: {
      id: string;
      variantId: string;
      quantity: number;
      bookingAvailabilityId: string | null;
      personTypeQuantities: Record<string, number> | null;
    },
    userId: string,
    orderId: string,
    createdOrderItems: Array<{
      id: string;
      orderId: string;
      variantId: string | null;
      productName: string;
      variantTitle: string | null;
      quantity: number;
      unitPrice: string;
      totalPrice: string;
      bookingAvailabilityId: string | null;
      createdAt: Date | null;
    }>,
  ) {
    if (!cartItem.bookingAvailabilityId) return;

    // Find the matching order item
    const orderItem = createdOrderItems.find(
      (oi) =>
        oi.variantId === cartItem.variantId &&
        oi.bookingAvailabilityId === cartItem.bookingAvailabilityId,
    );

    // Update booking request to confirmed
    const requests = await this.db
      .select()
      .from(bookingRequests)
      .where(
        and(
          eq(bookingRequests.cartItemId, cartItem.id),
          eq(bookingRequests.userId, userId),
        ),
      )
      .limit(1);

    if (requests.length > 0) {
      await this.db
        .update(bookingRequests)
        .set({
          status: "confirmed",
          orderId,
          expiresAt: null,
        })
        .where(eq(bookingRequests.id, requests[0].id));
    }

    // Create booking record
    const bookingRows = await this.db
      .insert(bookings)
      .values({
        orderItemId: orderItem?.id ?? null,
        userId,
        bookingAvailabilityId: cartItem.bookingAvailabilityId,
        status: "confirmed",
      })
      .returning();

    const booking = bookingRows[0];

    // Create booking items from personTypeQuantities if present
    if (cartItem.personTypeQuantities && booking) {
      // Fetch prices for this availability
      const prices = await this.db
        .select()
        .from(bookingAvailabilityPrices)
        .where(
          eq(bookingAvailabilityPrices.availabilityId, cartItem.bookingAvailabilityId),
        );

      const priceMap = new Map(
        prices.map((p) => [p.personType, Number(p.price)]),
      );

      for (const [personType, qty] of Object.entries(cartItem.personTypeQuantities)) {
        if (qty <= 0) continue;
        const unitPrice = priceMap.get(personType as "adult" | "child" | "pet") ?? 0;

        await this.db.insert(bookingItems).values({
          bookingId: booking.id,
          personType: personType as "adult" | "child" | "pet",
          quantity: qty,
          unitPrice: unitPrice.toFixed(2),
          totalPrice: (unitPrice * qty).toFixed(2),
        });
      }
    }

    // Update reserved count on availability
    await this.db
      .update(bookingAvailability)
      .set({
        reservedCount: sql`${bookingAvailability.reservedCount} + ${cartItem.quantity}`,
      })
      .where(eq(bookingAvailability.id, cartItem.bookingAvailabilityId));
  }
}
