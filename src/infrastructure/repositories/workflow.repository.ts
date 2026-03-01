import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { storeWorkflows } from "../db/schema";

interface CreateWorkflowData {
  name: string;
  description?: string | null;
  triggerType: string;
  triggerConfig: unknown;
  actionType: string;
  actionConfig: unknown;
  isActive?: boolean;
  createdBy?: string | null;
}

interface UpdateWorkflowData {
  name?: string;
  description?: string | null;
  triggerType?: string;
  triggerConfig?: unknown;
  actionType?: string;
  actionConfig?: unknown;
  isActive?: boolean;
  updatedBy?: string | null;
}

export class WorkflowRepository {
  constructor(
    private readonly db: Database,
    private readonly storeId: string,
  ) {}

  async list(limit = 50) {
    const normalizedLimit = Math.max(1, Math.min(limit, 200));
    return this.db
      .select()
      .from(storeWorkflows)
      .where(eq(storeWorkflows.storeId, this.storeId))
      .orderBy(desc(storeWorkflows.updatedAt))
      .limit(normalizedLimit);
  }

  async findById(id: string) {
    const rows = await this.db
      .select()
      .from(storeWorkflows)
      .where(and(eq(storeWorkflows.id, id), eq(storeWorkflows.storeId, this.storeId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async create(input: CreateWorkflowData) {
    const rows = await this.db
      .insert(storeWorkflows)
      .values({
        storeId: this.storeId,
        name: input.name,
        description: input.description ?? null,
        triggerType: input.triggerType,
        triggerConfig: input.triggerConfig,
        actionType: input.actionType,
        actionConfig: input.actionConfig,
        isActive: input.isActive ?? true,
        createdBy: input.createdBy ?? null,
        updatedBy: input.createdBy ?? null,
      })
      .returning();

    return rows[0] ?? null;
  }

  async update(id: string, input: UpdateWorkflowData) {
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.triggerType !== undefined) updates.triggerType = input.triggerType;
    if (input.triggerConfig !== undefined) updates.triggerConfig = input.triggerConfig;
    if (input.actionType !== undefined) updates.actionType = input.actionType;
    if (input.actionConfig !== undefined) updates.actionConfig = input.actionConfig;
    if (input.isActive !== undefined) updates.isActive = input.isActive;
    if (input.updatedBy !== undefined) updates.updatedBy = input.updatedBy;

    const rows = await this.db
      .update(storeWorkflows)
      .set(updates)
      .where(and(eq(storeWorkflows.id, id), eq(storeWorkflows.storeId, this.storeId)))
      .returning();

    return rows[0] ?? null;
  }

  async delete(id: string) {
    const rows = await this.db
      .delete(storeWorkflows)
      .where(and(eq(storeWorkflows.id, id), eq(storeWorkflows.storeId, this.storeId)))
      .returning();

    return rows[0] ?? null;
  }

  async markLastRun(id: string, updatedBy?: string | null) {
    const rows = await this.db
      .update(storeWorkflows)
      .set({
        lastRunAt: new Date(),
        updatedAt: new Date(),
        updatedBy: updatedBy ?? null,
      })
      .where(and(eq(storeWorkflows.id, id), eq(storeWorkflows.storeId, this.storeId)))
      .returning();

    return rows[0] ?? null;
  }
}
