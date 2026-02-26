import type Stripe from "stripe";
import type { SubscriptionRepository } from "../../infrastructure/repositories/subscription.repository";
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
  async execute(userId: string, subscriptionId: string) {
    const subscription = await this.subscriptionRepo.findById(subscriptionId, userId);
    if (!subscription) {
      throw new NotFoundError("Subscription", subscriptionId);
    }

    if (!subscription.stripeSubscriptionId) {
      throw new ValidationError("This subscription has no associated Stripe subscription");
    }

    if (subscription.status === "cancelled") {
      throw new ValidationError("Cannot resume a fully cancelled subscription");
    }

    if (!subscription.cancelAtPeriodEnd) {
      throw new ValidationError("Subscription is not scheduled for cancellation");
    }

    // Resume via Stripe
    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    // Update local record
    const updated = await this.subscriptionRepo.updateFromStripe(
      subscription.stripeSubscriptionId,
      { cancelAtPeriodEnd: false },
    );

    return updated;
  }
}
