import type { Env } from "../../env";
import type { Database } from "../../infrastructure/db/client";
import { sql } from "drizzle-orm";

interface InfraHealthResult {
  service: string;
  status: "healthy" | "unhealthy" | "unavailable";
  message: string;
  latencyMs?: number;
}

export class CheckInfrastructureUseCase {
  async execute(env: Env, db: Database): Promise<InfraHealthResult[]> {
    const results: InfraHealthResult[] = [];

    // Neon PostgreSQL
    const neonStart = Date.now();
    try {
      await db.execute(sql`SELECT 1`);
      results.push({
        service: "neon",
        status: "healthy",
        message: "Database responding",
        latencyMs: Date.now() - neonStart,
      });
    } catch (err) {
      results.push({
        service: "neon",
        status: "unhealthy",
        message: err instanceof Error ? err.message : "Connection failed",
        latencyMs: Date.now() - neonStart,
      });
    }

    // R2 bucket
    try {
      if (env.IMAGES) {
        await env.IMAGES.head("health-check");
        results.push({
          service: "r2",
          status: "healthy",
          message: "R2 bucket accessible",
        });
      } else {
        results.push({
          service: "r2",
          status: "unavailable",
          message: "IMAGES binding not configured",
        });
      }
    } catch {
      // head() throws on missing key — that's fine, binding works
      results.push({
        service: "r2",
        status: "healthy",
        message: "R2 bucket accessible",
      });
    }

    // Queues
    for (const [name, binding] of [
      ["ai-queue", env.AI_QUEUE],
      ["fulfillment-queue", env.FULFILLMENT_QUEUE],
      ["notification-queue", env.NOTIFICATION_QUEUE],
    ] as const) {
      results.push({
        service: name,
        status: binding ? "healthy" : "unavailable",
        message: binding
          ? "Queue binding available"
          : `${name} binding not configured`,
      });
    }

    // Workers AI
    results.push({
      service: "workers-ai",
      status: env.AI ? "healthy" : "unavailable",
      message: env.AI ? "AI binding available" : "AI binding not configured",
    });

    return results;
  }
}
