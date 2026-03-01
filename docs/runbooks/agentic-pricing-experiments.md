# Agentic Pricing Experiments Runbook

## Scope

- Feature flag: `ai_pricing_experiments`
- Surfaces:
  - `/admin/pricing-experiments`
  - `/api/admin/pricing-experiments`
  - `/api/admin/pricing-experiments/propose`
  - `/api/admin/pricing-experiments/start`
  - `/api/admin/pricing-experiments/:id/stop`
  - `/api/admin/pricing-experiments/:id/performance`

## What It Does

- Proposes guarded variant-level price deltas using recent demand and inventory heuristics.
- Starts experiments with optional auto-apply for selected variant assignments.
- Stops experiments and restores baseline prices for all assigned variants.
- Provides pre/post window performance comparison for units, revenue, and orders.

## Rollout

1. Enable `ai_pricing_experiments` for internal admin users.
2. Open `/admin/pricing-experiments` and generate a proposal.
3. Validate proposal quality:
   - assignments are plausible for demand/inventory profile;
   - guardrails match expected min/max deltas;
   - warnings are reviewed.
4. Start a low-risk experiment with `maxVariants <= 5`.
5. Verify analytics events:
   - `pricing_experiment_proposal_generated`
   - `pricing_experiment_started`
   - `pricing_experiment_stopped` (after stop flow test)
6. Verify stop flow restores baseline prices for all assignments.

## Guardrails

- Endpoints are admin-only under `/api/admin/*` middleware.
- Propose/start/stop/list endpoints are rate-limited.
- Delta percent bounds are clamped server-side (`-20%` to `+20%`).
- Assignment application and restoration are store-scoped.

## Rollback

1. Remove `ai_pricing_experiments` from `FEATURE_FLAGS`.
2. Redeploy.
3. Verify:
   - `/admin/pricing-experiments` redirects away;
   - pricing experiment APIs return `FEATURE_DISABLED`.
