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
  - `GET /api/admin/pricing-experiments/:id/performance`
  - `GET /api/admin/workflows`
- Platform flexibility/admin surfaces:
  - `GET /api/admin/integration-marketplace/apps`
  - `GET /api/admin/headless/packs`
  - `GET /api/admin/store-templates`
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

## Failure Handling

1. If contract metadata check fails:
   - verify route method/path changed intentionally;
   - update contract and route together.
2. If live response validation fails:
   - compare route response with contract schema for returned status code;
   - align either runtime response shape or contract schema;
   - rerun smoke in contract-only then live mode.
