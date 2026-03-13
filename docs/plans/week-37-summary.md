# Week 37 Summary

## Scope

- Expand end-to-end smoke matrix coverage for critical user and operator journeys.
- Make smoke execution/reporting consistent across local and CI paths.

## Shipped This Week

1. E2E smoke matrix runner
- Added [`/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts) to execute:
  - admin parity smoke command stage (`pnpm smoke:admin-parity`),
  - HTTP journey checks for storefront, auth, account, platform, and admin gate flows,
  - section-level pass/fail aggregation with structured JSON/Markdown output.

2. New npm script
- Added `smoke:e2e-matrix` in [`/Users/lsendel/Projects/commerce/package.json`](/Users/lsendel/Projects/commerce/package.json).

3. CI workflow for matrix smoke
- Added [`/Users/lsendel/Projects/commerce/.github/workflows/e2e-smoke-matrix.yml`](/Users/lsendel/Projects/commerce/.github/workflows/e2e-smoke-matrix.yml):
  - `contract-matrix` job on PR/push/schedule/manual with `SMOKE_MATRIX_SKIP_HTTP=true`,
  - `live-matrix` job on non-PR events when `SMOKE_BASE_URL` secret is available,
  - artifact upload for both JSON and Markdown matrix reports.

4. Runbook documentation
- Added [`/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md`](/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md) with:
  - coverage matrix,
  - execution modes and env flags,
  - artifact paths,
  - CI behavior and failure handling guidance.

## Validation

- `pnpm -s tsc --noEmit --pretty false`
- `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`
- `pnpm smoke:e2e-matrix` (live HTTP matrix against default `https://petm8.io`)

## Next Week Kickoff

- Add CI policy that enforces schema snapshot update when smoke report descriptor changes.
- Add owner latency burn-rate trend deltas (current vs trailing baseline) into smoke reports.
