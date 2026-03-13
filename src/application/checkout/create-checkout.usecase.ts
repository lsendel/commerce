import { eq, and, inArray } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import type { CartRepository } from "../../infrastructure/repositories/cart.repository";
import { StripeCheckoutAdapter } from "../../infrastructure/stripe/checkout.adapter";
import type Stripe from "stripe";
import {
  products,
  productVariants,
  bookingRequests,
  carts,
} from "../../infrastructure/db/schema";
import { ValidationError } from "../../shared/errors";
import { BOOKING_REQUEST_TTL_MINUTES } from "../../shared/constants";

// Commerce feature integrations
import { PromotionRepository } from "../../infrastructure/repositories/promotion.repository";
import { InventoryRepository } from "../../infrastructure/repositories/inventory.repository";
import { ShippingRepository } from "../../infrastructure/repositories/shipping.repository";
import { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { UserRepository } from "../../infrastructure/repositories/user.repository";
import { EvaluateCartPromotionsUseCase } from "../promotions/evaluate-cart-promotions.usecase";
import { ApplyCouponUseCase } from "../promotions/apply-coupon.usecase";
import { ReserveInventoryUseCase } from "../catalog/reserve-inventory.usecase";
import { CalculateShippingUseCase } from "../fulfillment/calculate-shipping.usecase";
import { CalculateTaxUseCase } from "../tax/calculate-tax.usecase";
import { TrackEventUseCase } from "../analytics/track-event.usecase";
import { ValidateCartUseCase } from "../cart/validate-cart.usecase";
import { buildDeliveryPromise, type DeliveryPromise } from "../../shared/delivery-promise";
import { composeIdempotencyKey } from "../../shared/idempotency";

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
  idempotencyKey?: string;
}

interface CheckoutBreakdown {
  url: string;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  deliveryPromise: DeliveryPromise | null;
  appliedCouponCode: string | null;
  warnings: string[];
}

interface CheckoutPricingLineInput {
  variantTitle: string;
  productName: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
}

function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount * 100));
}

function toDollars(amountCents: number): number {
  return Math.max(0, amountCents) / 100;
}

const DEFAULT_CHECKOUT_SHIPPING_COUNTRIES = [
  "US",
  "CA",
  "GB",
  "AU",
  "DE",
  "FR",
  "ES",
  "IT",
  "NL",
  "JP",
  "BR",
  "MX",
  "IN",
  "NZ",
  "IE",
  "SE",
  "NO",
  "DK",
  "FI",
  "CH",
  "AT",
  "BE",
  "PT",
  "SG",
  "KR",
];

