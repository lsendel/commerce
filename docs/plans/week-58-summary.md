# Week 58 Summary

## Scope

- Edge caching and invalidation automation for high-traffic surfaces:
  - complete mutation + webhook invalidation flows,
  - codify cache policy matrix and runbook,
  - ship an automated invalidation smoke gate,
  - wire cache governance into matrix/compliance release controls.

## Shipped This Week

1. Completed cache invalidation automation across mutation paths
- Updated [`/Users/lsendel/Projects/commerce/src/routes/api/admin-products.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/admin-products.routes.ts):
  - centralized `invalidateProductCache(...)` now supports both `product` and `event` resources,
  - bookable product mutations now invalidate event cache surfaces,
  - invalidation is applied across product mutation endpoints.
- Updated [`/Users/lsendel/Projects/commerce/src/routes/api/admin-collections.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/admin-collections.routes.ts):
  - added `invalidateCollectionCache(...)`,
  - wired create/update/delete and collection membership mutation endpoints to invalidation.
- Updated [`/Users/lsendel/Projects/commerce/src/routes/api/currency.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/currency.routes.ts):
  - `PATCH /currency/config` now invalidates `currency:rates` tag.
- Updated [`/Users/lsendel/Projects/commerce/src/routes/api/cache.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/cache.routes.ts):
  - webhook payload supports single + batched resources, `dryRun`, and `reason`,
  - route executes centralized invalidation plan/executor with slug resolvers.
- Updated [`/Users/lsendel/Projects/commerce/src/routes/api/events.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/events.routes.ts):
  - added `cacheResponse(...)` coverage for events list/detail with tags.
- Updated [`/Users/lsendel/Projects/commerce/src/routes/api/products.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/products.routes.ts):
  - product detail cache now includes static `products:detail` tag in addition to per-slug dynamic tags.
- Updated [`/Users/lsendel/Projects/commerce/src/infrastructure/cache/invalidation-plan.ts`](/Users/lsendel/Projects/commerce/src/infrastructure/cache/invalidation-plan.ts):
  - added direct-key invalidation for legacy `/api/products/collections` listing,
  - keeps listing invalidation behavior aligned with active and legacy collection APIs.

2. Added Week 58 cache policy matrix + runbook
- Added [`/Users/lsendel/Projects/commerce/docs/policies/cache-policy-matrix-v1.json`](/Users/lsendel/Projects/commerce/docs/policies/cache-policy-matrix-v1.json):
  - high-traffic surface matrix (TTL, tags, invalidation resource coverage, target hit-rates),
  - invalidation trigger matrix (webhook, admin mutations, currency update, executor),
  - review cadence/governance metadata.
- Added [`/Users/lsendel/Projects/commerce/docs/policies/cache-policy-matrix-v1.md`](/Users/lsendel/Projects/commerce/docs/policies/cache-policy-matrix-v1.md):
  - policy intent and enforcement rules.
- Added [`/Users/lsendel/Projects/commerce/docs/runbooks/cache-invalidation-automation.md`](/Users/lsendel/Projects/commerce/docs/runbooks/cache-invalidation-automation.md):
  - triage/recovery flow for cache invalidation regressions.

3. Added Week 58 smoke gate and release wiring
- Added [`/Users/lsendel/Projects/commerce/scripts/smoke-cache-invalidation.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-cache-invalidation.ts):
  - validates policy structure/review window/resource coverage,
  - validates required cache surface snippets and invalidation trigger snippets,
  - validates `buildCacheInvalidationPlan(...)` output shape for tags/direct keys/unresolved/touched surfaces,
  - writes artifacts:
    - `output/smoke/cache-invalidation-report.json`
    - `output/smoke/cache-invalidation-report.md`.
- Updated [`/Users/lsendel/Projects/commerce/package.json`](/Users/lsendel/Projects/commerce/package.json):
  - added `smoke:cache-invalidation`.
- Updated [`/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts):
  - added command stage `pnpm smoke:cache-invalidation`,
  - added skip flag `SMOKE_MATRIX_SKIP_CACHE_INVALIDATION`.
- Updated [`/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md`](/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md):
  - documented new stage + skip behavior.

4. Wired cache invalidation into compliance controls
- Updated compliance controls:
  - [`/Users/lsendel/Projects/commerce/docs/policies/compliance-control-matrix-v1.json`](/Users/lsendel/Projects/commerce/docs/policies/compliance-control-matrix-v1.json)
  - [`/Users/lsendel/Projects/commerce/docs/policies/compliance-control-matrix-v1.md`](/Users/lsendel/Projects/commerce/docs/policies/compliance-control-matrix-v1.md)
  - added `CC-014` for edge cache invalidation governance.
- Updated [`/Users/lsendel/Projects/commerce/docs/runbooks/compliance-control-framework.md`](/Users/lsendel/Projects/commerce/docs/runbooks/compliance-control-framework.md):
  - added `pnpm smoke:cache-invalidation` to compliance rerun sequence.

## Validation

- `pnpm -s tsc --noEmit --pretty false`
- `pnpm smoke:cache-invalidation`
- `pnpm smoke:compliance-controls`
- `pnpm smoke:admin-parity`
- `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`
- `pnpm smoke:production`

## Week 58 Artifact Snapshot

- Cache invalidation smoke report:
  - status: `passed`
  - checks: `98/98` passed, `0` failed
  - surface count: `8`
  - invalidation trigger count: `5`
  - plan cases: `7/7` passed
  - artifact: `output/smoke/cache-invalidation-report.json`
- Compliance controls smoke:
  - status: `passed`
  - controls: `14`
  - checks: `310`
  - failed checks: `0`
  - includes `CC-014` coverage.
- E2E matrix (HTTP-off mode):
  - status: `passed`
  - includes command stage `pnpm smoke:cache-invalidation`.
- Production smoke:
  - `ALL PASS: 85/85` on `https://petm8.io`.

## Next Week Kickoff

- Week 59: async workflow orchestration hardening (timeouts, retries, compensation).
