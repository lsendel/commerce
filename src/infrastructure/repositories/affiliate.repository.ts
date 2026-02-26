import { eq, and, desc, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  affiliates,
  affiliateTiers,
  affiliateLinks,
  affiliateClicks,
  affiliateConversions,
  affiliatePayouts,
} from "../db/schema";

export class AffiliateRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  // Affiliates
  async create(data: {
    userId: string;
    referralCode: string;
    commissionRate: string;
    parentAffiliateId?: string;
    tierId?: string;
    customSlug?: string;
  }) {
    const [affiliate] = await this.db
      .insert(affiliates)
      .values({ ...data, storeId: this.storeId })
      .returning();
    return affiliate;
  }

  async findById(id: string) {
    const [affiliate] = await this.db
      .select()
      .from(affiliates)
      .where(and(eq(affiliates.id, id), eq(affiliates.storeId, this.storeId)))
      .limit(1);
    return affiliate ?? null;
  }

  async findByUserId(userId: string) {
    const [affiliate] = await this.db
      .select()
      .from(affiliates)
      .where(
        and(
          eq(affiliates.userId, userId),
          eq(affiliates.storeId, this.storeId),
        ),
      )
      .limit(1);
    return affiliate ?? null;
  }

  async findByReferralCode(code: string) {
    const [affiliate] = await this.db
      .select()
      .from(affiliates)
      .where(eq(affiliates.referralCode, code))
      .limit(1);
    return affiliate ?? null;
  }

  async updateStatus(id: string, status: "pending" | "approved" | "suspended") {
    const [affiliate] = await this.db
      .update(affiliates)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(affiliates.id, id), eq(affiliates.storeId, this.storeId)))
      .returning();
    return affiliate;
  }

  async incrementClicks(id: string) {
    await this.db
      .update(affiliates)
      .set({
        totalClicks: sql`${affiliates.totalClicks} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(affiliates.id, id));
  }

  async incrementConversions(id: string, earnings: string) {
    await this.db
      .update(affiliates)
      .set({
        totalConversions: sql`${affiliates.totalConversions} + 1`,
        totalEarnings: sql`${affiliates.totalEarnings} + ${earnings}::decimal`,
        updatedAt: new Date(),
      })
      .where(eq(affiliates.id, id));
  }

  async listAll() {
    return this.db
      .select()
      .from(affiliates)
      .where(eq(affiliates.storeId, this.storeId))
      .orderBy(desc(affiliates.createdAt));
  }

  async listPending() {
    return this.db
      .select()
      .from(affiliates)
      .where(
        and(
          eq(affiliates.storeId, this.storeId),
          eq(affiliates.status, "pending"),
        ),
      )
      .orderBy(desc(affiliates.createdAt));
  }

  // Links
  async createLink(data: {
    affiliateId: string;
    targetUrl: string;
    shortCode: string;
  }) {
    const [link] = await this.db
      .insert(affiliateLinks)
      .values(data)
      .returning();
    return link;
  }

  async findLinks(affiliateId: string) {
    return this.db
      .select()
      .from(affiliateLinks)
      .where(eq(affiliateLinks.affiliateId, affiliateId))
      .orderBy(desc(affiliateLinks.createdAt));
  }

  async findLinkByShortCode(shortCode: string) {
    const [link] = await this.db
      .select()
      .from(affiliateLinks)
      .where(eq(affiliateLinks.shortCode, shortCode))
      .limit(1);
    return link ?? null;
  }

  async incrementLinkClicks(linkId: string) {
    await this.db
      .update(affiliateLinks)
      .set({ clickCount: sql`${affiliateLinks.clickCount} + 1` })
      .where(eq(affiliateLinks.id, linkId));
  }

  // Clicks
  async recordClick(data: {
    linkId: string;
    ip?: string;
    userAgent?: string;
    referrer?: string;
  }) {
    const [click] = await this.db
      .insert(affiliateClicks)
      .values(data)
      .returning();
    return click;
  }

  // Conversions
  async createConversion(data: {
    affiliateId: string;
    orderId: string;
    orderTotal: string;
    commissionAmount: string;
    attributionMethod: "link" | "coupon" | "tier";
    clickId?: string;
    couponCode?: string;
    parentConversionId?: string;
  }) {
    const [conversion] = await this.db
      .insert(affiliateConversions)
      .values(data)
      .returning();
    return conversion;
  }

  async findConversions(affiliateId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    return this.db
      .select()
      .from(affiliateConversions)
      .where(eq(affiliateConversions.affiliateId, affiliateId))
      .orderBy(desc(affiliateConversions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async approveConversion(id: string) {
    const [conversion] = await this.db
      .update(affiliateConversions)
      .set({ status: "approved" })
      .where(eq(affiliateConversions.id, id))
      .returning();
    return conversion;
  }

  async findApprovedUnpaidConversions() {
    return this.db
      .select()
      .from(affiliateConversions)
      .where(eq(affiliateConversions.status, "approved"));
  }

  // Payouts
  async createPayout(data: {
    affiliateId: string;
    amount: string;
    periodStart: Date;
    periodEnd: Date;
    stripeTransferId?: string;
  }) {
    const [payout] = await this.db
      .insert(affiliatePayouts)
      .values(data)
      .returning();
    return payout;
  }

  async findPayouts(affiliateId: string) {
    return this.db
      .select()
      .from(affiliatePayouts)
      .where(eq(affiliatePayouts.affiliateId, affiliateId))
      .orderBy(desc(affiliatePayouts.createdAt));
  }

  // Tiers
  async findTiers() {
    return this.db
      .select()
      .from(affiliateTiers)
      .where(eq(affiliateTiers.storeId, this.storeId));
  }

  async findTierById(id: string) {
    const [tier] = await this.db
      .select()
      .from(affiliateTiers)
      .where(
        and(
          eq(affiliateTiers.id, id),
          eq(affiliateTiers.storeId, this.storeId),
        ),
      )
      .limit(1);
    return tier ?? null;
  }
}
