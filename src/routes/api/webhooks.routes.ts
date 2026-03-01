import { Hono } from "hono";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { createStripeClient } from "../../infrastructure/stripe/stripe.client";
import { StripeWebhookHandler } from "../../infrastructure/stripe/webhook.handler";
import { CartRepository } from "../../infrastructure/repositories/cart.repository";
import { OrderRepository } from "../../infrastructure/repositories/order.repository";
import { SubscriptionRepository } from "../../infrastructure/repositories/subscription.repository";
import { UserRepository } from "../../infrastructure/repositories/user.repository";
import { FulfillOrderUseCase } from "../../application/checkout/fulfill-order.usecase";
import { resolveFeatureFlags } from "../../shared/feature-flags";
import type Stripe from "stripe";

const webhooks = new Hono<{ Bindings: Env }>();

const webhookHandler = new StripeWebhookHandler();

// POST /webhooks/stripe — Stripe webhook endpoint
// CRITICAL: Must read raw body via c.req.text() BEFORE any JSON parsing
webhooks.post("/webhooks/stripe", async (c) => {
  const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);

  // 1. Read raw body as text for signature verification
  const rawBody = await c.req.text();
  const signature = c.req.header("stripe-signature");

  if (!signature) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }

  // 2. Verify webhook signature (async on Workers)
  let event;
  try {
    event = await webhookHandler.constructEvent(
      rawBody,
      signature,
      c.env.STRIPE_WEBHOOK_SECRET,
      stripe,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return c.json({ error: `Webhook signature verification failed: ${message}` }, 400);
  }

  // 3. Handle events
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;

      try {
        const db = createDb(c.env.DATABASE_URL);
        const orderRepo = new OrderRepository(db, c.get("storeId") as string);
        const cartRepo = new CartRepository(db, c.get("storeId") as string);
        const featureFlags = resolveFeatureFlags(c.env.FEATURE_FLAGS);

        const useCase = new FulfillOrderUseCase(orderRepo, cartRepo, db, c.get("storeId") as string);
        await useCase.execute({
          session,
          fulfillmentQueue: c.env.FULFILLMENT_QUEUE,
          splitShipmentOptimizer: featureFlags.split_shipment_optimizer,
        });

        console.log(
          `Order fulfilled for session ${session.id}, cart ${session.metadata?.cartId}`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`Failed to fulfill order for session ${session.id}:`, message);
        // Return 500 so Stripe will retry
        return c.json({ error: "Order fulfillment failed" }, 500);
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      console.error(
        `Payment failed for intent ${paymentIntent.id}:`,
        paymentIntent.last_payment_error?.message,
      );
      break;
    }

    case "customer.subscription.created": {
      const stripeSubscription = event.data
        .object as Stripe.Subscription;

      try {
        const db = createDb(c.env.DATABASE_URL);
        const subscriptionRepo = new SubscriptionRepository(db, c.get("storeId") as string);
        const userRepo = new UserRepository(db);

        // Resolve the user from Stripe customer ID
        const customerId =
          typeof stripeSubscription.customer === "string"
            ? stripeSubscription.customer
            : stripeSubscription.customer.id;

        const metadataPlanId = stripeSubscription.metadata?.planId ?? null;
        const planFromMetadata = metadataPlanId
          ? await subscriptionRepo.findPlanById(metadataPlanId)
          : null;

        // Fallback: Find the plan by Stripe price ID
        const priceId =
          stripeSubscription.items.data[0]?.price?.id ?? null;
        const plan = planFromMetadata
          ?? (priceId
            ? await subscriptionRepo.findPlanByStripePriceId(priceId)
            : null);

        if (!plan) {
          console.error(
            `No plan found for Stripe price ${priceId} on subscription ${stripeSubscription.id}`,
          );
          break;
        }

        // Check if we already have this subscription (idempotency)
        const existing = await subscriptionRepo.findByStripeId(
          stripeSubscription.id,
        );
        if (existing) {
          console.log(
            `Subscription ${stripeSubscription.id} already exists locally, skipping create`,
          );
          break;
        }

        // Resolve userId from metadata or by looking up the customer
        let userId = stripeSubscription.metadata?.userId ?? null;

        if (!userId) {
          // Look up user by stripeCustomerId
          const user =
            await userRepo.findByStripeCustomerId(customerId);
          if (user) {
            userId = user.id;
          }
        }

        if (!userId) {
          console.error(
            `Cannot find user for Stripe customer ${customerId} on subscription ${stripeSubscription.id}`,
          );
          break;
        }

        // Map Stripe status to local enum
        const status = mapStripeSubscriptionStatus(
          stripeSubscription.status,
        );

        await subscriptionRepo.createSubscription({
          userId,
          planId: plan.id,
          stripeSubscriptionId: stripeSubscription.id,
          stripeCustomerId: customerId,
          status,
          currentPeriodStart: new Date(
            stripeSubscription.current_period_start * 1000,
          ),
          currentPeriodEnd: new Date(
            stripeSubscription.current_period_end * 1000,
          ),
          cancelAtPeriodEnd:
            stripeSubscription.cancel_at_period_end,
          mixConfiguration:
            parseMixConfiguration(stripeSubscription.metadata?.mixConfiguration) ?? null,
        });

        console.log(
          `Subscription created locally for Stripe subscription ${stripeSubscription.id}`,
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        console.error(
          `Failed to create subscription for ${stripeSubscription.id}:`,
          message,
        );
        return c.json(
          { error: "Subscription creation failed" },
          500,
        );
      }
      break;
    }

    case "customer.subscription.updated": {
      const stripeSubscription = event.data
        .object as Stripe.Subscription;

      try {
        const db = createDb(c.env.DATABASE_URL);
        const subscriptionRepo = new SubscriptionRepository(db, c.get("storeId") as string);

        const status = mapStripeSubscriptionStatus(
          stripeSubscription.status,
        );

        const updated = await subscriptionRepo.updateFromStripe(
          stripeSubscription.id,
          {
            status,
            currentPeriodStart: new Date(
              stripeSubscription.current_period_start * 1000,
            ),
            currentPeriodEnd: new Date(
              stripeSubscription.current_period_end * 1000,
            ),
            cancelAtPeriodEnd:
              stripeSubscription.cancel_at_period_end,
            mixConfiguration: parseMixConfiguration(
              stripeSubscription.metadata?.mixConfiguration,
            ),
          },
        );

        if (updated) {
          console.log(
            `Subscription ${stripeSubscription.id} updated: status=${status}, cancel_at_period_end=${stripeSubscription.cancel_at_period_end}`,
          );
        } else {
          console.warn(
            `Subscription ${stripeSubscription.id} not found locally for update`,
          );
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        console.error(
          `Failed to update subscription ${stripeSubscription.id}:`,
          message,
        );
        return c.json(
          { error: "Subscription update failed" },
          500,
        );
      }
      break;
    }

    case "customer.subscription.deleted": {
      const stripeSubscription = event.data
        .object as Stripe.Subscription;

      try {
        const db = createDb(c.env.DATABASE_URL);
        const subscriptionRepo = new SubscriptionRepository(db, c.get("storeId") as string);

        const updated = await subscriptionRepo.updateFromStripe(
          stripeSubscription.id,
          { status: "cancelled" },
        );

        if (updated) {
          console.log(
            `Subscription ${stripeSubscription.id} marked as cancelled`,
          );
        } else {
          console.warn(
            `Subscription ${stripeSubscription.id} not found locally for deletion`,
          );
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        console.error(
          `Failed to cancel subscription ${stripeSubscription.id}:`,
          message,
        );
        return c.json(
          { error: "Subscription cancellation failed" },
          500,
        );
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  // Acknowledge receipt
  return c.json({ received: true }, 200);
});

/**
 * Map Stripe subscription status to local subscription_status enum.
 */
function mapStripeSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status,
): "active" | "past_due" | "cancelled" | "trialing" | "paused" {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "cancelled";
    case "trialing":
      return "trialing";
    case "paused":
      return "paused";
    // incomplete, incomplete_expired, unpaid all map to past_due
    default:
      return "past_due";
  }
}

function parseMixConfiguration(raw: string | null | undefined): Record<string, unknown> | undefined {
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch (error) {
    console.warn("Invalid mixConfiguration metadata payload", error);
  }

  return undefined;
}

export { webhooks as webhookRoutes };
