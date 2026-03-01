# Executive Control Tower Runbook

## Scope

- Feature flag: `executive_control_tower`
- Surfaces:
  - `/admin/control-tower`
  - `/api/admin/control-tower/summary`

## Summary Payload

- KPI block: revenue, orders, AOV, conversion, visitors, page views.
- Growth block: current vs prior-period deltas.
- Readiness block: conversion-drop rail, fulfillment-failure rail, P1 rail.
- Fulfillment block: 7-day request/failure volume and rate.
- Policy block: 7-day policy violations with domain distribution.
- Feature rollout block: enabled/total flags from weekly matrix.
- Risk block: derived level (`low|medium|high`) plus blocker messages.

## Rollout

1. Enable `executive_control_tower` for internal admin users.
2. Open `/admin/control-tower` and validate summary cards and tables.
3. Compare KPI values with `/admin/analytics` for the same date range.
4. Confirm risk level transitions when safety rails or violations breach thresholds.

## Guardrails

- Summary API is admin-only and rate-limited.
- Risk classification is computed from explicit rules:
  - conversion drop thresholds
  - fulfillment failure-rate thresholds
  - P1 incident count
  - policy violation error volume
- Date range defaults to current month if not supplied.

## Smoke Validation

1. Contract-only check (no HTTP calls):
   - `pnpm smoke:admin-parity`
2. Live API check (includes `/api/admin/control-tower/summary` response-shape validation):
   - `SMOKE_BASE_URL=https://<env-host> SMOKE_COOKIE='<cookie>' pnpm smoke:admin-parity`
3. CI automation:
   - `.github/workflows/admin-api-smoke.yml` runs contract parity on PR/push and live checks on non-PR runs when `SMOKE_BASE_URL` + auth secret are configured.

## Rollback

1. Remove `executive_control_tower` from `FEATURE_FLAGS`.
2. Redeploy.
3. Verify:
   - `/admin/control-tower` redirects away;
   - summary API returns `FEATURE_DISABLED`.
