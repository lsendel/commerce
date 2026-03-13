import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { analyticsEvents } from "../infrastructure/db/schema";
import type { QueueWorkflowName } from "./orchestration-policy";

export type DeadLetterAction =
  | "requeue_original_once"
  | "reroute_notification_email_once"
  | "mark_failed_and_drop"
  | "manual_review";

export interface DeadLetterDecision {
  queue: QueueWorkflowName;
  action: DeadLetterAction;
  autoRemediate: boolean;
  requiresManualReview: boolean;
  reason: string;
  remediationCount: number;
}

interface DeadLetterInput {
  queue: QueueWorkflowName;
  payload: unknown;
  retryable: boolean;
  reason: string;
  maxAutoRequeues: number;
}

interface DlqMetadata {
  remediationCount: number;
  firstFailureAt: string;
  lastFailureAt: string;
  lastReason: string;
}

interface DeadLetterResult {
  decision: DeadLetterDecision;
  executed: boolean;
  executionReason: string;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function isEnabled(value: string | undefined, fallback = true): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return fallback;
  return !(normalized === "0" || normalized === "false" || normalized === "off" || normalized === "no");
}

function resolveMaxAutoRequeues(env: Env): number {
  const override = Number(env.DLQ_AUTO_REMEDIATE_MAX_REQUEUES ?? "");
  if (Number.isFinite(override) && override >= 0) {
    return Math.min(3, Math.floor(override));
  }
  return 1;
}

function getDlqMetadata(payload: unknown): DlqMetadata {
  const record = toRecord(payload);
  const dlq = toRecord(record.__dlq);

  const remediationCountRaw = Number(dlq.remediationCount ?? 0);
  const remediationCount =
    Number.isFinite(remediationCountRaw) && remediationCountRaw >= 0
      ? Math.floor(remediationCountRaw)
      : 0;

  const nowIso = new Date().toISOString();
  const firstFailureAt = String(dlq.firstFailureAt ?? nowIso);
  const lastFailureAt = String(dlq.lastFailureAt ?? nowIso);
  const lastReason = String(dlq.lastReason ?? "unknown");

  return {
    remediationCount,
    firstFailureAt,
    lastFailureAt,
    lastReason,
  };
}

function withDlqMetadata(payload: unknown, metadata: DlqMetadata): Record<string, unknown> {
  const base = toRecord(payload);
  return {
    ...base,
    __dlq: {
      remediationCount: metadata.remediationCount,
      firstFailureAt: metadata.firstFailureAt,
      lastFailureAt: metadata.lastFailureAt,
      lastReason: metadata.lastReason,
    },
  };
}

function resolveStoreAndUserContext(input: {
  queue: QueueWorkflowName;
  payload: unknown;
  env: Env;
}): { storeId: string; userId?: string } {
  const record = toRecord(input.payload);

  if (input.queue === "order-fulfillment") {
    const storeId = String(record.storeId ?? input.env.DEFAULT_STORE_ID).trim();
    return { storeId: storeId || input.env.DEFAULT_STORE_ID };
  }

  if (input.queue === "notifications") {
    const data = toRecord(record.data);
    const storeId = String(data.storeId ?? input.env.DEFAULT_STORE_ID).trim();
    const userId = String(data.userId ?? "").trim();
    return {
      storeId: storeId || input.env.DEFAULT_STORE_ID,
      userId: userId || undefined,
    };
  }

  return { storeId: input.env.DEFAULT_STORE_ID };
}

async function trackDlqEvent(input: {
  env: Env;
  queue: QueueWorkflowName;
  eventType:
    | "queue_dlq_candidate_recorded"
    | "queue_dlq_auto_remediation_executed"
    | "queue_dlq_auto_remediation_skipped"
    | "queue_dlq_auto_remediation_failed"
    | "queue_dlq_manual_review_required";
  payload: unknown;
  reason: string;
  action: DeadLetterAction;
  retryable: boolean;
  remediationCount: number;
}) {
  try {
    const db = createDb(input.env.DATABASE_URL);
    const context = resolveStoreAndUserContext({
      queue: input.queue,
      payload: input.payload,
      env: input.env,
    });

    await db.insert(analyticsEvents).values({
      storeId: context.storeId,
      userId: context.userId ?? null,
      eventType: input.eventType,
      properties: {
        queue: input.queue,
        action: input.action,
        retryable: input.retryable,
        remediationCount: input.remediationCount,
        reason: input.reason,
      },
    });
  } catch (error) {
    console.error("[dlq-remediation] Failed to write DLQ metrics event:", error);
  }
}

async function sendToQueue(env: Env, queue: QueueWorkflowName, payload: Record<string, unknown>) {
  if (queue === "ai-generation") {
    await env.AI_QUEUE.send(payload);
    return;
  }
  if (queue === "order-fulfillment") {
    await env.FULFILLMENT_QUEUE.send(payload);
    return;
  }
  await env.NOTIFICATION_QUEUE.send(payload);
}

