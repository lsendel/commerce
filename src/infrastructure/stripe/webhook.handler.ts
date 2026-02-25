import Stripe from "stripe";

/**
 * Workers-compatible Stripe webhook handler.
 * Uses SubtleCryptoProvider for signature verification (no Node.js crypto).
 */
export class StripeWebhookHandler {
  /**
   * Verify and construct a Stripe event from the raw webhook body.
   * MUST use constructEventAsync + createSubtleCryptoProvider() on Workers.
   */
  async constructEvent(
    body: string,
    signature: string,
    secret: string,
    stripe: Stripe,
  ): Promise<Stripe.Event> {
    const cryptoProvider = Stripe.createSubtleCryptoProvider();

    return stripe.webhooks.constructEventAsync(
      body,
      signature,
      secret,
      undefined,
      cryptoProvider,
    );
  }
}
