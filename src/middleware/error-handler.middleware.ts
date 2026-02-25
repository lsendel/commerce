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
import type { Env } from "../env";

export function errorHandler() {
  return async (c: Context<{ Bindings: Env }>, next: () => Promise<void>) => {
    try {
      await next();
    } catch (err) {
      if (err instanceof NotFoundError) {
        return c.json({ error: err.message, code: err.code }, 404);
      }
      if (err instanceof ValidationError) {
        return c.json({ error: err.message, code: err.code }, 400);
      }
      if (err instanceof AuthError) {
        return c.json({ error: err.message, code: err.code }, 401);
      }
      if (err instanceof ForbiddenError) {
        return c.json({ error: err.message, code: err.code }, 403);
      }
      if (err instanceof ConflictError) {
        return c.json({ error: err.message, code: err.code }, 409);
      }
      if (err instanceof ExpiredError) {
        return c.json({ error: err.message, code: err.code }, 410);
      }
      if (err instanceof DomainError) {
        return c.json({ error: err.message, code: err.code }, 400);
      }

      console.error("Unhandled error:", err);
      return c.json({ error: "Internal server error" }, 500);
    }
  };
}
