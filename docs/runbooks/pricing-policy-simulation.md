# Pricing Policy Simulation Runbook

## Scope

- Preflight risk evaluator:
  - `src/application/pricing/pricing-policy-preflight.ts`
- Policy preview primitives:
  - `src/application/platform/policy-engine.usecase.ts`
- Pricing experiments API preflight endpoint:
  - `POST /api/admin/pricing-experiments/preflight`
- Admin UI surface:
  - `/admin/pricing-experiments`
- Smoke command:
  - `pnpm smoke:pricing-policy-simulation`

## Preflight Behavior

1. Simulation input
- pricing proposal controls (`maxVariants`, delta bounds, optional variant IDs),
- optional discount scenario (`percentage_off` or `fixed_amount`, value, stackable flag),
- auto-apply intent.

2. Validation layers
- policy guardrail previews for pricing and optional discount scenario,
- proposal-shape heuristics (assignment count, markdown share, average delta, auto-apply blast radius),
- risk scoring into `low`/`medium`/`high`.

3. Output shape
- proposal snapshot + summary stats,
- policy validation preview results with violations,
- risk score/level and actionable recommendations,
- blockers/warnings for operator decisioning.

## API Usage

1. Run preflight before start:
- `POST /api/admin/pricing-experiments/preflight`

2. Start behavior:
- `POST /api/admin/pricing-experiments/start` now includes `preflight` in success payload,
- returns `409 PRE_FLIGHT_BLOCKED` when high-risk blocker conditions are detected.

3. Auth/flags
- endpoint requires authenticated admin context,
- if `policy_engine_guardrails` is disabled, policy preview is advisory-only and flagged in warnings.

## Smoke Gate

1. Run:
- `pnpm smoke:pricing-policy-simulation`

2. Report artifacts:
- `output/smoke/pricing-policy-simulation-report.json`
- `output/smoke/pricing-policy-simulation-report.md`

3. Gate criteria:
- no failed checks across low-risk, hard-block, monitor-mode, and discount-risk scenarios.

## Matrix Integration

- Included in `pnpm smoke:e2e-matrix`.
- Skip only this stage:
  - `SMOKE_MATRIX_SKIP_PRICING_POLICY_SIMULATION=true pnpm smoke:e2e-matrix`

## Failure Handling

1. If preflight blocks expected launches:
- review policy thresholds in `/admin/policies`,
- reduce experiment blast radius (`maxVariants`, delta range, disable auto-apply),
- rerun preflight then restart.

2. If simulation smoke fails:
- inspect failing check rows in markdown report,
- adjust risk heuristics/policy preview mapping,
- rerun `pnpm smoke:pricing-policy-simulation`.
