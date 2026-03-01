import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { orderReturnRequests } from "../db/schema";

export type ReturnRequestType = "refund" | "exchange";
export type ReturnRequestStatus = "submitted" | "approved" | "rejected" | "completed" | "cancelled";

export interface CreateOrderReturnRequestData {
  orderId: string;
  userId: string;
  type: ReturnRequestType;
  status?: ReturnRequestStatus;
  reason?: string | null;
  requestedItems: Array<{
    orderItemId: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    productName: string;
    variantId: string | null;
  }>;
  exchangeItems?: Array<{
    orderItemId: string;
    quantity: number;
    replacementVariantId: string;
  }>;
  refundAmount: string;
  creditAmount: string;
  instantExchange?: boolean;
  metadata?: Record<string, unknown> | null;
}

export class OrderReturnRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async createRequest(data: CreateOrderReturnRequestData) {
    const rows = await this.db
      .insert(orderReturnRequests)
      .values({
        storeId: this.storeId,
        orderId: data.orderId,
        userId: data.userId,
        type: data.type,
        status: data.status ?? "submitted",
        reason: data.reason ?? null,
        requestedItems: data.requestedItems,
        exchangeItems: data.exchangeItems ?? [],
        refundAmount: data.refundAmount,
        creditAmount: data.creditAmount,
        instantExchange: data.instantExchange ?? false,
        metadata: data.metadata ?? null,
      })
      .returning();

    return rows[0] ?? null;
  }

  async listByUserId(userId: string) {
    return this.db
      .select({
        id: orderReturnRequests.id,
        orderId: orderReturnRequests.orderId,
        type: orderReturnRequests.type,
        status: orderReturnRequests.status,
        reason: orderReturnRequests.reason,
        requestedItems: orderReturnRequests.requestedItems,
        exchangeItems: orderReturnRequests.exchangeItems,
        refundAmount: orderReturnRequests.refundAmount,
        creditAmount: orderReturnRequests.creditAmount,
        instantExchange: orderReturnRequests.instantExchange,
        createdAt: orderReturnRequests.createdAt,
        updatedAt: orderReturnRequests.updatedAt,
      })
      .from(orderReturnRequests)
      .where(and(
        eq(orderReturnRequests.userId, userId),
        eq(orderReturnRequests.storeId, this.storeId),
      ))
      .orderBy(desc(orderReturnRequests.createdAt));
  }

  async findByOrderId(orderId: string, userId?: string) {
    const conditions = [
      eq(orderReturnRequests.orderId, orderId),
      eq(orderReturnRequests.storeId, this.storeId),
    ];
    if (userId) {
      conditions.push(eq(orderReturnRequests.userId, userId));
    }

    return this.db
      .select({
        id: orderReturnRequests.id,
        orderId: orderReturnRequests.orderId,
        userId: orderReturnRequests.userId,
        type: orderReturnRequests.type,
        status: orderReturnRequests.status,
        reason: orderReturnRequests.reason,
        requestedItems: orderReturnRequests.requestedItems,
        exchangeItems: orderReturnRequests.exchangeItems,
        refundAmount: orderReturnRequests.refundAmount,
        creditAmount: orderReturnRequests.creditAmount,
        instantExchange: orderReturnRequests.instantExchange,
        createdAt: orderReturnRequests.createdAt,
        updatedAt: orderReturnRequests.updatedAt,
      })
      .from(orderReturnRequests)
      .where(and(...conditions))
      .orderBy(desc(orderReturnRequests.createdAt));
  }
}
