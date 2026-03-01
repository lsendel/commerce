import {
  and,
  asc,
  count,
  eq,
  gte,
  inArray,
  isNotNull,
  lte,
  sql,
} from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import {
  analyticsEvents,
  cartItems,
  carts,
  orders,
  users,
} from "../../infrastructure/db/schema";
import { WorkflowRepository } from "../../infrastructure/repositories/workflow.repository";
import { NotFoundError, ValidationError } from "../../shared/errors";

export type WorkflowTriggerType = "abandoned_checkout";
export type WorkflowActionType = "checkout_recovery_message";

export type RecoveryChannel = "email" | "sms" | "whatsapp";
export type RecoveryStage = "recovery_1h" | "recovery_24h" | "recovery_72h";

export interface WorkflowTriggerConfig {
  idleMinutes: number;
  lookbackMinutes: number;
  maxCandidates: number;
}

export interface WorkflowActionConfig {
  channel: RecoveryChannel;
  stage: RecoveryStage;
  incentiveCode: string | null;
  maxPerRun: number;
}

export interface WorkflowView {
  id: string;
  name: string;
  description: string | null;
  triggerType: WorkflowTriggerType;
  triggerConfig: WorkflowTriggerConfig;
  actionType: WorkflowActionType;
  actionConfig: WorkflowActionConfig;
  isActive: boolean;
  lastRunAt: string | null;
  updatedAt: string;
}

interface CreateWorkflowInput {
  name: string;
  description?: string | null;
  triggerType: WorkflowTriggerType;
  triggerConfig?: Record<string, unknown>;
  actionType: WorkflowActionType;
  actionConfig?: Record<string, unknown>;
  isActive?: boolean;
  userId?: string | null;
}

interface UpdateWorkflowInput {
  name?: string;
  description?: string | null;
  triggerType?: WorkflowTriggerType;
  triggerConfig?: Record<string, unknown>;
  actionType?: WorkflowActionType;
  actionConfig?: Record<string, unknown>;
  isActive?: boolean;
  userId?: string | null;
}

export interface WorkflowPreviewResult {
  workflowId: string;
  matchedCount: number;
  sample: Array<{
    cartId: string;
    userId: string;
    userEmail: string;
    userPhone: string | null;
    userName: string;
    itemCount: number;
    updatedAt: string;
  }>;
  warnings: string[];
}

interface CandidateCart {
  cartId: string;
  userId: string;
  userEmail: string;
  userPhone: string | null;
  userName: string;
  itemCount: number;
  updatedAt: Date;
}

export interface WorkflowRunNotification {
  cartId: string;
  userId: string;
  userEmail: string;
  userPhone: string | null;
  userName: string;
  itemCount: number;
  idleHours: number;
  channel: RecoveryChannel;
  stage: RecoveryStage;
  recoveryUrl: string;
  incentiveCode: string | null;
}

export interface WorkflowRunPlan {
  workflow: WorkflowView;
  matchedCount: number;
  preparedCount: number;
  skippedRecovered: number;
  skippedRecentlyEnqueued: number;
  skippedMissingChannelAddress: number;
  notifications: WorkflowRunNotification[];
  warnings: string[];
}

const SUPPORTED_TRIGGER_TYPE: WorkflowTriggerType = "abandoned_checkout";
const SUPPORTED_ACTION_TYPE: WorkflowActionType = "checkout_recovery_message";

const RECOVERY_CHANNELS: RecoveryChannel[] = ["email", "sms", "whatsapp"];
const RECOVERY_STAGES: RecoveryStage[] = ["recovery_1h", "recovery_24h", "recovery_72h"];

const NON_CANCELLED_ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "refunded",
] as const;

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function normalizeTriggerConfig(raw: unknown): WorkflowTriggerConfig {
  const record = toRecord(raw);
  const idleMinutes = Math.max(
    15,
    Math.min(60 * 24 * 7, Number(record.idleMinutes ?? 60) || 60),
  );
  const lookbackMinutes = Math.max(
    idleMinutes,
    Math.min(60 * 24 * 30, Number(record.lookbackMinutes ?? 60 * 24 * 7) || 60 * 24 * 7),
  );
  const maxCandidates = Math.max(10, Math.min(500, Number(record.maxCandidates ?? 120) || 120));

  return {
    idleMinutes,
    lookbackMinutes,
    maxCandidates,
  };
}

