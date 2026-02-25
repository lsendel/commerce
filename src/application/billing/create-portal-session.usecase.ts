import type Stripe from "stripe";
import type { UserRepository } from "../../infrastructure/repositories/user.repository";
import { StripePortalAdapter } from "../../infrastructure/stripe/portal.adapter";
import { NotFoundError, ValidationError } from "../../shared/errors";

export class CreatePortalSessionUseCase {
  private portalAdapter = new StripePortalAdapter();

  constructor(
    private userRepo: UserRepository,
    private stripe: Stripe,
  ) {}

  /**
   * Create a Stripe Customer Portal session for the authenticated user.
   * The portal lets customers manage their subscriptions, payment methods, and invoices.
   */
  async execute(
    userId: string,
    returnUrl: string,
  ): Promise<{ url: string }> {
    // 1. Get user's Stripe customer ID
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError("User", userId);
    }

    if (!user.stripeCustomerId) {
      throw new ValidationError(
        "No billing account found. Please create a subscription first.",
      );
    }

    // 2. Create portal session via adapter
    const { url } = await this.portalAdapter.createPortalSession(
      this.stripe,
      user.stripeCustomerId,
      returnUrl,
    );

    return { url };
  }
}
