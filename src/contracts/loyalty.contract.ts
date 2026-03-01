import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const loyaltyTierSchema = z.object({
  id: z.string(),
  name: z.string(),
  minPoints: z.number(),
  multiplier: z.number(),
  color: z.string().nullable(),
  benefits: z.array(z.string()),
});

const loyaltyTransactionSchema = z.object({
  id: z.string(),
  type: z.enum(["earn", "redeem", "refund", "adjustment"]),
  points: z.number(),
  description: z.string(),
  sourceOrderId: z.string().nullable(),
  createdAt: z.date().nullable(),
});

export const loyaltyContract = c.router({
  wallet: {
    method: "GET",
    path: "/api/loyalty/wallet",
    responses: {
      200: z.object({
        walletId: z.string(),
        availablePoints: z.number(),
        lifetimeEarned: z.number(),
        lifetimeRedeemed: z.number(),
        currentTier: loyaltyTierSchema.nullable(),
        nextTier: z.object({
          id: z.string(),
          name: z.string(),
          minPoints: z.number(),
          multiplier: z.number(),
          pointsToUnlock: z.number(),
        }).nullable(),
        progressPercent: z.number(),
        rewards: z.array(z.object({
          id: z.string(),
          label: z.string(),
          cost: z.number(),
          description: z.string(),
          eligible: z.boolean(),
        })),
        transactions: z.array(loyaltyTransactionSchema),
      }),
      401: z.object({ error: z.string() }),
      403: z.object({ error: z.string(), code: z.string() }),
    },
  },
  redeem: {
    method: "POST",
    path: "/api/loyalty/redeem",
    body: z.object({
      rewardId: z.string(),
    }),
    responses: {
      200: z.object({
        rewardId: z.string(),
        rewardLabel: z.string(),
        pointsSpent: z.number(),
        benefitToken: z.string(),
        wallet: z.unknown(),
      }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      403: z.object({ error: z.string(), code: z.string() }),
    },
  },
});
