# Query Performance Budget Policy v1

## Purpose

- Define Wave 1 query-performance budgets for high-traffic repository paths.
- Enforce index coverage, predicate correctness, and cache-surface guardrails.

## Source of Truth

- Policy: `docs/policies/query-performance-budget-v1.json`
- Migration script: `scripts/sql/add-week57-performance-indexes.sql`
- Smoke gate: `pnpm smoke:query-performance`
- Artifacts:
  - `output/smoke/query-performance-report.json`
  - `output/smoke/query-performance-report.md`

## Budget Domains

1. Hot-path query budgets:
   - `targetP95Ms` and `queryBudgetUnits` per repository method.
2. Index coverage:
   - each hot path maps to one or more required index names.
3. Cache budgets:
   - critical catalog surfaces must keep explicit TTL-based cache middleware.

## Required Enforcement

1. Every `hotPaths[*].requiredIndexes` item must exist in:
   - `src/infrastructure/db/schema.ts` index definitions,
   - `scripts/sql/add-week57-performance-indexes.sql`.
2. Every `hotPaths[*].requiredPredicates` snippet must be present in the mapped repository path.
3. Every cache surface entry must keep its `requiredSnippet` in the mapped route file.
4. Policy review window (`nextReviewBy`) must stay inside `reviewCadenceDays`.

## Weekly Review

- Owner: `commerce-data-platform`
- Cadence: 14 days
- Review output:
  - pass/fail smoke report,
  - prioritized tuning backlog for any failing hot paths,
  - index-application confirmation in staging/prod.
