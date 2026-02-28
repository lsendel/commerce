import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { UserRepository } from "../../infrastructure/repositories/user.repository";
import { OrderRepository } from "../../infrastructure/repositories/order.repository";
import { SubscriptionRepository } from "../../infrastructure/repositories/subscription.repository";
import { GetProfileUseCase } from "../../application/identity/get-profile.usecase";
import { UpdateProfileUseCase } from "../../application/identity/update-profile.usecase";
import { ManageAddressesUseCase } from "../../application/identity/manage-addresses.usecase";
import { requireAuth } from "../../middleware/auth.middleware";
import { updateProfileSchema, addressSchema } from "../../shared/validators";

const account = new Hono<{ Bindings: Env }>();

// All account routes require authentication
account.use("/*", requireAuth());

// GET /account/profile — current user profile
account.get("/profile", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const useCase = new GetProfileUseCase(new UserRepository(db));
  const profile = await useCase.execute(c.get("userId"));
  return c.json(profile);
});

// PATCH /account/profile — update profile
account.patch("/profile", zValidator("json", updateProfileSchema), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const useCase = new UpdateProfileUseCase(new UserRepository(db));
  const result = await useCase.execute(c.get("userId"), c.req.valid("json"));
  return c.json(result);
});

// GET /account/orders — user's order history
account.get("/orders", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const orderRepo = new OrderRepository(db, storeId);
  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit")) || 10));
  const result = await orderRepo.findByUserId(c.get("userId"), { page, limit });
  return c.json(result);
});

// GET /account/subscriptions — user's subscriptions
account.get("/subscriptions", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const subRepo = new SubscriptionRepository(db, storeId);
  const subscriptions = await subRepo.findByUserId(c.get("userId"));
  return c.json({ subscriptions });
});

// GET /account/addresses — user's addresses
account.get("/addresses", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const useCase = new ManageAddressesUseCase(new UserRepository(db));
  const addresses = await useCase.list(c.get("userId"));
  return c.json({ addresses });
});

// POST /account/addresses — add address
account.post("/addresses", zValidator("json", addressSchema), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const useCase = new ManageAddressesUseCase(new UserRepository(db));
  const address = await useCase.create(c.get("userId"), c.req.valid("json"));
  return c.json({ address }, 201);
});

// PATCH /account/addresses/:id — update address
account.patch("/addresses/:id", zValidator("json", addressSchema), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const useCase = new ManageAddressesUseCase(new UserRepository(db));
  const address = await useCase.update(c.get("userId"), c.req.param("id"), c.req.valid("json"));
  return c.json({ address });
});

// DELETE /account/addresses/:id — delete address
account.delete("/addresses/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const useCase = new ManageAddressesUseCase(new UserRepository(db));
  await useCase.remove(c.get("userId"), c.req.param("id"));
  return c.json({ success: true });
});

export { account as accountRoutes };
