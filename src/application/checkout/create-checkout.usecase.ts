import { eq, and, inArray } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import type { CartRepository } from "../../infrastructure/repositories/cart.repository";
import { StripeCheckoutAdapter } from "../../infrastructure/stripe/checkout.adapter";
import type Stripe from "stripe";
import {
  products,
  productVariants,
  bookingRequests,
} from "../../infrastructure/db/schema";
import { ValidationError } from "../../shared/errors";
import { BOOKING_REQUEST_TTL_MINUTES } from "../../shared/constants";

// Commerce feature integrations
import { PromotionRepository } from "../../infrastructure/repositories/promotion.repository";
import { InventoryRepository } from "../../infrastructure/repositories/inventory.repository";
import { ShippingRepository } from "../../infrastructure/repositories/shipping.repository";
import { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { EvaluateCartPromotionsUseCase } from "../promotions/evaluate-cart-promotions.usecase";
import { ReserveInventoryUseCase } from "../catalog/reserve-inventory.usecase";
import { CalculateShippingUseCase } from "../fulfillment/calculate-shipping.usecase";
import { CalculateTaxUseCase } from "../tax/calculate-tax.usecase";
import { TrackEventUseCase } from "../analytics/track-event.usecase";
import { ValidateCartUseCase } from "../cart/validate-cart.usecase";
import { buildDeliveryPromise, type DeliveryPromise } from "../../shared/delivery-promise";

interface CreateCheckoutInput {
  sessionId: string;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
  shippingAddress?: {
    country: string;
    state?: string;
    postalCode?: string;
  };
  storeId: string;
  couponCode?: string;
  carrierFallbackRouting?: boolean;
}

interface CheckoutBreakdown {
  url: string;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  deliveryPromise: DeliveryPromise | null;
}

export class CreateCheckoutUseCase {
  private adapter = new StripeCheckoutAdapter();

  constructor(
    private cartRepo: CartRepository,
    private db: Database,
    private stripe: Stripe,
  ) {}

  async execute(input: CreateCheckoutInput): Promise<CheckoutBreakdown> {
    const {
      sessionId,
      userId,
      userEmail,
      successUrl,
      cancelUrl,
      shippingAddress,
      storeId,
      couponCode,
      carrierFallbackRouting = false,
    } = input;

    // 1. Get the user's cart with items
    const cart = await this.cartRepo.findOrCreateCart(sessionId, userId);
    const cartWithItems = await this.cartRepo.findCartWithItems(cart.id);

    if (!cartWithItems || cartWithItems.items.length === 0) {
      throw new ValidationError("Cart is empty");
    }

    // 1b. Validate cart — reject if any blockers (out of stock, unavailable)
    const validateUseCase = new ValidateCartUseCase(this.cartRepo, this.db);
    const validation = await validateUseCase.execute(sessionId, userId);
    const blockers = validation.problems.filter(
      (p) => p.type === "out_of_stock" || p.type === "unavailable",
    );
    if (blockers.length > 0) {
      const messages = blockers.map((b) => b.message);
      throw new ValidationError(`Cart has issues: ${messages.join("; ")}`);
    }

    // 2. For bookable items, create/update booking requests with pending_payment status
    for (const item of cartWithItems.items) {
      if (item.bookingAvailabilityId) {
        await this.handleBookingRequest(cart.id, item, userId);
      }
    }

    // 3. Evaluate promotions — get discount breakdown
    const promoRepo = new PromotionRepository(this.db, storeId);
    const promoUseCase = new EvaluateCartPromotionsUseCase(promoRepo, this.db);

    // Enrich cart items with productId for promotion evaluation
    const variantIds = [...new Set(cartWithItems.items.map((i) => i.variantId))];
    const variantRows = await this.db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.id, variantIds));
    const variantProductMap = new Map(variantRows.map((v) => [v.id, v.productId]));

    const discounts = await promoUseCase.execute(
      cartWithItems.items.map((item) => ({
        variantId: item.variantId,
        productId: variantProductMap.get(item.variantId) ?? "",
        quantity: item.quantity,
        unitPrice: item.variant.price,
      })),
      userId,
    );

    const totalDiscount = discounts.reduce((sum, d) => sum + d.discountAmount, 0);

    // 4. Re-verify inventory reservations for physical items
    const inventoryRepo = new InventoryRepository(this.db, storeId);
    const reserveUseCase = new ReserveInventoryUseCase(inventoryRepo);

    const productRows = await this.db
      .select()
      .from(products)
      .where(inArray(products.id, [...new Set(variantRows.map((v) => v.productId))]));
    const productMap = new Map(productRows.map((p) => [p.id, p]));

    for (const item of cartWithItems.items) {
      const variant = variantRows.find((v) => v.id === item.variantId);
      const product = variant ? productMap.get(variant.productId) : null;
      if (product?.type === "physical") {
        // Re-verify: try to reserve (may already be reserved from add-to-cart)
        const existing = await inventoryRepo.findByCartItem(item.id);
        if (!existing) {
          await reserveUseCase.execute(item.variantId, item.id, item.quantity);
        }
      }
    }

    // 5. Calculate shipping (if address provided and physical items exist)
    let shippingCost = 0;
    let selectedShippingWindow: { minDays: number | null; maxDays: number | null } | null = null;
    if (shippingAddress) {
      const hasPhysical = cartWithItems.items.some((item) => {
        const variant = variantRows.find((v) => v.id === item.variantId);
        const product = variant ? productMap.get(variant.productId) : null;
        return product?.type === "physical";
      });

      if (hasPhysical) {
        try {
          const shippingRepo = new ShippingRepository(this.db, storeId);
          const shippingUseCase = new CalculateShippingUseCase(
            shippingRepo,
            undefined,
            { carrierFallbackRouting },
          );
          const shippingResult = await shippingUseCase.execute({
            items: cartWithItems.items.map((item) => {
              const variant = variantRows.find((v) => v.id === item.variantId);
              return {
                variantId: item.variantId,
                quantity: item.quantity,
                price: item.variant.price,
                weight: variant?.weight ? Number(variant.weight) : null,
                weightUnit: variant?.weightUnit ?? null,
              };
            }),
            address: shippingAddress,
            subtotal: cartWithItems.subtotal,
          });
          // Use the cheapest available option
          const cheapest = shippingResult.options
            .filter((o) => o.price !== null)
            .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0];
          shippingCost = cheapest?.price ?? 0;
          selectedShippingWindow = cheapest
            ? {
              minDays: cheapest.estimatedDaysMin,
              maxDays: cheapest.estimatedDaysMax,
            }
            : null;
        } catch {
          // No shipping zone found — proceed without shipping cost
        }
      }
    }

    const physicalProductionDays = cartWithItems.items
      .map((item) => {
        const variant = variantRows.find((v) => v.id === item.variantId);
        const product = variant ? productMap.get(variant.productId) : null;
        if (product?.type !== "physical") return null;
        return Number(variant?.estimatedProductionDays ?? 0);
      })
      .filter((days): days is number => typeof days === "number" && Number.isFinite(days) && days > 0);

    const deliveryPromise = buildDeliveryPromise({
      productionDays: physicalProductionDays,
      shippingWindows: selectedShippingWindow ? [selectedShippingWindow] : [],
    });

    // 6. Calculate tax
    let taxAmount = 0;
    if (shippingAddress) {
      try {
        const taxUseCase = new CalculateTaxUseCase();
        const taxResult = await taxUseCase.execute({
          db: this.db,
          storeId,
          lineItems: cartWithItems.items.map((item) => {
            const variant = variantRows.find((v) => v.id === item.variantId);
            const product = variant ? productMap.get(variant.productId) : null;
            return {
              id: item.id,
              amount: item.variant.price * item.quantity,
              productType: product?.type ?? "physical",
            };
          }),
          shippingAmount: shippingCost,
          address: {
            country: shippingAddress.country,
            state: shippingAddress.state,
            zip: shippingAddress.postalCode ?? "",
          },
        });
        taxAmount = taxResult.totalTax;
      } catch {
        // No tax zones configured — proceed without tax
      }
    }

    // 7. Build line items for Stripe (with discount applied)
    const subtotalAfterDiscount = Math.max(cartWithItems.subtotal - totalDiscount, 0);
    const lineItems = cartWithItems.items.map((item) => ({
      variantTitle: item.variant.title,
      productName: item.variant.product.name,
      price: item.variant.price,
      quantity: item.quantity,
      imageUrl: item.variant.product.featuredImageUrl,
    }));

    // 8. Create Stripe Checkout Session
    const grandTotal = subtotalAfterDiscount + shippingCost + taxAmount;
    const { url } = await this.adapter.createCheckoutSession({
      stripe: this.stripe,
      lineItems,
      successUrl,
      cancelUrl,
      customerEmail: userEmail,
      metadata: {
        cartId: cart.id,
        userId,
        subtotal: cartWithItems.subtotal.toFixed(2),
        discount: totalDiscount.toFixed(2),
        shipping: shippingCost.toFixed(2),
        tax: taxAmount.toFixed(2),
        total: grandTotal.toFixed(2),
        ...(deliveryPromise
          ? {
            deliveryMinDays: String(deliveryPromise.minDays),
            deliveryMaxDays: String(deliveryPromise.maxDays),
            deliveryConfidence: deliveryPromise.confidence,
          }
          : {}),
        ...(couponCode ? { couponCode } : {}),
      },
    });

    // 9. Track checkout_started event
    try {
      const analyticsRepo = new AnalyticsRepository(this.db, storeId);
      const trackUseCase = new TrackEventUseCase(analyticsRepo);
      await trackUseCase.execute({
        eventType: "checkout_started",
        userId,
        sessionId,
        properties: {
          cartId: cart.id,
          subtotal: cartWithItems.subtotal,
          discount: totalDiscount,
          shipping: shippingCost,
          tax: taxAmount,
          total: grandTotal,
          itemCount: cartWithItems.items.length,
          deliveryPromiseMinDays: deliveryPromise?.minDays,
          deliveryPromiseMaxDays: deliveryPromise?.maxDays,
          deliveryPromiseConfidence: deliveryPromise?.confidence,
        },
      });
    } catch {
      // Analytics failure should not block checkout
    }

    return {
      url,
      subtotal: cartWithItems.subtotal,
      discount: totalDiscount,
      shipping: shippingCost,
      tax: taxAmount,
      total: grandTotal,
      deliveryPromise,
    };
  }

  /**
   * For bookable items, create or update a booking request to "pending_payment"
   * with a 15-minute expiry window.
   */
  private async handleBookingRequest(
    cartId: string,
    item: {
      id: string;
      variantId: string;
      quantity: number;
      bookingAvailabilityId: string | null;
    },
    userId: string,
  ) {
    if (!item.bookingAvailabilityId) return;

    const expiresAt = new Date(Date.now() + BOOKING_REQUEST_TTL_MINUTES * 60 * 1000);

    // Check if a booking request already exists for this cart item
    const existing = await this.db
      .select()
      .from(bookingRequests)
      .where(
        and(
          eq(bookingRequests.cartItemId, item.id),
          eq(bookingRequests.userId, userId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing request to pending_payment with fresh expiry
      const existingRequest = existing[0];
      if (existingRequest) {
        await this.db
          .update(bookingRequests)
          .set({
            status: "pending_payment",
            expiresAt,
          })
          .where(eq(bookingRequests.id, existingRequest.id));
      }
    } else {
      // Create new booking request
      await this.db.insert(bookingRequests).values({
        availabilityId: item.bookingAvailabilityId,
        userId,
        status: "pending_payment",
        quantity: item.quantity,
        expiresAt,
        cartItemId: item.id,
      });
    }
  }
}
