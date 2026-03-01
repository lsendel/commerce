import { ValidationError } from "../../shared/errors";
import { LoyaltyRepository } from "../../infrastructure/repositories/loyalty.repository";

interface RewardDefinition {
  id: string;
  label: string;
  cost: number;
  description: string;
}

const ELIGIBLE_EARN_STATUSES = new Set(["shipped", "delivered"]);
const ELIGIBLE_REFUND_STATUSES = new Set(["refunded"]);

const DEFAULT_REWARDS: RewardDefinition[] = [
  {
    id: "free_shipping",
    label: "Free Shipping Voucher",
    cost: 150,
    description: "Redeem for one free shipping credit on your next checkout.",
  },
  {
    id: "discount_5",
    label: "$5 Off Voucher",
    cost: 250,
    description: "Redeem for a $5 equivalent discount credit.",
  },
  {
    id: "discount_10",
    label: "$10 Off Voucher",
    cost: 500,
    description: "Redeem for a $10 equivalent discount credit.",
  },
];

export class ManageLoyaltyWalletUseCase {
  constructor(private repo: LoyaltyRepository) {}

  private normalizePointsFromOrderTotal(total: string | number | null | undefined) {
    const amount = Number(total ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    return Math.max(0, Math.floor(amount));
  }

  private parseBenefits(benefits: unknown): string[] {
    if (!Array.isArray(benefits)) return [];
    return benefits
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private buildTierView(
    tiers: Array<{
      id: string;
      name: string;
      minPoints: number;
      multiplier: string;
      benefits: unknown;
      color: string | null;
    }>,
    lifetimeEarned: number,
  ) {
    const current = this.repo.findTierForPoints(lifetimeEarned, tiers) ?? tiers[0]!;
    const sorted = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
    const next = sorted.find((tier) => tier.minPoints > (current?.minPoints ?? 0)) ?? null;

    const nextThreshold = next?.minPoints ?? null;
    const progressDenominator = nextThreshold != null
      ? Math.max(1, nextThreshold - (current?.minPoints ?? 0))
      : 1;
    const progressNumerator = nextThreshold != null
      ? Math.max(0, lifetimeEarned - (current?.minPoints ?? 0))
      : progressDenominator;
    const progressPercent = nextThreshold != null
      ? Math.max(0, Math.min(100, Math.round((progressNumerator / progressDenominator) * 100)))
      : 100;

    return {
      current,
      next,
      progressPercent,
      pointsToNextTier: nextThreshold != null ? Math.max(0, nextThreshold - lifetimeEarned) : 0,
    };
  }

  private makeRewardCatalog(availablePoints: number) {
    return DEFAULT_REWARDS.map((reward) => ({
      ...reward,
      eligible: availablePoints >= reward.cost,
    }));
  }

  private async syncWalletFromOrders(walletId: string, userId: string) {
    const orders = await this.repo.listUserOrders(userId);
    const orderIds = orders.map((order) => order.id);
    const existingTransactions = await this.repo.listTransactionsByOrders(walletId, orderIds);

    const transactionByOrderAndType = new Map<string, { points: number }>();
    for (const tx of existingTransactions) {
      if (!tx.sourceOrderId) continue;
      transactionByOrderAndType.set(`${tx.sourceOrderId}:${tx.type}`, { points: tx.points });
    }

    for (const order of orders) {
      const status = order.status ?? "pending";
      const orderPoints = this.normalizePointsFromOrderTotal(order.total);
      if (orderPoints <= 0) continue;

      const earnKey = `${order.id}:earn`;
      const refundKey = `${order.id}:refund`;
      const earnTx = transactionByOrderAndType.get(earnKey);
      const refundTx = transactionByOrderAndType.get(refundKey);

      if (ELIGIBLE_EARN_STATUSES.has(status) && !earnTx) {
        try {
          await this.repo.createTransaction({
            walletId,
            userId,
            type: "earn",
            points: orderPoints,
            sourceOrderId: order.id,
            description: `Earned from order ${order.id.slice(0, 8).toUpperCase()}`,
          });
          transactionByOrderAndType.set(earnKey, { points: orderPoints });
        } catch {
          // Idempotency guard: ignore duplicate insertion races.
        }
      }

      if (ELIGIBLE_REFUND_STATUSES.has(status) && earnTx && !refundTx) {
        try {
          await this.repo.createTransaction({
            walletId,
            userId,
            type: "refund",
            points: -Math.abs(earnTx.points),
            sourceOrderId: order.id,
            description: `Reversed due to refund on order ${order.id.slice(0, 8).toUpperCase()}`,
          });
          transactionByOrderAndType.set(refundKey, { points: -Math.abs(earnTx.points) });
        } catch {
          // Idempotency guard: ignore duplicate insertion races.
        }
      }
    }
  }

  async getWallet(userId: string) {
    const tiers = await this.repo.ensureDefaultTiers();
    const baseTier = tiers[0];
    if (!baseTier) {
      throw new ValidationError("Could not initialize loyalty tiers");
    }

    const wallet = await this.repo.getOrCreateWallet(userId, baseTier.id);
    await this.syncWalletFromOrders(wallet.id, userId);

    const summary = await this.repo.summarizeWallet(wallet.id);
    const tierView = this.buildTierView(tiers, summary.lifetimeEarned);
    await this.repo.updateWalletSummary(wallet.id, {
      availablePoints: summary.availablePoints,
      lifetimeEarned: summary.lifetimeEarned,
      lifetimeRedeemed: summary.lifetimeRedeemed,
      currentTierId: tierView.current?.id ?? null,
    });

    const transactions = await this.repo.listTransactions(wallet.id, 30);
    return {
      walletId: wallet.id,
      availablePoints: summary.availablePoints,
      lifetimeEarned: summary.lifetimeEarned,
      lifetimeRedeemed: summary.lifetimeRedeemed,
      currentTier: tierView.current
        ? {
          id: tierView.current.id,
          name: tierView.current.name,
          minPoints: tierView.current.minPoints,
          multiplier: Number(tierView.current.multiplier),
          color: tierView.current.color,
          benefits: this.parseBenefits(tierView.current.benefits),
        }
        : null,
      nextTier: tierView.next
        ? {
          id: tierView.next.id,
          name: tierView.next.name,
          minPoints: tierView.next.minPoints,
          multiplier: Number(tierView.next.multiplier),
          pointsToUnlock: tierView.pointsToNextTier,
        }
        : null,
      progressPercent: tierView.progressPercent,
      rewards: this.makeRewardCatalog(summary.availablePoints),
      transactions: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        points: tx.points,
        description: tx.description ?? "",
        sourceOrderId: tx.sourceOrderId,
        createdAt: tx.createdAt,
      })),
    };
  }

  async redeemReward(userId: string, rewardId: string) {
    const walletView = await this.getWallet(userId);
    const reward = DEFAULT_REWARDS.find((item) => item.id === rewardId);
    if (!reward) {
      throw new ValidationError("Invalid loyalty reward");
    }
    if (walletView.availablePoints < reward.cost) {
      throw new ValidationError("Not enough points to redeem this reward");
    }

    await this.repo.createTransaction({
      walletId: walletView.walletId,
      userId,
      type: "redeem",
      points: -reward.cost,
      description: `Redeemed ${reward.label}`,
      metadata: {
        rewardId: reward.id,
        rewardLabel: reward.label,
      },
    });

    const updatedWallet = await this.getWallet(userId);
    const benefitToken = `LOYALTY-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    return {
      rewardId: reward.id,
      rewardLabel: reward.label,
      pointsSpent: reward.cost,
      benefitToken,
      wallet: updatedWallet,
    };
  }
}
