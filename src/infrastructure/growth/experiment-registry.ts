export type ExperimentStatus = "draft" | "running" | "paused" | "completed";

export type GuardrailMetric =
  | "conversion_rate"
  | "revenue_per_session"
  | "average_order_value"
  | "order_rate"
  | "refund_rate";

export type GuardrailDirection = "not_below" | "not_above";

export interface ExperimentVariant {
  variantId: string;
  name: string;
  allocationPercent: number;
  isHoldout?: boolean;
}

export interface ExperimentAttributionPolicy {
  model: "first_touch" | "last_touch" | "multi_touch";
  lookbackDays: number;
  requiredKeys: string[];
  enforceCampaignAttribution: boolean;
}

export interface KpiGuardrailDefinition {
  metric: GuardrailMetric;
  direction: GuardrailDirection;
  warnThresholdPercent: number;
  failThresholdPercent: number;
  minSampleSize: number;
  actionOnFail: "pause_experiment" | "rollback_variant";
}

export interface ExperimentRegistryEntry {
  experimentId: string;
  name: string;
  owner: string;
  hypothesis: string;
  status: ExperimentStatus;
  startedAt: string;
  primaryMetric: GuardrailMetric;
  variants: ExperimentVariant[];
  attribution: ExperimentAttributionPolicy;
  guardrails: KpiGuardrailDefinition[];
  tags: string[];
}

export interface MetricObservation {
  metric: GuardrailMetric;
  baselineValue: number;
  currentValue: number;
  sampleSize: number;
}

export interface GuardrailEvaluation {
  metric: GuardrailMetric;
  direction: GuardrailDirection;
  baselineValue: number;
  currentValue: number;
  sampleSize: number;
  deltaPercent: number;
  breachPercent: number;
  status: "pass" | "warn" | "fail";
  note: string;
  action: "none" | "pause_experiment" | "rollback_variant";
}

export interface ExperimentGuardrailEvaluation {
  experimentId: string;
  status: "pass" | "warn" | "fail";
  checks: GuardrailEvaluation[];
}

