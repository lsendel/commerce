# Week 61 Summary

## Scope

- API productization phase 1:
  - enforce API version negotiation at the app boundary,
  - add deprecation and sunset contract signaling,
  - publish client migration hooks and discovery endpoints,
  - ship policy/runbook + smoke/compliance/e2e gate wiring.

## Shipped This Week

1. Implemented API version negotiation and deprecation middleware
- Added [`/Users/lsendel/Projects/commerce/src/shared/api-versioning.ts`](/Users/lsendel/Projects/commerce/src/shared/api-versioning.ts):
  - canonical runtime API version policy (`latest`, `default`, supported/deprecated versions),
  - request-version extraction across headers/query/Accept parameters,
  - version resolution model with support/default/deprecation flags,
  - migration hook registry for client migration sequencing.
- Added [`/Users/lsendel/Projects/commerce/src/middleware/api-versioning.middleware.ts`](/Users/lsendel/Projects/commerce/src/middleware/api-versioning.middleware.ts):
  - enforces unsupported-version rejection (`400`) for `/api/*`,
  - emits response headers:
    - `X-API-Version`
    - `X-API-Latest-Version`
    - `X-API-Version-Defaulted`
    - `X-API-Version-Requested` (when present)
    - `X-API-Migration-Guide`
  - emits deprecated-version headers:
    - `Deprecation`
    - `Sunset`
    - `Link` (`rel="deprecation"`)
    - `Warning`.
- Updated [`/Users/lsendel/Projects/commerce/src/index.tsx`](/Users/lsendel/Projects/commerce/src/index.tsx):
  - wired global `/api/*` middleware: `app.use("/api/*", apiVersioningMiddleware());`.

2. Added API version metadata and migration-hook endpoints
- Added [`/Users/lsendel/Projects/commerce/src/routes/api/api-versioning.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/api-versioning.routes.ts):
  - `GET /api/versioning` for policy/version discovery and effective version context,
  - `GET /api/versioning/migration-hooks` for client migration execution hooks.
- Updated [`/Users/lsendel/Projects/commerce/src/index.tsx`](/Users/lsendel/Projects/commerce/src/index.tsx):
  - mounted `app.route("/api", apiVersioningRoutes);`.

3. Added Week 61 API version governance policy and migration guide
- Added [`/Users/lsendel/Projects/commerce/docs/policies/api-version-policy-v1.json`](/Users/lsendel/Projects/commerce/docs/policies/api-version-policy-v1.json):
  - lifecycle metadata, supported/deprecated versions, sunset timeline,
  - request channel requirements, source/snippet integrity requirements,
  - simulation cases for version-resolution behavior,
  - migration hooks with required-by dates and endpoints.
- Added [`/Users/lsendel/Projects/commerce/docs/policies/api-version-policy-v1.md`](/Users/lsendel/Projects/commerce/docs/policies/api-version-policy-v1.md):
  - governance intent and enforcement rules.
- Added [`/Users/lsendel/Projects/commerce/docs/runbooks/api-versioning-migration.md`](/Users/lsendel/Projects/commerce/docs/runbooks/api-versioning-migration.md):
  - client migration procedure and operator run sequence.

4. Added Week 61 smoke gate and release wiring
- Added [`/Users/lsendel/Projects/commerce/scripts/smoke-api-versioning.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-api-versioning.ts):
  - validates policy structure/review windows and runtime-policy parity,
  - validates source-path/snippet coverage,
  - validates migration-hook shape and endpoint format,
  - executes simulation cases over runtime resolver behavior,
  - writes artifacts:
    - `output/smoke/api-versioning-report.json`
    - `output/smoke/api-versioning-report.md`.
- Updated [`/Users/lsendel/Projects/commerce/package.json`](/Users/lsendel/Projects/commerce/package.json):
  - added `smoke:api-versioning`.
- Updated [`/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts):
  - added command stage `pnpm smoke:api-versioning`,
  - added skip flag `SMOKE_MATRIX_SKIP_API_VERSIONING`.
- Updated [`/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md`](/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md):
  - documented API versioning command stage and skip behavior.

5. Wired Week 61 into compliance controls
- Updated compliance controls:
  - [`/Users/lsendel/Projects/commerce/docs/policies/compliance-control-matrix-v1.json`](/Users/lsendel/Projects/commerce/docs/policies/compliance-control-matrix-v1.json)
  - [`/Users/lsendel/Projects/commerce/docs/policies/compliance-control-matrix-v1.md`](/Users/lsendel/Projects/commerce/docs/policies/compliance-control-matrix-v1.md)
  - added `CC-017` for API version lifecycle governance.
- Updated [`/Users/lsendel/Projects/commerce/docs/runbooks/compliance-control-framework.md`](/Users/lsendel/Projects/commerce/docs/runbooks/compliance-control-framework.md):
  - added `pnpm smoke:api-versioning` to compliance rerun sequence.

## Validation

- `pnpm -s tsc --noEmit --pretty false`
- `pnpm smoke:api-versioning`
- `pnpm smoke:compliance-controls`
- `pnpm smoke:admin-parity`
- `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`
- `pnpm smoke:production`

## Week 61 Artifact Snapshot

- API versioning smoke report:
  - status: `passed`
  - checks: `56/56` passed, `0` failed
  - simulation cases: `4/4` passed
  - artifact: `output/smoke/api-versioning-report.json`
- Compliance controls smoke:
  - status: `passed`
  - controls: `17`
  - checks: `388`
  - failed checks: `0`
  - includes `CC-017` coverage.
- Admin parity smoke:
  - status: `contract_only`
  - checks: `60`
  - failed checks: `0`
  - live HTTP parity intentionally skipped (no `SMOKE_BASE_URL` auth headers configured in this run).
- E2E matrix (HTTP-off mode):
  - status: `passed`
  - command stages: `22` total, `19` executed/passed, `3` skipped (HTTP-bound).
  - includes command stage `pnpm smoke:api-versioning`.
- Production smoke:
  - `ALL PASS: 85/85` on `https://petm8.io`.

## Next Week Kickoff

- Week 62: partner onboarding self-serve flows and contract verification.
