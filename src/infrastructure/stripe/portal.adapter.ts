import type Stripe from "stripe";

export class StripePortalAdapter {
  /**
   * Creates a Stripe Customer Portal session for managing subscriptions.
   * Returns the portal URL for redirect.
   */
  async createPortalSession(
    stripe: Stripe,
    customerId: string,
    returnUrl: string,
  ): Promise<{ url: string }> {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  /**
   * Creates a Stripe Checkout Session in subscription mode.
   * Returns the checkout URL for redirect.
   */
  async createSubscriptionCheckout(params: {
    stripe: Stripe;
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    trialDays?: number;
    metadata?: Record<string, string>;
  }): Promise<{ url: string; sessionId: string }> {
    const {
      stripe,
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      trialDays,
      metadata,
    } = params;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: metadata ?? {},
    };

    if (trialDays && trialDays > 0) {
      sessionParams.subscription_data = {
        trial_period_days: trialDays,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      throw new Error("Stripe did not return a checkout session URL");
    }

    return { url: session.url, sessionId: session.id };
  }
}
