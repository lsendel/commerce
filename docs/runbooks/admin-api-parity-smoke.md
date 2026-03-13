# Admin API Parity Smoke Runbook

## Scope

- Command: `pnpm smoke:admin-parity`
- Script: `scripts/smoke-policy-control-tower.ts`
- Purpose:
  - enforce method/path contract parity checks;
  - validate runtime response status/shape parity for critical admin APIs.

## Covered Endpoints

- Policy + control tower:
  - `GET /api/admin/policies`
  - `PUT /api/admin/policies` (partial update + restore)
  - `GET /api/admin/policies/violations`
  - `GET /api/admin/control-tower/summary`
- Pricing experiments + workflow builder:
  - `GET /api/admin/pricing-experiments`
  - `POST /api/admin/pricing-experiments/preflight`
  - `GET /api/admin/pricing-experiments/:id/performance`
  - `GET /api/admin/ops/fulfillment-sla`
  - `POST /api/admin/ops/fulfillment-sla/interventions` (default dry-run path)
  - `GET /api/admin/workflows`
- Platform flexibility/admin surfaces:
  - `GET /api/admin/integration-marketplace/apps`
  - `GET /api/admin/headless/packs`
  - `GET /api/admin/store-templates`
- Platform/storefront parity wave:
  - `GET /api/platform/plans`
  - `GET /api/products`
  - `GET /api/products/:slug`
  - `GET /api/collections`
  - `GET /api/cart`
  - `POST /api/cart/validate`
  - `POST /api/cart/apply-coupon`
  - `DELETE /api/cart/remove-coupon`
  - `POST /api/checkout`
  - `GET /api/checkout/success`
  - `GET /api/products/:slug/reviews`
  - `POST /api/reviews/:id/helpful`
  - `POST /api/reviews/:id/report`
- Auth/session parity wave (contract + route metadata drift protection):
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
  - `POST /api/auth/verify-email`
  - `GET /api/auth/profile`
  - `PATCH /api/auth/profile`
  - `POST /api/auth/request-verification`
  - `POST /api/auth/change-password`
- Billing/subscription reliability parity wave (contract + route metadata drift protection):
  - `POST /api/subscriptions`
  - `GET /api/subscriptions`
  - `GET /api/subscriptions/builder/options`
  - `POST /api/subscriptions/builder/quote`
  - `POST /api/subscriptions/builder/checkout`
  - `POST /api/subscriptions/portal`
  - `DELETE /api/subscriptions/:id`
  - `PATCH /api/subscriptions/:id/change-plan`
  - `POST /api/subscriptions/:id/resume`
- Optional reversible mutation checks (when enabled):
  - `POST /api/admin/integration-marketplace/apps/:provider/install` + uninstall rollback
  - `POST /api/admin/integration-marketplace/apps/:provider/verify` (non-destructive verification pass)
  - `POST /api/admin/headless/packs` + revoke rollback
  - `POST /api/admin/store-templates` + delete rollback
  - `POST /api/admin/store-templates/:id/clone` conflict-path validation (forced slug collision, expects `400`, no store created)

## Modes

1. Contract-only mode (local/CI default):
   - `pnpm smoke:admin-parity`
2. Live API mode:
   - `SMOKE_BASE_URL=https://<env-host> SMOKE_COOKIE='<cookie>' pnpm smoke:admin-parity`
   - or
   - `SMOKE_BASE_URL=https://<env-host> SMOKE_AUTHORIZATION='Bearer <token>' pnpm smoke:admin-parity`
3. Live API + mutation mode:
   - `SMOKE_BASE_URL=https://<env-host> SMOKE_COOKIE='<cookie>' SMOKE_ENABLE_MUTATIONS=true pnpm smoke:admin-parity`
   - Clone safety strategy: the script intentionally clones with an existing slug to assert `400` and avoid persistent clone-store artifacts.

## CI Automation

- Workflow: `.github/workflows/admin-api-smoke.yml`
- `contract-smoke`: runs on PR, push, schedule, manual dispatch.
- PR guard: workflow fails early if `docs/snapshots/admin-api-parity-report.schema.snapshot.json` is missing or not tracked by git.
- `live-smoke`: runs on non-PR events when:
  - `SMOKE_BASE_URL` is set;
  - one of `SMOKE_COOKIE` or `SMOKE_AUTHORIZATION` is set.
  - mutation checks are enabled only when `SMOKE_ENABLE_MUTATIONS` is truthy.
