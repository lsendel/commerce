import type Stripe from "stripe";
import type { SubscriptionRepository } from "../../infrastructure/repositories/subscription.repository";
import {
  buildStripeRequestOptions,
  runStripeMutationWithRetry,
} from "../../infrastructure/stripe/retry";
import { composeIdempotencyKey } from "../../shared/idempotency";
import { NotFoundError, ValidationError } from "../../shared/errors";

export class ResumeSubscriptionUseCase {
  constructor(
    private subscriptionRepo: SubscriptionRepository,
    private stripe: Stripe,
  ) {}

  /**
   * Resume a subscription that was scheduled to cancel at period end.
   * Calls stripe.subscriptions.update({ cancel_at_period_end: false }).
   */
  async execute(
    userId: string,
    subscriptionId: string,
    options?: { idempotencyKey?: string },
  ) {
    const subscription = await this.subscriptionRepo.findById(subscriptionId, userId);
    if (!subscription) {
      throw new NotFoundError("Subscription", subscriptionId);
    }

    if (!subscription.stripeSubscriptionId) {
      throw new ValidationError("This subscription has no associated Stripe subscription");
    }
    const stripeSubscriptionId = subscription.stripeSubscriptionId;

    if (subscription.status === "cancelled") {
      throw new ValidationError("Cannot resume a fully cancelled subscription");
    }

    if (!subscription.cancelAtPeriodEnd) {
      return subscription;
    }

    // Resume via Stripe
    await runStripeMutationWithRetry(() =>
      this.stripe.subscriptions.update(
        stripeSubscriptionId,
        {
          cancel_at_period_end: false,
        },
        buildStripeRequestOptions(
          composeIdempotencyKey(options?.idempotencyKey, "resume"),
        ),
      ),
    );

    // Update local record
    const updated = await this.subscriptionRepo.updateFromStripe(
      stripeSubscriptionId,
      { cancelAtPeriodEnd: false },
    );

    return updated ?? subscription;
  }
}
