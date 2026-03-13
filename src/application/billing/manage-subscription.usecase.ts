import type Stripe from "stripe";
import type { SubscriptionRepository } from "../../infrastructure/repositories/subscription.repository";
import type { UserRepository } from "../../infrastructure/repositories/user.repository";
import { StripePortalAdapter } from "../../infrastructure/stripe/portal.adapter";
import {
  buildStripeRequestOptions,
  runStripeMutationWithRetry,
} from "../../infrastructure/stripe/retry";
import { composeIdempotencyKey } from "../../shared/idempotency";
import { NotFoundError, ValidationError } from "../../shared/errors";

export class ManageSubscriptionUseCase {
  private portalAdapter = new StripePortalAdapter();

  constructor(
    private subscriptionRepo: SubscriptionRepository,
    private userRepo: UserRepository,
    private stripe: Stripe,
  ) {}

  /**
   * Create a subscription checkout session.
   * 1. Get the plan (with stripePriceId)
   * 2. Get or create Stripe customer for the user
   * 3. Create Stripe checkout session in subscription mode
   * 4. Return the checkout URL
   */
  async create(
    userId: string,
    planId: string,
    appUrl: string,
    options?: { idempotencyKey?: string },
  ): Promise<{ checkoutUrl: string }> {
    // 1. Get the plan
    const plan = await this.subscriptionRepo.findPlanById(planId);
    if (!plan) {
      throw new NotFoundError("Subscription plan", planId);
    }

    if (!plan.stripePriceId) {
      throw new ValidationError(
        "This plan is not configured for Stripe billing",
      );
    }

    // 2. Get or create Stripe customer for the user
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError("User", userId);
    }

    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await runStripeMutationWithRetry(() =>
        this.stripe.customers.create(
          {
            email: user.email,
            name: user.name,
            metadata: { userId: user.id },
          },
          buildStripeRequestOptions(
            composeIdempotencyKey(options?.idempotencyKey, "customer-create"),
          ),
        ),
      );
      stripeCustomerId = customer.id;
      await this.userRepo.updateStripeCustomerId(userId, stripeCustomerId);
    }

    // 3. Create Stripe checkout session in subscription mode
    const { url } = await this.portalAdapter.createSubscriptionCheckout({
      stripe: this.stripe,
      customerId: stripeCustomerId,
      priceId: plan.stripePriceId,
      successUrl: `${appUrl}/subscriptions/success`,
      cancelUrl: `${appUrl}/subscriptions`,
      trialDays: plan.trialDays ?? undefined,
      metadata: {
        userId,
        planId,
      },
      idempotencyKey: composeIdempotencyKey(
        options?.idempotencyKey,
        "checkout-session",
      ),
    });

    // 4. Return the checkout URL
    return { checkoutUrl: url };
  }

  /**
   * List all subscriptions for a user.
   */
  async list(userId: string) {
    return this.subscriptionRepo.findByUserId(userId);
  }

  /**
   * Change a subscription to a different plan with proration.
   */
  async changePlan(
    userId: string,
    subscriptionId: string,
    newPlanId: string,
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
      throw new ValidationError("Cannot change plan on a cancelled subscription");
    }

    if (subscription.planId === newPlanId) {
      return subscription;
    }

    const newPlan = await this.subscriptionRepo.findPlanById(newPlanId);
    if (!newPlan) {
      throw new NotFoundError("Subscription plan", newPlanId);
    }

    if (!newPlan.stripePriceId) {
      throw new ValidationError("New plan is not configured for Stripe billing");
    }
    const newPlanStripePriceId = newPlan.stripePriceId;

    // Retrieve the Stripe subscription to get the current item ID
    const stripeSub = await runStripeMutationWithRetry(() =>
      this.stripe.subscriptions.retrieve(stripeSubscriptionId),
    );
    const currentItem = stripeSub.items.data[0];
    if (!currentItem) {
      throw new ValidationError("No subscription item found on Stripe");
    }

    // Update the subscription with the new price (prorated by default)
    await runStripeMutationWithRetry(() =>
      this.stripe.subscriptions.update(
        stripeSubscriptionId,
        {
          items: [{ id: currentItem.id, price: newPlanStripePriceId }],
          proration_behavior: "create_prorations",
        },
        buildStripeRequestOptions(
          composeIdempotencyKey(options?.idempotencyKey, "change-plan"),
        ),
      ),
    );

    // Update local plan reference
    const updated = await this.subscriptionRepo.updatePlan(subscriptionId, newPlanId);
    return updated ?? subscription;
  }

  /**
   * Cancel a subscription at the end of its current billing period.
   * Updates both Stripe and the local record.
   */
  async cancel(
    userId: string,
    subscriptionId: string,
    options?: { idempotencyKey?: string },
  ) {
    // 1. Find the subscription scoped to the user
    const subscription = await this.subscriptionRepo.findById(
      subscriptionId,
      userId,
    );
    if (!subscription) {
      throw new NotFoundError("Subscription", subscriptionId);
    }

    if (!subscription.stripeSubscriptionId) {
      throw new ValidationError(
        "This subscription has no associated Stripe subscription",
      );
    }
    const stripeSubscriptionId = subscription.stripeSubscriptionId;

    if (subscription.status === "cancelled") {
      return subscription;
    }

    if (subscription.cancelAtPeriodEnd) {
      return subscription;
    }

    // 2. Cancel at period end via Stripe API
    await runStripeMutationWithRetry(() =>
      this.stripe.subscriptions.update(
        stripeSubscriptionId,
        { cancel_at_period_end: true },
        buildStripeRequestOptions(
          composeIdempotencyKey(options?.idempotencyKey, "cancel"),
        ),
      ),
    );

    // 3. Update local record
    const updated = await this.subscriptionRepo.updateFromStripe(
      stripeSubscriptionId,
      { cancelAtPeriodEnd: true },
    );

    return updated ?? subscription;
  }
}