export function resolveDeadLetterDecision(input: DeadLetterInput): DeadLetterDecision {
  const metadata = getDlqMetadata(input.payload);
  const remediationCount = metadata.remediationCount;

  if (input.queue === "order-fulfillment") {
    const payload = toRecord(input.payload);
    const hasRequiredContext =
      typeof payload.fulfillmentRequestId === "string" &&
      payload.fulfillmentRequestId.length > 0 &&
      typeof payload.storeId === "string" &&
      payload.storeId.length > 0;

    if (
      input.retryable &&
      hasRequiredContext &&
      remediationCount < input.maxAutoRequeues
    ) {
      return {
        queue: input.queue,
        action: "requeue_original_once",
        autoRemediate: true,
        requiresManualReview: false,
        reason: "Retryable order-fulfillment dead-letter candidate eligible for bounded requeue.",
        remediationCount,
      };
    }

    return {
      queue: input.queue,
      action: "mark_failed_and_drop",
      autoRemediate: false,
      requiresManualReview: true,
      reason: "Order-fulfillment candidate not eligible for further auto-remediation.",
      remediationCount,
    };
  }

  if (input.queue === "notifications") {
    const payload = toRecord(input.payload);
    const type = String(payload.type ?? "");
    const data = toRecord(payload.data);
    const channel = String(data.channel ?? "").toLowerCase();
    const hasEmailFallback = typeof data.userEmail === "string" && data.userEmail.length > 0;
    const canFallbackToEmail =
      type === "checkout_recovery" &&
      (channel === "sms" || channel === "whatsapp") &&
      hasEmailFallback;

    if (input.retryable && canFallbackToEmail && remediationCount < input.maxAutoRequeues) {
      return {
        queue: input.queue,
        action: "reroute_notification_email_once",
        autoRemediate: true,
        requiresManualReview: false,
        reason: "Retryable notification candidate rerouted to email fallback.",
        remediationCount,
      };
    }

    return {
      queue: input.queue,
      action: "manual_review",
      autoRemediate: false,
      requiresManualReview: true,
      reason: "Notification candidate requires manual review.",
      remediationCount,
    };
  }

  if (input.queue === "ai-generation") {
    return {
      queue: "ai-generation",
      action: "manual_review",
      autoRemediate: false,
      requiresManualReview: true,
      reason: "AI generation dead-letter candidates require manual review after bounded retries.",
      remediationCount,
    };
  }

  return {
    queue: input.queue,
    action: "manual_review",
    autoRemediate: false,
    requiresManualReview: true,
    reason: "Dead-letter candidate requires manual review.",
    remediationCount,
  };
}

export async function processDeadLetterCandidate(input: {
  env: Env;
  queue: QueueWorkflowName;
  payload: unknown;
  retryable: boolean;
  reason: string;
}): Promise<DeadLetterResult> {
  const maxAutoRequeues = resolveMaxAutoRequeues(input.env);
  const decision = resolveDeadLetterDecision({
    queue: input.queue,
    payload: input.payload,
    retryable: input.retryable,
    reason: input.reason,
    maxAutoRequeues,
  });

  await trackDlqEvent({
    env: input.env,
    queue: input.queue,
    eventType: "queue_dlq_candidate_recorded",
    payload: input.payload,
    reason: input.reason,
    action: decision.action,
    retryable: input.retryable,
    remediationCount: decision.remediationCount,
  });

  const enabled = isEnabled(input.env.DLQ_AUTO_REMEDIATE_ENABLED, true);
  if (!enabled || !decision.autoRemediate) {
    await trackDlqEvent({
      env: input.env,
      queue: input.queue,
      eventType: decision.requiresManualReview
        ? "queue_dlq_manual_review_required"
        : "queue_dlq_auto_remediation_skipped",
      payload: input.payload,
      reason: enabled
        ? decision.reason
        : "DLQ auto-remediation is disabled by env flag.",
      action: decision.action,
      retryable: input.retryable,
      remediationCount: decision.remediationCount,
    });

    return {
      decision,
      executed: false,
      executionReason: enabled
        ? "No auto-remediation action executed."
        : "Auto-remediation disabled.",
    };
  }

  try {
    const metadata = getDlqMetadata(input.payload);
    const nextMetadata: DlqMetadata = {
      remediationCount: metadata.remediationCount + 1,
      firstFailureAt: metadata.firstFailureAt,
      lastFailureAt: new Date().toISOString(),
      lastReason: input.reason,
    };

    if (decision.action === "requeue_original_once") {
      const payloadWithMeta = withDlqMetadata(input.payload, nextMetadata);
      await sendToQueue(input.env, input.queue, payloadWithMeta);
    } else if (decision.action === "reroute_notification_email_once") {
      const payload = toRecord(input.payload);
      const data = toRecord(payload.data);
      const reroutedPayload = withDlqMetadata(
        {
          ...payload,
          data: {
            ...data,
            channel: "email",
          },
        },
        nextMetadata,
      );
      await sendToQueue(input.env, "notifications", reroutedPayload);
    }

    await trackDlqEvent({
      env: input.env,
      queue: input.queue,
      eventType: "queue_dlq_auto_remediation_executed",
      payload: input.payload,
      reason: decision.reason,
      action: decision.action,
      retryable: input.retryable,
      remediationCount: nextMetadata.remediationCount,
    });

    return {
      decision,
      executed: true,
      executionReason: `Executed ${decision.action}.`,
    };
  } catch (error) {
    const executionReason = error instanceof Error ? error.message : String(error);

    await trackDlqEvent({
      env: input.env,
      queue: input.queue,
      eventType: "queue_dlq_auto_remediation_failed",
      payload: input.payload,
      reason: executionReason,
      action: decision.action,
      retryable: input.retryable,
      remediationCount: decision.remediationCount,
    });

    return {
      decision,
      executed: false,
      executionReason: `Auto-remediation failed: ${executionReason}`,
    };
  }
}