function normalizeActionConfig(raw: unknown): WorkflowActionConfig {
  const record = toRecord(raw);

  const channel = String(record.channel ?? "email").toLowerCase();
  const stage = String(record.stage ?? "recovery_1h").toLowerCase();

  const resolvedChannel: RecoveryChannel = RECOVERY_CHANNELS.includes(channel as RecoveryChannel)
    ? (channel as RecoveryChannel)
    : "email";
  const resolvedStage: RecoveryStage = RECOVERY_STAGES.includes(stage as RecoveryStage)
    ? (stage as RecoveryStage)
    : "recovery_1h";

  const incentiveCodeRaw = String(record.incentiveCode ?? "").trim();
  const maxPerRun = Math.max(1, Math.min(200, Number(record.maxPerRun ?? 40) || 40));

  return {
    channel: resolvedChannel,
    stage: resolvedStage,
    incentiveCode: incentiveCodeRaw ? incentiveCodeRaw : null,
    maxPerRun,
  };
}

function buildRecoveryUrl(params: {
  appUrl: string;
  cartId: string;
  stage: RecoveryStage;
  channel: RecoveryChannel;
  incentiveCode?: string | null;
}): string {
  const { appUrl, cartId, stage, channel, incentiveCode } = params;
  const base = appUrl.replace(/\/$/, "");
  const url = new URL(`${base}/cart`);
  url.searchParams.set("utm_source", "checkout_recovery");
  url.searchParams.set("utm_medium", channel);
  url.searchParams.set("utm_campaign", stage);
  url.searchParams.set("utm_content", "workflow_builder");
  url.searchParams.set("cart_id", cartId);
  url.searchParams.set("recovery_stage", stage);
  url.searchParams.set("recovery_channel", channel);
  if (incentiveCode) {
    url.searchParams.set("coupon", incentiveCode);
  }
  return url.toString();
}

function hoursFromMinutes(minutes: number): number {
  return Math.max(1, Math.round(minutes / 60));
}

export class NoCodeWorkflowBuilderUseCase {
  constructor(
    private readonly db: Database,
    private readonly storeId: string,
    private readonly workflowRepo: WorkflowRepository,
  ) {}

  async listWorkflows(limit = 50): Promise<WorkflowView[]> {
    const rows = await this.workflowRepo.list(limit);
    return rows.map((row) => this.toView(row));
  }

  async getWorkflowById(id: string): Promise<WorkflowView> {
    const row = await this.workflowRepo.findById(id);
    if (!row) {
      throw new NotFoundError("Workflow", id);
    }
    return this.toView(row);
  }

  async createWorkflow(input: CreateWorkflowInput): Promise<WorkflowView> {
    const name = String(input.name ?? "").trim();
    if (!name) {
      throw new ValidationError("Workflow name is required");
    }

    if (input.triggerType !== SUPPORTED_TRIGGER_TYPE) {
      throw new ValidationError(`Unsupported trigger type: ${input.triggerType}`);
    }

    if (input.actionType !== SUPPORTED_ACTION_TYPE) {
      throw new ValidationError(`Unsupported action type: ${input.actionType}`);
    }

    const row = await this.workflowRepo.create({
      name,
      description: input.description?.trim() ? input.description.trim() : null,
      triggerType: input.triggerType,
      triggerConfig: normalizeTriggerConfig(input.triggerConfig),
      actionType: input.actionType,
      actionConfig: normalizeActionConfig(input.actionConfig),
      isActive: input.isActive ?? true,
      createdBy: input.userId ?? null,
    });

    if (!row) {
      throw new ValidationError("Failed to create workflow");
    }

    return this.toView(row);
  }

  async updateWorkflow(id: string, input: UpdateWorkflowInput): Promise<WorkflowView> {
    const existing = await this.workflowRepo.findById(id);
    if (!existing) {
      throw new NotFoundError("Workflow", id);
    }

    const nextName = input.name !== undefined ? String(input.name).trim() : existing.name;
    if (!nextName) {
      throw new ValidationError("Workflow name is required");
    }

    const triggerType = input.triggerType ?? (existing.triggerType as WorkflowTriggerType);
    const actionType = input.actionType ?? (existing.actionType as WorkflowActionType);

    if (triggerType !== SUPPORTED_TRIGGER_TYPE) {
      throw new ValidationError(`Unsupported trigger type: ${triggerType}`);
    }
    if (actionType !== SUPPORTED_ACTION_TYPE) {
      throw new ValidationError(`Unsupported action type: ${actionType}`);
    }

    const nextTriggerConfig = normalizeTriggerConfig(
      input.triggerConfig ?? toRecord(existing.triggerConfig),
    );
    const nextActionConfig = normalizeActionConfig(
      input.actionConfig ?? toRecord(existing.actionConfig),
    );

    const row = await this.workflowRepo.update(id, {
      name: nextName,
      description:
        input.description !== undefined
          ? input.description?.trim() || null
          : existing.description,
      triggerType,
      triggerConfig: nextTriggerConfig,
      actionType,
      actionConfig: nextActionConfig,
      isActive: input.isActive,
      updatedBy: input.userId ?? undefined,
    });

    if (!row) {
      throw new ValidationError("Failed to update workflow");
    }

    return this.toView(row);
  }

