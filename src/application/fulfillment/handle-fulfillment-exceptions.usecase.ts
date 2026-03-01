import { and, asc, eq, inArray } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import { fulfillmentRequests } from "../../infrastructure/db/schema";

export type FulfillmentExceptionAction = "retry" | "monitor" | "manual_review";

export interface FulfillmentExceptionItem {
  requestId: string;
  orderId: string;
  provider: string;
  status: string;
  ageMinutes: number;
  externalId: string | null;
  errorMessage: string | null;
  reason: string;
  suggestedAction: FulfillmentExceptionAction;
  autoResolvable: boolean;
}

interface ScanInput {
  limit?: number;
  pendingOlderThanMinutes?: number;
  submittedOlderThanMinutes?: number;
  processingOlderThanMinutes?: number;
  cancelRequestedOlderThanMinutes?: number;
}

interface AutoResolveInput extends ScanInput {
  dryRun?: boolean;
}

interface QueueMessage {
  type: "fulfillment.submit";
  fulfillmentRequestId: string;
  provider: string;
  storeId: string;
}

interface QueueAdapter {
  send(message: QueueMessage): Promise<void>;
}

interface AutoResolveResult {
  scannedCount: number;
  eligibleCount: number;
  resolvedCount: number;
  dryRun: boolean;
  resolvedRequestIds: string[];
  exceptions: FulfillmentExceptionItem[];
}

const OPEN_STATUSES = [
  "pending",
  "submitted",
  "processing",
  "cancel_requested",
  "failed",
] as const;

function toMinutes(olderThan: number | undefined, fallback: number): number {
  const value = Number(olderThan);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.round(value);
}

function isRetryableFailure(message: string | null): boolean {
  const text = String(message ?? "").toLowerCase();
  if (!text) return true;

  const transientPatterns = [
    /timeout/,
    /timed out/,
    /temporar/,
    /network/,
    /connection/,
    /unavailable/,
    /rate\s*limit/,
    /429/,
    /5\d\d/,
    /try again/,
  ];

  return transientPatterns.some((pattern) => pattern.test(text));
}

function ageInMinutes(value: Date | null | undefined, now: Date): number {
  if (!value) return 0;
  return Math.max(0, Math.round((now.getTime() - value.getTime()) / 60_000));
}

export class HandleFulfillmentExceptionsUseCase {
  constructor(
    private readonly db: Database,
    private readonly storeId: string,
    private readonly queue: QueueAdapter,
  ) {}

