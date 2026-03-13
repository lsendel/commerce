import type { PolicyGuardrailPreview } from "../platform/policy-engine.usecase";
import type { PricingExperimentProposal } from "./agentic-pricing-experiments.usecase";

export type PricingPolicyRiskLevel = "low" | "medium" | "high";

export interface PricingPreflightPolicyInput {
  maxVariants?: number;
  minDeltaPercent?: number;
  maxDeltaPercent?: number;
  autoApply?: boolean;
}

export interface DiscountScenarioInput {
  strategyType?: "percentage_off" | "fixed_amount";
  value?: number;
  stackable?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface PricingPolicyPreflightInput {
  proposal: PricingExperimentProposal;
  pricingPolicyPreview: PolicyGuardrailPreview<PricingPreflightPolicyInput>;
  discountPolicyPreview?: PolicyGuardrailPreview<{
    strategyType?: string;
    strategyParams?: unknown;
    stackable?: boolean;
    startsAt?: string | Date | null;
    endsAt?: string | Date | null;
  }> | null;
  discountScenario?: DiscountScenarioInput | null;
  policyEngineEnabled: boolean;
}

export interface PricingPolicyPreflightResult {
  modelVersion: "wk49-pricing-policy-preflight-v1";
  evaluatedAt: string;
  proposal: PricingExperimentProposal;
  proposalSummary: {
    assignmentsCount: number;
    markdownCount: number;
    markdownShare: number;
    avgDeltaPercent: number;
    avgMarkdownPercent: number | null;
    autoApply: boolean;
  };
  policyValidation: {
    policyEngineEnabled: boolean;
    pricing: PolicyGuardrailPreview<PricingPreflightPolicyInput>;
    discount: PricingPolicyPreflightInput["discountPolicyPreview"] | null;
  };
  risk: {
    score: number;
    level: PricingPolicyRiskLevel;
  };
  findings: {
    blockers: string[];
    warnings: string[];
    recommendations: string[];
  };
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

export function evaluatePricingPolicyPreflight(
  input: PricingPolicyPreflightInput,
): PricingPolicyPreflightResult {
  const assignments = input.proposal.assignments;
  const markdownAssignments = assignments.filter((assignment) => assignment.deltaPercent < 0);
  const avgDeltaPercent =
    assignments.length > 0
      ? roundToTwo(
          assignments.reduce((sum, assignment) => sum + assignment.deltaPercent, 0) /
            assignments.length,
        )
      : 0;
  const avgMarkdownPercent =
    markdownAssignments.length > 0
      ? roundToTwo(
          markdownAssignments.reduce((sum, assignment) => sum + Math.abs(assignment.deltaPercent), 0) /
            markdownAssignments.length,
        )
      : null;
  const markdownShare =
    assignments.length > 0
      ? roundToTwo(markdownAssignments.length / assignments.length)
      : 0;
  const autoApply = input.pricingPolicyPreview.input.autoApply ?? true;

  const blockers: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let riskScore = 0;

  for (const violation of input.pricingPolicyPreview.violations) {
    if (violation.severity === "error") {
      blockers.push(`Pricing policy: ${violation.message}`);
      riskScore += 35;
      continue;
    }
    warnings.push(`Pricing policy: ${violation.message}`);
    riskScore += 10;
  }

  if (input.discountPolicyPreview) {
    for (const violation of input.discountPolicyPreview.violations) {
      if (violation.severity === "error") {
        blockers.push(`Discount policy: ${violation.message}`);
        riskScore += 30;
        continue;
      }
      warnings.push(`Discount policy: ${violation.message}`);
      riskScore += 10;
    }
  }

  if (!input.policyEngineEnabled) {
    warnings.push("Policy engine guardrails are disabled; risk checks are advisory only.");
    recommendations.push("Enable policy_engine_guardrails before enabling auto-apply rollouts.");
    riskScore += 8;
  }

  if (assignments.length === 0) {
    warnings.push("No eligible assignments generated under the current proposal constraints.");
    recommendations.push("Widen guardrails or provide targeted variant IDs before launch.");
    riskScore += 10;
  }

  const pricingLimit = input.pricingPolicyPreview.policy.config.pricing.maxVariants;
  if (assignments.length >= Math.max(1, Math.floor(pricingLimit * 0.8))) {
    warnings.push(
      `Assignment volume is near policy max (${assignments.length}/${pricingLimit}).`,
    );
    recommendations.push("Reduce maxVariants for initial rollout and expand only after measured lift.");
    riskScore += 10;
  }

  const absAvgDelta = Math.abs(avgDeltaPercent);
  if (absAvgDelta >= 12) {
    blockers.push(
      `Average price delta (${avgDeltaPercent}%) is too aggressive for a safe rollout.`,
    );
    recommendations.push("Constrain min/max delta range and rerun preflight.");
    riskScore += 24;
  } else if (absAvgDelta >= 8) {
    warnings.push(
      `Average price delta (${avgDeltaPercent}%) is high and may increase volatility.`,
    );
    recommendations.push("Pilot with tighter deltas and monitor conversion daily.");
    riskScore += 14;
  }

  if (markdownShare >= 0.7 && (avgMarkdownPercent ?? 0) >= 6) {
    warnings.push(
      `Markdown concentration is elevated (${roundToTwo(markdownShare * 100)}% of assignments, avg markdown ${avgMarkdownPercent}%).`,
    );
    recommendations.push("Use control holdout and set a maximum markdown share for launch waves.");
    riskScore += 16;
  }

  if (autoApply && assignments.length >= 12) {
    warnings.push("Auto-apply is enabled on a high-volume change set.");
    recommendations.push("Disable auto-apply for first run and review recommendations manually.");
    riskScore += 12;
  }

  const discountScenario = input.discountScenario ?? null;
  if (discountScenario?.strategyType === "percentage_off") {
    const value = Number(discountScenario.value ?? 0);
    if (value >= 55) {
      blockers.push(`Configured percentage discount (${value}%) is too deep for safe rollout.`);
      recommendations.push("Lower discount percentage or use fixed-amount incentive.");
      riskScore += 24;
    } else if (value >= 40) {
      warnings.push(`High percentage discount configured (${value}%).`);
      recommendations.push("Run a shorter campaign window before broad rollout.");
      riskScore += 12;
    }
  } else if (discountScenario?.strategyType === "fixed_amount") {
    const value = Number(discountScenario.value ?? 0);
    if (value >= 250) {
      blockers.push(`Configured fixed discount (${value}) is too high for safe rollout.`);
      recommendations.push("Lower fixed discount amount or scope to limited audience.");
      riskScore += 22;
    } else if (value >= 100) {
      warnings.push(`Large fixed discount configured (${value}).`);
      recommendations.push("Cap fixed discount for low-price SKUs to protect margin.");
      riskScore += 10;
    }
  }

  if (discountScenario?.stackable === true && markdownShare >= 0.4) {
    warnings.push("Stackable discount is combined with broad markdown coverage.");
    recommendations.push("Disable stackable discounts while markdown experiments are active.");
    riskScore += 16;
  }

  const startsAt = parseIsoDate(discountScenario?.startsAt);
  const endsAt = parseIsoDate(discountScenario?.endsAt);
  if (startsAt && endsAt && endsAt > startsAt) {
    const durationDays = (endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60 * 24);
    if (durationDays > 45) {
      warnings.push(`Discount duration is long (${roundToTwo(durationDays)} days).`);
      recommendations.push("Reduce campaign duration to keep pricing signals measurable.");
      riskScore += 8;
    }
  }

  const mergedWarnings = unique([...warnings, ...input.proposal.warnings.map((warning) => `Proposal: ${warning}`)]);
  const mergedBlockers = unique(blockers);
  const mergedRecommendations = unique(recommendations);
  const score = Math.max(0, Math.min(100, Math.round(riskScore)));
  const level: PricingPolicyRiskLevel =
    mergedBlockers.length > 0 || score >= 70
      ? "high"
      : score >= 35
        ? "medium"
        : "low";

  return {
    modelVersion: "wk49-pricing-policy-preflight-v1",
    evaluatedAt: new Date().toISOString(),
    proposal: input.proposal,
    proposalSummary: {
      assignmentsCount: assignments.length,
      markdownCount: markdownAssignments.length,
      markdownShare,
      avgDeltaPercent,
      avgMarkdownPercent,
      autoApply,
    },
    policyValidation: {
      policyEngineEnabled: input.policyEngineEnabled,
      pricing: input.pricingPolicyPreview,
      discount: input.discountPolicyPreview ?? null,
    },
    risk: {
      score,
      level,
    },
    findings: {
      blockers: mergedBlockers,
      warnings: mergedWarnings,
      recommendations: mergedRecommendations,
    },
  };
}
