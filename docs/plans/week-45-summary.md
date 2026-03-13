# Week 45 Summary

## Scope

- Growth experimentation operating system:
  - experiment registry contracts,
  - A/B holdout + attribution requirements,
  - KPI guardrail evaluation with fail actions,
  - smoke/matrix enforcement and rollout docs.

## Shipped This Week

1. Added experiment registry + KPI guardrail core module
- Added [`/Users/lsendel/Projects/commerce/src/infrastructure/growth/experiment-registry.ts`](/Users/lsendel/Projects/commerce/src/infrastructure/growth/experiment-registry.ts):
  - typed experiment registry entry model,
  - holdout and allocation validation checks,
  - attribution policy requirements,
  - KPI guardrail evaluation (`pass`/`warn`/`fail`) with fail-action outputs,
  - default Week 45 registry set for pricing, landing-page, and checkout-recovery experiments.

2. Added growth experimentation smoke command + artifacts
- Added [`/Users/lsendel/Projects/commerce/scripts/smoke-growth-experiment-os.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-growth-experiment-os.ts):
  - validates registry structure and attribution requirements,
  - evaluates KPI guardrails from metric observations,
  - writes experiment OS report artifacts:
    - `output/smoke/growth-experiment-os-report.json`
    - `output/smoke/growth-experiment-os-report.md`
  - writes registry snapshot artifact:
    - `output/experiments/experiment-registry.json`
  - exits non-zero on guardrail/definition failures.

3. Integrated into smoke matrix
- Updated [`/Users/lsendel/Projects/commerce/package.json`](/Users/lsendel/Projects/commerce/package.json):
  - added `smoke:growth-experiments`.
- Updated [`/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts):
  - adds `pnpm smoke:growth-experiments` command stage,
  - adds `SMOKE_MATRIX_SKIP_GROWTH_EXPERIMENTS` skip control.
- Updated matrix runbook:
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md`](/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md)

4. Added Week 45 policy/runbook docs
- Added KPI policy:
  - [`/Users/lsendel/Projects/commerce/docs/policies/growth-kpi-guardrails.md`](/Users/lsendel/Projects/commerce/docs/policies/growth-kpi-guardrails.md)
- Added experimentation OS runbook:
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/growth-experiment-os.md`](/Users/lsendel/Projects/commerce/docs/runbooks/growth-experiment-os.md)

## Validation

- `pnpm -s tsc --noEmit --pretty false`
- `pnpm smoke:growth-experiments`
- `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`
- `pnpm smoke:production`

## Week 45 Artifact Snapshot

- Experiment OS report status:
  - `passed_with_warnings`
  - `3` experiments evaluated (`2` pass, `1` warn, `0` fail, `0` invalid definitions).
- Warning surfaced:
  - `wk45-lp-intent-copy` conversion rate breach `3.08%` over warn threshold `3%` (below fail threshold `5%`).
- Matrix command stage status:
  - `pnpm smoke:growth-experiments` passes and is now included in `pnpm smoke:e2e-matrix`.
- Production smoke status:
  - `ALL PASS: 81/81` on `https://petm8.io`.

## Next Week Kickoff

- Week 46: event pipeline reliability (taxonomy enforcement, dedupe, delivery guarantees).
