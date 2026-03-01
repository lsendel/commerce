import type { Context } from "hono";
import {
  DomainError,
  NotFoundError,
  ValidationError,
  AuthError,
  ConflictError,
  ExpiredError,
  ForbiddenError,
} from "../shared/errors";
import { redactForLogs } from "../shared/pii-redaction";
import type { Env } from "../env";

export function errorHandler() {
  return async (c: Context<{ Bindings: Env }>, next: () => Promise<void>) => {
    const requestId = crypto.randomUUID();
    c.res.headers.set("X-Request-Id", requestId);

    try {
      await next();
    } catch (err) {
      if (err instanceof NotFoundError) {
        return c.json({ error: err.message, message: err.message, code: err.code, requestId }, 404);
      }
      if (err instanceof ValidationError) {
        return c.json({ error: err.message, message: err.message, code: err.code, requestId }, 400);
      }
      if (err instanceof AuthError) {
        return c.json({ error: err.message, message: err.message, code: err.code, requestId }, 401);
      }
      if (err instanceof ForbiddenError) {
        return c.json({ error: err.message, message: err.message, code: err.code, requestId }, 403);
      }
      if (err instanceof ConflictError) {
        return c.json({ error: err.message, message: err.message, code: err.code, requestId }, 409);
      }
      if (err instanceof ExpiredError) {
        return c.json({ error: err.message, message: err.message, code: err.code, requestId }, 410);
      }
      if (err instanceof DomainError) {
        return c.json({ error: err.message, message: err.message, code: err.code, requestId }, 400);
      }

      const errCode = String((err as any)?.code ?? "");
      const errName = String((err as any)?.name ?? "");
      const errMessage = err instanceof Error ? err.message : "Unexpected error";
      if (errCode === "NOT_FOUND" || errName === "NotFoundError") {
        return c.json({ error: errMessage, message: errMessage, code: errCode, requestId }, 404);
      }
      if (errCode === "VALIDATION_ERROR" || errName === "ValidationError") {
        return c.json({ error: errMessage, message: errMessage, code: errCode, requestId }, 400);
      }
      if (errCode === "AUTH_ERROR" || errName === "AuthError") {
        return c.json({ error: errMessage, message: errMessage, code: errCode, requestId }, 401);
      }
      if (errCode === "FORBIDDEN" || errName === "ForbiddenError") {
        return c.json({ error: errMessage, message: errMessage, code: errCode, requestId }, 403);
      }
      if (errCode === "CONFLICT" || errName === "ConflictError") {
        return c.json({ error: errMessage, message: errMessage, code: errCode, requestId }, 409);
      }
      if (errCode === "EXPIRED" || errName === "ExpiredError") {
        return c.json({ error: errMessage, message: errMessage, code: errCode, requestId }, 410);
      }
      if (errCode) {
        return c.json({ error: errMessage, message: errMessage, code: errCode, requestId }, 400);
      }

      const logEntry = redactForLogs({
        level: "error",
        requestId,
        error: errMessage,
        stack: err instanceof Error ? err.stack : undefined,
        path: c.req.path,
        method: c.req.method,
        timestamp: new Date().toISOString(),
      });
      console.error(JSON.stringify(logEntry));
      return c.json({ error: "Internal server error", message: "Internal server error", requestId }, 500);
    }
  };
}