  async scan(input: ScanInput = {}): Promise<FulfillmentExceptionItem[]> {
    const limit = Math.max(1, Math.min(Number(input.limit ?? 50), 200));
    const pendingOlderThan = toMinutes(input.pendingOlderThanMinutes, 20);
    const submittedOlderThan = toMinutes(input.submittedOlderThanMinutes, 45);
    const processingOlderThan = toMinutes(input.processingOlderThanMinutes, 90);
    const cancelRequestedOlderThan = toMinutes(input.cancelRequestedOlderThanMinutes, 120);

    const rows = await this.db
      .select()
      .from(fulfillmentRequests)
      .where(
        and(
          eq(fulfillmentRequests.storeId, this.storeId),
          inArray(fulfillmentRequests.status, [...OPEN_STATUSES]),
        ),
      )
      .orderBy(asc(fulfillmentRequests.updatedAt))
      .limit(limit * 3);

    const now = new Date();
    const exceptions: FulfillmentExceptionItem[] = [];

    for (const row of rows) {
      const status = row.status ?? "pending";
      const lastTouch = row.updatedAt ?? row.createdAt;
      const ageMinutes = ageInMinutes(lastTouch, now);

      if (status === "failed") {
        const retryable = isRetryableFailure(row.errorMessage);
        exceptions.push({
          requestId: row.id,
          orderId: row.orderId,
          provider: row.provider,
          status,
          ageMinutes,
          externalId: row.externalId,
          errorMessage: row.errorMessage,
          reason: retryable
            ? "Failed with transient signature; safe to requeue automatically."
            : "Failed with non-transient signature; requires operator review.",
          suggestedAction: retryable ? "retry" : "manual_review",
          autoResolvable: retryable,
        });
        continue;
      }

      if (status === "pending" && ageMinutes >= pendingOlderThan) {
        exceptions.push({
          requestId: row.id,
          orderId: row.orderId,
          provider: row.provider,
          status,
          ageMinutes,
          externalId: row.externalId,
          errorMessage: row.errorMessage,
          reason: `Pending longer than ${pendingOlderThan} minutes without submission.`,
          suggestedAction: "retry",
          autoResolvable: true,
        });
        continue;
      }

      if (status === "submitted" && ageMinutes >= submittedOlderThan) {
        const missingExternalId = !row.externalId;
        exceptions.push({
          requestId: row.id,
          orderId: row.orderId,
          provider: row.provider,
          status,
          ageMinutes,
          externalId: row.externalId,
          errorMessage: row.errorMessage,
          reason: missingExternalId
            ? `Submitted longer than ${submittedOlderThan} minutes without external provider reference.`
            : `Submitted longer than ${submittedOlderThan} minutes; provider confirmation lag.`,
          suggestedAction: missingExternalId ? "retry" : "monitor",
          autoResolvable: missingExternalId,
        });
        continue;
      }

      if (status === "processing" && ageMinutes >= processingOlderThan) {
        const missingExternalId = !row.externalId;
        exceptions.push({
          requestId: row.id,
          orderId: row.orderId,
          provider: row.provider,
          status,
          ageMinutes,
          externalId: row.externalId,
          errorMessage: row.errorMessage,
          reason: missingExternalId
            ? `Processing longer than ${processingOlderThan} minutes with no external provider ID.`
            : `Processing longer than ${processingOlderThan} minutes; waiting for provider webhook updates.`,
          suggestedAction: missingExternalId ? "retry" : "monitor",
          autoResolvable: missingExternalId,
        });
        continue;
      }

      if (status === "cancel_requested" && ageMinutes >= cancelRequestedOlderThan) {
        exceptions.push({
          requestId: row.id,
          orderId: row.orderId,
          provider: row.provider,
          status,
          ageMinutes,
          externalId: row.externalId,
          errorMessage: row.errorMessage,
          reason: `Cancel requested for over ${cancelRequestedOlderThan} minutes; provider callback missing.`,
          suggestedAction: "monitor",
          autoResolvable: false,
        });
      }
    }

    return exceptions
      .sort((a, b) => b.ageMinutes - a.ageMinutes)
      .slice(0, limit);
  }

  async autoResolve(input: AutoResolveInput = {}): Promise<AutoResolveResult> {
    const exceptions = await this.scan(input);
    const eligible = exceptions.filter(
      (item) => item.autoResolvable && item.suggestedAction === "retry",
    );
    const dryRun = Boolean(input.dryRun);

    if (dryRun) {
      return {
        scannedCount: exceptions.length,
        eligibleCount: eligible.length,
        resolvedCount: 0,
        dryRun: true,
        resolvedRequestIds: [],
        exceptions,
      };
    }

    const resolvedRequestIds: string[] = [];

    for (const item of eligible) {
      await this.db
        .update(fulfillmentRequests)
        .set({
          status: "pending",
          errorMessage: null,
          externalId: null,
          submittedAt: null,
          completedAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(fulfillmentRequests.id, item.requestId),
            eq(fulfillmentRequests.storeId, this.storeId),
          ),
        );

      await this.queue.send({
        type: "fulfillment.submit",
        fulfillmentRequestId: item.requestId,
        provider: item.provider,
        storeId: this.storeId,
      });

      resolvedRequestIds.push(item.requestId);
    }

    return {
      scannedCount: exceptions.length,
      eligibleCount: eligible.length,
      resolvedCount: resolvedRequestIds.length,
      dryRun: false,
      resolvedRequestIds,
      exceptions,
    };
  }
}
