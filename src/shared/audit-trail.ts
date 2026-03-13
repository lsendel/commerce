export interface AuditActor {
  userId: string | null;
  role: string | null;
  sessionState: "authenticated" | "anonymous";
}

export interface AuditLogEntryInput {
  timestamp: string;
  requestId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  outcome: "success" | "rejected" | "error";
  actor: AuditActor;
  request: {
    ip: string | null;
    userAgent: string;
    queryKeys: string[];
  };
  metadata?: Record<string, unknown>;
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
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
  return `{${entries.join(",")}}`;
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildAuditIntegrityHash(
  entry: AuditLogEntryInput,
  secret: string,
): Promise<string> {
  const normalizedSecret = secret.trim() || "fallback-audit-secret";
  const canonical = stableStringify(entry);
  const seed = `audit-v1|${normalizedSecret}|${canonical}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed));
  return toHex(digest);
}

export function normalizeRequestPath(path: string): string {
  if (!path) return "/";
  const normalized = path.split("?")[0] ?? "/";
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function extractQueryKeys(url: string): string[] {
  try {
    const parsed = new URL(url);
    return [...new Set([...parsed.searchParams.keys()].map((key) => key.trim()).filter(Boolean))].sort();
  } catch {
    return [];
  }
}
