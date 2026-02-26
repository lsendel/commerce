import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { auditLog } from "../db/schema";

export class AuditLogRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async record(entry: {
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    await this.db.insert(auditLog).values({
      storeId: this.storeId,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      details: entry.details,
      ipAddress: entry.ipAddress,
    });
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.storeId, this.storeId),
          eq(auditLog.entityType, entityType),
          eq(auditLog.entityId, entityId),
        ),
      )
      .orderBy(desc(auditLog.createdAt));
  }

  async findByStore(filters?: { page?: number; limit?: number }) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const offset = (page - 1) * limit;

    return this.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.storeId, this.storeId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset);
  }
}
