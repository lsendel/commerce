import { eq, and } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import type { CartRepository } from "../../infrastructure/repositories/cart.repository";
import { StripeCheckoutAdapter } from "../../infrastructure/stripe/checkout.adapter";
import type Stripe from "stripe";
import {
  carts,
  cartItems,
  products,
  productVariants,
  bookingRequests,
  bookingAvailability,
} from "../../infrastructure/db/schema";
import { ValidationError } from "../../shared/errors";
import { BOOKING_REQUEST_TTL_MINUTES } from "../../shared/constants";

interface CreateCheckoutInput {
  sessionId: string;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export class CreateCheckoutUseCase {
  private adapter = new StripeCheckoutAdapter();

  constructor(
    private cartRepo: CartRepository,
    private db: Database,
    private stripe: Stripe,
  ) {}

  async execute(input: CreateCheckoutInput): Promise<{ url: string }> {
    const { sessionId, userId, userEmail, successUrl, cancelUrl } = input;

    // 1. Get the user's cart with items
    const cart = await this.cartRepo.findOrCreateCart(sessionId, userId);
    const cartWithItems = await this.cartRepo.findCartWithItems(cart.id);

    if (!cartWithItems || cartWithItems.items.length === 0) {
      throw new ValidationError("Cart is empty");
    }

    // 2. For bookable items, create/update booking requests with pending_payment status
    for (const item of cartWithItems.items) {
      if (item.bookingAvailabilityId) {
        await this.handleBookingRequest(cart.id, item, userId);
      }
    }

    // 3. Build line items for Stripe
    const lineItems = cartWithItems.items.map((item) => ({
      variantTitle: item.variant.title,
      productName: item.variant.product.name,
      price: item.variant.price,
      quantity: item.quantity,
      imageUrl: item.variant.product.featuredImageUrl,
    }));

    // 4. Create Stripe Checkout Session
    const { url } = await this.adapter.createCheckoutSession({
      stripe: this.stripe,
      lineItems,
      successUrl,
      cancelUrl,
      customerEmail: userEmail,
      metadata: {
        cartId: cart.id,
        userId,
      },
    });

    return { url };
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
