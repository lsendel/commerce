import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { createStripeClient } from "../../infrastructure/stripe/stripe.client";
import { SubscriptionRepository } from "../../infrastructure/repositories/subscription.repository";
import { UserRepository } from "../../infrastructure/repositories/user.repository";
import { ManageSubscriptionUseCase } from "../../application/billing/manage-subscription.usecase";
import { ResumeSubscriptionUseCase } from "../../application/billing/resume-subscription.usecase";
import { CreatePortalSessionUseCase } from "../../application/billing/create-portal-session.usecase";
import { createSubscriptionSchema } from "../../shared/validators";
import { requireAuth } from "../../middleware/auth.middleware";
import { NotFoundError, ValidationError } from "../../shared/errors";

const subscriptionRoutes = new Hono<{ Bindings: Env }>();

// All subscription routes require authentication
subscriptionRoutes.use("/subscriptions", requireAuth());
subscriptionRoutes.use("/subscriptions/*", requireAuth());

// POST /subscriptions — create subscription (returns checkout URL)
subscriptionRoutes.post(
  "/subscriptions",
  zValidator("json", createSubscriptionSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);
    const subscriptionRepo = new SubscriptionRepository(db, c.get("storeId") as string);
    const userRepo = new UserRepository(db);

    const useCase = new ManageSubscriptionUseCase(
      subscriptionRepo,
      userRepo,
      stripe,
    );

    try {
      const { planId } = c.req.valid("json");
      const userId = c.get("userId");
      const appUrl = c.env.APP_URL;

      const result = await useCase.create(userId, planId, appUrl);

      return c.json({ checkoutUrl: result.checkoutUrl }, 201);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return c.json({ error: err.message }, 400);
      }
      if (err instanceof ValidationError) {
        return c.json({ error: err.message }, 400);
      }
      throw err;
    }
  },
);

// GET /subscriptions — list user subscriptions
subscriptionRoutes.get("/subscriptions", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);
  const subscriptionRepo = new SubscriptionRepository(db, c.get("storeId") as string);
  const userRepo = new UserRepository(db);

  const useCase = new ManageSubscriptionUseCase(
    subscriptionRepo,
    userRepo,
    stripe,
  );

  const userId = c.get("userId");
  const subscriptions = await useCase.list(userId);

  return c.json({
    subscriptions: subscriptions.map((sub) => ({
      id: sub.id,
      planId: sub.planId,
      planName: sub.planName,
      billingPeriod: sub.billingPeriod,
      status: sub.status,
      stripeSubscriptionId: sub.stripeSubscriptionId,
      currentPeriodStart: sub.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      createdAt: sub.createdAt?.toISOString() ?? null,
    })),
  });
});

// POST /subscriptions/portal — get Stripe portal URL
subscriptionRoutes.post("/subscriptions/portal", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);
  const userRepo = new UserRepository(db);

  const useCase = new CreatePortalSessionUseCase(userRepo, stripe);

  try {
    const userId = c.get("userId");
    const appUrl = c.env.APP_URL;

    const result = await useCase.execute(userId, `${appUrl}/account/billing`);

    return c.json({ url: result.url });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return c.json({ error: err.message }, 400);
    }
    if (err instanceof ValidationError) {
      return c.json({ error: err.message }, 400);
    }
    throw err;
  }
});

// DELETE /subscriptions/:id — cancel subscription
subscriptionRoutes.delete("/subscriptions/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);
  const subscriptionRepo = new SubscriptionRepository(db, c.get("storeId") as string);
  const userRepo = new UserRepository(db);

  const useCase = new ManageSubscriptionUseCase(
    subscriptionRepo,
    userRepo,
    stripe,
  );

  try {
    const userId = c.get("userId");
    const subscriptionId = c.req.param("id");

    const updated = await useCase.cancel(userId, subscriptionId);

    return c.json({
      subscription: {
        id: updated!.id,
        status: updated!.status,
        cancelAtPeriodEnd: updated!.cancelAtPeriodEnd,
        currentPeriodEnd: updated!.currentPeriodEnd?.toISOString() ?? null,
      },
    });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    if (err instanceof ValidationError) {
      return c.json({ error: err.message }, 400);
    }
    throw err;
  }
});

// PATCH /subscriptions/:id/change-plan — switch to a different plan
const changePlanSchema = z.object({
  newPlanId: z.string().uuid(),
});

subscriptionRoutes.patch(
  "/subscriptions/:id/change-plan",
  requireAuth(),
  zValidator("json", changePlanSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);
    const subscriptionRepo = new SubscriptionRepository(db, c.get("storeId") as string);
    const userRepo = new UserRepository(db);

    const useCase = new ManageSubscriptionUseCase(subscriptionRepo, userRepo, stripe);

    try {
      const userId = c.get("userId");
      const subscriptionId = c.req.param("id");
      const { newPlanId } = c.req.valid("json");

      const updated = await useCase.changePlan(userId, subscriptionId, newPlanId);
      return c.json({ subscription: updated });
    } catch (err) {
      if (err instanceof NotFoundError) return c.json({ error: err.message }, 404);
      if (err instanceof ValidationError) return c.json({ error: err.message }, 400);
      throw err;
    }
  },
);

// POST /subscriptions/:id/resume — resume a subscription scheduled for cancellation
subscriptionRoutes.post(
  "/subscriptions/:id/resume",
  requireAuth(),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);
    const subscriptionRepo = new SubscriptionRepository(db, c.get("storeId") as string);

    const useCase = new ResumeSubscriptionUseCase(subscriptionRepo, stripe);

    try {
      const userId = c.get("userId");
      const subscriptionId = c.req.param("id");

      const updated = await useCase.execute(userId, subscriptionId);
      return c.json({ subscription: updated });
    } catch (err) {
      if (err instanceof NotFoundError) return c.json({ error: err.message }, 404);
      if (err instanceof ValidationError) return c.json({ error: err.message }, 400);
      throw err;
    }
  },
);

export { subscriptionRoutes };
