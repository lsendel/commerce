# Week 49 Summary

## Scope

- Pricing/discount policy simulation with preflight risk checks:
  - non-mutating policy validation previews,
  - risk-scored preflight API + UI workflow gating,
  - simulation validation suite + matrix integration.

## Shipped This Week

1. Added non-mutating policy preview APIs
- Updated [`/Users/lsendel/Projects/commerce/src/application/platform/policy-engine.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/platform/policy-engine.usecase.ts):
  - added preview methods:
    - `previewPricingExperimentGuardrails`
    - `previewPromotionGuardrails`
    - `previewShippingRateGuardrails`
  - refactored guardrail checks into reusable collectors,
  - added preview violation output model for policy simulation use cases.

2. Added pricing/discount preflight risk evaluator
- Added [`/Users/lsendel/Projects/commerce/src/application/pricing/pricing-policy-preflight.ts`](/Users/lsendel/Projects/commerce/src/application/pricing/pricing-policy-preflight.ts):
  - computes proposal summary metrics (assignment count, markdown share, avg deltas),
  - combines pricing/promotion policy previews with rollout heuristics,
  - returns risk score + level (`low`/`medium`/`high`) and blocker/warning/recommendation sets.

3. Added preflight API and start-time risk gating
- Updated [`/Users/lsendel/Projects/commerce/src/routes/api/pricing-experiments.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/pricing-experiments.routes.ts):
  - added `POST /api/admin/pricing-experiments/preflight`,
  - start flow now executes preflight and blocks unsafe launches with:
    - `409` + `code: PRE_FLIGHT_BLOCKED`,
  - start success payload now includes `preflight` result snapshot.

4. Extended pricing contract and parity coverage
- Updated [`/Users/lsendel/Projects/commerce/src/contracts/pricing-experiment.contract.ts`](/Users/lsendel/Projects/commerce/src/contracts/pricing-experiment.contract.ts):
  - added `preflight` route contract with full response schema,
  - extended `start` response schema with preflight payload,
  - added `409 PRE_FLIGHT_BLOCKED` response shape.
- Updated [`/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts):
  - added method/path assertion for preflight endpoint,
  - added live-response contract validation check for preflight.

5. Added admin UI preflight workflow
- Updated [`/Users/lsendel/Projects/commerce/src/routes/pages/admin/pricing-experiments.page.tsx`](/Users/lsendel/Projects/commerce/src/routes/pages/admin/pricing-experiments.page.tsx):
  - added discount scenario controls,
  - added “Run Preflight Risk Check” action,
  - added preflight summary panel.
- Updated [`/Users/lsendel/Projects/commerce/public/scripts/admin-pricing-experiments.js`](/Users/lsendel/Projects/commerce/public/scripts/admin-pricing-experiments.js):
  - added preflight API integration and rendering,
  - enforces UI-side block before start when preflight risk is high/blocking,
  - preserves server-returned preflight details on start errors.

6. Added Week 49 simulation smoke suite + matrix wiring
- Added [`/Users/lsendel/Projects/commerce/scripts/smoke-pricing-policy-simulation.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-pricing-policy-simulation.ts):
  - validates low-risk, enforce-block, monitor-mode, and discount-risk scenarios,
  - writes artifacts:
    - `output/smoke/pricing-policy-simulation-report.json`
    - `output/smoke/pricing-policy-simulation-report.md`.
- Updated [`/Users/lsendel/Projects/commerce/package.json`](/Users/lsendel/Projects/commerce/package.json):
  - added `smoke:pricing-policy-simulation`.
- Updated [`/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts):
  - added `pnpm smoke:pricing-policy-simulation` stage,
  - added skip flag:
    - `SMOKE_MATRIX_SKIP_PRICING_POLICY_SIMULATION`.
- Added/updated runbooks:
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/pricing-policy-simulation.md`](/Users/lsendel/Projects/commerce/docs/runbooks/pricing-policy-simulation.md)
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md`](/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md)
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md`](/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md)

## Validation

- `pnpm -s tsc --noEmit --pretty false`
- `pnpm smoke:pricing-policy-simulation`
- `pnpm smoke:admin-parity`
- `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`
- `pnpm smoke:production`

## Week 49 Artifact Snapshot

- Pricing policy simulation report:
  - status: `passed`
  - checks: `5/5` passed, `0` failed
  - artifact: `output/smoke/pricing-policy-simulation-report.json`
- Matrix:
  - includes `pnpm smoke:pricing-policy-simulation` stage and passes.
- Production smoke:
  - `ALL PASS: 81/81` on `https://petm8.io`.

## Next Week Kickoff

- Week 50: returns and fulfillment SLA prediction + proactive intervention triggers.
