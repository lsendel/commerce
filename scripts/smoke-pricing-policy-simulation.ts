import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { PolicyEngineUseCase } from "../src/application/platform/policy-engine.usecase";
import { evaluatePricingPolicyPreflight } from "../src/application/pricing/pricing-policy-preflight";
import type { PricingExperimentProposal } from "../src/application/pricing/agentic-pricing-experiments.usecase";

type CheckStatus = "pass" | "fail";
type ReportStatus = "passed" | "failed";

interface SimulationCheck {
  id: string;
  status: CheckStatus;
  note: string;
}

interface PricingPolicySimulationReport {
  startedAt: string;
  finishedAt: string;
  status: ReportStatus;
  reportVersion: "v1";
  checks: SimulationCheck[];
  metrics: {
    totalChecks: number;
    failedChecks: number;
  };
}

function deepMerge<T extends Record<string, any>>(base: T, patch: Partial<T>): T {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === "object"
    ) {
      result[key] = deepMerge(base[key], value as Record<string, unknown>);
      continue;
    }
    result[key] = value;
  }
  return result as T;
}

function createPolicyEngine(options?: {
  isActive?: boolean;
  mode?: "enforce" | "monitor";
  configOverrides?: Record<string, unknown>;
}) {
  const defaultConfig = {
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
      mode: options?.mode ?? "enforce",
    },
  };
  const config = options?.configOverrides
    ? deepMerge(defaultConfig, options.configOverrides)
    : defaultConfig;

  const repository = {
    async getConfig() {
      return {
        version: 11,
        isActive: options?.isActive ?? true,
        policies: config,
      };
    },
    async upsertConfig(input: any) {
      return {
        version: 12,
        isActive: input?.isActive ?? true,
        policies: input?.policies ?? config,
      };
    },
    async listViolations() {
      return [];
    },
    async recordViolation() {
      return;
    },
  };

  return new PolicyEngineUseCase(repository as any);
}

function buildProposal(deltas: number[]): PricingExperimentProposal {
  return {
    assignments: deltas.map((delta, index) => ({
      variantId: `00000000-0000-0000-0000-${String(1000 + index).padStart(12, "0")}`,
      productId: `00000000-0000-0000-0000-${String(2000 + index).padStart(12, "0")}`,
      productName: `Product ${index + 1}`,
      variantTitle: `Variant ${index + 1}`,
      baselinePrice: 100,
      baselineCompareAtPrice: 120,
      proposedPrice: Number((100 * (1 + delta / 100)).toFixed(2)),
      deltaPercent: delta,
      rationale: "Fixture data",
    })),
    warnings: [],
    guardrails: {
      minDeltaPercent: -10,
      maxDeltaPercent: 10,
      maxVariants: Math.max(deltas.length, 1),
    },
  };
}

function runCheck(id: string, condition: boolean, note: string): SimulationCheck {
  return {
    id,
    status: condition ? "pass" : "fail",
    note,
  };
}

