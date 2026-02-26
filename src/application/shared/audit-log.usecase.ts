import type { AuditLogRepository } from "../../infrastructure/repositories/audit-log.repository";

export class AuditLogUseCase {
  constructor(private repo: AuditLogRepository) {}

  async record(
    userId: string | undefined,
    action: string,
    entityType: string,
    entityId?: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
  ) {
    await this.repo.record({ userId, action, entityType, entityId, details, ipAddress });
  }

  async query(filters?: { page?: number; limit?: number }) {
    return this.repo.findByStore(filters);
  }

  async queryByEntity(entityType: string, entityId: string) {
    return this.repo.findByEntity(entityType, entityId);
  }
}