  async setWorkflowActive(id: string, isActive: boolean, userId?: string | null): Promise<WorkflowView> {
    const row = await this.workflowRepo.update(id, {
      isActive,
      updatedBy: userId ?? null,
    });

    if (!row) {
      throw new NotFoundError("Workflow", id);
    }

    return this.toView(row);
  }

  async deleteWorkflow(id: string): Promise<void> {
    const deleted = await this.workflowRepo.delete(id);
    if (!deleted) {
      throw new NotFoundError("Workflow", id);
    }
  }

  async previewWorkflow(id: string): Promise<WorkflowPreviewResult> {
    const workflow = await this.getWorkflowById(id);

    const candidates = await this.findAbandonedCheckoutCandidates(workflow.triggerConfig);

    return {
      workflowId: workflow.id,
      matchedCount: candidates.length,
      sample: candidates.slice(0, 5).map((candidate) => ({
        cartId: candidate.cartId,
        userId: candidate.userId,
        userEmail: candidate.userEmail,
        userPhone: candidate.userPhone,
        userName: candidate.userName,
        itemCount: candidate.itemCount,
        updatedAt: candidate.updatedAt.toISOString(),
      })),
      warnings: [],
    };
  }

  async prepareRun(
    id: string,
    input: {
      appUrl: string;
      maxPerRun?: number;
      includeInactive?: boolean;
    },
  ): Promise<WorkflowRunPlan> {
    const workflow = await this.getWorkflowById(id);
    if (!input.includeInactive && !workflow.isActive) {
      throw new ValidationError("Workflow is inactive. Activate before running.");
    }

    const triggerConfig = workflow.triggerConfig;
    const actionConfig = workflow.actionConfig;
    const maxPerRun = Math.max(
      1,
      Math.min(actionConfig.maxPerRun, Number(input.maxPerRun ?? actionConfig.maxPerRun) || actionConfig.maxPerRun),
    );

    const candidates = await this.findAbandonedCheckoutCandidates(triggerConfig);

    const warnings: string[] = [];
    if (candidates.length === 0) {
      warnings.push("No abandoned checkout candidates found for current trigger window.");
    }

    const notifications: WorkflowRunNotification[] = [];
    let skippedRecovered = 0;
    let skippedRecentlyEnqueued = 0;
    let skippedMissingChannelAddress = 0;

    for (const candidate of candidates) {
      if (notifications.length >= maxPerRun) {
        break;
      }

      const hasRecovered = await this.hasRecoveredPurchase(candidate.userId, candidate.updatedAt);
      if (hasRecovered) {
        skippedRecovered++;
        continue;
      }

      const recentlyEnqueued = await this.hasRecentRecoveryEnqueue(
        candidate.cartId,
        actionConfig.channel,
        actionConfig.stage,
      );
      if (recentlyEnqueued) {
        skippedRecentlyEnqueued++;
        continue;
      }

      if (actionConfig.channel === "email" && !candidate.userEmail) {
        skippedMissingChannelAddress++;
        continue;
      }
      if ((actionConfig.channel === "sms" || actionConfig.channel === "whatsapp") && !candidate.userPhone) {
        skippedMissingChannelAddress++;
        continue;
      }

      notifications.push({
        cartId: candidate.cartId,
        userId: candidate.userId,
        userEmail: candidate.userEmail,
        userPhone: candidate.userPhone,
        userName: candidate.userName,
        itemCount: candidate.itemCount,
        idleHours: hoursFromMinutes(triggerConfig.idleMinutes),
        channel: actionConfig.channel,
        stage: actionConfig.stage,
        recoveryUrl: buildRecoveryUrl({
          appUrl: input.appUrl,
          cartId: candidate.cartId,
          stage: actionConfig.stage,
          channel: actionConfig.channel,
          incentiveCode: actionConfig.incentiveCode,
        }),
        incentiveCode: actionConfig.incentiveCode,
      });
    }

    return {
      workflow,
      matchedCount: candidates.length,
      preparedCount: notifications.length,
      skippedRecovered,
      skippedRecentlyEnqueued,
      skippedMissingChannelAddress,
      notifications,
      warnings,
    };
  }

