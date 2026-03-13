import type Stripe from "stripe";

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 250;

const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_TYPES = new Set(["api_error", "api_connection_error", "rate_limit_error"]);
const RETRYABLE_ERROR_CODES = new Set(["lock_timeout"]);

interface StripeRetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableStripeError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }

  const candidate = error as {
    statusCode?: number;
    type?: string;
    code?: string;
  };

  if (typeof candidate.statusCode === "number" && RETRYABLE_STATUS_CODES.has(candidate.statusCode)) {
    return true;
  }

  const type = String(candidate.type ?? "").toLowerCase();
  if (RETRYABLE_ERROR_TYPES.has(type)) {
    return true;
  }

  const code = String(candidate.code ?? "").toLowerCase();
  if (RETRYABLE_ERROR_CODES.has(code)) {
    return true;
  }

  return false;
}

export function buildStripeRequestOptions(
  idempotencyKey?: string,
): Stripe.RequestOptions | undefined {
  if (!idempotencyKey) return undefined;
  return { idempotencyKey };
}

export async function runStripeMutationWithRetry<T>(
  operation: () => Promise<T>,
  options?: StripeRetryOptions,
): Promise<T> {
  const maxAttempts = Math.max(1, options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const baseDelayMs = Math.max(1, options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS);

  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;
      const retryable = isRetryableStripeError(error);
      if (!retryable || attempt >= maxAttempts) {
        throw error;
      }

      const backoffMs = baseDelayMs * 2 ** (attempt - 1);
      const jitterMs = Math.floor(Math.random() * Math.max(20, Math.round(baseDelayMs / 3)));
      await wait(backoffMs + jitterMs);
    }
  }

  throw new Error("Unexpected retry failure state");
}