async function evaluateChecks(): Promise<SimulationCheck[]> {
  const checks: SimulationCheck[] = [];

  const lowRiskPolicy = createPolicyEngine();
  const lowRiskPricingPreview = await lowRiskPolicy.previewPricingExperimentGuardrails("start", {
    maxVariants: 4,
    minDeltaPercent: -6,
    maxDeltaPercent: 6,
    autoApply: true,
  });
  const lowRisk = evaluatePricingPolicyPreflight({
    proposal: buildProposal([3, -2, 2, -1]),
    pricingPolicyPreview: lowRiskPricingPreview,
    policyEngineEnabled: true,
  });
  checks.push(
    runCheck(
      "low-risk-rollout",
      lowRisk.risk.level === "low" && lowRisk.findings.blockers.length === 0,
      "Balanced small-delta rollout should remain low risk with no blockers.",
    ),
  );

  const blockedPolicy = createPolicyEngine({
    configOverrides: {
      pricing: {
        maxVariants: 3,
        maxDeltaPercent: 6,
        allowAutoApply: false,
      },
    },
  });
  const blockedPricingPreview = await blockedPolicy.previewPricingExperimentGuardrails("start", {
    maxVariants: 8,
    minDeltaPercent: -8,
    maxDeltaPercent: 12,
    autoApply: true,
  });
  const blockedRisk = evaluatePricingPolicyPreflight({
    proposal: buildProposal([-8, -7, -6, -5, -5, -4, -4, -3]),
    pricingPolicyPreview: blockedPricingPreview,
    policyEngineEnabled: true,
  });
  checks.push(
    runCheck(
      "hard-policy-block",
      blockedRisk.risk.level === "high" &&
        blockedRisk.findings.blockers.some((item) => item.startsWith("Pricing policy:")),
      "Policy violations in enforce mode should trigger high-risk preflight blockers.",
    ),
  );

  const monitorPolicy = createPolicyEngine({
    mode: "monitor",
    configOverrides: {
      pricing: {
        maxVariants: 3,
        maxDeltaPercent: 6,
        allowAutoApply: false,
      },
    },
  });
  const monitorPreview = await monitorPolicy.previewPricingExperimentGuardrails("start", {
    maxVariants: 8,
    minDeltaPercent: -8,
    maxDeltaPercent: 12,
    autoApply: true,
  });
  const monitorRisk = evaluatePricingPolicyPreflight({
    proposal: buildProposal([-8, -7, -6, -5, -5, -4, -4, -3]),
    pricingPolicyPreview: monitorPreview,
    policyEngineEnabled: true,
  });
  checks.push(
    runCheck(
      "monitor-mode-warnings",
      monitorPreview.wouldBlock === false &&
        monitorRisk.findings.blockers.length === 0 &&
        monitorRisk.findings.warnings.some((item) => item.startsWith("Pricing policy:")),
      "Monitor mode should downgrade violations to warnings without hard blockers.",
    ),
  );

  const discountPolicy = createPolicyEngine({
    configOverrides: {
      promotions: {
        maxPercentageOff: 25,
        allowStackable: false,
      },
    },
  });
  const discountPricingPreview = await discountPolicy.previewPricingExperimentGuardrails("start", {
    maxVariants: 6,
    minDeltaPercent: -10,
    maxDeltaPercent: 5,
    autoApply: false,
  });
  const discountPreview = await discountPolicy.previewPromotionGuardrails("copilot_apply", {
    strategyType: "percentage_off",
    strategyParams: { value: 40 },
    stackable: true,
    startsAt: "2027-02-01T00:00:00.000Z",
    endsAt: "2027-02-20T00:00:00.000Z",
  });
  const discountRisk = evaluatePricingPolicyPreflight({
    proposal: buildProposal([-10, -9, -8, -7, -6, -5]),
    pricingPolicyPreview: discountPricingPreview,
    discountPolicyPreview: discountPreview,
    discountScenario: {
      strategyType: "percentage_off",
      value: 40,
      stackable: true,
      startsAt: "2027-02-01T00:00:00.000Z",
      endsAt: "2027-02-20T00:00:00.000Z",
    },
    policyEngineEnabled: true,
  });
  checks.push(
    runCheck(
      "discount-policy-block",
      discountRisk.findings.blockers.some((item) => item.startsWith("Discount policy:")) &&
        discountRisk.findings.recommendations.some((item) =>
          item.includes("Disable stackable discounts"),
        ),
      "Unsafe discount scenarios should produce blocking findings and mitigation guidance.",
    ),
  );

  const advisoryRisk = evaluatePricingPolicyPreflight({
    proposal: buildProposal([2, -1]),
    pricingPolicyPreview: lowRiskPricingPreview,
    policyEngineEnabled: false,
  });
  checks.push(
    runCheck(
      "policy-engine-disabled-advisory",
      advisoryRisk.findings.warnings.some((item) =>
        item.includes("Policy engine guardrails are disabled"),
      ),
      "Preflight should surface advisory warning when policy enforcement is disabled.",
    ),
  );

  return checks;
}

async function writeReport(report: PricingPolicySimulationReport) {
  const reportJsonPath =
    process.env.SMOKE_PRICING_POLICY_SIMULATION_JSON_PATH ??
    "output/smoke/pricing-policy-simulation-report.json";
  const reportMdPath =
    process.env.SMOKE_PRICING_POLICY_SIMULATION_MD_PATH ??
    "output/smoke/pricing-policy-simulation-report.md";

  await mkdir(dirname(reportJsonPath), { recursive: true });
  await mkdir(dirname(reportMdPath), { recursive: true });
  await writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines: string[] = [
    "# Pricing Policy Simulation Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Total checks: ${report.metrics.totalChecks}`,
    `- Failed checks: ${report.metrics.failedChecks}`,
    "",
    "| Check | Status | Note |",
    "| --- | --- | --- |",
    ...report.checks.map((check) => `| ${check.id} | ${check.status} | ${check.note.replace(/\|/g, "\\|")} |`),
    "",
  ];

  await writeFile(reportMdPath, `${lines.join("\n")}\n`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const checks = await evaluateChecks();
  const failedChecks = checks.filter((check) => check.status === "fail").length;

  const report: PricingPolicySimulationReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: failedChecks > 0 ? "failed" : "passed",
    reportVersion: "v1",
    checks,
    metrics: {
      totalChecks: checks.length,
      failedChecks,
    },
  };

  await writeReport(report);
  if (report.status === "failed") {
    console.error(`Pricing policy simulation smoke failed: ${failedChecks} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log("Pricing policy simulation smoke passed.");
}

main().catch((error) => {
  console.error(
    `Pricing policy simulation smoke crashed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
