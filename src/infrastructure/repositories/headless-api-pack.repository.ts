import { and, desc, eq, isNull } from "drizzle-orm";
import type { Database } from "../db/client";
import { headlessApiPacks } from "../db/schema";

interface CreateHeadlessApiPackInput {
  name: string;
  description?: string | null;
  keyHash: string;
  keyPrefix: string;
  scopes: string[];
  rateLimitPerMinute: number;
  createdBy?: string | null;
}

export class HeadlessApiPackRepository {
  constructor(
    private readonly db: Database,
    private readonly storeId?: string,
  ) {}

  private requireStoreId() {
    if (!this.storeId) {
      throw new Error("storeId is required for this repository operation");
    }
    return this.storeId;
  }

  async list(limit = 100) {
    const storeId = this.requireStoreId();
    const normalizedLimit = Math.max(1, Math.min(limit, 200));

    return this.db
      .select()
      .from(headlessApiPacks)
      .where(eq(headlessApiPacks.storeId, storeId))
      .orderBy(desc(headlessApiPacks.updatedAt))
      .limit(normalizedLimit);
  }

  async findById(id: string) {
    const storeId = this.requireStoreId();
    const rows = await this.db
      .select()
      .from(headlessApiPacks)
      .where(and(eq(headlessApiPacks.id, id), eq(headlessApiPacks.storeId, storeId)))
      .limit(1);

    return rows[0] ?? null;
  }

  async create(input: CreateHeadlessApiPackInput) {
    const storeId = this.requireStoreId();

    const rows = await this.db
      .insert(headlessApiPacks)
      .values({
        storeId,
        name: input.name,
        description: input.description ?? null,
        keyHash: input.keyHash,
        keyPrefix: input.keyPrefix,
        scopes: input.scopes,
        rateLimitPerMinute: input.rateLimitPerMinute,
        createdBy: input.createdBy ?? null,
      })
      .returning();

    return rows[0] ?? null;
  }

  async revoke(id: string, revokedBy?: string | null) {
    const storeId = this.requireStoreId();

    const rows = await this.db
      .update(headlessApiPacks)
      .set({
        status: "revoked",
        revokedBy: revokedBy ?? null,
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(headlessApiPacks.id, id), eq(headlessApiPacks.storeId, storeId)))
      .returning();

    return rows[0] ?? null;
  }

  async findActiveByKeyHash(keyHash: string) {
    const rows = await this.db
      .select()
      .from(headlessApiPacks)
      .where(
        and(
          eq(headlessApiPacks.keyHash, keyHash),
          eq(headlessApiPacks.status, "active"),
          isNull(headlessApiPacks.revokedAt),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async markLastUsed(id: string) {
    const rows = await this.db
      .update(headlessApiPacks)
      .set({
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(headlessApiPacks.id, id))
      .returning();

    return rows[0] ?? null;
  }
}
