import { and, desc, eq, gte } from "drizzle-orm";
import type { Database } from "../db/client";
import { policyViolations, storePolicyConfigs } from "../db/schema";

interface UpsertPolicyConfigInput {
  policies: unknown;
  isActive?: boolean;
  updatedBy?: string | null;
}

interface RecordPolicyViolationInput {
  domain: string;
  action: string;
  severity?: "warning" | "error";
  message: string;
  details?: unknown;
  actorUserId?: string | null;
}

export class PolicyRepository {
  constructor(
    private readonly db: Database,
    private readonly storeId: string,
  ) {}

  async getConfig() {
    const rows = await this.db
      .select()
      .from(storePolicyConfigs)
      .where(eq(storePolicyConfigs.storeId, this.storeId))
      .limit(1);

    return rows[0] ?? null;
  }

  async upsertConfig(input: UpsertPolicyConfigInput) {
    const existing = await this.getConfig();

    if (!existing) {
      const rows = await this.db
        .insert(storePolicyConfigs)
        .values({
          storeId: this.storeId,
          version: 1,
          isActive: input.isActive ?? true,
          policies: input.policies,
          updatedBy: input.updatedBy ?? null,
        })
        .returning();

      return rows[0] ?? null;
    }

    const rows = await this.db
      .update(storePolicyConfigs)
      .set({
        version: (existing.version ?? 1) + 1,
        isActive: input.isActive ?? existing.isActive ?? true,
        policies: input.policies,
        updatedBy: input.updatedBy ?? null,
        updatedAt: new Date(),
      })
      .where(eq(storePolicyConfigs.id, existing.id))
      .returning();

    return rows[0] ?? null;
  }

  async recordViolation(input: RecordPolicyViolationInput) {
    const rows = await this.db
      .insert(policyViolations)
      .values({
        storeId: this.storeId,
        domain: input.domain,
        action: input.action,
        severity: input.severity ?? "error",
        message: input.message,
        details: input.details ?? {},
        actorUserId: input.actorUserId ?? null,
      })
      .returning();

    return rows[0] ?? null;
  }

  async listViolations(limit = 100) {
    const normalizedLimit = Math.max(1, Math.min(limit, 500));

    return this.db
      .select()
      .from(policyViolations)
      .where(eq(policyViolations.storeId, this.storeId))
      .orderBy(desc(policyViolations.createdAt))
      .limit(normalizedLimit);
  }

  async listViolationsSince(since: Date, limit = 500) {
    const normalizedLimit = Math.max(1, Math.min(limit, 2000));

    return this.db
      .select()
      .from(policyViolations)
      .where(
        and(
          eq(policyViolations.storeId, this.storeId),
          gte(policyViolations.createdAt, since),
        ),
      )
      .orderBy(desc(policyViolations.createdAt))
      .limit(normalizedLimit);
  }
}
