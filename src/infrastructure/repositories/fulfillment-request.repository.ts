import { eq, and, inArray } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  fulfillmentRequests,
  fulfillmentRequestItems,
  providerEvents,
} from "../db/schema";
import type { FulfillmentRequestStatus } from "../../domain/fulfillment/fulfillment-request.entity";

interface CreateRequestData {
  orderId: string;
  provider: string;
  providerId?: string;
  itemsSnapshot?: unknown;
  costEstimatedTotal?: string;
  items: Array<{
    orderItemId: string;
    quantity: number;
  }>;
}

interface CreateEventData {
  provider: string;
  externalEventId?: string;
  externalOrderId?: string;
  eventType: string;
  payload?: unknown;
}

export class FulfillmentRequestRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async create(data: CreateRequestData) {
    const [request] = await this.db
      .insert(fulfillmentRequests)
      .values({
        storeId: this.storeId,
        orderId: data.orderId,
        provider: data.provider,
        providerId: data.providerId,
        itemsSnapshot: data.itemsSnapshot,
        costEstimatedTotal: data.costEstimatedTotal,
      })
      .returning();

    if (data.items.length > 0) {
      await this.db.insert(fulfillmentRequestItems).values(
        data.items.map((item) => ({
          fulfillmentRequestId: request.id,
          orderItemId: item.orderItemId,
          quantity: item.quantity,
        })),
      );
    }

    return request;
  }

  async findById(id: string) {
    const rows = await this.db
      .select()
      .from(fulfillmentRequests)
      .where(
        and(
          eq(fulfillmentRequests.id, id),
          eq(fulfillmentRequests.storeId, this.storeId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findByOrderId(orderId: string) {
    return this.db
      .select()
      .from(fulfillmentRequests)
      .where(
        and(
          eq(fulfillmentRequests.orderId, orderId),
          eq(fulfillmentRequests.storeId, this.storeId),
        ),
      );
  }

  async findByExternalId(provider: string, externalId: string) {
    const rows = await this.db
      .select()
      .from(fulfillmentRequests)
      .where(
        and(
          eq(fulfillmentRequests.provider, provider),
          eq(fulfillmentRequests.externalId, externalId),
          eq(fulfillmentRequests.storeId, this.storeId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findItemsByRequestId(requestId: string) {
    return this.db
      .select()
      .from(fulfillmentRequestItems)
      .where(eq(fulfillmentRequestItems.fulfillmentRequestId, requestId));
  }

  async updateStatus(
    id: string,
    status: FulfillmentRequestStatus,
    extra?: Partial<{
      externalId: string;
      errorMessage: string;
      costActualTotal: string;
      costShipping: string;
      costTax: string;
      refundStripeId: string;
      refundAmount: string;
      refundStatus: string;
      submittedAt: Date;
      completedAt: Date;
    }>,
  ) {
    const values: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
      ...extra,
    };
    const rows = await this.db
      .update(fulfillmentRequests)
      .set(values)
      .where(
        and(
          eq(fulfillmentRequests.id, id),
          eq(fulfillmentRequests.storeId, this.storeId),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async findPendingByProvider(provider: string) {
    return this.db
      .select()
      .from(fulfillmentRequests)
      .where(
        and(
          eq(fulfillmentRequests.provider, provider),
          eq(fulfillmentRequests.storeId, this.storeId),
          inArray(fulfillmentRequests.status, ["submitted", "processing"]),
        ),
      );
  }

  async insertProviderEvent(data: CreateEventData) {
    const rows = await this.db
      .insert(providerEvents)
      .values({
        storeId: this.storeId,
        provider: data.provider,
        externalEventId: data.externalEventId,
        externalOrderId: data.externalOrderId,
        eventType: data.eventType,
        payload: data.payload,
      })
      .onConflictDoNothing()
      .returning();
    return rows[0] ?? null;
  }

  async markEventProcessed(eventId: string) {
    await this.db
      .update(providerEvents)
      .set({ processedAt: new Date() })
      .where(eq(providerEvents.id, eventId));
  }
}
