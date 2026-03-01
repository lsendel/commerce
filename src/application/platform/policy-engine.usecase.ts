import { PolicyRepository } from "../../infrastructure/repositories/policy.repository";
import { ValidationError } from "../../shared/errors";

export type PolicyMode = "enforce" | "monitor";

export interface EffectivePolicyConfig {
  pricing: {
    maxVariants: number;
    minDeltaPercent: number;
    maxDeltaPercent: number;
    allowAutoApply: boolean;
  };
  shipping: {
    maxFlatRate: number;
    maxEstimatedDays: number;
  };
  promotions: {
    maxPercentageOff: number;
    maxFixedAmount: number;
    maxCampaignDays: number;
    allowStackable: boolean;
  };
  enforcement: {
    mode: PolicyMode;
  };
}

interface EffectivePolicyView {
  version: number;
  isActive: boolean;
  config: EffectivePolicyConfig;
}

interface PolicyViolationCandidate {
  message: string;
  details?: Record<string, unknown>;
}

const DEFAULT_POLICY: EffectivePolicyConfig = {
  pricing: {
    maxVariants: 20,
    minDeltaPercent: -15,
    maxDeltaPercent: 15,
    allowAutoApply: true,
  },
  shipping: {
    maxFlatRate: 120,
    maxEstimatedDays: 30,
  },
  promotions: {
    maxPercentageOff: 60,
    maxFixedAmount: 250,
    maxCampaignDays: 120,
    allowStackable: true,
  },
  enforcement: {
    mode: "enforce",
  },
};

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

function normalizePolicyConfig(
  raw: unknown,
  fallback: EffectivePolicyConfig = DEFAULT_POLICY,
): EffectivePolicyConfig {
  const root = toRecord(raw);
  const pricing = toRecord(root.pricing);
  const shipping = toRecord(root.shipping);
  const promotions = toRecord(root.promotions);
  const enforcement = toRecord(root.enforcement);

  const minDeltaPercent = Math.max(
    -50,
    Math.min(-1, toNumber(pricing.minDeltaPercent, fallback.pricing.minDeltaPercent)),
  );
  const maxDeltaPercent = Math.max(
    1,
    Math.min(50, toNumber(pricing.maxDeltaPercent, fallback.pricing.maxDeltaPercent)),
  );

  return {
    pricing: {
      maxVariants: Math.max(
        1,
        Math.min(100, Math.trunc(toNumber(pricing.maxVariants, fallback.pricing.maxVariants))),
      ),
      minDeltaPercent,
      maxDeltaPercent,
      allowAutoApply: toBoolean(pricing.allowAutoApply, fallback.pricing.allowAutoApply),
    },
    shipping: {
      maxFlatRate: Math.max(
        0,
        Math.min(1000, toNumber(shipping.maxFlatRate, fallback.shipping.maxFlatRate)),
      ),
      maxEstimatedDays: Math.max(
        0,
        Math.min(120, Math.trunc(toNumber(shipping.maxEstimatedDays, fallback.shipping.maxEstimatedDays))),
      ),
    },
    promotions: {
      maxPercentageOff: Math.max(
        1,
        Math.min(100, toNumber(promotions.maxPercentageOff, fallback.promotions.maxPercentageOff)),
      ),
      maxFixedAmount: Math.max(
        0,
        Math.min(5000, toNumber(promotions.maxFixedAmount, fallback.promotions.maxFixedAmount)),
      ),
      maxCampaignDays: Math.max(
        1,
        Math.min(365, Math.trunc(toNumber(promotions.maxCampaignDays, fallback.promotions.maxCampaignDays))),
      ),
      allowStackable: toBoolean(promotions.allowStackable, fallback.promotions.allowStackable),
    },
    enforcement: {
      mode: enforcement.mode === "monitor" ? "monitor" : fallback.enforcement.mode,
    },
  };
}