function buildCheckoutPricingLines(params: {
  cartLines: CheckoutPricingLineInput[];
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
}) {
  const pricedLines = params.cartLines.map((line, index) => {
    const lineTotalCents = Math.max(0, toCents(line.price) * Math.max(1, line.quantity));
    return {
      index,
      line,
      lineTotalCents,
      discountCents: 0,
    };
  });

  const subtotalCents = pricedLines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const minimumSubtotalCents = pricedLines.filter((line) => line.lineTotalCents > 0).length;
  const maxDiscountCents = Math.max(0, subtotalCents - minimumSubtotalCents);
  const requestedDiscountCents = Math.min(maxDiscountCents, toCents(params.discountAmount));

  if (requestedDiscountCents > 0 && subtotalCents > 0) {
    let allocated = 0;
    for (const line of pricedLines) {
      const proportional = Math.floor((requestedDiscountCents * line.lineTotalCents) / subtotalCents);
      const capped = Math.min(proportional, Math.max(0, line.lineTotalCents - 1));
      line.discountCents = capped;
      allocated += capped;
    }

    let remainder = requestedDiscountCents - allocated;
    const sortedByLineTotal = [...pricedLines].sort((left, right) => {
      if (right.lineTotalCents !== left.lineTotalCents) {
        return right.lineTotalCents - left.lineTotalCents;
      }
      return left.index - right.index;
    });

    while (remainder > 0) {
      let progressed = false;
      for (const line of sortedByLineTotal) {
        if (remainder <= 0) break;
        if (line.discountCents < Math.max(0, line.lineTotalCents - 1)) {
          line.discountCents += 1;
          remainder -= 1;
          progressed = true;
        }
      }
      if (!progressed) break;
    }
  }

  const productLines = pricedLines
    .map(({ line, lineTotalCents, discountCents }) => {
    const adjustedLineTotalCents = lineTotalCents - discountCents;
    const displayNameBase = line.variantTitle && line.variantTitle !== line.productName
      ? `${line.productName} — ${line.variantTitle}`
      : line.productName;
    const displayName = line.quantity > 1
      ? `${displayNameBase} x${line.quantity}`
      : displayNameBase;
    return {
      variantTitle: line.variantTitle,
      productName: line.productName,
      displayName,
      price: toDollars(adjustedLineTotalCents),
      quantity: 1,
      imageUrl: line.imageUrl ?? null,
    };
    })
    .filter((line) => line.price > 0);

  const appliedDiscountCents = pricedLines.reduce((sum, line) => sum + line.discountCents, 0);
  const shippingCents = toCents(params.shippingAmount);
  const taxCents = toCents(params.taxAmount);

  const extraLines = [];
  if (shippingCents > 0) {
    extraLines.push({
      variantTitle: "Shipping",
      productName: "Shipping",
      displayName: "Shipping",
      price: toDollars(shippingCents),
      quantity: 1,
      imageUrl: null,
    });
  }
  if (taxCents > 0) {
    extraLines.push({
      variantTitle: "Tax",
      productName: "Tax",
      displayName: "Tax",
      price: toDollars(taxCents),
      quantity: 1,
      imageUrl: null,
    });
  }

  return {
    lineItems: [...productLines, ...extraLines],
    appliedDiscount: toDollars(appliedDiscountCents),
  };
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
      idempotencyKey,
    } = input;
    const warnings: string[] = [];

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

    // 3. Evaluate promotions — automatic rules plus an explicitly applied coupon
    const promoRepo = new PromotionRepository(this.db, storeId);
    const promoUseCase = new EvaluateCartPromotionsUseCase(promoRepo, this.db);
    const applyCouponUseCase = new ApplyCouponUseCase(promoRepo, this.db);

    const normalizedCouponCode = couponCode
      ? couponCode.trim().toUpperCase()
      : undefined;
    let selectedCouponCode = normalizedCouponCode || null;

    if (!selectedCouponCode && cart.couponCodeId) {
      const persistedCoupon = await promoRepo.findCouponById(cart.couponCodeId);
      if (persistedCoupon) {
        selectedCouponCode = persistedCoupon.coupon.code;
      } else {
        await this.db
          .update(carts)
          .set({ couponCodeId: null, updatedAt: new Date() })
          .where(eq(carts.id, cart.id));
        warnings.push(
          "A previously applied coupon is no longer available and was removed from the cart.",
        );
      }
    }

    let selectedCouponPromotionId: string | null = null;
    if (selectedCouponCode) {
      try {
        const appliedCoupon = await applyCouponUseCase.execute(
          selectedCouponCode,
          userId,
          cart.id,
        );
        selectedCouponCode = appliedCoupon.coupon.code;
        selectedCouponPromotionId = appliedCoupon.promotion.id;
      } catch {
        selectedCouponCode = null;
        selectedCouponPromotionId = null;
        warnings.push(
          "The selected coupon could not be applied. Checkout will continue without coupon savings.",
        );
        await this.db
          .update(carts)
          .set({ couponCodeId: null, updatedAt: new Date() })
          .where(eq(carts.id, cart.id));
      }
    }

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
      {
        allowedTypes: ["automatic", "flash_sale"],
        includePromotionIds: selectedCouponPromotionId
          ? [selectedCouponPromotionId]
          : [],
      },
    );

    let couponAppliedInPricing = false;
    if (selectedCouponPromotionId) {
      couponAppliedInPricing = discounts.some((discount) =>
        discount.promotionId === selectedCouponPromotionId
      );
      if (!couponAppliedInPricing) {
        warnings.push(
          "Your coupon is valid but does not currently meet eligibility conditions for this cart.",
        );
      }
    }

    const hasFreeShippingPromotion = discounts.some((discount) => discount.freeShipping);
    let totalDiscount = discounts.reduce((sum, d) => sum + d.discountAmount, 0);
    let subtotalAfterDiscount = Math.max(cartWithItems.subtotal - totalDiscount, 0);

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

    // 5. Calculate shipping
    let shippingCost = 0;
    let selectedShippingWindow: { minDays: number | null; maxDays: number | null } | null = null;
    const fallbackShippingCost = subtotalAfterDiscount >= 50 ? 0 : 5.99;
    const hasPhysical = cartWithItems.items.some((item) => {
      const variant = variantRows.find((v) => v.id === item.variantId);
      const product = variant ? productMap.get(variant.productId) : null;
      return product?.type === "physical";
    });
    const userRepo = new UserRepository(this.db);
    const savedAddresses = hasPhysical ? await userRepo.findAddresses(userId) : [];
    const defaultAddress =
      savedAddresses.find((address) => address.isDefault) ?? savedAddresses[0] ?? null;
    const checkoutEstimateAddress = shippingAddress ??
      (defaultAddress
        ? {
            country: defaultAddress.country,
            state: defaultAddress.state ?? undefined,
            postalCode: defaultAddress.zip,
          }
        : undefined);
    const allowedShippingCountries = checkoutEstimateAddress?.country
      ? [...new Set([...DEFAULT_CHECKOUT_SHIPPING_COUNTRIES, checkoutEstimateAddress.country.toUpperCase()])]
      : DEFAULT_CHECKOUT_SHIPPING_COUNTRIES;

    if (hasPhysical && checkoutEstimateAddress) {
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
          address: checkoutEstimateAddress,
          subtotal: subtotalAfterDiscount,
        });
        const cheapest = shippingResult.options
          .filter((option) => option.price !== null)
          .sort((left, right) => (left.price ?? 0) - (right.price ?? 0))[0];

        if (!cheapest) {
          shippingCost = fallbackShippingCost;
          warnings.push(
            "Carrier rates were unavailable. A fallback shipping estimate was used for checkout.",
          );
        } else {
          shippingCost = cheapest.price ?? 0;
          selectedShippingWindow = {
            minDays: cheapest.estimatedDaysMin,
            maxDays: cheapest.estimatedDaysMax,
          };
        }
      } catch {
        shippingCost = fallbackShippingCost;
        warnings.push(
          "Shipping calculation failed. A fallback shipping estimate was used for checkout.",
        );
      }
    } else if (hasPhysical) {
      shippingCost = fallbackShippingCost;
      warnings.push(
        "No shipping address was provided. A fallback shipping estimate was used for checkout.",
      );
    }

    if (hasFreeShippingPromotion && shippingCost > 0) {
      shippingCost = 0;
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
    if (checkoutEstimateAddress) {
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
            country: checkoutEstimateAddress.country,
            state: checkoutEstimateAddress.state,
            zip: checkoutEstimateAddress.postalCode ?? "",
          },
        });
        taxAmount = taxResult.totalTax;
      } catch {
        warnings.push(
          "Tax calculation was unavailable for this checkout request. Tax was set to 0 for this attempt.",
        );
      }
    } else if (hasPhysical) {
      warnings.push(
        "Tax could not be calculated without a shipping address. Tax was set to 0 for this checkout attempt.",
      );
    }

    // 7. Build line items for Stripe (discount-adjusted with shipping/tax charges)
    const pricedCheckoutLines = buildCheckoutPricingLines({
      cartLines: cartWithItems.items.map((item) => ({
      variantTitle: item.variant.title,
      productName: item.variant.product.name,
      price: item.variant.price,
      quantity: item.quantity,
      imageUrl: item.variant.product.featuredImageUrl,
      })),
      discountAmount: totalDiscount,
      shippingAmount: shippingCost,
      taxAmount,
    });
    if (pricedCheckoutLines.lineItems.length === 0) {
      throw new ValidationError("Checkout total is zero. Add billable items to continue.");
    }
    totalDiscount = pricedCheckoutLines.appliedDiscount;
    subtotalAfterDiscount = Math.max(cartWithItems.subtotal - totalDiscount, 0);

    // 8. Create Stripe Checkout Session
    const grandTotal = subtotalAfterDiscount + shippingCost + taxAmount;
    const { url } = await this.adapter.createCheckoutSession({
      stripe: this.stripe,
      lineItems: pricedCheckoutLines.lineItems,
      successUrl,
      cancelUrl,
      customerEmail: userEmail,
      collectShippingAddress: hasPhysical,
      collectPhoneNumber: hasPhysical,
      allowedShippingCountries,
      metadata: {
        cartId: cart.id,
        userId,
        storeId,
        subtotal: cartWithItems.subtotal.toFixed(2),
        discount: totalDiscount.toFixed(2),
        shipping: shippingCost.toFixed(2),
        tax: taxAmount.toFixed(2),
        total: grandTotal.toFixed(2),
        ...(checkoutEstimateAddress
          ? {
              shippingCountry: checkoutEstimateAddress.country,
              shippingState: checkoutEstimateAddress.state ?? "",
              shippingPostalCode: checkoutEstimateAddress.postalCode ?? "",
            }
          : {}),
        ...(deliveryPromise
          ? {
            deliveryMinDays: String(deliveryPromise.minDays),
            deliveryMaxDays: String(deliveryPromise.maxDays),
            deliveryConfidence: deliveryPromise.confidence,
          }
          : {}),
        ...(couponAppliedInPricing && selectedCouponCode ? { couponCode: selectedCouponCode } : {}),
      },
      idempotencyKey: composeIdempotencyKey(idempotencyKey, "checkout-session"),
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
      appliedCouponCode: couponAppliedInPricing ? selectedCouponCode : null,
      warnings,
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
