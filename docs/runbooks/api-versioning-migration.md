# API Versioning and Migration Guide

## Scope

- Policy: `docs/policies/api-version-policy-v1.json`
- Runtime:
  - `src/shared/api-versioning.ts`
  - `src/middleware/api-versioning.middleware.ts`
  - `src/routes/api/api-versioning.routes.ts`
- Validation command: `pnpm smoke:api-versioning`

## Client Migration Path

1. Discover current policy:
   - `GET /api/versioning`
2. Pin client requests to an explicit API version:
   - set request header `x-api-version: 2026-04-26`
3. Confirm response headers:
   - `X-API-Version`
   - `X-API-Latest-Version`
   - `X-API-Version-Defaulted`
4. If using deprecated versions, monitor:
   - `Deprecation: true`
   - `Sunset: <date>`
   - `Link: <migration-guide>; rel="deprecation"`
5. Track and close migration hooks:
   - `GET /api/versioning/migration-hooks`

## Unsupported Version Behavior

- Unsupported request versions return `400` with:
  - requested version,
  - supported version list,
  - migration guide path,
  - migration hooks endpoint.

## Operator Procedure

1. Update `docs/policies/api-version-policy-v1.json` for new version lifecycle events.
2. Verify runtime constants/snippets remain aligned with policy.
3. Run:
   - `pnpm smoke:api-versioning`
   - `pnpm smoke:compliance-controls`
   - `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`
4. Confirm artifacts:
   - `output/smoke/api-versioning-report.json`
   - `output/smoke/api-versioning-report.md`
