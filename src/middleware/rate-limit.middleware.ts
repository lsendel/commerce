import type { Context, Next } from "hono";
import type { Env } from "../env";

// In-memory rate limiter for Workers (resets on cold start, which is acceptable)
// For production at scale, use Cloudflare Rate Limiting or Durable Objects
const requests = new Map<string, { count: number; resetAt: number }>();

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export function rateLimit(options: RateLimitOptions = { windowMs: 60_000, max: 10 }) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown";
    const key = `${ip}:${new URL(c.req.url).pathname}`;
    const now = Date.now();

    const entry = requests.get(key);
    if (entry && entry.resetAt > now) {
      if (entry.count >= options.max) {
        return c.json({ error: "Too many requests", message: "Too many requests" }, 429);
      }
      entry.count++;
    } else {
      requests.set(key, { count: 1, resetAt: now + options.windowMs });
    }

    // Cleanup stale entries periodically
    if (requests.size > 10_000) {
      for (const [k, v] of requests) {
        if (v.resetAt <= now) requests.delete(k);
      }
    }

    await next();
  };
}
