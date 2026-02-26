import { eq, and, or, desc, sql, count } from "drizzle-orm";
import type { Database } from "../db/client";
import { productReviews } from "../db/schema";
import type { ReviewStatus } from "../../domain/catalog/review.entity";

export interface CreateReviewData {
  productId: string;
  userId: string;
  rating: number;
  title: string | null;
  content: string | null;
  isVerifiedPurchase: boolean;
  verifiedPurchaseOrderId?: string | null;
  status: ReviewStatus;
}

export class ReviewRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async create(data: CreateReviewData) {
    const rows = await this.db
      .insert(productReviews)
      .values({
        storeId: this.storeId,
        productId: data.productId,
        userId: data.userId,
        rating: data.rating,
        title: data.title,
        content: data.content,
        isVerifiedPurchase: data.isVerifiedPurchase,
        verifiedPurchaseOrderId: data.verifiedPurchaseOrderId ?? null,
        status: data.status,
      })
      .returning();

    return rows[0]!;
  }

  async findByProduct(productId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const countResult = await this.db
      .select({ total: count() })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.productId, productId),
          eq(productReviews.storeId, this.storeId),
          eq(productReviews.status, "approved"),
        ),
      );

    const total = countResult[0]?.total ?? 0;

    const rows = await this.db
      .select()
      .from(productReviews)
      .where(
        and(
          eq(productReviews.productId, productId),
          eq(productReviews.storeId, this.storeId),
          eq(productReviews.status, "approved"),
        ),
      )
      .orderBy(desc(productReviews.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      reviews: rows.map((r) => ({
        id: r.id,
        productId: r.productId,
        userId: r.userId,
        rating: r.rating,
        title: r.title,
        content: r.content,
        isVerifiedPurchase: r.isVerifiedPurchase ?? false,
        status: r.status,
        helpfulCount: r.helpfulCount,
        reportedCount: r.reportedCount,
        createdAt: r.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async findFlagged(page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const countResult = await this.db
      .select({ total: count() })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.storeId, this.storeId),
          or(
            eq(productReviews.status, "flagged"),
            eq(productReviews.status, "pending"),
          ),
        ),
      );

    const total = countResult[0]?.total ?? 0;

    const rows = await this.db
      .select()
      .from(productReviews)
      .where(
        and(
          eq(productReviews.storeId, this.storeId),
          or(
            eq(productReviews.status, "flagged"),
            eq(productReviews.status, "pending"),
          ),
        ),
      )
      .orderBy(desc(productReviews.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      reviews: rows.map((r) => ({
        id: r.id,
        productId: r.productId,
        userId: r.userId,
        rating: r.rating,
        title: r.title,
        content: r.content,
        isVerifiedPurchase: r.isVerifiedPurchase ?? false,
        status: r.status,
        helpfulCount: r.helpfulCount,
        reportedCount: r.reportedCount,
        createdAt: r.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async moderate(id: string, status: "approved" | "rejected") {
    const rows = await this.db
      .update(productReviews)
      .set({
        status,
        moderatedAt: new Date(),
      })
      .where(
        and(
          eq(productReviews.id, id),
          eq(productReviews.storeId, this.storeId),
        ),
      )
      .returning();

    return rows[0] ?? null;
  }

  async getAverageRating(productId: string) {
    const result = await this.db
      .select({
        avg: sql<string>`coalesce(avg(${productReviews.rating}), 0)`,
        count: count(),
      })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.productId, productId),
          eq(productReviews.storeId, this.storeId),
          eq(productReviews.status, "approved"),
        ),
      );

    const row = result[0];
    return {
      average: row ? Number(row.avg) : 0,
      count: row?.count ?? 0,
    };
  }

  async getStarDistribution(productId: string) {
    const result = await this.db
      .select({
        rating: productReviews.rating,
        count: count(),
      })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.productId, productId),
          eq(productReviews.storeId, this.storeId),
          eq(productReviews.status, "approved"),
        ),
      )
      .groupBy(productReviews.rating);

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of result) {
      distribution[row.rating] = row.count;
    }
    return distribution;
  }

  async incrementHelpful(id: string) {
    const rows = await this.db
      .update(productReviews)
      .set({
        helpfulCount: sql`${productReviews.helpfulCount} + 1`,
      })
      .where(
        and(
          eq(productReviews.id, id),
          eq(productReviews.storeId, this.storeId),
        ),
      )
      .returning();

    return rows[0] ?? null;
  }

  async incrementReported(id: string) {
    // Increment reported_count, auto-flag if > 3
    const rows = await this.db
      .update(productReviews)
      .set({
        reportedCount: sql`${productReviews.reportedCount} + 1`,
      })
      .where(
        and(
          eq(productReviews.id, id),
          eq(productReviews.storeId, this.storeId),
        ),
      )
      .returning();

    const review = rows[0];
    if (!review) return null;

    // Auto-flag if reported count exceeds 3
    if ((review.reportedCount ?? 0) > 3 && review.status === "approved") {
      const flaggedRows = await this.db
        .update(productReviews)
        .set({ status: "flagged" })
        .where(eq(productReviews.id, id))
        .returning();

      return flaggedRows[0] ?? review;
    }

    return review;
  }

  async addResponse(id: string, responseText: string) {
    const rows = await this.db
      .update(productReviews)
      .set({
        responseText,
        responseAt: new Date(),
      })
      .where(
        and(
          eq(productReviews.id, id),
          eq(productReviews.storeId, this.storeId),
        ),
      )
      .returning();

    return rows[0] ?? null;
  }

  async listAll(page = 1, limit = 50, statusFilter?: string) {
    const offset = (page - 1) * limit;
    const conditions = [eq(productReviews.storeId, this.storeId)];

    if (statusFilter) {
      conditions.push(eq(productReviews.status, statusFilter as any));
    }

    const countResult = await this.db
      .select({ total: count() })
      .from(productReviews)
      .where(and(...conditions));

    const total = countResult[0]?.total ?? 0;

    const rows = await this.db
      .select()
      .from(productReviews)
      .where(and(...conditions))
      .orderBy(desc(productReviews.createdAt))
      .limit(limit)
      .offset(offset);

    return { reviews: rows, total, page, limit };
  }

  async findById(id: string) {
    const rows = await this.db
      .select()
      .from(productReviews)
      .where(
        and(
          eq(productReviews.id, id),
          eq(productReviews.storeId, this.storeId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }
}
