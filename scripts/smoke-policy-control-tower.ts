import { controlTowerContract } from "../src/contracts/control-tower.contract";
import { policiesContract } from "../src/contracts/policies.contract";
import { pricingExperimentContract } from "../src/contracts/pricing-experiment.contract";
import { workflowsContract } from "../src/contracts/workflows.contract";
import { integrationMarketplaceContract } from "../src/contracts/integration-marketplace.contract";
import { headlessApiPacksContract } from "../src/contracts/headless-api-packs.contract";
import { storeTemplatesContract } from "../src/contracts/store-templates.contract";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type ContractRoute = {
  method: string;
  path: string;
  responses: Record<string, { safeParse: (value: unknown) => { success: boolean; error?: unknown } }>;
};

type Provider =
  | "stripe"
  | "printful"
  | "gooten"
  | "prodigi"
  | "shapeways"
  | "gemini"
  | "resend";

interface SmokeCheckResult {
  name: string;
  method: string;
  path: string;
  status: number | "contract";
  ok: boolean;
}

interface SmokeReport {
  startedAt: string;
  finishedAt: string;
  status: "passed" | "failed" | "contract_only";
  mutationChecksEnabled: boolean;
  checks: SmokeCheckResult[];
  error: string | null;
}

const SMOKE_STARTED_AT = new Date().toISOString();
const SMOKE_CHECK_RESULTS: SmokeCheckResult[] = [];

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

function isEnabled(value: string | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

function recordCheck(result: SmokeCheckResult) {
  SMOKE_CHECK_RESULTS.push(result);
}

async function writeReport(report: SmokeReport) {
  if (isEnabled(process.env.SMOKE_SKIP_REPORTS)) return;

  const jsonPath = process.env.SMOKE_REPORT_JSON_PATH ?? "output/smoke/admin-api-parity-report.json";
  const mdPath = process.env.SMOKE_REPORT_MD_PATH ?? "output/smoke/admin-api-parity-report.md";

  const markdownLines = [
    "# Admin API Parity Smoke Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Mutation checks enabled: ${report.mutationChecksEnabled}`,
    report.error ? `- Error: ${report.error}` : "- Error: none",
    "",
    "| Name | Method | Path | Status | Result |",
    "| --- | --- | --- | --- | --- |",
    ...report.checks.map((check) => {
      const result = check.ok ? "pass" : "fail";
      return `| ${check.name} | ${check.method} | ${check.path} | ${String(check.status)} | ${result} |`;
    }),
    "",
  ];

  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(mdPath), { recursive: true });
  await writeFile(jsonPath, JSON.stringify(report, null, 2));
  await writeFile(mdPath, markdownLines.join("\n"));
}

