import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import type { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { orderItems, orders, products, productVariants } from "../../infrastructure/db/schema";
import { NotFoundError, ValidationError } from "../../shared/errors";

interface ProposeInput {
  maxVariants?: number;
  variantIds?: string[];
  minDeltaPercent?: number;
  maxDeltaPercent?: number;
}

interface CandidateVariant {
  variantId: string;
  productId: string;
  productName: string;
  variantTitle: string;
  currentPrice: number;
  currentCompareAtPrice: number | null;
  inventoryQuantity: number;
  reservedQuantity: number;
  units30d: number;
  revenue30d: number;
  orderCount30d: number;
}

export interface PricingExperimentAssignment {
  variantId: string;
  productId: string;
  productName: string;
  variantTitle: string;
  baselinePrice: number;
  baselineCompareAtPrice: number | null;
  proposedPrice: number;
  deltaPercent: number;
  rationale: string;
}

export interface PricingExperimentProposal {
  assignments: PricingExperimentAssignment[];
  warnings: string[];
  guardrails: {
    minDeltaPercent: number;
    maxDeltaPercent: number;
    maxVariants: number;
  };
}

export interface PricingExperimentRecord {
  experimentId: string;
  name: string;
  status: "running" | "stopped";
  startedAt: string;
  stoppedAt: string | null;
  assignmentsCount: number;
  avgDeltaPercent: number;
}

export interface PricingExperimentPerformance {
  experimentId: string;
  startedAt: string;
  stoppedAt: string | null;
  windowDays: number;
  preWindow: {
    from: string;
    to: string;
    units: number;
    revenue: number;
    orderCount: number;
  };
  postWindow: {
    from: string;
    to: string;
    units: number;
    revenue: number;
    orderCount: number;
  };
  lifts: {
    unitsPercent: number | null;
    revenuePercent: number | null;
    orderCountPercent: number | null;
  };
}

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

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asAssignments(value: unknown): PricingExperimentAssignment[] {
  if (!Array.isArray(value)) return [];

  const assignments: PricingExperimentAssignment[] = [];
  for (const item of value) {
    const row = toRecord(item);
    const variantId = asString(row.variantId);
    const productId = asString(row.productId);
    const productName = asString(row.productName);
    const variantTitle = asString(row.variantTitle);
    const baselinePrice = asNumber(row.baselinePrice);
    const proposedPrice = asNumber(row.proposedPrice);
    const deltaPercent = asNumber(row.deltaPercent);

    if (!variantId || !productId || !productName || !variantTitle) continue;
    if (baselinePrice === null || proposedPrice === null || deltaPercent === null) continue;

    assignments.push({
      variantId,
      productId,
      productName,
      variantTitle,
      baselinePrice,
      baselineCompareAtPrice: asNumber(row.baselineCompareAtPrice),
      proposedPrice,
      deltaPercent,
      rationale: asString(row.rationale) ?? "No rationale provided.",
    });
  }

  return assignments;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function percentLift(next: number, prev: number): number | null {
  if (!Number.isFinite(prev) || prev <= 0) return null;
  return roundToTwo(((next - prev) / prev) * 100);
}

function computePsychologicalPrice(basePrice: number, deltaPercent: number): number {
  if (deltaPercent === 0) return roundToTwo(basePrice);

  const raw = basePrice * (1 + deltaPercent / 100);
  const clamped = clamp(raw, 1, 10000);

  if (deltaPercent > 0) {
    const ceil = Math.ceil(clamped);
    return roundToTwo(Math.max(1, ceil - 0.01));
  }

  const floor = Math.floor(clamped);
  if (floor <= 1) return roundToTwo(Math.max(1, clamped));
  return roundToTwo(floor + 0.99);
}

export class AgenticPricingExperimentsUseCase {
  constructor(
    private readonly db: Database,
    private readonly storeId: string,
    private readonly analyticsRepo: AnalyticsRepository,
  ) {}

  async propose(input: ProposeInput = {}): Promise<PricingExperimentProposal> {
    const maxVariants = Math.max(1, Math.min(Number(input.maxVariants ?? 8), 30));
    const minDeltaPercent = clamp(Number(input.minDeltaPercent ?? -10), -20, 0);
    const maxDeltaPercent = clamp(Number(input.maxDeltaPercent ?? 10), 0, 20);
    if (minDeltaPercent > maxDeltaPercent) {
      throw new ValidationError("minDeltaPercent cannot be greater than maxDeltaPercent");
    }

    const warnings: string[] = [];
    const candidates = await this.loadCandidates({
      variantIds: input.variantIds,
      maxVariants,
    });

    if (candidates.length === 0) {
      throw new ValidationError("No eligible variants found for pricing experiments");
    }

    const assignments: PricingExperimentAssignment[] = [];

    for (const candidate of candidates) {
      const availableInventory = Math.max(
        0,
        Number(candidate.inventoryQuantity) - Number(candidate.reservedQuantity),
      );

      let delta = 0;
      let rationale = "Stable demand profile; keep current price.";

      if (availableInventory === 0) {
        delta = 0;
        rationale = "No available inventory; skip price changes to avoid demand distortion.";
      } else if (candidate.units30d >= 40 && availableInventory <= 8) {
        delta = 6;
        rationale = "High velocity with constrained inventory; test premium uplift.";
      } else if (candidate.units30d >= 25) {
        delta = 3;
        rationale = "Strong recent demand; test moderate upward price movement.";
      } else if (candidate.units30d <= 3 && availableInventory >= 20) {
        delta = -7;
        rationale = "Low sell-through with high inventory; test stronger price reduction.";
      } else if (candidate.units30d <= 8 && availableInventory >= 12) {
        delta = -4;
        rationale = "Soft demand and available inventory; test light markdown.";
      } else if (candidate.revenue30d === 0 && availableInventory >= 5) {
        delta = -5;
        rationale = "No recent revenue; test demand activation discount.";
      }

      if (candidate.currentPrice <= 5 && delta < 0) {
        delta = Math.max(delta, -2);
      }
      if (candidate.currentPrice >= 200 && delta > 0) {
        delta = Math.min(delta, 4);
      }

      delta = clamp(delta, minDeltaPercent, maxDeltaPercent);
      const proposedPrice = computePsychologicalPrice(candidate.currentPrice, delta);
      const effectiveDelta =
        candidate.currentPrice > 0
          ? roundToTwo(((proposedPrice - candidate.currentPrice) / candidate.currentPrice) * 100)
          : 0;

      if (effectiveDelta === 0 || proposedPrice <= 0) {
        continue;
      }

      assignments.push({
        variantId: candidate.variantId,
        productId: candidate.productId,
        productName: candidate.productName,
        variantTitle: candidate.variantTitle,
        baselinePrice: roundToTwo(candidate.currentPrice),
        baselineCompareAtPrice: candidate.currentCompareAtPrice,
        proposedPrice,
        deltaPercent: effectiveDelta,
        rationale,
      });

      if (assignments.length >= maxVariants) {
        break;
      }
    }

    if (assignments.length === 0) {
      warnings.push("No variants qualified for non-zero price changes within configured guardrails.");
    }

    return {
      assignments,
      warnings,
      guardrails: {
        minDeltaPercent,
        maxDeltaPercent,
        maxVariants,
      },
    };
  }

  async applyAssignments(assignments: PricingExperimentAssignment[]): Promise<number> {
    if (assignments.length === 0) return 0;

    const targetIds = assignments.map((assignment) => assignment.variantId);
    const eligibleRows = await this.db
      .select({
        variantId: productVariants.id,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          eq(products.storeId, this.storeId),
          inArray(productVariants.id, targetIds),
        ),
      );

    const eligible = new Set(eligibleRows.map((row) => row.variantId));
    let updated = 0;

    for (const assignment of assignments) {
      if (!eligible.has(assignment.variantId)) continue;

      const nextCompareAt =
        assignment.proposedPrice < assignment.baselinePrice
          ? assignment.baselinePrice.toFixed(2)
          : assignment.baselineCompareAtPrice !== null
            ? assignment.baselineCompareAtPrice.toFixed(2)
            : null;

      await this.db
        .update(productVariants)
        .set({
          price: assignment.proposedPrice.toFixed(2),
          compareAtPrice: nextCompareAt,
        })
        .where(eq(productVariants.id, assignment.variantId));

      updated++;
    }

    return updated;
  }

  async restoreAssignments(assignments: PricingExperimentAssignment[]): Promise<number> {
    if (assignments.length === 0) return 0;

    const targetIds = assignments.map((assignment) => assignment.variantId);
    const eligibleRows = await this.db
      .select({
        variantId: productVariants.id,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          eq(products.storeId, this.storeId),
          inArray(productVariants.id, targetIds),
        ),
      );

    const eligible = new Set(eligibleRows.map((row) => row.variantId));
    let updated = 0;

    for (const assignment of assignments) {
      if (!eligible.has(assignment.variantId)) continue;

      await this.db
        .update(productVariants)
        .set({
          price: assignment.baselinePrice.toFixed(2),
          compareAtPrice:
            assignment.baselineCompareAtPrice !== null
              ? assignment.baselineCompareAtPrice.toFixed(2)
              : null,
        })
        .where(eq(productVariants.id, assignment.variantId));

      updated++;
    }

    return updated;
  }

  async listExperiments(limit = 20): Promise<PricingExperimentRecord[]> {
    const normalizedLimit = Math.max(1, Math.min(limit, 100));
    const events = await this.analyticsRepo.listRecentEventsByTypes(
      ["pricing_experiment_started", "pricing_experiment_stopped"],
      normalizedLimit * 20,
    );

    const stopMap = new Map<string, string>();
    for (const event of events) {
      if (event.eventType !== "pricing_experiment_stopped") continue;
      const properties = toRecord(event.properties);
      const experimentId = asString(properties.experimentId);
      if (!experimentId || stopMap.has(experimentId)) continue;
      const stoppedAt = asString(properties.stoppedAt)
        ?? (event.createdAt instanceof Date ? event.createdAt.toISOString() : null)
        ?? new Date().toISOString();
      stopMap.set(experimentId, stoppedAt);
    }

    const result: PricingExperimentRecord[] = [];
    const seen = new Set<string>();

    for (const event of events) {
      if (event.eventType !== "pricing_experiment_started") continue;
      const properties = toRecord(event.properties);
      const experimentId = asString(properties.experimentId);
      if (!experimentId || seen.has(experimentId)) continue;
      seen.add(experimentId);

      const assignments = asAssignments(properties.assignments);
      const avgDeltaPercent = assignments.length > 0
        ? roundToTwo(
            assignments.reduce((sum, item) => sum + item.deltaPercent, 0) /
              assignments.length,
          )
        : 0;

      const startedAt = asString(properties.startedAt)
        ?? (event.createdAt instanceof Date ? event.createdAt.toISOString() : new Date().toISOString());
      const stoppedAt = stopMap.get(experimentId) ?? null;

      result.push({
        experimentId,
        name: asString(properties.name) ?? "Pricing Experiment",
        status: stoppedAt ? "stopped" : "running",
        startedAt,
        stoppedAt,
        assignmentsCount: assignments.length,
        avgDeltaPercent,
      });

      if (result.length >= normalizedLimit) {
        break;
      }
    }

    return result;
  }

  async getExperimentById(experimentId: string): Promise<{
    experimentId: string;
    name: string;
    startedAt: string;
    stoppedAt: string | null;
    status: "running" | "stopped";
    assignments: PricingExperimentAssignment[];
  }> {
    const events = await this.analyticsRepo.listRecentEventsByTypes(
      ["pricing_experiment_started", "pricing_experiment_stopped"],
      2000,
    );

    let startEvent: { properties: Record<string, unknown>; createdAt: Date | null } | null = null;
    let stoppedAt: string | null = null;

    for (const event of events) {
      const properties = toRecord(event.properties);
      const eventExperimentId = asString(properties.experimentId);
      if (eventExperimentId !== experimentId) continue;

      if (event.eventType === "pricing_experiment_stopped" && stoppedAt === null) {
        stoppedAt = asString(properties.stoppedAt)
          ?? (event.createdAt instanceof Date ? event.createdAt.toISOString() : null)
          ?? new Date().toISOString();
      }

      if (event.eventType === "pricing_experiment_started" && startEvent === null) {
        startEvent = {
          properties,
          createdAt: event.createdAt instanceof Date ? event.createdAt : null,
        };
      }

      if (startEvent && stoppedAt !== null) {
        break;
      }
    }

    if (!startEvent) {
      throw new NotFoundError("Pricing experiment", experimentId);
    }

    const startedAt = asString(startEvent.properties.startedAt)
      ?? (startEvent.createdAt ? startEvent.createdAt.toISOString() : new Date().toISOString());

    return {
      experimentId,
      name: asString(startEvent.properties.name) ?? "Pricing Experiment",
      startedAt,
      stoppedAt,
      status: stoppedAt ? "stopped" : "running",
      assignments: asAssignments(startEvent.properties.assignments),
    };
  }

  async getPerformance(
    experimentId: string,
    windowDays = 14,
  ): Promise<PricingExperimentPerformance> {
    const normalizedWindowDays = Math.max(3, Math.min(windowDays, 60));
    const experiment = await this.getExperimentById(experimentId);
    const startAt = new Date(experiment.startedAt);
    if (Number.isNaN(startAt.getTime())) {
      throw new ValidationError("Experiment start timestamp is invalid");
    }

    const endAt = experiment.stoppedAt ? new Date(experiment.stoppedAt) : new Date();
    const preFrom = new Date(startAt);
    preFrom.setUTCDate(preFrom.getUTCDate() - normalizedWindowDays);

    const pre = await this.aggregateVariantWindow(
      experiment.assignments.map((item) => item.variantId),
      preFrom,
      startAt,
    );
    const post = await this.aggregateVariantWindow(
      experiment.assignments.map((item) => item.variantId),
      startAt,
      endAt,
    );

    return {
      experimentId,
      startedAt: startAt.toISOString(),
      stoppedAt: experiment.stoppedAt,
      windowDays: normalizedWindowDays,
      preWindow: {
        from: preFrom.toISOString(),
        to: startAt.toISOString(),
        units: pre.units,
        revenue: pre.revenue,
        orderCount: pre.orderCount,
      },
      postWindow: {
        from: startAt.toISOString(),
        to: endAt.toISOString(),
        units: post.units,
        revenue: post.revenue,
        orderCount: post.orderCount,
      },
      lifts: {
        unitsPercent: percentLift(post.units, pre.units),
        revenuePercent: percentLift(post.revenue, pre.revenue),
        orderCountPercent: percentLift(post.orderCount, pre.orderCount),
      },
    };
  }

  private async loadCandidates(input: {
    variantIds?: string[];
    maxVariants: number;
  }): Promise<CandidateVariant[]> {
    const requestedVariantIds = (input.variantIds ?? []).filter(Boolean);

    let candidateVariantIds: string[] = [];
    if (requestedVariantIds.length > 0) {
      candidateVariantIds = Array.from(new Set(requestedVariantIds)).slice(0, input.maxVariants * 3);
    } else {
      const last30Days = new Date();
      last30Days.setUTCDate(last30Days.getUTCDate() - 30);

      const topRows = await this.db
        .select({
          variantId: orderItems.variantId,
          revenue: sql<string>`sum(${orderItems.totalPrice})`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(
          and(
            eq(orders.storeId, this.storeId),
            eq(products.status, "active"),
            eq(products.availableForSale, true),
            gte(orders.createdAt, last30Days),
            inArray(orders.status, [...NON_CANCELLED_ORDER_STATUSES]),
          ),
        )
        .groupBy(orderItems.variantId)
        .orderBy(desc(sql`sum(${orderItems.totalPrice})`))
        .limit(input.maxVariants * 3);

      candidateVariantIds = topRows
        .map((row) => row.variantId)
        .filter((variantId): variantId is string => typeof variantId === "string" && variantId.length > 0);

      if (candidateVariantIds.length === 0) {
        const fallbackRows = await this.db
          .select({ variantId: productVariants.id })
          .from(productVariants)
          .innerJoin(products, eq(productVariants.productId, products.id))
          .where(
            and(
              eq(products.storeId, this.storeId),
              eq(products.status, "active"),
              eq(products.availableForSale, true),
              eq(productVariants.availableForSale, true),
            ),
          )
          .orderBy(desc(products.createdAt))
          .limit(input.maxVariants * 3);

        candidateVariantIds = fallbackRows
          .map((row) => row.variantId)
          .filter((variantId): variantId is string => typeof variantId === "string" && variantId.length > 0);
      }
    }

    if (candidateVariantIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .select({
        variantId: productVariants.id,
        productId: products.id,
        productName: products.name,
        variantTitle: productVariants.title,
        currentPrice: productVariants.price,
        currentCompareAtPrice: productVariants.compareAtPrice,
        inventoryQuantity: productVariants.inventoryQuantity,
        reservedQuantity: productVariants.reservedQuantity,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          eq(products.storeId, this.storeId),
          inArray(productVariants.id, candidateVariantIds),
          eq(products.status, "active"),
          eq(products.availableForSale, true),
          eq(productVariants.availableForSale, true),
        ),
      )
      .limit(input.maxVariants * 3);

    if (rows.length === 0) {
      return [];
    }

    const performanceMap = await this.loadVariantPerformance(
      rows.map((row) => row.variantId),
      30,
    );

    return rows
      .map((row) => {
        const perf = performanceMap.get(row.variantId) ?? {
          units30d: 0,
          revenue30d: 0,
          orderCount30d: 0,
        };

        return {
          variantId: row.variantId,
          productId: row.productId,
          productName: row.productName,
          variantTitle: row.variantTitle,
          currentPrice: Number(row.currentPrice ?? 0),
          currentCompareAtPrice:
            row.currentCompareAtPrice !== null ? Number(row.currentCompareAtPrice) : null,
          inventoryQuantity: Number(row.inventoryQuantity ?? 0),
          reservedQuantity: Number(row.reservedQuantity ?? 0),
          units30d: perf.units30d,
          revenue30d: perf.revenue30d,
          orderCount30d: perf.orderCount30d,
        };
      })
      .filter((row) => row.currentPrice > 0)
      .slice(0, input.maxVariants * 3);
  }

  private async loadVariantPerformance(variantIds: string[], days: number): Promise<Map<string, {
    units30d: number;
    revenue30d: number;
    orderCount30d: number;
  }>> {
    if (variantIds.length === 0) {
      return new Map();
    }

    const from = new Date();
    from.setUTCDate(from.getUTCDate() - days);

    const rows = await this.db
      .select({
        variantId: orderItems.variantId,
        units: sql<number>`sum(${orderItems.quantity})::int`,
        revenue: sql<string>`sum(${orderItems.totalPrice})`,
        orderCount: sql<number>`count(distinct ${orders.id})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.storeId, this.storeId),
          inArray(orderItems.variantId, variantIds),
          gte(orders.createdAt, from),
          inArray(orders.status, [...NON_CANCELLED_ORDER_STATUSES]),
        ),
      )
      .groupBy(orderItems.variantId);

    return new Map(
      rows
        .filter((row): row is typeof row & { variantId: string } => typeof row.variantId === "string" && row.variantId.length > 0)
        .map((row) => [
          row.variantId,
          {
            units30d: Number(row.units ?? 0),
            revenue30d: Number(row.revenue ?? 0),
            orderCount30d: Number(row.orderCount ?? 0),
          },
        ]),
    );
  }

  private async aggregateVariantWindow(
    variantIds: string[],
    from: Date,
    to: Date,
  ): Promise<{ units: number; revenue: number; orderCount: number }> {
    if (variantIds.length === 0 || to <= from) {
      return { units: 0, revenue: 0, orderCount: 0 };
    }

    const rows = await this.db
      .select({
        units: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
        revenue: sql<string>`coalesce(sum(${orderItems.totalPrice}), 0)`,
        orderCount: sql<number>`count(distinct ${orders.id})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.storeId, this.storeId),
          inArray(orderItems.variantId, variantIds),
          gte(orders.createdAt, from),
          lt(orders.createdAt, to),
          inArray(orders.status, [...NON_CANCELLED_ORDER_STATUSES]),
        ),
      );

    const row = rows[0];
    return {
      units: Number(row?.units ?? 0),
      revenue: Number(row?.revenue ?? 0),
      orderCount: Number(row?.orderCount ?? 0),
    };
  }
}
