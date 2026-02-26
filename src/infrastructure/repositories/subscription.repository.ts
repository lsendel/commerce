import { eq, and } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  subscriptionPlans,
  subscriptions,
  products,
} from "../db/schema";

export interface CreateSubscriptionData {
  userId: string;
  planId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status?: "active" | "past_due" | "cancelled" | "trialing" | "paused";
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

export interface UpdateFromStripeData {
  status?: "active" | "past_due" | "cancelled" | "trialing" | "paused";
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

export class SubscriptionRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  /**
   * Get a subscription plan by ID, joined with product info.
   */
  async findPlanById(id: string) {
    const rows = await this.db
      .select({
        id: subscriptionPlans.id,
        productId: subscriptionPlans.productId,
        billingPeriod: subscriptionPlans.billingPeriod,
        billingInterval: subscriptionPlans.billingInterval,
        trialDays: subscriptionPlans.trialDays,
        stripeProductId: subscriptionPlans.stripeProductId,
        stripePriceId: subscriptionPlans.stripePriceId,
        createdAt: subscriptionPlans.createdAt,
        productName: products.name,
        productSlug: products.slug,
        productDescription: products.description,
      })
      .from(subscriptionPlans)
      .innerJoin(products, eq(subscriptionPlans.productId, products.id))
      .where(and(eq(subscriptionPlans.id, id), eq(products.storeId, this.storeId)))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Get a subscription plan by its product ID.
   */
  async findPlanByProductId(productId: string) {
    const rows = await this.db
      .select({
        id: subscriptionPlans.id,
        productId: subscriptionPlans.productId,
        billingPeriod: subscriptionPlans.billingPeriod,
        billingInterval: subscriptionPlans.billingInterval,
        trialDays: subscriptionPlans.trialDays,
        stripeProductId: subscriptionPlans.stripeProductId,
        stripePriceId: subscriptionPlans.stripePriceId,
        createdAt: subscriptionPlans.createdAt,
        productName: products.name,
        productSlug: products.slug,
        productDescription: products.description,
      })
      .from(subscriptionPlans)
      .innerJoin(products, eq(subscriptionPlans.productId, products.id))
      .where(and(eq(subscriptionPlans.productId, productId), eq(products.storeId, this.storeId)))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Get a subscription plan by its Stripe price ID.
   */
  async findPlanByStripePriceId(stripePriceId: string) {
    const rows = await this.db
      .select({
        id: subscriptionPlans.id,
        productId: subscriptionPlans.productId,
        billingPeriod: subscriptionPlans.billingPeriod,
        billingInterval: subscriptionPlans.billingInterval,
        trialDays: subscriptionPlans.trialDays,
        stripeProductId: subscriptionPlans.stripeProductId,
        stripePriceId: subscriptionPlans.stripePriceId,
        createdAt: subscriptionPlans.createdAt,
        productName: products.name,
        productSlug: products.slug,
        productDescription: products.description,
      })
      .from(subscriptionPlans)
      .innerJoin(products, eq(subscriptionPlans.productId, products.id))
      .where(and(eq(subscriptionPlans.stripePriceId, stripePriceId), eq(products.storeId, this.storeId)))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * List all available subscription plans with product details.
   */
  async findAllPlans() {
    return this.db
      .select({
        id: subscriptionPlans.id,
        productId: subscriptionPlans.productId,
        billingPeriod: subscriptionPlans.billingPeriod,
        billingInterval: subscriptionPlans.billingInterval,
        trialDays: subscriptionPlans.trialDays,
        stripeProductId: subscriptionPlans.stripeProductId,
        stripePriceId: subscriptionPlans.stripePriceId,
        createdAt: subscriptionPlans.createdAt,
        productName: products.name,
        productSlug: products.slug,
        productDescription: products.description,
      })
      .from(subscriptionPlans)
      .innerJoin(products, eq(subscriptionPlans.productId, products.id))
      .where(eq(products.storeId, this.storeId));
  }

  /**
   * Insert a new subscription record.
   */
  async createSubscription(data: CreateSubscriptionData) {
    const rows = await this.db
      .insert(subscriptions)
      .values({
        storeId: this.storeId,
        userId: data.userId,
        planId: data.planId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        stripeCustomerId: data.stripeCustomerId,
        status: data.status ?? "active",
        currentPeriodStart: data.currentPeriodStart ?? null,
        currentPeriodEnd: data.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
      })
      .returning();

    return rows[0];
  }

  /**
   * List subscriptions for a user, enriched with plan and product details.
   */
  async findByUserId(userId: string) {
    return this.db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        planId: subscriptions.planId,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        stripeCustomerId: subscriptions.stripeCustomerId,
        status: subscriptions.status,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt,
        planName: products.name,
        billingPeriod: subscriptionPlans.billingPeriod,
      })
      .from(subscriptions)
      .innerJoin(
        subscriptionPlans,
        eq(subscriptions.planId, subscriptionPlans.id),
      )
      .innerJoin(products, eq(subscriptionPlans.productId, products.id))
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.storeId, this.storeId)));
  }

  /**
   * Get a single subscription by ID, optionally scoped to a user.
   */
  async findById(id: string, userId?: string) {
    const conditions = [eq(subscriptions.id, id), eq(subscriptions.storeId, this.storeId)];
    if (userId) {
      conditions.push(eq(subscriptions.userId, userId));
    }

    const rows = await this.db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        planId: subscriptions.planId,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        stripeCustomerId: subscriptions.stripeCustomerId,
        status: subscriptions.status,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt,
        planName: products.name,
        billingPeriod: subscriptionPlans.billingPeriod,
      })
      .from(subscriptions)
      .innerJoin(
        subscriptionPlans,
        eq(subscriptions.planId, subscriptionPlans.id),
      )
      .innerJoin(products, eq(subscriptionPlans.productId, products.id))
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Look up a subscription by its Stripe subscription ID.
   */
  async findByStripeId(stripeSubscriptionId: string) {
    const rows = await this.db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        planId: subscriptions.planId,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        stripeCustomerId: subscriptions.stripeCustomerId,
        status: subscriptions.status,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt,
      })
      .from(subscriptions)
      .where(and(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId), eq(subscriptions.storeId, this.storeId)))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Update subscription from Stripe webhook data.
   * Used for status changes, period date updates, and cancellation flags.
   */
  async updateFromStripe(
    stripeSubscriptionId: string,
    data: UpdateFromStripeData,
  ) {
    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.status !== undefined) {
      updateValues.status = data.status;
    }
    if (data.currentPeriodStart !== undefined) {
      updateValues.currentPeriodStart = data.currentPeriodStart;
    }
    if (data.currentPeriodEnd !== undefined) {
      updateValues.currentPeriodEnd = data.currentPeriodEnd;
    }
    if (data.cancelAtPeriodEnd !== undefined) {
      updateValues.cancelAtPeriodEnd = data.cancelAtPeriodEnd;
    }

    const rows = await this.db
      .update(subscriptions)
      .set(updateValues)
      .where(and(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId), eq(subscriptions.storeId, this.storeId)))
      .returning();

    return rows[0] ?? null;
  }

  /**
   * Update the plan on a subscription (for plan changes).
   */
  async updatePlan(id: string, newPlanId: string) {
    const rows = await this.db
      .update(subscriptions)
      .set({ planId: newPlanId, updatedAt: new Date() })
      .where(and(eq(subscriptions.id, id), eq(subscriptions.storeId, this.storeId)))
      .returning();

    return rows[0] ?? null;
  }

  /**
   * Hard delete a subscription record.
   */
  async delete(id: string) {
    const rows = await this.db
      .delete(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.storeId, this.storeId)))
      .returning();

    return rows[0] ?? null;
  }
}
