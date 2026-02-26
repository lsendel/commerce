import type Stripe from "stripe";

export interface CheckoutLineItem {
  variantTitle: string;
  productName: string;
  price: number; // in dollars (e.g. 29.99)
  quantity: number;
  imageUrl?: string | null;
}

export interface CreateCheckoutSessionParams {
  stripe: Stripe;
  lineItems: CheckoutLineItem[];
  successUrl: string;
  cancelUrl: string;
  customerEmail: string;
  metadata: {
    cartId: string;
    userId: string;
    [key: string]: string;
  };
}

export class StripeCheckoutAdapter {
  /**
   * Creates a Stripe Checkout Session from cart items.
   * Returns the session URL for redirect.
   */
  async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<{ url: string; sessionId: string }> {
    const { stripe, lineItems, successUrl, cancelUrl, customerEmail, metadata } = params;

    const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      lineItems.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name:
              item.variantTitle && item.variantTitle !== item.productName
                ? `${item.productName} — ${item.variantTitle}`
                : item.productName,
            ...(item.imageUrl ? { images: [item.imageUrl] } : {}),
          },
          unit_amount: Math.round(item.price * 100), // Convert dollars to cents
        },
        quantity: item.quantity,
      }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: stripeLineItems,
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      metadata,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout session URL");
    }

    return { url: session.url, sessionId: session.id };
  }
}