  async markWorkflowRun(id: string, userId?: string | null): Promise<void> {
    const row = await this.workflowRepo.markLastRun(id, userId ?? null);
    if (!row) {
      throw new NotFoundError("Workflow", id);
    }
  }

  private toView(row: any): WorkflowView {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      triggerType: SUPPORTED_TRIGGER_TYPE,
      triggerConfig: normalizeTriggerConfig(row.triggerConfig),
      actionType: SUPPORTED_ACTION_TYPE,
      actionConfig: normalizeActionConfig(row.actionConfig),
      isActive: Boolean(row.isActive),
      lastRunAt: row.lastRunAt ? new Date(row.lastRunAt).toISOString() : null,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  private async findAbandonedCheckoutCandidates(
    triggerConfig: WorkflowTriggerConfig,
  ): Promise<CandidateCart[]> {
    const now = new Date();
    const idleCutoff = new Date(now);
    idleCutoff.setUTCMinutes(idleCutoff.getUTCMinutes() - triggerConfig.idleMinutes);

    const lookbackCutoff = new Date(now);
    lookbackCutoff.setUTCMinutes(lookbackCutoff.getUTCMinutes() - triggerConfig.lookbackMinutes);

    const rows = await this.db
      .select({
        cartId: carts.id,
        userId: users.id,
        userEmail: users.email,
        userPhone: users.phone,
        userName: users.name,
        itemCount: count(cartItems.id),
        updatedAt: carts.updatedAt,
      })
      .from(carts)
      .innerJoin(users, eq(carts.userId, users.id))
      .leftJoin(cartItems, eq(cartItems.cartId, carts.id))
      .where(
        and(
          eq(carts.storeId, this.storeId),
          isNotNull(carts.userId),
          eq(users.marketingOptIn, true),
          isNotNull(users.emailVerifiedAt),
          lte(carts.updatedAt, idleCutoff),
          gte(carts.updatedAt, lookbackCutoff),
        ),
      )
      .groupBy(carts.id, users.id, users.email, users.phone, users.name, carts.updatedAt)
      .having(sql`count(${cartItems.id}) > 0`)
      .orderBy(asc(carts.updatedAt))
      .limit(triggerConfig.maxCandidates);

    return rows
      .map((row) => ({
        cartId: row.cartId,
        userId: row.userId,
        userEmail: row.userEmail,
        userPhone: row.userPhone ?? null,
        userName: row.userName ?? row.userEmail,
        itemCount: Number(row.itemCount ?? 0),
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt ?? new Date()),
      }))
      .filter((row): row is CandidateCart => {
        return (
          typeof row.cartId === "string" &&
          row.cartId.length > 0 &&
          typeof row.userId === "string" &&
          row.userId.length > 0 &&
          typeof row.userEmail === "string" &&
          row.userEmail.length > 0 &&
          row.itemCount > 0 &&
          !Number.isNaN(row.updatedAt.getTime())
        );
      });
  }

  private async hasRecoveredPurchase(userId: string, since: Date): Promise<boolean> {
    const rows = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.storeId, this.storeId),
          eq(orders.userId, userId),
          gte(orders.createdAt, since),
          inArray(orders.status, [...NON_CANCELLED_ORDER_STATUSES]),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }

  private async hasRecentRecoveryEnqueue(
    cartId: string,
    channel: RecoveryChannel,
    stage: RecoveryStage,
  ): Promise<boolean> {
    const cutoff = new Date();
    cutoff.setUTCHours(cutoff.getUTCHours() - 24);

    const rows = await this.db
      .select({ id: analyticsEvents.id })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.storeId, this.storeId),
          eq(analyticsEvents.eventType, "checkout_recovery_enqueued"),
          gte(analyticsEvents.createdAt, cutoff),
          sql`${analyticsEvents.properties}->>'cartId' = ${cartId}`,
          sql`${analyticsEvents.properties}->>'channel' = ${channel}`,
          sql`${analyticsEvents.properties}->>'stage' = ${stage}`,
        ),
      )
      .limit(1);

    return rows.length > 0;
  }
}
