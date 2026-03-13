# Cache Invalidation Automation Runbook

## Scope

- Policy: `docs/policies/cache-policy-matrix-v1.json`
- Plan builder: `src/infrastructure/cache/invalidation-plan.ts`
- Executor: `src/infrastructure/cache/invalidation-executor.ts`
- Webhook endpoint: `POST /api/webhooks/cache-invalidate`
- Gate: `pnpm smoke:cache-invalidation`

## Objective

- Keep high-traffic cache surfaces explicitly defined and invalidatable.
- Ensure mutation paths and webhook-triggered invalidation stay in sync.
- Prevent stale cached reads across product, collection, event, and currency surfaces.

## Operating Procedure

1. Run `pnpm smoke:cache-invalidation`.
2. Confirm artifacts:
   - `output/smoke/cache-invalidation-report.json`
   - `output/smoke/cache-invalidation-report.md`
3. If surface checks fail:
   - restore missing `cacheResponse(...)` tags/TTL snippets in route files.
4. If trigger checks fail:
   - restore invalidation call sites in admin mutation routes or cache webhook route.
5. If plan checks fail:
   - align `src/infrastructure/cache/invalidation-plan.ts` with expected tags/direct keys for supported resource types.
6. Re-run:
   - `pnpm smoke:cache-invalidation`
   - `pnpm smoke:compliance-controls`
   - `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`

## Incident Triggers

- Cache webhook payload shape drift.
- Missing invalidation call in admin mutation handlers.
- Missing TTL/tag middleware on required cache surfaces.
- Invalidation plan not emitting expected tags or keys for covered resources.

## Recovery Prioritization

1. `p0`: product list/detail stale-data regressions.
2. `p1`: collection/event stale-data regressions.
3. `p2`: currency-rate cache refresh delays.
