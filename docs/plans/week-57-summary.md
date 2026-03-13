# Week 57 Summary

## Scope

- Data/query performance tuning wave 1 (hot paths, indexes, cache hit rates):
  - establish query budget policy and validation gate,
  - ship concrete index and query-shape tuning commits,
  - wire query-performance governance into matrix/compliance release controls.

## Shipped This Week

1. Added Wave 1 query/index tuning commits
- Updated [`/Users/lsendel/Projects/commerce/src/infrastructure/db/schema.ts`](/Users/lsendel/Projects/commerce/src/infrastructure/db/schema.ts):
  - added composite indexes for hot paths:
    - `carts_store_session_idx`
    - `carts_store_user_idx`
    - `orders_store_user_created_idx`
    - `orders_store_status_created_idx`
    - `promotions_store_status_window_priority_idx`
    - `redemptions_promotion_customer_idx`
    - `customer_segments_store_created_idx`
    - `segment_memberships_segment_customer_idx`
- Updated [`/Users/lsendel/Projects/commerce/src/infrastructure/repositories/cart.repository.ts`](/Users/lsendel/Projects/commerce/src/infrastructure/repositories/cart.repository.ts):
  - tightened cart hot-path predicates to store-scoped conditions for:
    - `findOrCreateCart`
    - `mergeCart`
  - aligns query predicates with new composite cart indexes.
- Added SQL migration helper [`/Users/lsendel/Projects/commerce/scripts/sql/add-week57-performance-indexes.sql`](/Users/lsendel/Projects/commerce/scripts/sql/add-week57-performance-indexes.sql):
  - executable `CREATE INDEX IF NOT EXISTS ...` statements for all Week 57 indexes.

2. Added query budget policy and runbook
- Added [`/Users/lsendel/Projects/commerce/docs/policies/query-performance-budget-v1.json`](/Users/lsendel/Projects/commerce/docs/policies/query-performance-budget-v1.json):
  - hot-path budgets (`targetP95Ms`, `queryBudgetUnits`),
  - required predicates and index mappings,
  - cache-surface hit-rate targets,
  - review cadence and index migration source path.
- Added [`/Users/lsendel/Projects/commerce/docs/policies/query-performance-budget-v1.md`](/Users/lsendel/Projects/commerce/docs/policies/query-performance-budget-v1.md):
  - governance and enforcement rules.
- Added [`/Users/lsendel/Projects/commerce/docs/runbooks/query-performance-budget-wave1.md`](/Users/lsendel/Projects/commerce/docs/runbooks/query-performance-budget-wave1.md):
  - operational triage and recovery flow for query-budget regressions.

3. Added Week 57 smoke gate + query budget report artifact
- Added [`/Users/lsendel/Projects/commerce/scripts/smoke-query-performance.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-query-performance.ts):
  - validates policy structure and review windows,
  - validates schema + SQL index coverage,
  - validates hot-path predicate snippets by repository method,
  - validates cache-surface snippets for catalog APIs,
  - writes query budget report artifacts:
    - `output/smoke/query-performance-report.json`
    - `output/smoke/query-performance-report.md`.
- Updated [`/Users/lsendel/Projects/commerce/package.json`](/Users/lsendel/Projects/commerce/package.json):
  - added `smoke:query-performance`.

4. Wired Week 57 into matrix and compliance controls
- Updated [`/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts):
  - added `pnpm smoke:query-performance` stage,
  - added skip flag `SMOKE_MATRIX_SKIP_QUERY_PERFORMANCE`.
- Updated [`/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md`](/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md):
  - documented new query-performance stage and skip behavior.
- Updated compliance controls:
  - [`/Users/lsendel/Projects/commerce/docs/policies/compliance-control-matrix-v1.json`](/Users/lsendel/Projects/commerce/docs/policies/compliance-control-matrix-v1.json)
  - [`/Users/lsendel/Projects/commerce/docs/policies/compliance-control-matrix-v1.md`](/Users/lsendel/Projects/commerce/docs/policies/compliance-control-matrix-v1.md)
  - added `CC-013` for query-performance and capacity governance.
- Updated [`/Users/lsendel/Projects/commerce/docs/runbooks/compliance-control-framework.md`](/Users/lsendel/Projects/commerce/docs/runbooks/compliance-control-framework.md):
  - added `pnpm smoke:query-performance` to compliance rerun sequence.

## Validation

- `pnpm -s tsc --noEmit --pretty false`
- `pnpm smoke:query-performance`
- `pnpm smoke:compliance-controls`
- `pnpm smoke:admin-parity`
- `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`
- `pnpm smoke:production`

## Week 57 Artifact Snapshot

- Query performance smoke report:
  - status: `passed`
  - checks: `66/66` passed, `0` failed
  - hot paths passing: `6/6`
  - cache surfaces passing: `3/3`
  - indexed catalog size: `8`
  - artifact: `output/smoke/query-performance-report.json`
- Compliance controls smoke:
  - status: `passed`
  - controls: `13`
  - failed checks: `0`
  - includes `CC-013` coverage.
- Matrix:
  - includes `pnpm smoke:query-performance` stage and passes in HTTP-off mode.
- Production smoke:
  - `ALL PASS: 85/85` on `https://petm8.io`.

## Next Week Kickoff

- Week 58: edge caching and invalidation automation for high-traffic surfaces.