async function sendFailureAlert(report: SmokeReport) {
  const webhookUrl = process.env.SMOKE_ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  const failedCheck = [...report.checks].reverse().find((check) => !check.ok) ?? null;

  const payload = {
    text: `Admin parity smoke failed: ${report.error ?? "unknown error"}`,
    status: report.status,
    error: report.error,
    failedCheck,
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Alerting should never mask smoke failure.
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

function assertContractRoute(
  route: ContractRoute,
  name: string,
  expectedMethod: string,
  expectedPath: string,
) {
  invariant(route.method === expectedMethod, `Contract mismatch: ${name} must use ${expectedMethod}`);
  invariant(route.path === expectedPath, `Contract mismatch: ${name} path changed`);
  recordCheck({
    name: `contract:${name}`,
    method: expectedMethod,
    path: expectedPath,
    status: "contract",
    ok: true,
  });
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
  const integrationAppsList = integrationMarketplaceContract.listApps as unknown as ContractRoute;
  const integrationInstall = integrationMarketplaceContract.installApp as unknown as ContractRoute;
  const integrationUninstall = integrationMarketplaceContract.uninstallApp as unknown as ContractRoute;
  const headlessPacksList = headlessApiPacksContract.listAdminPacks as unknown as ContractRoute;
  const headlessPackCreate = headlessApiPacksContract.createAdminPack as unknown as ContractRoute;
  const headlessPackRevoke = headlessApiPacksContract.revokeAdminPack as unknown as ContractRoute;
  const storeTemplatesList = storeTemplatesContract.listTemplates as unknown as ContractRoute;
  const storeTemplateCreate = storeTemplatesContract.createTemplate as unknown as ContractRoute;
  const storeTemplateDelete = storeTemplatesContract.deleteTemplate as unknown as ContractRoute;

  assertContractRoute(policyGet, "getPolicy", "GET", "/api/admin/policies");
  assertContractRoute(policyPut, "updatePolicy", "PUT", "/api/admin/policies");
  assertContractRoute(policyViolations, "listViolations", "GET", "/api/admin/policies/violations");
  assertContractRoute(
    controlTowerSummary,
    "getControlTowerSummary",
    "GET",
    "/api/admin/control-tower/summary",
  );
  assertContractRoute(pricingList, "listPricingExperiments", "GET", "/api/admin/pricing-experiments");
  assertContractRoute(
    pricingPerformance,
    "pricingExperimentPerformance",
    "GET",
    "/api/admin/pricing-experiments/:id/performance",
  );
  assertContractRoute(workflowsList, "listWorkflows", "GET", "/api/admin/workflows");
  assertContractRoute(
    integrationAppsList,
    "listIntegrationMarketplaceApps",
    "GET",
    "/api/admin/integration-marketplace/apps",
  );
  assertContractRoute(
    integrationInstall,
    "installIntegrationApp",
    "POST",
    "/api/admin/integration-marketplace/apps/:provider/install",
  );
  assertContractRoute(
    integrationUninstall,
    "uninstallIntegrationApp",
    "POST",
    "/api/admin/integration-marketplace/apps/:provider/uninstall",
  );
  assertContractRoute(headlessPacksList, "listHeadlessPacks", "GET", "/api/admin/headless/packs");
  assertContractRoute(headlessPackCreate, "createHeadlessPack", "POST", "/api/admin/headless/packs");
  assertContractRoute(
    headlessPackRevoke,
    "revokeHeadlessPack",
    "POST",
    "/api/admin/headless/packs/:id/revoke",
  );
  assertContractRoute(storeTemplatesList, "listStoreTemplates", "GET", "/api/admin/store-templates");
  assertContractRoute(storeTemplateCreate, "createStoreTemplate", "POST", "/api/admin/store-templates");
  assertContractRoute(
    storeTemplateDelete,
    "deleteStoreTemplate",
    "DELETE",
    "/api/admin/store-templates/:id",
  );

  const baseUrlRaw = process.env.SMOKE_BASE_URL;
  if (!baseUrlRaw) {
    console.log("Contract metadata checks passed.");
    console.log("Live smoke skipped: set SMOKE_BASE_URL (and auth headers) to run HTTP checks.");
    await writeReport({
      startedAt: SMOKE_STARTED_AT,
      finishedAt: new Date().toISOString(),
      status: "contract_only",
      mutationChecksEnabled: false,
      checks: SMOKE_CHECK_RESULTS,
      error: null,
    });
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
  const enableMutations = isEnabled(process.env.SMOKE_ENABLE_MUTATIONS);
  console.log(`Mutation checks ${enableMutations ? "enabled" : "disabled"} (SMOKE_ENABLE_MUTATIONS).`);

  let baselinePolicy: PolicySnapshot | null = null;
  let createdHeadlessPackId: string | null = null;
  let createdStoreTemplateId: string | null = null;
  let installedIntegrationProvider: Provider | null = null;

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
    recordCheck({
      name: "getPolicy",
      method: "GET",
      path: "/api/admin/policies",
      status: getPolicyResponse.status,
      ok: true,
    });

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
      recordCheck({
        name: "updatePolicy(partial)",
        method: "PUT",
        path: "/api/admin/policies",
        status: partialUpdateResponse.status,
        ok: true,
      });

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
    recordCheck({
      name: "listViolations",
      method: "GET",
      path: "/api/admin/policies/violations",
      status: violationsResponse.status,
      ok: true,
    });

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
    recordCheck({
      name: "getControlTowerSummary",
      method: "GET",
      path: "/api/admin/control-tower/summary",
      status: towerResponse.status,
      ok: true,
    });

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
    recordCheck({
      name: "listPricingExperiments",
      method: "GET",
      path: "/api/admin/pricing-experiments",
      status: pricingListResponse.status,
      ok: true,
    });

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
    recordCheck({
      name: "pricingExperimentPerformance",
      method: "GET",
      path: "/api/admin/pricing-experiments/:id/performance",
      status: pricingPerformanceResponse.status,
      ok: true,
    });

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
    recordCheck({
      name: "listWorkflows",
      method: "GET",
      path: "/api/admin/workflows",
      status: workflowsListResponse.status,
      ok: true,
    });

    const integrationAppsListResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/admin/integration-marketplace/apps",
      headers,
    });
    validateContractResponse(
      integrationAppsList,
      integrationAppsListResponse.status,
      integrationAppsListResponse.payload,
      "listIntegrationMarketplaceApps",
    );
    console.log(`GET /api/admin/integration-marketplace/apps -> ${integrationAppsListResponse.status}`);
    recordCheck({
      name: "listIntegrationMarketplaceApps",
      method: "GET",
      path: "/api/admin/integration-marketplace/apps",
      status: integrationAppsListResponse.status,
      ok: true,
    });

    const headlessPacksListResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/admin/headless/packs?limit=20",
      headers,
    });
    validateContractResponse(
      headlessPacksList,
      headlessPacksListResponse.status,
      headlessPacksListResponse.payload,
      "listHeadlessPacks",
    );
    console.log(`GET /api/admin/headless/packs -> ${headlessPacksListResponse.status}`);
    recordCheck({
      name: "listHeadlessPacks",
      method: "GET",
      path: "/api/admin/headless/packs",
      status: headlessPacksListResponse.status,
      ok: true,
    });

    const storeTemplatesListResponse = await requestJson({
      baseUrl,
      method: "GET",
      path: "/api/admin/store-templates?limit=20",
      headers,
    });
    validateContractResponse(
      storeTemplatesList,
      storeTemplatesListResponse.status,
      storeTemplatesListResponse.payload,
      "listStoreTemplates",
    );
    console.log(`GET /api/admin/store-templates -> ${storeTemplatesListResponse.status}`);
    recordCheck({
      name: "listStoreTemplates",
      method: "GET",
      path: "/api/admin/store-templates",
      status: storeTemplatesListResponse.status,
      ok: true,
    });

    if (enableMutations) {
      if (integrationAppsListResponse.status === 200) {
        const payload = integrationAppsListResponse.payload as {
          apps: Array<{ provider: Provider; installed: boolean; source: "store_override" | "platform" | "none" }>;
        };
        const installCandidate = payload.apps.find(
          (app) => !app.installed && app.source === "none",
        );

        if (installCandidate) {
          const installResponse = await requestJson({
            baseUrl,
            method: "POST",
            path: `/api/admin/integration-marketplace/apps/${installCandidate.provider}/install`,
            headers,
          });
          validateContractResponse(
            integrationInstall,
            installResponse.status,
            installResponse.payload,
            "installIntegrationApp",
          );
          console.log(
            `POST /api/admin/integration-marketplace/apps/:provider/install -> ${installResponse.status}`,
          );
          recordCheck({
            name: "installIntegrationApp",
            method: "POST",
            path: "/api/admin/integration-marketplace/apps/:provider/install",
            status: installResponse.status,
            ok: true,
          });

          if (installResponse.status === 201) {
            installedIntegrationProvider = installCandidate.provider;
            const uninstallResponse = await requestJson({
              baseUrl,
              method: "POST",
              path: `/api/admin/integration-marketplace/apps/${installCandidate.provider}/uninstall`,
              headers,
            });
            validateContractResponse(
              integrationUninstall,
              uninstallResponse.status,
              uninstallResponse.payload,
              "uninstallIntegrationApp",
            );
            console.log(
              `POST /api/admin/integration-marketplace/apps/:provider/uninstall -> ${uninstallResponse.status}`,
            );
            recordCheck({
              name: "uninstallIntegrationApp",
              method: "POST",
              path: "/api/admin/integration-marketplace/apps/:provider/uninstall",
              status: uninstallResponse.status,
              ok: true,
            });

            if (uninstallResponse.status !== 200) {
              throw new Error(
                `Expected integration uninstall to return 200 after install, received ${uninstallResponse.status}`,
              );
            }
            installedIntegrationProvider = null;
          }
        } else {
          console.log(
            "Skipping integration install/uninstall mutation check: no safe provider candidate (installed=false, source=none).",
          );
        }
      } else {
        console.log(
          "Skipping integration install/uninstall mutation check: list endpoint did not return 200.",
        );
      }

      const headlessPackName = `Smoke Pack ${randomSuffix()}`;
      const createHeadlessPackResponse = await requestJson({
        baseUrl,
        method: "POST",
        path: "/api/admin/headless/packs",
        headers,
        body: {
          name: headlessPackName,
          description: "Parity smoke fixture (auto-revoked).",
          scopes: ["catalog:read"],
          rateLimitPerMinute: 100,
        },
      });
      validateContractResponse(
        headlessPackCreate,
        createHeadlessPackResponse.status,
        createHeadlessPackResponse.payload,
        "createHeadlessPack",
      );
      console.log(`POST /api/admin/headless/packs -> ${createHeadlessPackResponse.status}`);
      recordCheck({
        name: "createHeadlessPack",
        method: "POST",
        path: "/api/admin/headless/packs",
        status: createHeadlessPackResponse.status,
        ok: true,
      });

      if (createHeadlessPackResponse.status === 201) {
        const payload = createHeadlessPackResponse.payload as { pack: { id: string } };
        createdHeadlessPackId = payload.pack.id;
        const revokeHeadlessPackResponse = await requestJson({
          baseUrl,
          method: "POST",
          path: `/api/admin/headless/packs/${createdHeadlessPackId}/revoke`,
          headers,
        });
        validateContractResponse(
          headlessPackRevoke,
          revokeHeadlessPackResponse.status,
          revokeHeadlessPackResponse.payload,
          "revokeHeadlessPack",
        );
        console.log(`POST /api/admin/headless/packs/:id/revoke -> ${revokeHeadlessPackResponse.status}`);
        recordCheck({
          name: "revokeHeadlessPack",
          method: "POST",
          path: "/api/admin/headless/packs/:id/revoke",
          status: revokeHeadlessPackResponse.status,
          ok: true,
        });

        if (revokeHeadlessPackResponse.status !== 200) {
          throw new Error(
            `Expected headless pack revoke to return 200 after create, received ${revokeHeadlessPackResponse.status}`,
          );
        }
        createdHeadlessPackId = null;
      }

      const storeTemplateName = `Smoke Template ${randomSuffix()}`;
      const createStoreTemplateResponse = await requestJson({
        baseUrl,
        method: "POST",
        path: "/api/admin/store-templates",
        headers,
        body: {
          name: storeTemplateName,
          description: "Parity smoke fixture (auto-deleted).",
        },
      });
      validateContractResponse(
        storeTemplateCreate,
        createStoreTemplateResponse.status,
        createStoreTemplateResponse.payload,
        "createStoreTemplate",
      );
      console.log(`POST /api/admin/store-templates -> ${createStoreTemplateResponse.status}`);
      recordCheck({
        name: "createStoreTemplate",
        method: "POST",
        path: "/api/admin/store-templates",
        status: createStoreTemplateResponse.status,
        ok: true,
      });

      if (createStoreTemplateResponse.status === 201) {
        const payload = createStoreTemplateResponse.payload as { template: { id: string } };
        createdStoreTemplateId = payload.template.id;
        const deleteStoreTemplateResponse = await requestJson({
          baseUrl,
          method: "DELETE",
          path: `/api/admin/store-templates/${createdStoreTemplateId}`,
          headers,
        });
        validateContractResponse(
          storeTemplateDelete,
          deleteStoreTemplateResponse.status,
          deleteStoreTemplateResponse.payload,
          "deleteStoreTemplate",
        );
        console.log(`DELETE /api/admin/store-templates/:id -> ${deleteStoreTemplateResponse.status}`);
        recordCheck({
          name: "deleteStoreTemplate",
          method: "DELETE",
          path: "/api/admin/store-templates/:id",
          status: deleteStoreTemplateResponse.status,
          ok: true,
        });

        if (deleteStoreTemplateResponse.status !== 200) {
          throw new Error(
            `Expected store template delete to return 200 after create, received ${deleteStoreTemplateResponse.status}`,
          );
        }
        createdStoreTemplateId = null;
      }
    }

    console.log("Admin parity smoke passed.");
  } finally {
    if (installedIntegrationProvider) {
      const uninstallResponse = await requestJson({
        baseUrl,
        method: "POST",
        path: `/api/admin/integration-marketplace/apps/${installedIntegrationProvider}/uninstall`,
        headers,
      });
      validateContractResponse(
        integrationUninstall,
        uninstallResponse.status,
        uninstallResponse.payload,
        "uninstallIntegrationApp(cleanup)",
      );
      console.log(
        `POST /api/admin/integration-marketplace/apps/:provider/uninstall (cleanup) -> ${uninstallResponse.status}`,
      );
      recordCheck({
        name: "uninstallIntegrationApp(cleanup)",
        method: "POST",
        path: "/api/admin/integration-marketplace/apps/:provider/uninstall",
        status: uninstallResponse.status,
        ok: true,
      });
    }
    if (createdHeadlessPackId) {
      const revokeResponse = await requestJson({
        baseUrl,
        method: "POST",
        path: `/api/admin/headless/packs/${createdHeadlessPackId}/revoke`,
        headers,
      });
      validateContractResponse(
        headlessPackRevoke,
        revokeResponse.status,
        revokeResponse.payload,
        "revokeHeadlessPack(cleanup)",
      );
      console.log(`POST /api/admin/headless/packs/:id/revoke (cleanup) -> ${revokeResponse.status}`);
      recordCheck({
        name: "revokeHeadlessPack(cleanup)",
        method: "POST",
        path: "/api/admin/headless/packs/:id/revoke",
        status: revokeResponse.status,
        ok: true,
      });
    }
    if (createdStoreTemplateId) {
      const deleteResponse = await requestJson({
        baseUrl,
        method: "DELETE",
        path: `/api/admin/store-templates/${createdStoreTemplateId}`,
        headers,
      });
      validateContractResponse(
        storeTemplateDelete,
        deleteResponse.status,
        deleteResponse.payload,
        "deleteStoreTemplate(cleanup)",
      );
      console.log(`DELETE /api/admin/store-templates/:id (cleanup) -> ${deleteResponse.status}`);
      recordCheck({
        name: "deleteStoreTemplate(cleanup)",
        method: "DELETE",
        path: "/api/admin/store-templates/:id",
        status: deleteResponse.status,
        ok: true,
      });
    }
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
      recordCheck({
        name: "updatePolicy(restore)",
        method: "PUT",
        path: "/api/admin/policies",
        status: restoreResponse.status,
        ok: true,
      });
    }
  }

  await writeReport({
    startedAt: SMOKE_STARTED_AT,
    finishedAt: new Date().toISOString(),
    status: "passed",
    mutationChecksEnabled: enableMutations,
    checks: SMOKE_CHECK_RESULTS,
    error: null,
  });
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  recordCheck({
    name: "run_failure",
    method: "N/A",
    path: "N/A",
    status: "contract",
    ok: false,
  });
  const report: SmokeReport = {
    startedAt: SMOKE_STARTED_AT,
    finishedAt: new Date().toISOString(),
    status: "failed",
    mutationChecksEnabled: isEnabled(process.env.SMOKE_ENABLE_MUTATIONS),
    checks: SMOKE_CHECK_RESULTS,
    error: message,
  };
  await writeReport(report);
  await sendFailureAlert(report);
  console.error(`Admin parity smoke failed: ${message}`);
  process.exitCode = 1;
});
