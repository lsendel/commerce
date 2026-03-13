# Query Performance Budget Wave 1 Runbook

## Scope

- Policy: `docs/policies/query-performance-budget-v1.json`
- Schema: `src/infrastructure/db/schema.ts`
- SQL indexes: `scripts/sql/add-week57-performance-indexes.sql`
- Gate: `pnpm smoke:query-performance`

## Objective

- Keep hot-path query predicates store-scoped and index-backed.
- Keep catalog cache surfaces explicit and stable.
- Prevent regressions in query budget governance before release.

## Operation Steps

1. Run `pnpm smoke:query-performance`.
2. Confirm artifacts:
   - `output/smoke/query-performance-report.json`
   - `output/smoke/query-performance-report.md`
3. If index checks fail:
   - align index names between schema and SQL migration script.
4. If predicate checks fail:
   - update repository method filters to include policy-required predicates.
5. If cache checks fail:
   - restore required `cacheResponse(...)` TTL snippets in route files.
6. Re-run:
   - `pnpm smoke:query-performance`
   - `pnpm smoke:compliance-controls`
   - `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`

## Incident Triggers

- Any hot path missing required index coverage.
- Any cache surface missing required TTL middleware.
- Policy review date overdue (`nextReviewBy`).

## Recovery Prioritization

1. `p0`: cart and checkout path regressions.
2. `p1`: admin order/segment list regressions.
3. `p2`: campaign analytics/reports and secondary listing paths.
