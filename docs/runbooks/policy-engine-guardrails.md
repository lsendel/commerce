# Policy Engine Guardrails Runbook

## Scope

- Feature flag: `policy_engine_guardrails`
- Surfaces:
  - `/admin/policies`
  - `/api/admin/policies`
  - `/api/admin/policies/violations`
- Enforcement targets:
  - pricing experiments (`/api/admin/pricing-experiments/*`)
  - promotions create/update/copilot apply (`/api/promotions/*`)
  - shipping rate create/update (`/api/shipping/zones/:zoneId/rates*`)

## Policy Domains

- `pricing`
  - `maxVariants`
  - `minDeltaPercent`, `maxDeltaPercent`
  - `allowAutoApply`
- `shipping`
  - `maxFlatRate`
  - `maxEstimatedDays`
- `promotions`
  - `maxPercentageOff`
  - `maxFixedAmount`
  - `maxCampaignDays`
  - `allowStackable`

## Modes

- `enforce`: violations are blocked and written as `error` entries.
- `monitor`: requests continue and violations are written as `warning` entries.

## Rollout

1. Enable `policy_engine_guardrails` for internal admin users.
2. Open `/admin/policies` and confirm defaults are loaded.
3. Set mode to `monitor` for first pass and validate violation logging.
4. Switch to `enforce` once no false positives remain.
5. Verify violation events in `/api/admin/policies/violations` and UI timeline.

## Guardrails

- Policy update API is admin-only and rate-limited.
- Violations are persisted with domain/action, severity, actor, and details payload.
- Enforcement is deterministic and synchronous in mutation flows.

## Smoke Validation

1. Contract-only check (no HTTP calls):
   - `pnpm smoke:admin-parity`
2. Live API check (method/status/response-shape + partial-policy update merge behavior):
   - `SMOKE_BASE_URL=https://<env-host> SMOKE_COOKIE='<cookie>' pnpm smoke:admin-parity`
3. CI automation:
   - `.github/workflows/admin-api-smoke.yml` runs contract parity on PR/push and live checks on non-PR runs when `SMOKE_BASE_URL` + auth secret are configured.

## Rollback

1. Remove `policy_engine_guardrails` from `FEATURE_FLAGS`.
2. Redeploy.
3. Verify:
   - `/admin/policies` redirects away;
   - policy APIs return `FEATURE_DISABLED`;
   - guarded mutations no longer run policy checks.
