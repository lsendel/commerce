export type ApiVersionState = "active" | "deprecated";

export interface ApiVersionRecord {
  version: string;
  state: ApiVersionState;
  releasedOn: string;
  deprecatedOn?: string;
  sunsetOn?: string;
  migrationGuidePath: string;
  notes: string[];
}

export interface ApiMigrationHook {
  id: string;
  fromVersion: string;
  toVersion: string;
  summary: string;
  requiredBy: string;
  endpoint: string;
}

interface ApiVersionPolicy {
  policyVersion: "v1";
  owner: string;
  defaultVersion: string;
  latestVersion: string;
  versions: ApiVersionRecord[];
  requestHeaders: string[];
  requestQueryParams: string[];
  migrationHooks: ApiMigrationHook[];
}

export interface ApiVersionResolution {
  requestedVersion: string | null;
  effectiveVersion: string;
  supported: boolean;
  defaulted: boolean;
  isDeprecated: boolean;
  sunsetOn: string | null;
  migrationGuidePath: string;
  deprecationNote: string | null;
}

export const API_VERSION_POLICY: ApiVersionPolicy = {
  policyVersion: "v1",
  owner: "platform-api",
  defaultVersion: "2026-04-26",
  latestVersion: "2026-04-26",
  versions: [
    {
      version: "2026-04-26",
      state: "active",
      releasedOn: "2026-04-26",
      migrationGuidePath: "/docs/runbooks/api-versioning-migration.md",
      notes: [
        "Primary contract baseline for public, platform, and admin API surfaces.",
      ],
    },
    {
      version: "2025-12-01",
      state: "deprecated",
      releasedOn: "2025-12-01",
      deprecatedOn: "2026-04-26",
      sunsetOn: "2026-09-30",
      migrationGuidePath: "/docs/runbooks/api-versioning-migration.md",
      notes: [
        "Compatibility path preserved to allow client migration to the latest API baseline.",
      ],
    },
  ],
  requestHeaders: ["x-api-version", "api-version"],
  requestQueryParams: ["api_version", "api-version"],
  migrationHooks: [
    {
      id: "adopt-version-header",
      fromVersion: "2025-12-01",
      toVersion: "2026-04-26",
      summary:
        "Pin client requests with x-api-version and validate response deprecation headers in integration tests.",
      requiredBy: "2026-06-15",
      endpoint: "/api/versioning",
    },
    {
      id: "verify-deprecation-readiness",
      fromVersion: "2025-12-01",
      toVersion: "2026-04-26",
      summary:
        "Track deprecation and sunset headers and complete migration before sunset date.",
      requiredBy: "2026-09-30",
      endpoint: "/api/versioning/migration-hooks",
    },
    {
      id: "contract-matrix-gate",
      fromVersion: "2025-12-01",
      toVersion: "2026-04-26",
      summary:
        "Require smoke:api-versioning in release gates to prevent unsupported API version drift.",
      requiredBy: "2026-05-01",
      endpoint: "/api/versioning",
    },
  ],
};

function normalizeVersionInput(value: string): string {
  return value.trim();
}

function parseAcceptVersion(acceptHeader: string | null): string | null {
  if (!acceptHeader) return null;
  const match = acceptHeader.match(/version=([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  return match?.[1] ?? null;
}

export function getApiVersionRecords(): ApiVersionRecord[] {
  return [...API_VERSION_POLICY.versions];
}

export function getLatestApiVersion(): string {
  return API_VERSION_POLICY.latestVersion;
}

export function getDefaultApiVersion(): string {
  return API_VERSION_POLICY.defaultVersion;
}

export function getSupportedApiVersions(): string[] {
  return API_VERSION_POLICY.versions.map((entry) => entry.version);
}

export function getApiMigrationHooks(): ApiMigrationHook[] {
  return [...API_VERSION_POLICY.migrationHooks];
}

export function resolveRequestedApiVersion(request: Request): string | null {
  for (const headerName of API_VERSION_POLICY.requestHeaders) {
    const headerValue = request.headers.get(headerName);
    if (headerValue && headerValue.trim().length > 0) {
      return normalizeVersionInput(headerValue);
    }
  }

  const requestUrl = new URL(request.url);
  for (const queryParam of API_VERSION_POLICY.requestQueryParams) {
    const queryValue = requestUrl.searchParams.get(queryParam);
    if (queryValue && queryValue.trim().length > 0) {
      return normalizeVersionInput(queryValue);
    }
  }

  return parseAcceptVersion(request.headers.get("accept"));
}

export function evaluateApiVersion(requestedVersion: string | null): ApiVersionResolution {
  const trimmedRequestedVersion = requestedVersion ? normalizeVersionInput(requestedVersion) : null;
  const matchedVersion = trimmedRequestedVersion
    ? API_VERSION_POLICY.versions.find((entry) => entry.version === trimmedRequestedVersion) ?? null
    : null;
  const supported = !!matchedVersion || !trimmedRequestedVersion;
  const versionRecord =
    matchedVersion ??
    API_VERSION_POLICY.versions.find((entry) => entry.version === API_VERSION_POLICY.defaultVersion) ??
    API_VERSION_POLICY.versions[0];
  if (!versionRecord) {
    throw new Error("API version policy must define at least one version.");
  }

  const deprecationNote =
    versionRecord.state === "deprecated"
      ? `API version ${versionRecord.version} is deprecated and scheduled for sunset.`
      : null;

  return {
    requestedVersion: trimmedRequestedVersion,
    effectiveVersion: versionRecord.version,
    supported,
    defaulted: !trimmedRequestedVersion || !matchedVersion,
    isDeprecated: versionRecord.state === "deprecated",
    sunsetOn: versionRecord.sunsetOn ?? null,
    migrationGuidePath: versionRecord.migrationGuidePath,
    deprecationNote,
  };
}
