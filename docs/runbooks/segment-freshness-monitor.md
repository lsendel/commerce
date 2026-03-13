# Segment Freshness Monitor Runbook

## Scope

- API surface: `/api/promotions/segments/freshness`
- Command: `pnpm smoke:segment-freshness`
- Purpose:
  - detect stale segment refresh cycles,
  - detect membership-count drift between denormalized counters and membership table,
  - provide a release gate for segmentation integrity.

## Freshness Rules

- `fresh`:
  - `lastRefreshedAt` exists,
  - `ageHours <= thresholdHours`,
  - `memberCount === membershipCount`.
- `stale`:
  - `lastRefreshedAt` exists but exceeds threshold.
- `never_refreshed`:
  - no `lastRefreshedAt`.
- `drift`:
  - `memberCount !== membershipCount`.

## Commands

1. Default monitor run:
- `pnpm smoke:segment-freshness`

2. Custom threshold:
- `SMOKE_SEGMENT_THRESHOLD_HOURS=12 pnpm smoke:segment-freshness`

3. Matrix integration:
- `pnpm smoke:e2e-matrix`
- Skip only this stage:
  - `SMOKE_MATRIX_SKIP_SEGMENT_FRESHNESS=true pnpm smoke:e2e-matrix`

## Artifacts

- `output/smoke/segment-freshness-report.json`
- `output/smoke/segment-freshness-report.md`

## Failure Handling

1. `drift` found:
- run `POST /api/promotions/segments/:id/refresh` on affected segments,
- re-check freshness report,
- if drift persists, inspect segment rule evaluator and membership write path.

2. `stale` or `never_refreshed`:
- execute scheduled segment refresh job or manual refresh endpoint,
- ensure cron `0 */6 * * *` is active.
