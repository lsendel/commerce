import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { storeTemplates } from "../db/schema";

interface CreateStoreTemplateInput {
  sourceStoreId: string;
  name: string;
  description?: string | null;
  snapshot: unknown;
  isDefault?: boolean;
  createdBy?: string | null;
}

interface UpdateStoreTemplateInput {
  name?: string;
  description?: string | null;
  snapshot?: unknown;
  isDefault?: boolean;
  updatedBy?: string | null;
}

export class StoreTemplateRepository {
  constructor(
    private readonly db: Database,
    private readonly storeId: string,
  ) {}

  async list(limit = 100) {
    const normalizedLimit = Math.max(1, Math.min(limit, 200));

    return this.db
      .select()
      .from(storeTemplates)
      .where(eq(storeTemplates.storeId, this.storeId))
      .orderBy(desc(storeTemplates.updatedAt))
      .limit(normalizedLimit);
  }

  async findById(id: string) {
    const rows = await this.db
      .select()
      .from(storeTemplates)
      .where(and(eq(storeTemplates.id, id), eq(storeTemplates.storeId, this.storeId)))
      .limit(1);

    return rows[0] ?? null;
  }

  async create(input: CreateStoreTemplateInput) {
    const rows = await this.db
      .insert(storeTemplates)
      .values({
        storeId: this.storeId,
        sourceStoreId: input.sourceStoreId,
        name: input.name,
        description: input.description ?? null,
        snapshot: input.snapshot,
        isDefault: input.isDefault ?? false,
        createdBy: input.createdBy ?? null,
        updatedBy: input.createdBy ?? null,
      })
      .returning();

    return rows[0] ?? null;
  }

  async update(id: string, input: UpdateStoreTemplateInput) {
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.snapshot !== undefined) updates.snapshot = input.snapshot;
    if (input.isDefault !== undefined) updates.isDefault = input.isDefault;
    if (input.updatedBy !== undefined) updates.updatedBy = input.updatedBy;

    const rows = await this.db
      .update(storeTemplates)
      .set(updates)
      .where(and(eq(storeTemplates.id, id), eq(storeTemplates.storeId, this.storeId)))
      .returning();

    return rows[0] ?? null;
  }

  async delete(id: string) {
    const rows = await this.db
      .delete(storeTemplates)
      .where(and(eq(storeTemplates.id, id), eq(storeTemplates.storeId, this.storeId)))
      .returning();

    return rows[0] ?? null;
  }
}
