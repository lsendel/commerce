import { and, asc, eq, inArray } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import {
  fulfillmentRequests,
  orderReturnRequests,
} from "../../infrastructure/db/schema";

export type SlaRiskLevel = "low" | "medium" | "high";
export type SlaDomain = "fulfillment_request" | "return_request";
export type SlaRecommendedAction =
  | "retry"
  | "expedite_provider"
  | "manual_review"
  | "prioritize_return_review"
  | "prioritize_return_completion"
  | "monitor";

export interface FulfillmentSlaRiskItem {
  domain: SlaDomain;
  entityId: string;
  orderId: string;
  provider: string | null;
  status: string;
  ageMinutes: number;
  targetMinutes: number;
  riskScore: number;
  riskLevel: SlaRiskLevel;
  breachProbability: number;
  predictedBreachAt: string | null;
  reasons: string[];
  recommendedAction: SlaRecommendedAction;
  autoActionEligible: boolean;
}

export interface FulfillmentSlaDashboard {
  modelVersion: "wk50-fulfillment-sla-v1";
  generatedAt: string;
  totals: {
    openCount: number;
    fulfillmentOpenCount: number;
    returnsOpenCount: number;
    atRiskCount: number;
    highRiskCount: number;
    mediumRiskCount: number;
    autoActionEligibleCount: number;
    projectedBreaches24h: number;
  };
  actionQueue: Array<{
    action: SlaRecommendedAction;
    count: number;
  }>;
  items: FulfillmentSlaRiskItem[];
}

export interface SlaInterventionActionResult {
  entityId: string;
  orderId: string;
  domain: SlaDomain;
  action: SlaRecommendedAction;
  status: "planned" | "executed" | "skipped";
  note: string;
}

export interface FulfillmentSlaInterventionResult {
  modelVersion: "wk50-fulfillment-sla-v1";
  executedAt: string;
  dryRun: boolean;
  minRiskLevel: SlaRiskLevel;
  scannedCount: number;
  candidateCount: number;
  executedCount: number;
  skippedCount: number;
  actions: SlaInterventionActionResult[];
}

export interface FulfillmentSlaPredictionInput {
  limit?: number;
}

export interface FulfillmentSlaInterventionInput {
  dryRun?: boolean;
  limit?: number;
  minRiskLevel?: SlaRiskLevel;
}

