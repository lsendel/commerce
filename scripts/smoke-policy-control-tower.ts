import { controlTowerContract } from "../src/contracts/control-tower.contract";
import { policiesContract } from "../src/contracts/policies.contract";
import { pricingExperimentContract } from "../src/contracts/pricing-experiment.contract";
import { workflowsContract } from "../src/contracts/workflows.contract";

type ContractRoute = {
  method: string;
  path: string;
  responses: Record<string, { safeParse: (value: unknown) => { success: boolean; error?: unknown } }>;
};

interface PolicySnapshot {
  isActive: boolean;
  config: {
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
      mode: "enforce" | "monitor";
    };
  };
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeBaseUrl(raw: string): string {
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function parseJson(text: string): unknown {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function validateContractResponse(
  route: ContractRoute,
  status: number,
  payload: unknown,
  endpointName: string,
) {
  const schema = route.responses[String(status)];
  invariant(
    schema,
    `${endpointName}: unexpected status ${status}; expected one of ${Object.keys(route.responses).join(", ")}`,
  );

  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new Error(`${endpointName}: response for status ${status} failed contract validation`);
  }
}

async function requestJson(input: {
  baseUrl: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
}) {
  const response = await fetch(`${input.baseUrl}${input.path}`, {
    method: input.method,
    headers: input.body
      ? {
          ...input.headers,
          "Content-Type": "application/json",
        }
      : input.headers,
    body: input.body ? JSON.stringify(input.body) : undefined,
  });

  const text = await response.text();
  return {
    status: response.status,
    payload: parseJson(text),
  };
}

function policyPayloadToBody(policy: PolicySnapshot) {
  return {
    pricing: policy.config.pricing,
    shipping: policy.config.shipping,
    promotions: policy.config.promotions,
    enforcement: policy.config.enforcement,
    isActive: policy.isActive,
  };
}

function assertUnchangedFields(
  baseline: {
    pricing: {
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
    enforcement: { mode: "enforce" | "monitor" };
  },
  updated: {
    pricing: {
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
    enforcement: { mode: "enforce" | "monitor" };
  },
) {
  invariant(
    updated.pricing.minDeltaPercent === baseline.pricing.minDeltaPercent,
    "Partial update changed pricing.minDeltaPercent unexpectedly",
  );
  invariant(
    updated.pricing.maxDeltaPercent === baseline.pricing.maxDeltaPercent,
    "Partial update changed pricing.maxDeltaPercent unexpectedly",
  );
  invariant(
    updated.pricing.allowAutoApply === baseline.pricing.allowAutoApply,
    "Partial update changed pricing.allowAutoApply unexpectedly",
  );
  invariant(
    updated.shipping.maxFlatRate === baseline.shipping.maxFlatRate,
    "Partial update changed shipping.maxFlatRate unexpectedly",
  );
  invariant(
    updated.shipping.maxEstimatedDays === baseline.shipping.maxEstimatedDays,
    "Partial update changed shipping.maxEstimatedDays unexpectedly",
  );
  invariant(
    updated.promotions.maxPercentageOff === baseline.promotions.maxPercentageOff,
    "Partial update changed promotions.maxPercentageOff unexpectedly",
  );
  invariant(
    updated.promotions.maxFixedAmount === baseline.promotions.maxFixedAmount,
    "Partial update changed promotions.maxFixedAmount unexpectedly",
  );
  invariant(
    updated.promotions.maxCampaignDays === baseline.promotions.maxCampaignDays,
    "Partial update changed promotions.maxCampaignDays unexpectedly",
  );
  invariant(
    updated.promotions.allowStackable === baseline.promotions.allowStackable,
    "Partial update changed promotions.allowStackable unexpectedly",
  );
  invariant(
    updated.enforcement.mode === baseline.enforcement.mode,
    "Partial update changed enforcement.mode unexpectedly",
  );
}

async function main() {
  const policyGet = policiesContract.getPolicy as unknown as ContractRoute;
  const policyPut = policiesContract.updatePolicy as unknown as ContractRoute;
  const policyViolations = policiesContract.listViolations as unknown as ContractRoute;
  const controlTowerSummary = controlTowerContract.getSummary as unknown as ContractRoute;
  const pricingList = pricingExperimentContract.listExperiments as unknown as ContractRoute;
  const pricingPerformance = pricingExperimentContract.performance as unknown as ContractRoute;
  const workflowsList = workflowsContract.list as unknown as ContractRoute;

  invariant(policyGet.method === "GET", "Contract mismatch: getPolicy must use GET");
  invariant(policyGet.path === "/api/admin/policies", "Contract mismatch: getPolicy path changed");
  invariant(policyPut.method === "PUT", "Contract mismatch: updatePolicy must use PUT");
  invariant(policyPut.path === "/api/admin/policies", "Contract mismatch: updatePolicy path changed");
  invariant(policyViolations.method === "GET", "Contract mismatch: listViolations must use GET");
  invariant(
    policyViolations.path === "/api/admin/policies/violations",
    "Contract mismatch: listViolations path changed",
  );
  invariant(controlTowerSummary.method === "GET", "Contract mismatch: control tower summary must use GET");
  invariant(
    controlTowerSummary.path === "/api/admin/control-tower/summary",
    "Contract mismatch: control tower summary path changed",
  );
  invariant(pricingList.method === "GET", "Contract mismatch: pricing list must use GET");
  invariant(
    pricingList.path === "/api/admin/pricing-experiments",
    "Contract mismatch: pricing list path changed",
  );
  invariant(pricingPerformance.method === "GET", "Contract mismatch: pricing performance must use GET");
  invariant(
    pricingPerformance.path === "/api/admin/pricing-experiments/:id/performance",
    "Contract mismatch: pricing performance path changed",
  );
  invariant(workflowsList.method === "GET", "Contract mismatch: workflow list must use GET");
  invariant(
    workflowsList.path === "/api/admin/workflows",
    "Contract mismatch: workflow list path changed",
  );

  const baseUrlRaw = process.env.SMOKE_BASE_URL;
  if (!baseUrlRaw) {
    console.log("Contract metadata checks passed.");
    console.log("Live smoke skipped: set SMOKE_BASE_URL (and auth headers) to run HTTP checks.");
    return;
  }

  const baseUrl = normalizeBaseUrl(baseUrlRaw);
  const headers: Record<string, string> = {};
  if (process.env.SMOKE_COOKIE) {
    headers.Cookie = process.env.SMOKE_COOKIE;
  }
  if (process.env.SMOKE_AUTHORIZATION) {
    headers.Authorization = process.env.SMOKE_AUTHORIZATION;
  }

  let baselinePolicy: PolicySnapshot | null = null;

  let changedPolicy = false;

  try {
    const getPolicyResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/admin/policies",
      headers,
    });
    validateContractResponse(policyGet, getPolicyResponse.status, getPolicyResponse.payload, "getPolicy");
    console.log(`GET /api/admin/policies -> ${getPolicyResponse.status}`);

    if (getPolicyResponse.status === 200) {
      const policyPayload = getPolicyResponse.payload as { policy: PolicySnapshot };
      baselinePolicy = policyPayload.policy;
      const targetMaxVariants =
        baselinePolicy.config.pricing.maxVariants >= 100
          ? 99
          : baselinePolicy.config.pricing.maxVariants + 1;

      const partialUpdateResponse = await requestJson({
        baseUrl,
        method: "PUT",
        path: "/api/admin/policies",
        headers,
        body: {
          pricing: {
            maxVariants: targetMaxVariants,
          },
        },
      });
      validateContractResponse(
        policyPut,
        partialUpdateResponse.status,
        partialUpdateResponse.payload,
        "updatePolicy(partial)",
      );
      console.log(`PUT /api/admin/policies (partial) -> ${partialUpdateResponse.status}`);

      if (partialUpdateResponse.status === 200) {
        changedPolicy = true;
        const updated = partialUpdateResponse.payload as { policy: PolicySnapshot };
        invariant(
          updated.policy.config.pricing.maxVariants === targetMaxVariants,
          "Partial update did not apply pricing.maxVariants",
        );
        assertUnchangedFields(baselinePolicy.config, updated.policy.config);
      }
    }

    const violationsResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/admin/policies/violations?limit=20",
      headers,
    });
    validateContractResponse(
      policyViolations,
      violationsResponse.status,
      violationsResponse.payload,
      "listViolations",
    );
    console.log(`GET /api/admin/policies/violations -> ${violationsResponse.status}`);

    const towerResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/admin/control-tower/summary",
      headers,
    });
    validateContractResponse(
      controlTowerSummary,
      towerResponse.status,
      towerResponse.payload,
      "getControlTowerSummary",
    );
    console.log(`GET /api/admin/control-tower/summary -> ${towerResponse.status}`);

    const pricingListResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/admin/pricing-experiments?limit=20",
      headers,
    });
    validateContractResponse(
      pricingList,
      pricingListResponse.status,
      pricingListResponse.payload,
      "listPricingExperiments",
    );
    console.log(`GET /api/admin/pricing-experiments -> ${pricingListResponse.status}`);

    const pricingPerformanceResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/admin/pricing-experiments/non-existent/performance?windowDays=14",
      headers,
    });
    validateContractResponse(
      pricingPerformance,
      pricingPerformanceResponse.status,
      pricingPerformanceResponse.payload,
      "pricingExperimentPerformance",
    );
    console.log(
      `GET /api/admin/pricing-experiments/:id/performance -> ${pricingPerformanceResponse.status}`,
    );

    const workflowsListResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/admin/workflows?limit=20",
      headers,
    });
    validateContractResponse(
      workflowsList,
      workflowsListResponse.status,
      workflowsListResponse.payload,
      "listWorkflows",
    );
    console.log(`GET /api/admin/workflows -> ${workflowsListResponse.status}`);

    console.log("Admin parity smoke passed.");
  } finally {
    if (changedPolicy && baselinePolicy) {
      const restoreResponse = await requestJson({
        baseUrl,
        method: "PUT",
        path: "/api/admin/policies",
        headers,
        body: policyPayloadToBody(baselinePolicy),
      });
      validateContractResponse(policyPut, restoreResponse.status, restoreResponse.payload, "updatePolicy(restore)");
      console.log(`PUT /api/admin/policies (restore) -> ${restoreResponse.status}`);
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Admin parity smoke failed: ${message}`);
  process.exitCode = 1;
});
