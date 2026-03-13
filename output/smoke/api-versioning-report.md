# API Versioning Smoke Report

- Started: 2026-03-06T06:41:17.685Z
- Finished: 2026-03-06T06:41:17.689Z
- Status: passed
- Policy path: docs/policies/api-version-policy-v1.json
- Total checks: 56
- Failed checks: 0
- Simulation cases: 4
- Simulation passing: 4

## Simulation Results

| Case | Requested | Expected Supported | Actual Supported | Expected Effective | Actual Effective | Status |
| --- | --- | --- | --- | --- | --- | --- |
| default-no-version | default | true | true | 2026-04-26 | 2026-04-26 | pass |
| explicit-latest | 2026-04-26 | true | true | 2026-04-26 | 2026-04-26 | pass |
| explicit-deprecated | 2025-12-01 | true | true | 2025-12-01 | 2025-12-01 | pass |
| unsupported-version | 2023-01-01 | false | false | 2026-04-26 | 2026-04-26 | pass |

## Checks

| Check | Status | Note |
| --- | --- | --- |
| policy-owner-present | pass | Policy owner must be defined. |
| supported-versions-present | pass | Policy must define supported API versions. |
| deprecated-versions-present | pass | Policy must define at least one deprecated API version. |
| migration-hooks-present | pass | Policy must define migration hooks. |
| simulation-cases-present | pass | Policy must define simulation cases. |
| latest-supported | pass | Latest version must be part of supportedVersions. |
| default-supported | pass | Default version must be part of supportedVersions. |
| latest-equals-runtime | pass | Policy latestVersion must match runtime latest API version. |
| default-equals-runtime | pass | Policy defaultVersion must match runtime default API version. |
| supported-equals-runtime | pass | Policy supportedVersions must match runtime supported API versions. |
| request-header-channels | pass | Policy must define request header channels for version negotiation. |
| request-query-channels | pass | Policy must define request query channels for version negotiation. |
| review-cadence-valid | pass | reviewCadenceDays must be a positive number. |
| review-dates-format | pass | lastReviewedOn and nextReviewBy must use YYYY-MM-DD format. |
| review-next-after-last | pass | nextReviewBy must be on or after lastReviewedOn. |
| review-window-valid | pass | nextReviewBy must stay within reviewCadenceDays window. |
| review-not-overdue | pass | API version policy review date must not be overdue. |
| source-path-1 | pass | Source path must exist: src/shared/api-versioning.ts |
| source-path-2 | pass | Source path must exist: src/middleware/api-versioning.middleware.ts |
| source-path-3 | pass | Source path must exist: src/routes/api/api-versioning.routes.ts |
| source-path-4 | pass | Source path must exist: src/index.tsx |
| required-snippet-1 | pass | Required snippet must be present: X-API-Version |
| required-snippet-2 | pass | Required snippet must be present: Unsupported API version requested. |
| required-snippet-3 | pass | Required snippet must be present: apiVersioningRoutes.get("/versioning" |
| required-snippet-4 | pass | Required snippet must be present: app.use("/api/*", apiVersioningMiddleware()); |
| policy-md-exists | pass | Policy markdown must exist: docs/policies/api-version-policy-v1.md |
| migration-guide-exists | pass | Migration guide must exist: docs/runbooks/api-versioning-migration.md |
| migration-hook-adopt-version-header-from-supported | pass | Migration hook fromVersion must be supported. |
| migration-hook-adopt-version-header-to-supported | pass | Migration hook toVersion must be supported. |
| migration-hook-adopt-version-header-required-by-format | pass | Migration hook requiredBy must use YYYY-MM-DD format. |
| migration-hook-adopt-version-header-endpoint-format | pass | Migration hook endpoint must begin with /api/. |
| migration-hook-verify-deprecation-readiness-from-supported | pass | Migration hook fromVersion must be supported. |
| migration-hook-verify-deprecation-readiness-to-supported | pass | Migration hook toVersion must be supported. |
| migration-hook-verify-deprecation-readiness-required-by-format | pass | Migration hook requiredBy must use YYYY-MM-DD format. |
| migration-hook-verify-deprecation-readiness-endpoint-format | pass | Migration hook endpoint must begin with /api/. |
| migration-hook-contract-matrix-gate-from-supported | pass | Migration hook fromVersion must be supported. |
| migration-hook-contract-matrix-gate-to-supported | pass | Migration hook toVersion must be supported. |
| migration-hook-contract-matrix-gate-required-by-format | pass | Migration hook requiredBy must use YYYY-MM-DD format. |
| migration-hook-contract-matrix-gate-endpoint-format | pass | Migration hook endpoint must begin with /api/. |
| simulation-default-no-version-supported | pass | Expected supported=true, got true |
| simulation-default-no-version-effective-version | pass | Expected effectiveVersion=2026-04-26, got 2026-04-26 |
| simulation-default-no-version-defaulted | pass | Expected defaulted=true, got true |
| simulation-default-no-version-deprecated | pass | Expected deprecated=false, got false |
| simulation-explicit-latest-supported | pass | Expected supported=true, got true |
| simulation-explicit-latest-effective-version | pass | Expected effectiveVersion=2026-04-26, got 2026-04-26 |
| simulation-explicit-latest-defaulted | pass | Expected defaulted=false, got false |
| simulation-explicit-latest-deprecated | pass | Expected deprecated=false, got false |
| simulation-explicit-deprecated-supported | pass | Expected supported=true, got true |
| simulation-explicit-deprecated-effective-version | pass | Expected effectiveVersion=2025-12-01, got 2025-12-01 |
| simulation-explicit-deprecated-defaulted | pass | Expected defaulted=false, got false |
| simulation-explicit-deprecated-deprecated | pass | Expected deprecated=true, got true |
| simulation-unsupported-version-supported | pass | Expected supported=false, got false |
| simulation-unsupported-version-effective-version | pass | Expected effectiveVersion=2026-04-26, got 2026-04-26 |
| simulation-unsupported-version-defaulted | pass | Expected defaulted=true, got true |
| simulation-unsupported-version-deprecated | pass | Expected deprecated=false, got false |
| runtime-policy-version | pass | Runtime API version policy must be v1. |
