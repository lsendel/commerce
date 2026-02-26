import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { orders, shipments, fulfillmentRequests } from "../db/schema";
import { FulfillmentRequestRepository } from "../repositories/fulfillment-request.repository";
import type { FulfillmentRequestStatus } from "../../domain/fulfillment/fulfillment-request.entity";

interface WebhookEvent {
  provider: string;
  externalEventId?: string;
  externalOrderId: string;
  eventType: string;
  payload: unknown;
  /** Mapped status for the fulfillment request */
  mappedStatus?: FulfillmentRequestStatus;
  /** Shipment data if available */
  shipment?: {
    carrier: string;
    trackingNumber: string;
    trackingUrl: string;
    shippedAt: Date;
    raw?: unknown;
  };
}

export class FulfillmentWebhookRouter {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async processEvent(event: WebhookEvent) {
    const requestRepo = new FulfillmentRequestRepository(this.db, this.storeId);

    // 1. Record the event (dedup via unique index)
    const recorded = await requestRepo.insertProviderEvent({
      provider: event.provider,
      externalEventId: event.externalEventId,
      externalOrderId: event.externalOrderId,
      eventType: event.eventType,
      payload: event.payload,
    });

    if (!recorded) {
      // Duplicate event — already processed
      return { duplicate: true, eventId: null };
    }

    // 2. Find the fulfillment request by externalId
    const request = await requestRepo.findByExternalId(
      event.provider,
      event.externalOrderId,
    );

    if (!request) {
      // No matching request — mark event as processed and return
      await requestRepo.markEventProcessed(recorded.id);
      return { duplicate: false, eventId: recorded.id, requestFound: false };
    }

    // 3. Update fulfillment request status if a mapped status is provided
    if (event.mappedStatus) {
      const extra: Record<string, unknown> = {};
      if (
        event.mappedStatus === "shipped" ||
        event.mappedStatus === "delivered"
      ) {
        extra.completedAt = new Date();
      }
      await requestRepo.updateStatus(
        request.id,
        event.mappedStatus,
        extra as any,
      );
    }

    // 4. Create shipment record if shipment data provided
    if (event.shipment) {
      await this.db.insert(shipments).values({
        storeId: this.storeId,
        orderId: request.orderId,
        fulfillmentRequestId: request.id,
        carrier: event.shipment.carrier,
        trackingNumber: event.shipment.trackingNumber,
        trackingUrl: event.shipment.trackingUrl,
        status: "shipped",
        shippedAt: event.shipment.shippedAt,
        raw: event.shipment.raw as any,
      });
    }

    // 5. Aggregate order status from all requests
    await this.aggregateOrderStatus(request.orderId);

    // 6. Mark event as processed
    await requestRepo.markEventProcessed(recorded.id);

    return {
      duplicate: false,
      eventId: recorded.id,
      requestFound: true,
      requestId: request.id,
    };
  }

  /**
   * Derive overall order status from all its fulfillment requests.
   * If all shipped/delivered → shipped. If any failed → processing. If all cancelled → cancelled.
   */
  async aggregateOrderStatus(orderId: string) {
    const requests = await this.db
      .select({ status: fulfillmentRequests.status })
      .from(fulfillmentRequests)
      .where(eq(fulfillmentRequests.orderId, orderId));

    if (requests.length === 0) return;

    const statuses = requests.map((r) => r.status);

    let orderStatus: "processing" | "shipped" | "delivered" | "cancelled";

    if (statuses.every((s) => s === "delivered")) {
      orderStatus = "delivered";
    } else if (
      statuses.every((s) => s === "shipped" || s === "delivered")
    ) {
      orderStatus = "shipped";
    } else if (statuses.every((s) => s === "cancelled")) {
      orderStatus = "cancelled";
    } else {
      orderStatus = "processing";
    }

    await this.db
      .update(orders)
      .set({ status: orderStatus, updatedAt: new Date() })
      .where(eq(orders.id, orderId));
  }
}
