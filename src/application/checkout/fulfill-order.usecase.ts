import { eq, and, sql, inArray } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import type { OrderRepository } from "../../infrastructure/repositories/order.repository";
import type { CartRepository } from "../../infrastructure/repositories/cart.repository";
import { FulfillmentRequestRepository } from "../../infrastructure/repositories/fulfillment-request.repository";
import { FulfillmentRouter } from "../../infrastructure/fulfillment/fulfillment-router";
import {
  products,
  productVariants,
  bookingRequests,
  bookingAvailability,
  bookings,
  bookingItems,
  bookingAvailabilityPrices,
} from "../../infrastructure/db/schema";
import type Stripe from "stripe";

// Commerce feature integrations
import { InventoryRepository } from "../../infrastructure/repositories/inventory.repository";
import { PromotionRepository } from "../../infrastructure/repositories/promotion.repository";
import { DownloadRepository } from "../../infrastructure/repositories/download.repository";
import { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { CommitInventoryUseCase } from "../catalog/commit-inventory.usecase";
import { RedeemPromotionUseCase } from "../promotions/redeem-promotion.usecase";
import { GenerateDownloadTokenUseCase } from "../catalog/generate-download-token.usecase";
import { TrackEventUseCase } from "../analytics/track-event.usecase";

interface FulfillOrderInput {
  session: Stripe.Checkout.Session;
  fulfillmentQueue?: Queue;
}

export class FulfillOrderUseCase {
  constructor(
    private orderRepo: OrderRepository,
    private cartRepo: CartRepository,
    private db: Database,
    private storeId: string,
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

    const metadata = session.metadata ?? {};
    const subtotal = metadata.subtotal ? Number(metadata.subtotal) : cartWithItems.subtotal;
    const tax = metadata.tax ? Number(metadata.tax) : 0;
    const shippingCost = metadata.shipping ? Number(metadata.shipping) : 0;
    const discount = metadata.discount ? Number(metadata.discount) : 0;
    const total = metadata.total
      ? Number(metadata.total)
      : session.amount_total
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
        tax: tax.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        discount: discount.toFixed(2),
        total: total.toFixed(2),
        shippingAddress: null,
        couponCode: metadata.couponCode ?? null,
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

    // 6. Commit inventory reservations (finalize stock) for physical products
    const physicalItems = cartWithItems.items.filter((item) => {
      const variant = variantMap.get(item.variantId);
      const product = variant ? productMap.get(variant.productId) : null;
      return product?.type === "physical";
    });

    const inventoryRepo = new InventoryRepository(this.db, this.storeId);
    const commitUseCase = new CommitInventoryUseCase(inventoryRepo);

    for (const item of physicalItems) {
      // Try to commit reservation first; fall back to direct decrement
      const committed = await commitUseCase.execute(item.id);
      if (!committed) {
        await this.db
          .update(productVariants)
          .set({
            inventoryQuantity: sql`GREATEST(${productVariants.inventoryQuantity} - ${item.quantity}, 0)`,
          })
          .where(eq(productVariants.id, item.variantId));
      }
    }

    // 7. Redeem promotions (if coupon was applied via session metadata)
    const discountStr = metadata.discount;
    const couponCode = metadata.couponCode;
    if (discountStr && Number(discountStr) > 0) {
      try {
        const promoRepo = new PromotionRepository(this.db, this.storeId);
        const redeemUseCase = new RedeemPromotionUseCase(promoRepo);
        // If there's a coupon code, look up and redeem the associated promotion
        if (couponCode) {
          const result = await promoRepo.findCouponByCode(couponCode);
          if (result) {
            await redeemUseCase.execute({
              promotionId: result.coupon.promotionId,
              couponCodeId: result.coupon.id,
              orderId: order.id,
              customerId: userId,
              discountAmount: Number(discountStr),
            });
          }
        }
      } catch {
        // Promotion redemption failure should not block fulfillment
      }
    }

    // 8. Generate download tokens for digital products
    const digitalItems = cartWithItems.items.filter((item) => {
      const variant = variantMap.get(item.variantId);
      const product = variant ? productMap.get(variant.productId) : null;
      return product?.type === "digital";
    });

    if (digitalItems.length > 0) {
      try {
        const downloadRepo = new DownloadRepository(this.db, this.storeId);
        const tokenUseCase = new GenerateDownloadTokenUseCase(downloadRepo);
        for (const item of digitalItems) {
          const orderItem = order.items.find(
            (oi) => oi.variantId === item.variantId,
          );
          await tokenUseCase.execute({
            userId,
            orderId: order.id,
            orderItemId: orderItem?.id,
          });
        }
      } catch {
        // Download token failure should not block fulfillment
      }
    }

    // 9. Clear the cart
    await this.cartRepo.clearCart(cartId);

    // 8. Route physical items to fulfillment providers and create requests
    if (fulfillmentQueue && physicalItems.length > 0) {
      const router = new FulfillmentRouter(this.db, this.storeId);
      const requestRepo = new FulfillmentRequestRepository(this.db, this.storeId);

      const physicalVariantIds = physicalItems.map((i) => i.variantId);
      const routingMap = await router.selectProvidersForVariants(physicalVariantIds);

      // Group items by provider
      const byProvider = new Map<string, Array<{ orderItemId: string; variantId: string; quantity: number }>>();
      for (const item of physicalItems) {
        const routing = routingMap.get(item.variantId);
        const providerKey = routing?.providerType ?? "manual";
        const group = byProvider.get(providerKey) ?? [];
        const orderItem = order.items.find(
          (oi) => oi.variantId === item.variantId && !oi.bookingAvailabilityId,
        );
        if (orderItem) {
          group.push({
            orderItemId: orderItem.id,
            variantId: item.variantId,
            quantity: item.quantity,
          });
        }
        byProvider.set(providerKey, group);
      }

      // Create one fulfillment request per provider group
      for (const [providerType, items] of byProvider) {
        const firstItem = items[0];
      const firstRouting = firstItem
          ? routingMap.get(firstItem.variantId)
          : undefined;

        const request = await requestRepo.create({
          orderId: order.id,
          provider: providerType,
          providerId: firstRouting?.providerId,
          itemsSnapshot: items,
          items: items.map((i) => ({
            orderItemId: i.orderItemId,
            quantity: i.quantity,
          })),
        });

        await fulfillmentQueue.send({
          type: "fulfillment.submit",
          fulfillmentRequestId: request.id,
          provider: providerType,
          storeId: this.storeId,
        });
      }
    }

    // 11. Track purchase event
    try {
      const analyticsRepo = new AnalyticsRepository(this.db, this.storeId);
      const trackUseCase = new TrackEventUseCase(analyticsRepo);
      await trackUseCase.execute({
        eventType: "purchase",
        userId,
        properties: {
          orderId: order.id,
          total,
          subtotal,
          itemCount: cartWithItems.items.length,
        },
      });
    } catch {
      // Analytics failure should not block fulfillment
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
      const existingRequest = requests[0];
      if (existingRequest) {
        await this.db
          .update(bookingRequests)
          .set({
            status: "confirmed",
            orderId,
            expiresAt: null,
          })
          .where(eq(bookingRequests.id, existingRequest.id));
      }
    }

    // Create booking record
    const availabilityRows = await this.db
      .select({ storeId: bookingAvailability.storeId })
      .from(bookingAvailability)
      .where(eq(bookingAvailability.id, cartItem.bookingAvailabilityId))
      .limit(1);

    const availabilityRow = availabilityRows[0];
    if (!availabilityRow) {
      throw new Error(
        `Booking availability ${cartItem.bookingAvailabilityId} not found`,
      );
    }

    const bookingRows = await this.db
      .insert(bookings)
      .values({
        storeId: availabilityRow.storeId,
        orderItemId: orderItem?.id ?? null,
        userId,
        bookingAvailabilityId: cartItem.bookingAvailabilityId,
        status: "confirmed",
      })
      .returning();

    const booking = bookingRows[0];
    if (!booking) {
      throw new Error("Failed to create booking record");
    }

    // Create booking items from personTypeQuantities if present
    if (cartItem.personTypeQuantities) {
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