export interface ExperimentRegistryValidation {
  experimentId: string;
  ok: boolean;
  errors: string[];
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function safeDeltaPercent(currentValue: number, baselineValue: number): number {
  if (baselineValue === 0) {
    if (currentValue === 0) return 0;
    return currentValue > 0 ? 100 : -100;
  }
  return roundToTwo(((currentValue - baselineValue) / Math.abs(baselineValue)) * 100);
}

function computeBreachPercent(
  direction: GuardrailDirection,
  baselineValue: number,
  currentValue: number,
): number {
  if (baselineValue === 0) {
    if (direction === "not_below" && currentValue < 0) return 100;
    if (direction === "not_above" && currentValue > 0) return 100;
    return 0;
  }

  if (direction === "not_below") {
    if (currentValue >= baselineValue) return 0;
    return roundToTwo(((baselineValue - currentValue) / Math.abs(baselineValue)) * 100);
  }

  if (currentValue <= baselineValue) return 0;
  return roundToTwo(((currentValue - baselineValue) / Math.abs(baselineValue)) * 100);
}

function evaluateSingleGuardrail(
  guardrail: KpiGuardrailDefinition,
  observation: MetricObservation,
): GuardrailEvaluation {
  const deltaPercent = safeDeltaPercent(observation.currentValue, observation.baselineValue);
  const breachPercent = computeBreachPercent(
    guardrail.direction,
    observation.baselineValue,
    observation.currentValue,
  );

  if (observation.sampleSize < guardrail.minSampleSize) {
    return {
      metric: guardrail.metric,
      direction: guardrail.direction,
      baselineValue: observation.baselineValue,
      currentValue: observation.currentValue,
      sampleSize: observation.sampleSize,
      deltaPercent,
      breachPercent,
      status: "warn",
      note: `Sample size ${observation.sampleSize} below minimum ${guardrail.minSampleSize}.`,
      action: "none",
    };
  }

  if (breachPercent >= guardrail.failThresholdPercent) {
    return {
      metric: guardrail.metric,
      direction: guardrail.direction,
      baselineValue: observation.baselineValue,
      currentValue: observation.currentValue,
      sampleSize: observation.sampleSize,
      deltaPercent,
      breachPercent,
      status: "fail",
      note: `Breach ${breachPercent}% exceeded fail threshold ${guardrail.failThresholdPercent}%.`,
      action: guardrail.actionOnFail,
    };
  }

  if (breachPercent >= guardrail.warnThresholdPercent) {
    return {
      metric: guardrail.metric,
      direction: guardrail.direction,
      baselineValue: observation.baselineValue,
      currentValue: observation.currentValue,
      sampleSize: observation.sampleSize,
      deltaPercent,
      breachPercent,
      status: "warn",
      note: `Breach ${breachPercent}% exceeded warn threshold ${guardrail.warnThresholdPercent}%.`,
      action: "none",
    };
  }

  return {
    metric: guardrail.metric,
    direction: guardrail.direction,
    baselineValue: observation.baselineValue,
    currentValue: observation.currentValue,
    sampleSize: observation.sampleSize,
    deltaPercent,
    breachPercent,
    status: "pass",
    note: "Within configured threshold.",
    action: "none",
  };
}

export function validateExperimentRegistry(
  registry: ExperimentRegistryEntry[],
): ExperimentRegistryValidation[] {
  const seenIds = new Set<string>();

  return registry.map((entry) => {
    const errors: string[] = [];

    if (seenIds.has(entry.experimentId)) {
      errors.push("Duplicate experimentId.");
    }
    seenIds.add(entry.experimentId);

    if (entry.variants.length < 2) {
      errors.push("At least two variants are required (including holdout).");
    }

    const totalAllocation = roundToTwo(
      entry.variants.reduce((sum, variant) => sum + variant.allocationPercent, 0),
    );
    if (totalAllocation !== 100) {
      errors.push(`Variant allocation must total 100; got ${totalAllocation}.`);
    }

    const holdoutCount = entry.variants.filter((variant) => variant.isHoldout).length;
    if (holdoutCount !== 1) {
      errors.push(`Exactly one holdout variant is required; got ${holdoutCount}.`);
    }

    if (!entry.attribution.requiredKeys.includes("utmSource")) {
      errors.push("Attribution requiredKeys must include utmSource.");
    }
    if (!entry.attribution.requiredKeys.includes("utmCampaign")) {
      errors.push("Attribution requiredKeys must include utmCampaign.");
    }
    if (!entry.attribution.requiredKeys.includes("landingPath")) {
      errors.push("Attribution requiredKeys must include landingPath.");
    }

    if (!entry.guardrails.some((guardrail) => guardrail.metric === entry.primaryMetric)) {
      errors.push("Primary metric must be represented in guardrails.");
    }

    return {
      experimentId: entry.experimentId,
      ok: errors.length === 0,
      errors,
    };
  });
}

export function evaluateExperimentGuardrails(
  entry: ExperimentRegistryEntry,
  observations: MetricObservation[],
): ExperimentGuardrailEvaluation {
  const observationByMetric = new Map<GuardrailMetric, MetricObservation>(
    observations.map((row) => [row.metric, row]),
  );

  const checks: GuardrailEvaluation[] = [];
  for (const guardrail of entry.guardrails) {
    const observation = observationByMetric.get(guardrail.metric);
    if (!observation) {
      checks.push({
        metric: guardrail.metric,
        direction: guardrail.direction,
        baselineValue: 0,
        currentValue: 0,
        sampleSize: 0,
        deltaPercent: 0,
        breachPercent: 100,
        status: "fail",
        note: "Missing metric observation.",
        action: guardrail.actionOnFail,
      });
      continue;
    }

    checks.push(evaluateSingleGuardrail(guardrail, observation));
  }

  const hasFail = checks.some((check) => check.status === "fail");
  const hasWarn = checks.some((check) => check.status === "warn");
  return {
    experimentId: entry.experimentId,
    status: hasFail ? "fail" : hasWarn ? "warn" : "pass",
    checks,
  };
}

export function buildDefaultExperimentRegistry(): ExperimentRegistryEntry[] {
  return [
    {
      experimentId: "wk45-pricing-holdout-geo",
      name: "Pricing Lift by Demand Bands",
      owner: "commerce-growth",
      hypothesis:
        "Geo-weighted dynamic pricing improves revenue per session while preserving conversion guardrails.",
      status: "running",
      startedAt: "2027-01-05T10:00:00.000Z",
      primaryMetric: "revenue_per_session",
      variants: [
        { variantId: "control", name: "Control Pricing", allocationPercent: 20, isHoldout: true },
        { variantId: "delta-plus-3", name: "Demand Weighted +3%", allocationPercent: 40 },
        { variantId: "delta-minus-2", name: "Elasticity Activation -2%", allocationPercent: 40 },
      ],
      attribution: {
        model: "last_touch",
        lookbackDays: 14,
        requiredKeys: ["utmSource", "utmMedium", "utmCampaign", "landingPath"],
        enforceCampaignAttribution: true,
      },
      guardrails: [
        {
          metric: "conversion_rate",
          direction: "not_below",
          warnThresholdPercent: 2,
          failThresholdPercent: 4,
          minSampleSize: 500,
          actionOnFail: "pause_experiment",
        },
        {
          metric: "revenue_per_session",
          direction: "not_below",
          warnThresholdPercent: 1,
          failThresholdPercent: 3,
          minSampleSize: 500,
          actionOnFail: "pause_experiment",
        },
        {
          metric: "refund_rate",
          direction: "not_above",
          warnThresholdPercent: 10,
          failThresholdPercent: 20,
          minSampleSize: 300,
          actionOnFail: "rollback_variant",
        },
      ],
      tags: ["pricing", "holdout", "week45"],
    },
    {
      experimentId: "wk45-lp-intent-copy",
      name: "Intent-Led Landing Page Narrative",
      owner: "commerce-growth",
      hypothesis:
        "Intent-matched copy sequencing increases conversion without suppressing average order value.",
      status: "running",
      startedAt: "2027-01-06T08:30:00.000Z",
      primaryMetric: "conversion_rate",
      variants: [
        { variantId: "control", name: "Static LP Template", allocationPercent: 25, isHoldout: true },
        { variantId: "intent-proof-first", name: "Proof-First Narrative", allocationPercent: 35 },
        { variantId: "intent-offer-first", name: "Offer-First Narrative", allocationPercent: 40 },
      ],
      attribution: {
        model: "first_touch",
        lookbackDays: 21,
        requiredKeys: ["utmSource", "utmCampaign", "landingPath"],
        enforceCampaignAttribution: true,
      },
      guardrails: [
        {
          metric: "conversion_rate",
          direction: "not_below",
          warnThresholdPercent: 3,
          failThresholdPercent: 5,
          minSampleSize: 600,
          actionOnFail: "pause_experiment",
        },
        {
          metric: "average_order_value",
          direction: "not_below",
          warnThresholdPercent: 2,
          failThresholdPercent: 4,
          minSampleSize: 400,
          actionOnFail: "pause_experiment",
        },
      ],
      tags: ["landing-pages", "copy", "week45"],
    },
    {
      experimentId: "wk45-checkout-recovery-offer",
      name: "Checkout Recovery Offer Timing",
      owner: "commerce-growth",
      hypothesis:
        "Recovery offer timing optimization lifts order completion rate without raising refund rate.",
      status: "running",
      startedAt: "2027-01-07T12:15:00.000Z",
      primaryMetric: "order_rate",
      variants: [
        { variantId: "control", name: "Current Timing", allocationPercent: 30, isHoldout: true },
        { variantId: "two-hour-delay", name: "2h Recovery Delay", allocationPercent: 35 },
        { variantId: "six-hour-delay", name: "6h Recovery Delay", allocationPercent: 35 },
      ],
      attribution: {
        model: "multi_touch",
        lookbackDays: 7,
        requiredKeys: ["utmSource", "utmCampaign", "landingPath"],
        enforceCampaignAttribution: false,
      },
      guardrails: [
        {
          metric: "order_rate",
          direction: "not_below",
          warnThresholdPercent: 2,
          failThresholdPercent: 4,
          minSampleSize: 300,
          actionOnFail: "pause_experiment",
        },
        {
          metric: "refund_rate",
          direction: "not_above",
          warnThresholdPercent: 12,
          failThresholdPercent: 25,
          minSampleSize: 250,
          actionOnFail: "rollback_variant",
        },
      ],
      tags: ["checkout", "recovery", "week45"],
    },
  ];
}
