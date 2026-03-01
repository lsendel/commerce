import type Stripe from "stripe";
import type {
  SubscriptionBuilderPlanOption,
  SubscriptionRepository,
} from "../../infrastructure/repositories/subscription.repository";
import type { UserRepository } from "../../infrastructure/repositories/user.repository";
import { StripePortalAdapter } from "../../infrastructure/stripe/portal.adapter";
import { NotFoundError, ValidationError } from "../../shared/errors";

const MAX_BUNDLE_LINES = 8;
const MAX_LINE_QUANTITY = 12;

export interface BundleSelectionInput {
  planId: string;
  quantity: number;
}

export interface BundleQuoteLine {
  planId: string;
  planName: string;
  stripePriceId: string;
  quantity: number;
  unitAmountCents: number;
  lineAmountCents: number;
  interval: "month" | "year";
}

export interface BundleQuote {
  currency: "usd";
  billingCadence: "month" | "year";
  lines: BundleQuoteLine[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}

export interface BundleCheckoutResult {
  checkoutUrl: string;
  quote: BundleQuote;
}

function normalizeSelections(selections: BundleSelectionInput[]): BundleSelectionInput[] {
  const merged = new Map<string, number>();

  for (const selection of selections) {
    const planId = String(selection.planId ?? "").trim();
    const quantity = Number(selection.quantity ?? 0);
    if (!planId || !Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }

    const cappedQuantity = Math.min(MAX_LINE_QUANTITY, Math.floor(quantity));
    merged.set(planId, (merged.get(planId) ?? 0) + cappedQuantity);
  }

  return Array.from(merged.entries())
    .slice(0, MAX_BUNDLE_LINES)
    .map(([planId, quantity]) => ({
      planId,
      quantity: Math.min(MAX_LINE_QUANTITY, quantity),
    }));
}

function resolveCompactMixConfiguration(quote: BundleQuote) {
  return {
    v: 1,
    mode: "bundle",
    c: quote.billingCadence,
    i: quote.lines.map((line) => [line.planId, line.quantity] as const),
    s: quote.subtotalCents,
    d: quote.discountCents,
    t: quote.totalCents,
    cur: quote.currency,
  };
}

export class BuildSubscriptionBundleUseCase {
  private portalAdapter = new StripePortalAdapter();

  constructor(
    private subscriptionRepo: SubscriptionRepository,
    private userRepo: UserRepository,
    private stripe: Stripe,
  ) {}

  private async ensureStripeCustomerId(userId: string): Promise<string> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError("User", userId);
    }

    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await this.stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });

    await this.userRepo.updateStripeCustomerId(userId, customer.id);
    return customer.id;
  }

  private buildQuoteFromSelections(
    normalizedSelections: BundleSelectionInput[],
    options: SubscriptionBuilderPlanOption[],
  ): BundleQuote {
    if (normalizedSelections.length === 0) {
      throw new ValidationError("Select at least one subscription plan for your bundle.");
    }

    const optionsByPlanId = new Map(options.map((option) => [option.id, option]));

    let cadence: "month" | "year" | null = null;
    const lines: BundleQuoteLine[] = [];

    for (const selection of normalizedSelections) {
      const option = optionsByPlanId.get(selection.planId);
      if (!option) {
        throw new NotFoundError("Subscription plan", selection.planId);
      }

      if (!option.stripePriceId) {
        throw new ValidationError(
          `Plan \"${option.planName}\" is not configured for recurring Stripe billing.`,
        );
      }

      if (!option.unitAmountCents || option.unitAmountCents <= 0) {
        throw new ValidationError(
          `Plan \"${option.planName}\" is missing valid pricing for checkout.`,
        );
      }

      if (cadence && cadence !== option.interval) {
        throw new ValidationError(
          "All plans in a bundle must share the same billing cadence (monthly or yearly).",
        );
      }

      cadence = option.interval;
      const lineAmountCents = option.unitAmountCents * selection.quantity;

      lines.push({
        planId: option.id,
        planName: option.planName,
        stripePriceId: option.stripePriceId,
        quantity: selection.quantity,
        unitAmountCents: option.unitAmountCents,
        lineAmountCents,
        interval: option.interval,
      });
    }

    const subtotalCents = lines.reduce((sum, line) => sum + line.lineAmountCents, 0);
    const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
    const discountCents = totalQuantity >= 3 ? Math.round(subtotalCents * 0.05) : 0;

    return {
      currency: "usd",
      billingCadence: cadence ?? "month",
      lines,
      subtotalCents,
      discountCents,
      totalCents: Math.max(0, subtotalCents - discountCents),
    };
  }

  async quote(selections: BundleSelectionInput[]): Promise<BundleQuote> {
    const normalizedSelections = normalizeSelections(selections);
    const options = await this.subscriptionRepo.findBuilderPlanOptions();
    return this.buildQuoteFromSelections(normalizedSelections, options);
  }

  async checkout(
    userId: string,
    selections: BundleSelectionInput[],
    appUrl: string,
  ): Promise<BundleCheckoutResult> {
    const normalizedSelections = normalizeSelections(selections);
    const options = await this.subscriptionRepo.findBuilderPlanOptions();
    const quote = this.buildQuoteFromSelections(normalizedSelections, options);

    const stripeCustomerId = await this.ensureStripeCustomerId(userId);

    const optionsByPlanId = new Map(options.map((option) => [option.id, option]));
    const trialDaysSet = new Set<number>();
    for (const line of quote.lines) {
      const option = optionsByPlanId.get(line.planId);
      if (option && option.trialDays > 0) {
        trialDaysSet.add(option.trialDays);
      }
    }
    const trialDays = trialDaysSet.size === 1 ? Array.from(trialDaysSet)[0] : undefined;

    const mixConfiguration = resolveCompactMixConfiguration(quote);
    const mixConfigurationJson = JSON.stringify(mixConfiguration);
    if (mixConfigurationJson.length > 450) {
      throw new ValidationError("Bundle metadata is too large. Reduce the number of selected plans.");
    }
    const anchorLine = quote.lines[0];
    if (!anchorLine) {
      throw new ValidationError("Bundle checkout requires at least one selected plan.");
    }

    const { url } = await this.portalAdapter.createSubscriptionBuilderCheckout({
      stripe: this.stripe,
      customerId: stripeCustomerId,
      lineItems: quote.lines.map((line) => ({
        priceId: line.stripePriceId,
        quantity: line.quantity,
      })),
      successUrl: `${appUrl}/subscriptions/success`,
      cancelUrl: `${appUrl}/account/subscriptions`,
      trialDays,
      metadata: {
        userId,
        planId: anchorLine.planId,
        mixConfiguration: mixConfigurationJson,
      },
    });

    return {
      checkoutUrl: url,
      quote,
    };
  }
}
