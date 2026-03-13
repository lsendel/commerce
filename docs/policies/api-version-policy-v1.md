# API Version Policy v1

## Purpose

- Standardize API contract lifecycle controls (version negotiation, deprecation headers, and sunset signaling).
- Keep API migrations deterministic with explicit migration hooks and release-gated evidence.

## Policy Inputs

- Machine-readable source: `docs/policies/api-version-policy-v1.json`
- Runtime implementation:
  - `src/shared/api-versioning.ts`
  - `src/middleware/api-versioning.middleware.ts`
  - `src/routes/api/api-versioning.routes.ts`
  - `src/index.tsx`
- Validation gate: `pnpm smoke:api-versioning`
- Report artifacts:
  - `output/smoke/api-versioning-report.json`
  - `output/smoke/api-versioning-report.md`

## Governance Rules

1. All `/api/*` requests must resolve to a supported API version or return `400` for unsupported version requests.
2. Responses must include explicit version metadata headers (`X-API-Version`, latest/default markers).
3. Deprecated versions must emit deprecation metadata (`Deprecation`, `Sunset`, migration `Link` header).
4. Migration hooks must define ownerless client steps with required-by dates and concrete endpoints.
5. Policy review cadence must remain current and never exceed configured review window.
