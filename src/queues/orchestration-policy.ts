export type QueueWorkflowName = "ai-generation" | "order-fulfillment" | "notifications";

export interface QueueWorkflowPolicy {
  timeoutMs: number;
  maxAttempts: number;
  baseRetryDelayMs: number;
  compensationStrategy: "mark_failed" | "mark_failed_and_alert" | "log_and_drop";
}

export const QUEUE_WORKFLOW_POLICIES: Record<QueueWorkflowName, QueueWorkflowPolicy> = {
  "ai-generation": {
    timeoutMs: 120_000,
    maxAttempts: 2,
    baseRetryDelayMs: 1_000,
    compensationStrategy: "mark_failed",
  },
  "order-fulfillment": {
    timeoutMs: 45_000,
    maxAttempts: 4,
    baseRetryDelayMs: 1_500,
    compensationStrategy: "mark_failed_and_alert",
  },
  notifications: {
    timeoutMs: 20_000,
    maxAttempts: 3,
    baseRetryDelayMs: 800,
    compensationStrategy: "log_and_drop",
  },
};

const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set(["etimedout", "econnreset", "econnrefused", "lock_timeout"]);

function toInt(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

export function resolveQueueMessageAttempt(message: Message | Record<string, unknown>): number {
  const candidate = message as {
    attempts?: number;
    attempt?: number;
    deliveryAttempt?: number;
    retryCount?: number;
  };

  const attempts = toInt(candidate.attempts);
  if (attempts !== null) return attempts;

  const attempt = toInt(candidate.attempt);
  if (attempt !== null) return attempt;

  const deliveryAttempt = toInt(candidate.deliveryAttempt);
  if (deliveryAttempt !== null) return deliveryAttempt;

  const retryCount = toInt(candidate.retryCount);
  if (retryCount !== null) return retryCount + 1;

  return 1;
}

export function computeRetryBackoffMs(policy: QueueWorkflowPolicy, attempt: number): number {
  const normalizedAttempt = Math.max(1, attempt);
  const exponential = policy.baseRetryDelayMs * 2 ** (normalizedAttempt - 1);
  const capped = Math.min(30_000, exponential);
  const jitter = Math.floor(Math.random() * Math.max(25, Math.round(policy.baseRetryDelayMs / 3)));
  return capped + jitter;
}

export function isRetryableWorkflowError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }

  const candidate = error as {
    name?: string;
    message?: string;
    code?: string;
    status?: number;
    statusCode?: number;
  };

  const statusCode =
    typeof candidate.statusCode === "number"
      ? candidate.statusCode
      : typeof candidate.status === "number"
        ? candidate.status
        : null;
  if (statusCode !== null && RETRYABLE_STATUS_CODES.has(statusCode)) {
    return true;
  }

  const code = String(candidate.code ?? "").toLowerCase();
  if (code && RETRYABLE_ERROR_CODES.has(code)) {
    return true;
  }

  const name = String(candidate.name ?? "").toLowerCase();
  if (name.includes("timeout")) {
    return true;
  }

  const message = String(candidate.message ?? "").toLowerCase();
  if (!message) return false;

  return [
    "timeout",
    "timed out",
    "temporar",
    "network",
    "connection",
    "unavailable",
    "rate limit",
    "429",
    "5xx",
  ].some((pattern) => message.includes(pattern));
}

export function withWorkflowTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  const normalizedTimeout = Math.max(1_000, Math.floor(timeoutMs));

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const timeoutError = new Error(`${label} timed out after ${normalizedTimeout}ms`);
      timeoutError.name = "WorkflowTimeoutError";
      reject(timeoutError);
    }, normalizedTimeout);

    operation
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export function isManagedQueueName(queue: string): queue is QueueWorkflowName {
  return queue === "ai-generation" || queue === "order-fulfillment" || queue === "notifications";
}
