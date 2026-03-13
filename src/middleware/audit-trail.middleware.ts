import type { Context, Next } from "hono";
import type { Env } from "../env";
import {
  buildAuditIntegrityHash,
  extractQueryKeys,
  normalizeRequestPath,
  type AuditActor,
  type AuditLogEntryInput,
} from "../shared/audit-trail";
import { redactForLogs } from "../shared/pii-redaction";

function resolveRequestId(c: Context<{ Bindings: Env }>): string {
  const existing = c.res.headers.get("X-Request-Id");
  if (existing) return existing;

  const incoming = c.req.header("x-request-id")?.trim();
  const requestId = incoming && incoming.length <= 128 ? incoming : crypto.randomUUID();
  c.res.headers.set("X-Request-Id", requestId);
  return requestId;
}

function resolveActor(c: Context<{ Bindings: Env }>): AuditActor {
  const user = c.get("user") as { sub?: string } | undefined;
  const roleHeader = c.req.header("x-user-role")?.trim() ?? null;
  const userId = user?.sub?.trim() || null;

  return {
    userId,
    role: roleHeader,
    sessionState: userId ? "authenticated" : "anonymous",
  };
}

function resolveIp(c: Context<{ Bindings: Env }>): string | null {
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;

  const realIp = c.req.header("x-real-ip")?.trim();
  if (realIp) return realIp;

  const connectingIp = c.req.header("cf-connecting-ip")?.trim();
  return connectingIp || null;
}

function resolveOutcome(status: number): "success" | "rejected" | "error" {
  if (status >= 500) return "error";
  if (status >= 400) return "rejected";
  return "success";
}

export function auditTrailMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const startedAtMs = Date.now();
    const requestId = resolveRequestId(c);

    try {
      await next();
    } finally {
      const path = normalizeRequestPath(c.req.path);
      if (!path.startsWith("/api/")) {
        return;
      }

      const status = c.res.status || 200;
      const rawEntry: AuditLogEntryInput = {
        timestamp: new Date().toISOString(),
        requestId,
        method: c.req.method.toUpperCase(),
        path,
        status,
        durationMs: Date.now() - startedAtMs,
        outcome: resolveOutcome(status),
        actor: resolveActor(c),
        request: {
          ip: resolveIp(c),
          userAgent: c.req.header("user-agent") ?? "",
          queryKeys: extractQueryKeys(c.req.url),
        },
        metadata: {
          contentType: c.req.header("content-type") ?? "",
          hasAuthorizationHeader: Boolean(c.req.header("authorization")),
          hasCookieHeader: Boolean(c.req.header("cookie")),
        },
      };

      const redactedEntry = redactForLogs(rawEntry) as AuditLogEntryInput;
      const integrityHash = await buildAuditIntegrityHash(
        redactedEntry,
        c.env.AUDIT_LOG_SECRET ?? c.env.JWT_SECRET,
      );

      console.log(
        JSON.stringify({
          level: "audit",
          ...redactedEntry,
          integrityHash,
        }),
      );
    }
  };
}