interface FulfillmentSnapshotRow {
  id: string;
  orderId: string;
  provider: string | null;
  status: string;
  externalId: string | null;
  errorMessage: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface ReturnSnapshotRow {
  id: string;
  orderId: string;
  type: string;
  status: string;
  reason: string | null;
  instantExchange: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface QueueMessage {
  type: "fulfillment.submit";
  fulfillmentRequestId: string;
  provider: string;
  storeId: string;
}

interface QueueAdapter {
  send(message: QueueMessage): Promise<void>;
}

const FULFILLMENT_OPEN_STATUSES = [
  "pending",
  "submitted",
  "processing",
  "cancel_requested",
  "failed",
] as const;

const RETURN_OPEN_STATUSES = ["submitted", "approved"] as const;

const FULFILLMENT_TARGET_MINUTES: Record<string, number> = {
  pending: 25,
  submitted: 90,
  processing: 8 * 60,
  cancel_requested: 4 * 60,
  failed: 20,
};

const RETURN_TARGET_MINUTES: Record<string, number> = {
  submitted: 36 * 60,
  approved: 24 * 60,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toAgeMinutes(value: Date | null | undefined, now: Date): number {
  if (!value) return 0;
  return Math.max(0, Math.round((now.getTime() - value.getTime()) / 60_000));
}

function toRiskLevel(riskScore: number): SlaRiskLevel {
  if (riskScore >= 75) return "high";
  if (riskScore >= 45) return "medium";
  return "low";
}

function riskLevelAtLeast(current: SlaRiskLevel, minimum: SlaRiskLevel): boolean {
  const rank: Record<SlaRiskLevel, number> = { low: 1, medium: 2, high: 3 };
  return rank[current] >= rank[minimum];
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function isTransientError(message: string | null): boolean {
  const text = String(message ?? "").toLowerCase();
  if (!text) return true;
  return [
    /timeout/,
    /timed out/,
    /temporar/,
    /network/,
    /connection/,
    /unavailable/,
    /rate\s*limit/,
    /\b429\b/,
    /\b5\d\d\b/,
    /try again/,
  ].some((pattern) => pattern.test(text));
}

function predictFulfillmentRisk(row: FulfillmentSnapshotRow, now: Date): FulfillmentSlaRiskItem {
  const status = row.status || "pending";
  const updatedAt = row.updatedAt ?? row.createdAt;
  const ageMinutes = toAgeMinutes(updatedAt, now);
  const targetMinutes = FULFILLMENT_TARGET_MINUTES[status] ?? 120;
  const ratio = targetMinutes > 0 ? ageMinutes / targetMinutes : 0;
  const hasExternalId = Boolean(row.externalId);

  let breachProbability = 0.18;
  let riskScore = 18;
  let recommendedAction: SlaRecommendedAction = "monitor";
  let autoActionEligible = false;
  const reasons: string[] = [];

  if (status === "failed") {
    breachProbability = 0.88;
    riskScore = 90;
    const transient = isTransientError(row.errorMessage);
    reasons.push(transient ? "transient_failure_signature" : "non_transient_failure_signature");
    if (transient) {
      recommendedAction = "retry";
      autoActionEligible = true;
    } else {
      recommendedAction = "manual_review";
    }
  } else {
    if (ratio >= 1.8) {
      breachProbability = 0.84;
      riskScore = 82;
      reasons.push("age_far_above_sla_target");
    } else if (ratio >= 1.25) {
      breachProbability = 0.66;
      riskScore = 64;
      reasons.push("age_above_sla_target");
    } else if (ratio >= 0.8) {
      breachProbability = 0.48;
      riskScore = 48;
      reasons.push("age_nearing_sla_target");
    } else {
      breachProbability = 0.24;
      riskScore = 26;
    }

    if ((status === "submitted" || status === "processing") && !hasExternalId) {
      breachProbability = clamp(breachProbability + 0.2, 0, 1);
      riskScore = clamp(riskScore + 18, 0, 100);
      reasons.push("missing_external_provider_reference");
      if (ratio >= 1.0) {
        recommendedAction = "retry";
        autoActionEligible = true;
      }
    }

    if ((status === "submitted" || status === "processing") && hasExternalId && ratio >= 1.0) {
      recommendedAction = "expedite_provider";
      reasons.push("provider_lag_after_submission");
    }

    if (status === "pending" && ratio >= 1.0) {
      recommendedAction = "retry";
      autoActionEligible = true;
      reasons.push("pending_stuck_without_submission");
    }

    if (status === "cancel_requested" && ratio >= 1.0) {
      recommendedAction = "manual_review";
      reasons.push("cancellation_callback_missing");
    }
  }

  const riskLevel = toRiskLevel(riskScore);
  const minutesToBreach = Math.max(0, targetMinutes - ageMinutes);
  const predictedBreachAt =
    riskLevel === "low" && minutesToBreach > 0
      ? null
      : new Date(now.getTime() + minutesToBreach * 60_000).toISOString();

  return {
    domain: "fulfillment_request",
    entityId: row.id,
    orderId: row.orderId,
    provider: row.provider,
    status,
    ageMinutes,
    targetMinutes,
    riskScore: Math.round(riskScore),
    riskLevel,
    breachProbability: Number(breachProbability.toFixed(2)),
    predictedBreachAt,
    reasons: unique(reasons),
    recommendedAction,
    autoActionEligible,
  };
}

function predictReturnRisk(row: ReturnSnapshotRow, now: Date): FulfillmentSlaRiskItem {
  const status = row.status || "submitted";
  const updatedAt = row.updatedAt ?? row.createdAt;
  const ageMinutes = toAgeMinutes(updatedAt, now);
  const targetMinutes = RETURN_TARGET_MINUTES[status] ?? (48 * 60);
  const ratio = targetMinutes > 0 ? ageMinutes / targetMinutes : 0;

  let breachProbability = 0.2;
  let riskScore = 24;
  let recommendedAction: SlaRecommendedAction = "monitor";
  const reasons: string[] = [];

  if (ratio >= 1.8) {
    breachProbability = 0.82;
    riskScore = 81;
    reasons.push("return_age_far_above_sla_target");
  } else if (ratio >= 1.2) {
    breachProbability = 0.63;
    riskScore = 62;
    reasons.push("return_age_above_sla_target");
  } else if (ratio >= 0.8) {
    breachProbability = 0.45;
    riskScore = 46;
    reasons.push("return_age_nearing_sla_target");
  }

  if (status === "submitted" && ratio >= 1.0) {
    recommendedAction = "prioritize_return_review";
  } else if (status === "approved" && ratio >= 1.0) {
    recommendedAction = "prioritize_return_completion";
  }

  if (row.instantExchange && status === "submitted" && ratio >= 0.9) {
    breachProbability = clamp(breachProbability + 0.1, 0, 1);
    riskScore = clamp(riskScore + 8, 0, 100);
    reasons.push("instant_exchange_waiting_for_approval");
  }

  const riskLevel = toRiskLevel(riskScore);
  const minutesToBreach = Math.max(0, targetMinutes - ageMinutes);
  const predictedBreachAt =
    riskLevel === "low" && minutesToBreach > 0
      ? null
      : new Date(now.getTime() + minutesToBreach * 60_000).toISOString();

  return {
    domain: "return_request",
    entityId: row.id,
    orderId: row.orderId,
    provider: null,
    status,
    ageMinutes,
    targetMinutes,
    riskScore: Math.round(riskScore),
    riskLevel,
    breachProbability: Number(breachProbability.toFixed(2)),
    predictedBreachAt,
    reasons: unique(reasons),
    recommendedAction,
    autoActionEligible: false,
  };
}

export function buildFulfillmentSlaDashboard(input: {
  fulfillmentRows: FulfillmentSnapshotRow[];
  returnRows: ReturnSnapshotRow[];
  limit?: number;
  now?: Date;
}): FulfillmentSlaDashboard {
  const now = input.now ?? new Date();
  const limit = Math.max(1, Math.min(Number(input.limit ?? 40), 200));

  const items = [
    ...input.fulfillmentRows.map((row) => predictFulfillmentRisk(row, now)),
    ...input.returnRows.map((row) => predictReturnRisk(row, now)),
  ]
    .sort((a, b) => {
      if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
      if (b.ageMinutes !== a.ageMinutes) return b.ageMinutes - a.ageMinutes;
      return a.entityId.localeCompare(b.entityId);
    })
    .slice(0, limit);

  const highRiskCount = items.filter((item) => item.riskLevel === "high").length;
  const mediumRiskCount = items.filter((item) => item.riskLevel === "medium").length;
  const atRiskCount = highRiskCount + mediumRiskCount;
  const autoActionEligibleCount = items.filter((item) => item.autoActionEligible).length;
  const projectedBreaches24h = items.filter((item) => item.breachProbability >= 0.5).length;

  const actionMap = new Map<SlaRecommendedAction, number>();
  for (const item of items) {
    actionMap.set(item.recommendedAction, (actionMap.get(item.recommendedAction) ?? 0) + 1);
  }

  return {
    modelVersion: "wk50-fulfillment-sla-v1",
    generatedAt: now.toISOString(),
    totals: {
      openCount: items.length,
      fulfillmentOpenCount: items.filter((item) => item.domain === "fulfillment_request").length,
      returnsOpenCount: items.filter((item) => item.domain === "return_request").length,
      atRiskCount,
      highRiskCount,
      mediumRiskCount,
      autoActionEligibleCount,
      projectedBreaches24h,
    },
    actionQueue: Array.from(actionMap.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count),
    items,
  };
}

export class FulfillmentSlaPredictionUseCase {
  constructor(
    private readonly db: Database,
    private readonly storeId: string,
    private readonly queue: QueueAdapter | null,
  ) {}

  async getDashboard(input: FulfillmentSlaPredictionInput = {}): Promise<FulfillmentSlaDashboard> {
    const limit = Math.max(1, Math.min(Number(input.limit ?? 40), 200));
    const [fulfillmentRows, returnRows] = await Promise.all([
      this.db
        .select({
          id: fulfillmentRequests.id,
          orderId: fulfillmentRequests.orderId,
          provider: fulfillmentRequests.provider,
          status: fulfillmentRequests.status,
          externalId: fulfillmentRequests.externalId,
          errorMessage: fulfillmentRequests.errorMessage,
          createdAt: fulfillmentRequests.createdAt,
          updatedAt: fulfillmentRequests.updatedAt,
        })
        .from(fulfillmentRequests)
        .where(
          and(
            eq(fulfillmentRequests.storeId, this.storeId),
            inArray(fulfillmentRequests.status, [...FULFILLMENT_OPEN_STATUSES]),
          ),
        )
        .orderBy(asc(fulfillmentRequests.updatedAt))
        .limit(limit * 3),
      this.db
        .select({
          id: orderReturnRequests.id,
          orderId: orderReturnRequests.orderId,
          type: orderReturnRequests.type,
          status: orderReturnRequests.status,
          reason: orderReturnRequests.reason,
          instantExchange: orderReturnRequests.instantExchange,
          createdAt: orderReturnRequests.createdAt,
          updatedAt: orderReturnRequests.updatedAt,
        })
        .from(orderReturnRequests)
        .where(
          and(
            eq(orderReturnRequests.storeId, this.storeId),
            inArray(orderReturnRequests.status, [...RETURN_OPEN_STATUSES]),
          ),
        )
        .orderBy(asc(orderReturnRequests.updatedAt))
        .limit(limit * 3),
    ]);

    return buildFulfillmentSlaDashboard({
      fulfillmentRows: fulfillmentRows.map((row) => ({
        ...row,
        provider: row.provider ?? null,
        status: row.status ?? "pending",
      })),
      returnRows: returnRows.map((row) => ({
        ...row,
        status: row.status ?? "submitted",
        reason: row.reason ?? null,
      })),
      limit,
    });
  }

  async runInterventions(
    input: FulfillmentSlaInterventionInput = {},
  ): Promise<FulfillmentSlaInterventionResult> {
    const dryRun = Boolean(input.dryRun);
    const limit = Math.max(1, Math.min(Number(input.limit ?? 40), 200));
    const minRiskLevel = input.minRiskLevel ?? "high";
    const dashboard = await this.getDashboard({ limit: limit * 2 });
    const candidates = dashboard.items
      .filter((item) => item.domain === "fulfillment_request")
      .filter((item) => item.autoActionEligible)
      .filter((item) => riskLevelAtLeast(item.riskLevel, minRiskLevel))
      .slice(0, limit);

    const actions: SlaInterventionActionResult[] = [];

    for (const candidate of candidates) {
      if (candidate.recommendedAction !== "retry") {
        actions.push({
          entityId: candidate.entityId,
          orderId: candidate.orderId,
          domain: candidate.domain,
          action: candidate.recommendedAction,
          status: "skipped",
          note: "Candidate action is not auto-executable.",
        });
        continue;
      }

      if (dryRun) {
        actions.push({
          entityId: candidate.entityId,
          orderId: candidate.orderId,
          domain: candidate.domain,
          action: "retry",
          status: "planned",
          note: "Dry run: request would be reset to pending and requeued.",
        });
        continue;
      }

      if (!this.queue) {
        actions.push({
          entityId: candidate.entityId,
          orderId: candidate.orderId,
          domain: candidate.domain,
          action: "retry",
          status: "skipped",
          note: "Queue adapter is unavailable.",
        });
        continue;
      }

      const [current] = await this.db
        .select({
          id: fulfillmentRequests.id,
          status: fulfillmentRequests.status,
          provider: fulfillmentRequests.provider,
        })
        .from(fulfillmentRequests)
        .where(
          and(
            eq(fulfillmentRequests.id, candidate.entityId),
            eq(fulfillmentRequests.storeId, this.storeId),
          ),
        )
        .limit(1);

      if (!current) {
        actions.push({
          entityId: candidate.entityId,
          orderId: candidate.orderId,
          domain: candidate.domain,
          action: "retry",
          status: "skipped",
          note: "Request no longer exists.",
        });
        continue;
      }

      await this.db
        .update(fulfillmentRequests)
        .set({
          status: "pending",
          errorMessage: null,
          externalId: null,
          submittedAt: null,
          completedAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(fulfillmentRequests.id, candidate.entityId),
            eq(fulfillmentRequests.storeId, this.storeId),
          ),
        );

      await this.queue.send({
        type: "fulfillment.submit",
        fulfillmentRequestId: candidate.entityId,
        provider: current.provider,
        storeId: this.storeId,
      });

      actions.push({
        entityId: candidate.entityId,
        orderId: candidate.orderId,
        domain: candidate.domain,
        action: "retry",
        status: "executed",
        note: "Request requeued for fulfillment.submit.",
      });
    }

    return {
      modelVersion: "wk50-fulfillment-sla-v1",
      executedAt: new Date().toISOString(),
      dryRun,
      minRiskLevel,
      scannedCount: dashboard.items.length,
      candidateCount: candidates.length,
      executedCount: actions.filter((action) => action.status === "executed").length,
      skippedCount: actions.filter((action) => action.status === "skipped").length,
      actions,
    };
  }
}
