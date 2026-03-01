import { eq, and, or, lte, gte, sql, isNull } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  promotions,
  couponCodes,
  promotionRedemptions,
  promotionProductEligibility,
  customerSegmentMemberships,
  customerSegments,
} from "../db/schema";

export class PromotionRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async create(data: {
    name: string;
    description?: string;
    type: "coupon" | "automatic" | "flash_sale";
    strategyType: string;
    strategyParams: Record<string, unknown>;
    conditions: Record<string, unknown>;
    priority?: number;
    stackable?: boolean;
    startsAt?: Date;
    endsAt?: Date;
    usageLimit?: number;
  }) {
    const inserted = await this.db
      .insert(promotions)
      .values({
        storeId: this.storeId,
        name: data.name,
        description: data.description ?? null,
        type: data.type,
        strategyType: data.strategyType as any,
        strategyParams: data.strategyParams,
        conditions: data.conditions,
        priority: data.priority ?? 0,
        stackable: data.stackable ?? false,
        startsAt: data.startsAt ?? null,
        endsAt: data.endsAt ?? null,
        usageLimit: data.usageLimit ?? null,
      })
      .returning();
    return inserted[0] ?? null;
  }

  async findById(id: string) {
    const rows = await this.db
      .select()
      .from(promotions)
      .where(and(eq(promotions.id, id), eq(promotions.storeId, this.storeId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async listActive() {
    const now = new Date();
    return this.db
      .select()
      .from(promotions)
      .where(
        and(
          eq(promotions.storeId, this.storeId),
          eq(promotions.status, "active"),
          or(isNull(promotions.startsAt), lte(promotions.startsAt, now)),
          or(isNull(promotions.endsAt), gte(promotions.endsAt, now)),
        ),
      )
      .orderBy(promotions.priority);
  }

  async listAll() {
    return this.db
      .select()
      .from(promotions)
      .where(eq(promotions.storeId, this.storeId))
      .orderBy(promotions.priority);
  }

  async update(id: string, data: Partial<{
    name: string;
    description: string | null;
    status: "active" | "scheduled" | "expired" | "disabled";
    priority: number;
    stackable: boolean;
    strategyType: string;
    strategyParams: Record<string, unknown>;
    conditions: Record<string, unknown>;
    startsAt: Date | null;
    endsAt: Date | null;
    usageLimit: number | null;
  }>) {
    const updated = await this.db
      .update(promotions)
      .set({
        ...data,
        strategyType: data.strategyType as any,
        updatedAt: new Date(),
      })
      .where(and(eq(promotions.id, id), eq(promotions.storeId, this.storeId)))
      .returning();
    return updated[0] ?? null;
  }

  async findCouponByCode(code: string) {
    const rows = await this.db
      .select({
        coupon: couponCodes,
        promotion: promotions,
      })
      .from(couponCodes)
      .innerJoin(promotions, eq(couponCodes.promotionId, promotions.id))
      .where(
        and(
          eq(couponCodes.code, code.toUpperCase()),
          eq(promotions.storeId, this.storeId),
          eq(promotions.status, "active"),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async createCouponCode(promotionId: string, code: string, maxRedemptions?: number) {
    const inserted = await this.db
      .insert(couponCodes)
      .values({
        promotionId,
        code: code.toUpperCase(),
        maxRedemptions: maxRedemptions ?? null,
      })
      .returning();
    return inserted[0] ?? null;
  }

  async recordRedemption(data: {
    promotionId: string;
    couponCodeId?: string;
    orderId: string;
    customerId: string;
    discountAmount: number;
  }) {
    // Increment usage count on promotion
    await this.db
      .update(promotions)
      .set({ usageCount: sql`${promotions.usageCount} + 1` })
      .where(eq(promotions.id, data.promotionId));

    // Increment redemption count on coupon if applicable
    if (data.couponCodeId) {
      await this.db
        .update(couponCodes)
        .set({ redemptionCount: sql`${couponCodes.redemptionCount} + 1` })
        .where(eq(couponCodes.id, data.couponCodeId));
    }

    const inserted = await this.db
      .insert(promotionRedemptions)
      .values({
        promotionId: data.promotionId,
        couponCodeId: data.couponCodeId ?? null,
        orderId: data.orderId,
        customerId: data.customerId,
        discountAmount: String(data.discountAmount),
      })
      .returning();
    return inserted[0] ?? null;
  }

  async getCustomerRedemptionCount(promotionId: string, customerId: string) {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(promotionRedemptions)
      .where(
        and(
          eq(promotionRedemptions.promotionId, promotionId),
          eq(promotionRedemptions.customerId, customerId),
        ),
      );
    return result[0]?.count ?? 0;
  }

  async getEligibility(promotionId: string) {
    return this.db
      .select()
      .from(promotionProductEligibility)
      .where(eq(promotionProductEligibility.promotionId, promotionId));
  }

  async isCustomerInSegment(customerId: string, segmentId: string) {
    const rows = await this.db
      .select()
      .from(customerSegmentMemberships)
      .where(
        and(
          eq(customerSegmentMemberships.customerId, customerId),
          eq(customerSegmentMemberships.segmentId, segmentId),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async getCustomerSegments(customerId: string): Promise<string[]> {
    const rows = await this.db
      .select({ segmentId: customerSegmentMemberships.segmentId })
      .from(customerSegmentMemberships)
      .where(eq(customerSegmentMemberships.customerId, customerId));
    return rows.map((r) => r.segmentId);
  }

  async createSegment(data: {
    name: string;
    description?: string;
    rules: Record<string, unknown>;
  }) {
    const inserted = await this.db
      .insert(customerSegments)
      .values({
        storeId: this.storeId,
        name: data.name,
        description: data.description ?? null,
        rules: data.rules,
      })
      .returning();
    return inserted[0] ?? null;
  }

  async listSegments() {
    return this.db
      .select()
      .from(customerSegments)
      .where(eq(customerSegments.storeId, this.storeId));
  }

  async findSegmentById(id: string) {
    const rows = await this.db
      .select()
      .from(customerSegments)
      .where(and(eq(customerSegments.id, id), eq(customerSegments.storeId, this.storeId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async updateSegment(id: string, data: Partial<{
    name: string;
    description: string | null;
    rules: Record<string, unknown>;
    memberCount: number;
    lastRefreshedAt: Date;
  }>) {
    const updated = await this.db
      .update(customerSegments)
      .set(data)
      .where(and(eq(customerSegments.id, id), eq(customerSegments.storeId, this.storeId)))
      .returning();
    return updated[0] ?? null;
  }

  async refreshSegmentMemberships(segmentId: string, customerIds: string[]) {
    await this.db
      .delete(customerSegmentMemberships)
      .where(eq(customerSegmentMemberships.segmentId, segmentId));

    if (customerIds.length > 0) {
      await this.db.insert(customerSegmentMemberships).values(
        customerIds.map((customerId) => ({
          segmentId,
          customerId,
        })),
      );
    }

    const updated = await this.db
      .update(customerSegments)
      .set({
        memberCount: customerIds.length,
        lastRefreshedAt: new Date(),
      })
      .where(and(eq(customerSegments.id, segmentId), eq(customerSegments.storeId, this.storeId)))
      .returning();

    return updated[0] ?? null;
  }

  async getRedemptionAnalytics() {
    return this.db
      .select({
        promotionId: promotionRedemptions.promotionId,
        totalRedemptions: sql<number>`count(*)`,
        totalDiscount: sql<string>`sum(${promotionRedemptions.discountAmount})`,
        uniqueCustomers: sql<number>`count(distinct ${promotionRedemptions.customerId})`,
      })
      .from(promotionRedemptions)
      .innerJoin(promotions, eq(promotionRedemptions.promotionId, promotions.id))
      .where(eq(promotions.storeId, this.storeId))
      .groupBy(promotionRedemptions.promotionId);
  }
}
