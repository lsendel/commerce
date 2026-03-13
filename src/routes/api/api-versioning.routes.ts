import { Hono } from "hono";
import type { Env } from "../../env";
import {
  API_VERSION_POLICY,
  evaluateApiVersion,
  getApiMigrationHooks,
  getApiVersionRecords,
  getDefaultApiVersion,
  getLatestApiVersion,
  getSupportedApiVersions,
  resolveRequestedApiVersion,
} from "../../shared/api-versioning";

const apiVersioningRoutes = new Hono<{ Bindings: Env }>();

apiVersioningRoutes.get("/versioning", (c) => {
  const requestedVersion = resolveRequestedApiVersion(c.req.raw);
  const resolution = evaluateApiVersion(requestedVersion);

  return c.json({
    policyVersion: API_VERSION_POLICY.policyVersion,
    owner: API_VERSION_POLICY.owner,
    latestVersion: getLatestApiVersion(),
    defaultVersion: getDefaultApiVersion(),
    supportedVersions: getSupportedApiVersions(),
    requestedVersion: resolution.requestedVersion,
    effectiveVersion: resolution.effectiveVersion,
    deprecated: resolution.isDeprecated,
    sunsetOn: resolution.sunsetOn,
    migrationGuidePath: resolution.migrationGuidePath,
    versions: getApiVersionRecords(),
    migrationHooks: getApiMigrationHooks(),
  });
});

apiVersioningRoutes.get("/versioning/migration-hooks", (c) => {
  return c.json({
    latestVersion: getLatestApiVersion(),
    defaultVersion: getDefaultApiVersion(),
    hooks: getApiMigrationHooks(),
  });
});

export { apiVersioningRoutes };
