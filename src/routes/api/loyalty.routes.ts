import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { resolveFeatureFlags } from "../../shared/feature-flags";
import { LoyaltyRepository } from "../../infrastructure/repositories/loyalty.repository";
import { ManageLoyaltyWalletUseCase } from "../../application/loyalty/manage-loyalty-wallet.usecase";
import { ValidationError } from "../../shared/errors";

const loyalty = new Hono<{ Bindings: Env }>();
const redeemSchema = z.object({
  rewardId: z.string().min(1),
});

function checkLoyaltyFlag(c: any) {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags.loyalty_wallet) {
    return c.json(
      { error: "Loyalty wallet is currently disabled", code: "FEATURE_DISABLED" },
      403,
    );
  }
  return null;
}

loyalty.use("/loyalty/*", requireAuth());

// GET /loyalty/wallet — loyalty wallet summary, tier, and recent transactions
loyalty.get("/loyalty/wallet", async (c) => {
  const flagError = checkLoyaltyFlag(c);
  if (flagError) return flagError;

  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const userId = c.get("userId");

  const repo = new LoyaltyRepository(db, storeId);
  const useCase = new ManageLoyaltyWalletUseCase(repo);
  const wallet = await useCase.getWallet(userId);
  return c.json(wallet, 200);
});

// POST /loyalty/redeem — redeem points for a wallet reward
loyalty.post("/loyalty/redeem", zValidator("json", redeemSchema), async (c) => {
  const flagError = checkLoyaltyFlag(c);
  if (flagError) return flagError;

  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const userId = c.get("userId");
  const body = c.req.valid("json");

  const repo = new LoyaltyRepository(db, storeId);
  const useCase = new ManageLoyaltyWalletUseCase(repo);

  try {
    const result = await useCase.redeemReward(userId, body.rewardId);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof ValidationError) {
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
});

export { loyalty as loyaltyRoutes };
