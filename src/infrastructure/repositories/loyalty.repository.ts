import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  loyaltyTiers,
  loyaltyTransactions,
  loyaltyWallets,
  orders,
} from "../db/schema";

export type LoyaltyTransactionType = "earn" | "redeem" | "refund" | "adjustment";

export interface LoyaltyTierRecord {
  id: string;
  storeId: string;
  name: string;
  minPoints: number;
  multiplier: string;
  benefits: unknown;
  color: string | null;
}

export class LoyaltyRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async listTiers() {
    return this.db
      .select()
      .from(loyaltyTiers)
      .where(eq(loyaltyTiers.storeId, this.storeId))
      .orderBy(asc(loyaltyTiers.minPoints));
  }

  async ensureDefaultTiers() {
    const existing = await this.listTiers();
    if (existing.length > 0) return existing;

    await this.db.insert(loyaltyTiers).values([
      {
        storeId: this.storeId,
        name: "Bronze",
        minPoints: 0,
        multiplier: "1.00",
        benefits: [
          "Early access to selected drops",
          "Birthday bonus points",
        ],
        color: "amber",
      },
      {
        storeId: this.storeId,
        name: "Silver",
        minPoints: 500,
        multiplier: "1.10",
        benefits: [
          "All Bronze benefits",
          "Priority support queue",
          "Monthly member-only offer",
        ],
        color: "slate",
      },
      {
        storeId: this.storeId,
        name: "Gold",
        minPoints: 1500,
        multiplier: "1.25",
        benefits: [
          "All Silver benefits",
          "VIP launch previews",
          "Quarterly surprise perk",
        ],
        color: "yellow",
      },
    ]);

    return this.listTiers();
  }

  async findTierById(id: string) {
    const rows = await this.db
      .select()
      .from(loyaltyTiers)
      .where(
        and(
          eq(loyaltyTiers.id, id),
          eq(loyaltyTiers.storeId, this.storeId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  findTierForPoints<T extends { id: string; minPoints: number }>(
    points: number,
    tiers: T[],
  ) {
    const sorted = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
    let selected = sorted[0] ?? null;
    for (const tier of sorted) {
      if (points >= tier.minPoints) selected = tier;
    }
    return selected;
  }

  async getWallet(userId: string) {
    const rows = await this.db
      .select()
      .from(loyaltyWallets)
      .where(
        and(
          eq(loyaltyWallets.storeId, this.storeId),
          eq(loyaltyWallets.userId, userId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async getOrCreateWallet(userId: string, initialTierId: string) {
    const existing = await this.getWallet(userId);
    if (existing) return existing;

    const rows = await this.db
      .insert(loyaltyWallets)
      .values({
        storeId: this.storeId,
        userId,
        availablePoints: 0,
        lifetimeEarned: 0,
        lifetimeRedeemed: 0,
        currentTierId: initialTierId,
      })
      .returning();
    return rows[0]!;
  }

  async updateWalletSummary(
    walletId: string,
    values: {
      availablePoints: number;
      lifetimeEarned: number;
      lifetimeRedeemed: number;
      currentTierId: string | null;
    },
  ) {
    const rows = await this.db
      .update(loyaltyWallets)
      .set({
        availablePoints: values.availablePoints,
        lifetimeEarned: values.lifetimeEarned,
        lifetimeRedeemed: values.lifetimeRedeemed,
        currentTierId: values.currentTierId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(loyaltyWallets.id, walletId),
          eq(loyaltyWallets.storeId, this.storeId),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async listUserOrders(userId: string) {
    return this.db
      .select({
        id: orders.id,
        status: orders.status,
        total: orders.total,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(
        and(
          eq(orders.storeId, this.storeId),
          eq(orders.userId, userId),
        ),
      )
      .orderBy(asc(orders.createdAt));
  }

  async listTransactions(walletId: string, limit = 50) {
    return this.db
      .select()
      .from(loyaltyTransactions)
      .where(
        and(
          eq(loyaltyTransactions.storeId, this.storeId),
          eq(loyaltyTransactions.walletId, walletId),
        ),
      )
      .orderBy(desc(loyaltyTransactions.createdAt))
      .limit(limit);
  }

  async listTransactionsByOrders(walletId: string, orderIds: string[]) {
    if (orderIds.length === 0) return [];
    return this.db
      .select()
      .from(loyaltyTransactions)
      .where(
        and(
          eq(loyaltyTransactions.storeId, this.storeId),
          eq(loyaltyTransactions.walletId, walletId),
          inArray(loyaltyTransactions.sourceOrderId, orderIds),
        ),
      );
  }

  async createTransaction(input: {
    walletId: string;
    userId: string;
    type: LoyaltyTransactionType;
    points: number;
    description: string;
    sourceOrderId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const rows = await this.db
      .insert(loyaltyTransactions)
      .values({
        storeId: this.storeId,
        walletId: input.walletId,
        userId: input.userId,
        type: input.type,
        points: input.points,
        description: input.description,
        sourceOrderId: input.sourceOrderId ?? null,
        metadata: input.metadata ?? null,
      })
      .returning();
    return rows[0] ?? null;
  }

  async summarizeWallet(walletId: string) {
    const rows = await this.db
      .select({
        availablePoints: sql<number>`coalesce(sum(${loyaltyTransactions.points}), 0)`,
        lifetimeEarned: sql<number>`coalesce(sum(case when ${loyaltyTransactions.points} > 0 then ${loyaltyTransactions.points} else 0 end), 0)`,
        lifetimeRedeemed: sql<number>`coalesce(sum(case when ${loyaltyTransactions.type} = 'redeem' then abs(${loyaltyTransactions.points}) else 0 end), 0)`,
      })
      .from(loyaltyTransactions)
      .where(
        and(
          eq(loyaltyTransactions.storeId, this.storeId),
          eq(loyaltyTransactions.walletId, walletId),
        ),
      );

    const row = rows[0];
    return {
      availablePoints: Number(row?.availablePoints ?? 0),
      lifetimeEarned: Number(row?.lifetimeEarned ?? 0),
      lifetimeRedeemed: Number(row?.lifetimeRedeemed ?? 0),
    };
  }
}
