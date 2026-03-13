const REDACTED_VALUE = "[REDACTED]";
const MAX_REDACTION_DEPTH = 8;

const SENSITIVE_KEY_PATTERNS: RegExp[] = [
  /pass(word)?/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /cookie/i,
  /api[-_]?key/i,
  /private[-_]?key/i,
  /client[-_]?secret/i,
  /session/i,
  /email/i,
  /phone/i,
  /ssn/i,
  /card/i,
  /cvv/i,
  /iban/i,
  /address/i,
];

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+\/-]+=*\b/gi;
const PHONE_PATTERN = /\+?[0-9][0-9()\-\s]{6,}[0-9]/g;
const QUERY_SENSITIVE_PATTERN = /([?&](?:token|password|secret|code|email|phone|session|authorization)=)[^&#]*/gi;

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function looksLikeOpaqueSecret(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 24 || trimmed.length > 512) return false;
  if (/\s/.test(trimmed)) return false;
  return /[A-Za-z]/.test(trimmed) && /\d/.test(trimmed) && /^[A-Za-z0-9._~+\/-]+=*$/.test(trimmed);
}

export function redactStringValue(value: string): string {
  if (!value) return value;

  let redacted = value;
  redacted = redacted.replace(EMAIL_PATTERN, REDACTED_VALUE);
  redacted = redacted.replace(JWT_PATTERN, REDACTED_VALUE);
  redacted = redacted.replace(BEARER_PATTERN, REDACTED_VALUE);
  redacted = redacted.replace(QUERY_SENSITIVE_PATTERN, `$1${REDACTED_VALUE}`);
  redacted = redacted.replace(PHONE_PATTERN, (match) => {
    const digits = match.replace(/\D/g, "");
    return digits.length >= 7 ? REDACTED_VALUE : match;
  });

  if (looksLikeOpaqueSecret(redacted)) {
    return REDACTED_VALUE;
  }

  return redacted;
}

export function redactForLogs(
  value: unknown,
  options?: { maxDepth?: number },
): unknown {
  const visited = new WeakSet<object>();
  const maxDepth = Math.max(1, options?.maxDepth ?? MAX_REDACTION_DEPTH);

  const walk = (input: unknown, depth: number): unknown => {
    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input === "string") {
      return redactStringValue(input);
    }

    if (typeof input === "number" || typeof input === "boolean") {
      return input;
    }

    if (typeof input === "bigint") {
      return String(input);
    }

    if (input instanceof Date) {
      return input.toISOString();
    }

    if (depth >= maxDepth) {
      return "[TRUNCATED]";
    }

    if (Array.isArray(input)) {
      return input.map((item) => walk(item, depth + 1));
    }

    if (typeof input === "object") {
      if (visited.has(input as object)) {
        return "[CIRCULAR]";
      }
      visited.add(input as object);

      if (input instanceof Error) {
        return {
          name: input.name,
          message: redactStringValue(input.message),
          stack: redactStringValue(input.stack ?? ""),
        };
      }

      const output: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(input as Record<string, unknown>)) {
        if (isSensitiveKey(key)) {
          output[key] = REDACTED_VALUE;
          continue;
        }
        output[key] = walk(entry, depth + 1);
      }
      return output;
    }

    return String(input);
  };

  return walk(value, 0);
}

export { REDACTED_VALUE };
