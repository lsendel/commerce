import { eq, and, isNull } from "drizzle-orm";
import type { Database } from "../db/client";
import { platformIntegrations, integrationSecrets } from "../db/schema";
import type {
  PlatformIntegration,
  IntegrationProvider,
  IntegrationStatus,
  IntegrationSecret,
} from "../../domain/platform/integration.entity";

export class IntegrationRepository {
  constructor(private db: Database) {}

  async findByProvider(
    provider: IntegrationProvider,
    storeId?: string | null,
  ): Promise<PlatformIntegration | null> {
    const condition = storeId
      ? and(
          eq(platformIntegrations.provider, provider),
          eq(platformIntegrations.storeId, storeId),
        )
      : and(
          eq(platformIntegrations.provider, provider),
          isNull(platformIntegrations.storeId),
        );

    const rows = await this.db
      .select()
      .from(platformIntegrations)
      .where(condition)
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findAllByStore(
    storeId?: string | null,
  ): Promise<PlatformIntegration[]> {
    const condition = storeId
      ? eq(platformIntegrations.storeId, storeId)
      : isNull(platformIntegrations.storeId);

    const rows = await this.db
      .select()
      .from(platformIntegrations)
      .where(condition);

    return rows.map((r) => this.toDomain(r));
  }

  async findAllEnabled(): Promise<PlatformIntegration[]> {
    const rows = await this.db
      .select()
      .from(platformIntegrations)
      .where(eq(platformIntegrations.enabled, true));

    return rows.map((r) => this.toDomain(r));
  }

  async upsert(
    data: Omit<PlatformIntegration, "id" | "createdAt" | "updatedAt">,
  ): Promise<PlatformIntegration> {
    const rows = await this.db
      .insert(platformIntegrations)
      .values({
        storeId: data.storeId,
        provider: data.provider,
        enabled: data.enabled,
        config: data.config,
        status: data.status,
        statusMessage: data.statusMessage,
        lastVerifiedAt: data.lastVerifiedAt,
        lastSyncAt: data.lastSyncAt,
      })
      .onConflictDoUpdate({
        target: [platformIntegrations.storeId, platformIntegrations.provider],
        set: {
          enabled: data.enabled,
          config: data.config,
          status: data.status,
          statusMessage: data.statusMessage,
          updatedAt: new Date(),
        },
      })
      .returning();

    return this.toDomain(rows[0]);
  }

  async delete(
    provider: IntegrationProvider,
    storeId?: string | null,
  ): Promise<void> {
    const condition = storeId
      ? and(
          eq(platformIntegrations.provider, provider),
          eq(platformIntegrations.storeId, storeId),
        )
      : and(
          eq(platformIntegrations.provider, provider),
          isNull(platformIntegrations.storeId),
        );

    await this.db.delete(platformIntegrations).where(condition);
  }

  async updateStatus(
    id: string,
    status: IntegrationStatus,
    message?: string | null,
  ): Promise<void> {
    await this.db
      .update(platformIntegrations)
      .set({
        status,
        statusMessage: message ?? null,
        updatedAt: new Date(),
      })
      .where(eq(platformIntegrations.id, id));
  }

  async updateLastVerified(id: string): Promise<void> {
    await this.db
      .update(platformIntegrations)
      .set({ lastVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(platformIntegrations.id, id));
  }

  async updateLastSync(id: string): Promise<void> {
    await this.db
      .update(platformIntegrations)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(platformIntegrations.id, id));
  }

  private toDomain(row: any): PlatformIntegration {
    return {
      id: row.id,
      storeId: row.storeId,
      provider: row.provider,
      enabled: row.enabled,
      config: (row.config ?? {}) as Record<string, unknown>,
      status: row.status,
      statusMessage: row.statusMessage,
      lastVerifiedAt: row.lastVerifiedAt,
      lastSyncAt: row.lastSyncAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export class IntegrationSecretRepository {
  constructor(private db: Database) {}

  async findByIntegrationAndKey(
    integrationId: string,
    key: string,
  ): Promise<IntegrationSecret | null> {
    const rows = await this.db
      .select()
      .from(integrationSecrets)
      .where(
        and(
          eq(integrationSecrets.integrationId, integrationId),
          eq(integrationSecrets.key, key),
        ),
      )
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findAllByIntegration(
    integrationId: string,
  ): Promise<IntegrationSecret[]> {
    const rows = await this.db
      .select()
      .from(integrationSecrets)
      .where(eq(integrationSecrets.integrationId, integrationId));

    return rows.map((r) => this.toDomain(r));
  }

  async upsert(
    data: Omit<IntegrationSecret, "id" | "createdAt" | "updatedAt">,
  ): Promise<IntegrationSecret> {
    const rows = await this.db
      .insert(integrationSecrets)
      .values({
        integrationId: data.integrationId,
        key: data.key,
        encryptedValue: data.encryptedValue,
        iv: data.iv,
      })
      .onConflictDoUpdate({
        target: [integrationSecrets.integrationId, integrationSecrets.key],
        set: {
          encryptedValue: data.encryptedValue,
          iv: data.iv,
          updatedAt: new Date(),
        },
      })
      .returning();

    return this.toDomain(rows[0]);
  }

  async deleteByIntegration(integrationId: string): Promise<void> {
    await this.db
      .delete(integrationSecrets)
      .where(eq(integrationSecrets.integrationId, integrationId));
  }

  private toDomain(row: any): IntegrationSecret {
    return {
      id: row.id,
      integrationId: row.integrationId,
      key: row.key,
      encryptedValue: row.encryptedValue,
      iv: row.iv,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