function parseNumericFromParams(params: unknown, keys: string[]): number | null {
  const record = toRecord(params);

  for (const key of keys) {
    const value = record[key];
    if (value === undefined || value === null) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function parseIsoDate(value: unknown): Date | null {
  if (!value) return null;
  const text = String(value);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export class PolicyEngineUseCase {
  constructor(private readonly repository: PolicyRepository) {}

  async getEffectivePolicy(): Promise<EffectivePolicyView> {
    const row = await this.repository.getConfig();
    if (!row) {
      return {
        version: 1,
        isActive: true,
        config: DEFAULT_POLICY,
      };
    }

    return {
      version: row.version ?? 1,
      isActive: row.isActive ?? true,
      config: normalizePolicyConfig(row.policies),
    };
  }

  async updatePolicy(
    policies: unknown,
    options?: { isActive?: boolean; updatedBy?: string | null },
  ): Promise<EffectivePolicyView> {
    const current = await this.getEffectivePolicy();
    const normalized = normalizePolicyConfig(policies, current.config);
    const row = await this.repository.upsertConfig({
      policies: normalized,
      isActive: options?.isActive,
      updatedBy: options?.updatedBy ?? null,
    });

    return {
      version: row?.version ?? 1,
      isActive: row?.isActive ?? true,
      config: normalizePolicyConfig(row?.policies ?? normalized),
    };
  }

  async listViolations(limit = 100) {
    const rows = await this.repository.listViolations(limit);

    return rows.map((row) => ({
      id: row.id,
      domain: row.domain,
      action: row.action,
      severity: row.severity === "warning" ? "warning" : "error",
      message: row.message,
      details: toRecord(row.details),
      actorUserId: row.actorUserId ?? null,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    }));
  }

  async enforcePricingExperimentGuardrails(
    action: "propose" | "start",
    input: {
      maxVariants?: number;
      minDeltaPercent?: number;
      maxDeltaPercent?: number;
      autoApply?: boolean;
    },
    actorUserId?: string | null,
  ) {
    const effective = await this.getEffectivePolicy();
    const checks: PolicyViolationCandidate[] = [];

    if ((input.maxVariants ?? 0) > effective.config.pricing.maxVariants) {
      checks.push({
        message: `maxVariants exceeds policy limit (${effective.config.pricing.maxVariants})`,
        details: {
          provided: input.maxVariants,
          maxAllowed: effective.config.pricing.maxVariants,
        },
      });
    }

    if (
      input.minDeltaPercent !== undefined &&
      input.minDeltaPercent < effective.config.pricing.minDeltaPercent
    ) {
      checks.push({
        message: `minDeltaPercent exceeds lower policy bound (${effective.config.pricing.minDeltaPercent})`,
        details: {
          provided: input.minDeltaPercent,
          minAllowed: effective.config.pricing.minDeltaPercent,
        },
      });
    }

    if (
      input.maxDeltaPercent !== undefined &&
      input.maxDeltaPercent > effective.config.pricing.maxDeltaPercent
    ) {
      checks.push({
        message: `maxDeltaPercent exceeds upper policy bound (${effective.config.pricing.maxDeltaPercent})`,
        details: {
          provided: input.maxDeltaPercent,
          maxAllowed: effective.config.pricing.maxDeltaPercent,
        },
      });
    }

    if (
      action === "start" &&
      input.autoApply === true &&
      !effective.config.pricing.allowAutoApply
    ) {
      checks.push({
        message: "autoApply is disabled by pricing policy",
        details: {
          provided: input.autoApply,
        },
      });
    }

    await this.handleViolations("pricing", action, checks, effective, actorUserId);
  }

  async enforcePromotionGuardrails(
    action: "create" | "update" | "copilot_apply",
    input: {
      strategyType?: string;
      strategyParams?: unknown;
      stackable?: boolean;
      startsAt?: string | Date | null;
      endsAt?: string | Date | null;
    },
    actorUserId?: string | null,
  ) {
    const effective = await this.getEffectivePolicy();
    const checks: PolicyViolationCandidate[] = [];

    const strategyType = String(input.strategyType ?? "");
    const strategyParams = input.strategyParams ?? {};

    if (strategyType === "percentage_off") {
      const percentage = parseNumericFromParams(strategyParams, [
        "value",
        "percent",
        "percentage",
        "discountPercent",
        "discountPercentage",
      ]);

      if (
        percentage !== null &&
        percentage > effective.config.promotions.maxPercentageOff
      ) {
        checks.push({
          message: `percentage_off exceeds policy limit (${effective.config.promotions.maxPercentageOff}%)`,
          details: {
            provided: percentage,
            maxAllowed: effective.config.promotions.maxPercentageOff,
          },
        });
      }
    }

    if (strategyType === "fixed_amount") {
      const fixedAmount = parseNumericFromParams(strategyParams, [
        "value",
        "amount",
        "discountAmount",
      ]);

      if (
        fixedAmount !== null &&
        fixedAmount > effective.config.promotions.maxFixedAmount
      ) {
        checks.push({
          message: `fixed_amount exceeds policy limit (${effective.config.promotions.maxFixedAmount})`,
          details: {
            provided: fixedAmount,
            maxAllowed: effective.config.promotions.maxFixedAmount,
          },
        });
      }
    }

    if (input.stackable === true && !effective.config.promotions.allowStackable) {
      checks.push({
        message: "stackable promotions are disabled by policy",
      });
    }

    const startsAt = parseIsoDate(input.startsAt);
    const endsAt = parseIsoDate(input.endsAt);

    if (startsAt && endsAt) {
      const durationMs = endsAt.getTime() - startsAt.getTime();
      if (durationMs < 0) {
        checks.push({
          message: "promotion schedule is invalid (endsAt before startsAt)",
          details: {
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
          },
        });
      } else {
        const durationDays = durationMs / (1000 * 60 * 60 * 24);
        if (durationDays > effective.config.promotions.maxCampaignDays) {
          checks.push({
            message: `promotion duration exceeds policy limit (${effective.config.promotions.maxCampaignDays} days)`,
            details: {
              providedDays: Number(durationDays.toFixed(2)),
              maxAllowedDays: effective.config.promotions.maxCampaignDays,
            },
          });
        }
      }
    }

    await this.handleViolations("promotions", action, checks, effective, actorUserId);
  }

  async enforceShippingRateGuardrails(
    action: "create_rate" | "update_rate",
    input: {
      type?: string;
      price?: string;
      estimatedDaysMin?: number;
      estimatedDaysMax?: number;
    },
    actorUserId?: string | null,
  ) {
    const effective = await this.getEffectivePolicy();
    const checks: PolicyViolationCandidate[] = [];

    const rateType = String(input.type ?? "");
    const ratePrice = input.price == null ? null : Number(input.price);

    if (rateType === "flat" && ratePrice !== null && Number.isFinite(ratePrice)) {
      if (ratePrice > effective.config.shipping.maxFlatRate) {
        checks.push({
          message: `flat shipping rate exceeds policy limit (${effective.config.shipping.maxFlatRate})`,
          details: {
            provided: ratePrice,
            maxAllowed: effective.config.shipping.maxFlatRate,
          },
        });
      }
    }

    const estimatedDaysMin = input.estimatedDaysMin;
    const estimatedDaysMax = input.estimatedDaysMax;

    if (
      estimatedDaysMax !== undefined &&
      estimatedDaysMax > effective.config.shipping.maxEstimatedDays
    ) {
      checks.push({
        message: `estimatedDaysMax exceeds policy limit (${effective.config.shipping.maxEstimatedDays})`,
        details: {
          provided: estimatedDaysMax,
          maxAllowed: effective.config.shipping.maxEstimatedDays,
        },
      });
    }

    if (
      estimatedDaysMin !== undefined &&
      estimatedDaysMax !== undefined &&
      estimatedDaysMin > estimatedDaysMax
    ) {
      checks.push({
        message: "estimatedDaysMin cannot exceed estimatedDaysMax",
        details: {
          estimatedDaysMin,
          estimatedDaysMax,
        },
      });
    }

    await this.handleViolations("shipping", action, checks, effective, actorUserId);
  }

  private async handleViolations(
    domain: string,
    action: string,
    checks: PolicyViolationCandidate[],
    effective: EffectivePolicyView,
    actorUserId?: string | null,
  ) {
    if (checks.length === 0) return;

    const severity =
      effective.isActive && effective.config.enforcement.mode === "enforce"
        ? "error"
        : "warning";

    for (const check of checks) {
      await this.repository.recordViolation({
        domain,
        action,
        severity,
        message: check.message,
        details: {
          ...(check.details ?? {}),
          policyMode: effective.config.enforcement.mode,
          policyActive: effective.isActive,
          policyVersion: effective.version,
        },
        actorUserId: actorUserId ?? null,
      });
    }

    if (severity === "error") {
      throw new ValidationError(checks.map((check) => check.message).join("; "));
    }
  }
}
