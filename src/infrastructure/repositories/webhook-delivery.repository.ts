import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { providerEvents } from "../db/schema";

export interface WebhookDeliveryRecord {
  id: string;
  storeId: string;
  provider: string;
  externalEventId: string | null;
  externalOrderId: string | null;
  eventType: string;
  payload: unknown;
  receivedAt: Date | null;
  processedAt: Date | null;
  errorMessage: string | null;
}

export interface RecordWebhookDeliveryInput {
  storeId: string;
  provider: string;
  externalEventId: string;
  externalOrderId?: string | null;
  eventType: string;
  payload: unknown;
}

export class WebhookDeliveryRepository {
  constructor(private readonly db: Database) {}

  async record(input: RecordWebhookDeliveryInput): Promise<{
    duplicate: boolean;
    record: WebhookDeliveryRecord;
  }> {
    const rows = await this.db
      .insert(providerEvents)
      .values({
        storeId: input.storeId,
        provider: input.provider,
        externalEventId: input.externalEventId,
        externalOrderId: input.externalOrderId ?? null,
        eventType: input.eventType,
        payload: input.payload as any,
      })
      .onConflictDoNothing()
      .returning();

    if (rows[0]) {
      return { duplicate: false, record: this.toRecord(rows[0]) };
    }

    const existing = await this.findByProviderAndExternalEventId(
      input.storeId,
      input.provider,
      input.externalEventId,
    );
    if (!existing) {
      throw new Error(
        `Webhook delivery insert conflicted but no existing row was found for ${input.provider}:${input.externalEventId}.`,
      );
    }
    return { duplicate: true, record: existing };
  }

  async findByProviderAndExternalEventId(
    storeId: string,
    provider: string,
    externalEventId: string,
  ): Promise<WebhookDeliveryRecord | null> {
    const rows = await this.db
      .select()
      .from(providerEvents)
      .where(
        and(
          eq(providerEvents.storeId, storeId),
          eq(providerEvents.provider, provider),
          eq(providerEvents.externalEventId, externalEventId),
        ),
      )
      .limit(1);
    return rows[0] ? this.toRecord(rows[0]) : null;
  }

  async markProcessed(id: string): Promise<void> {
    await this.db
      .update(providerEvents)
      .set({
        processedAt: new Date(),
        errorMessage: null,
      })
      .where(eq(providerEvents.id, id));
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.db
      .update(providerEvents)
      .set({
        errorMessage: errorMessage.slice(0, 4000),
      })
      .where(eq(providerEvents.id, id));
  }

  async listRecent(input: {
    storeId: string;
    provider?: string;
    limit: number;
  }): Promise<WebhookDeliveryRecord[]> {
    const limit = Math.max(1, Math.min(200, Math.floor(input.limit)));
    const rows = input.provider
      ? await this.db
          .select()
          .from(providerEvents)
          .where(
            and(
              eq(providerEvents.storeId, input.storeId),
              eq(providerEvents.provider, input.provider),
            ),
          )
          .orderBy(desc(providerEvents.receivedAt))
          .limit(limit)
      : await this.db
          .select()
          .from(providerEvents)
          .where(eq(providerEvents.storeId, input.storeId))
          .orderBy(desc(providerEvents.receivedAt))
          .limit(limit);

    return rows.map((row) => this.toRecord(row));
  }

  private toRecord(row: any): WebhookDeliveryRecord {
    return {
      id: row.id,
      storeId: row.storeId,
      provider: row.provider,
      externalEventId: row.externalEventId ?? null,
      externalOrderId: row.externalOrderId ?? null,
      eventType: row.eventType,
      payload: row.payload ?? null,
      receivedAt: row.receivedAt ?? null,
      processedAt: row.processedAt ?? null,
      errorMessage: row.errorMessage ?? null,
    };
  }
}
