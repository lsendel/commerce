const IDEMPOTENCY_KEY_MAX_LENGTH = 255;
const AUTO_IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000;

interface ResolveRequestIdempotencyKeyInput {
  providedKey?: string | null;
  namespace: string;
  userId: string;
  resourceId?: string;
  payload?: unknown;
  nowMs?: number;
  windowMs?: number;
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function truncateKey(value: string): string {
  return value.length > IDEMPOTENCY_KEY_MAX_LENGTH
    ? value.slice(0, IDEMPOTENCY_KEY_MAX_LENGTH)
    : value;
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }
  if (typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${stableStringify(entryValue)}`,
    );
  return `{${entries.join(",")}}`;
}

export function normalizeIdempotencyKey(
  value: string | null | undefined,
): string | undefined {
  const normalized = String(value ?? "").trim();
  if (!normalized) return undefined;
  return truncateKey(normalized);
}

export function composeIdempotencyKey(
  baseKey: string | undefined,
  suffix: string,
): string | undefined {
  if (!baseKey) return undefined;
  const normalizedSuffix = suffix.trim().replace(/\s+/g, "-");
  if (!normalizedSuffix) return truncateKey(baseKey);
  return truncateKey(`${baseKey}:${normalizedSuffix}`);
}

export async function resolveRequestIdempotencyKey(
  input: ResolveRequestIdempotencyKeyInput,
): Promise<string> {
  const provided = normalizeIdempotencyKey(input.providedKey);
  if (provided) {
    return provided;
  }

  const nowMs = input.nowMs ?? Date.now();
  const windowMs = Math.max(1, input.windowMs ?? AUTO_IDEMPOTENCY_WINDOW_MS);
  const bucket = Math.floor(nowMs / windowMs);
  const payloadFingerprint = stableStringify(input.payload ?? null);
  const rawSeed = [
    input.namespace,
    input.userId,
    input.resourceId ?? "",
    String(bucket),
    payloadFingerprint,
  ].join("|");

  const encoded = new TextEncoder().encode(rawSeed);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const digestHex = toHex(digest).slice(0, 48);
  return truncateKey(`auto:${input.namespace}:${digestHex}`);
}