- Report artifacts:
  - contract: `output/smoke/admin-api-parity-report.contract.json|.md`
  - live: `output/smoke/admin-api-parity-report.live.json|.md`

## Alerting

- Optional webhook: set `SMOKE_ALERT_WEBHOOK_URL`.
- On failure, the script posts a JSON payload with error summary and last failed check metadata.
- Optional owner-aware routing fields:
  - `SMOKE_ALERT_OWNER_ROUTING_JSON` (JSON map of owner to escalation route)
    - Example: `{"commerce-integrations":"pagerduty:integrations","commerce-platform":"slack:#platform-alerts"}`
  - `SMOKE_ALERT_DEFAULT_ROUTE` (fallback route when owner has no explicit mapping)
- Alert payload now includes:
  - `failedOwner`, `failedTags`,
  - `retryPolicyKey` + effective retry policy details (when endpoint is policy-managed),
  - `escalation` object with matched owner route + final route.

## Flaky External-Provider Policy

- Shared defaults for external-provider integration endpoints:
  - `SMOKE_EXTERNAL_PROVIDER_MAX_ATTEMPTS` (default: `3`)
  - `SMOKE_EXTERNAL_PROVIDER_RETRY_DELAY_MS` (default: `750`)
  - `SMOKE_SUPPRESS_FLAKY_EXTERNAL_PROVIDER_FAILURES` (default: `false`)
- Endpoint-specific overrides:
  - Verify:
    - `SMOKE_VERIFY_MAX_ATTEMPTS`
    - `SMOKE_VERIFY_RETRY_DELAY_MS`
    - `SMOKE_SUPPRESS_FLAKY_VERIFY_FAILURES`
  - Install:
    - `SMOKE_INSTALL_MAX_ATTEMPTS`
    - `SMOKE_INSTALL_RETRY_DELAY_MS`
    - `SMOKE_SUPPRESS_FLAKY_INSTALL_FAILURES`
  - Uninstall:
    - `SMOKE_UNINSTALL_MAX_ATTEMPTS`
    - `SMOKE_UNINSTALL_RETRY_DELAY_MS`
    - `SMOKE_SUPPRESS_FLAKY_UNINSTALL_FAILURES`
- Suppressed failures are recorded in report metadata and set run status to `passed_with_suppressed`.

## Report Metrics

- JSON/Markdown reports include:
  - endpoint owner and tags metadata on each check row,
  - owner/tag rollups with grouped `total/pass/fail/suppressed` counts,
  - owner latency rollups with grouped `p50/p95` visibility,
  - owner-specific latency SLO evaluation (`warnings` and `failures`) based on owner `p95`,
  - per-check `durationMs`, attempts, suppression metadata,
  - aggregate latency metrics (`min`, `p50`, `p95`, `max`, `avg`),
  - failed vs suppressed check counts,
  - mixed admin/platform/storefront parity checks in one report stream.
- Optional owner p95 threshold config:
  - `SMOKE_OWNER_P95_SLO_THRESHOLDS_JSON`
  - Format: JSON map by owner; each owner can set `warnP95Ms` and/or `failP95Ms` (aliases: `warnMs`, `failMs`).
  - Example: `{"commerce-platform":{"warnP95Ms":300,"failP95Ms":700},"commerce-integrations":{"failP95Ms":1200}}`
  - Any owner crossing `failP95Ms` fails the smoke run.

## Report Schema Snapshot

- Snapshot path (default): `docs/snapshots/admin-api-parity-report.schema.snapshot.json`
- On each smoke run, the script:
  - validates the checked-in snapshot has not drifted from the code-defined report schema descriptor,
  - validates the generated report payload against that descriptor.
- Optional maintenance envs:
  - `SMOKE_UPDATE_REPORT_SCHEMA_SNAPSHOT=true` updates the snapshot file intentionally.
  - `SMOKE_SKIP_REPORT_SCHEMA_CHECK=true` bypasses schema snapshot enforcement (emergency only).

## Failure Handling

1. If contract metadata check fails:
   - verify route method/path changed intentionally;
   - update contract and route together.
2. If live response validation fails:
   - compare route response with contract schema for returned status code;
   - align either runtime response shape or contract schema;
   - rerun smoke in contract-only then live mode.
