# Week 29 Summary

## Scope

- Add endpoint-by-endpoint smoke reporting artifacts for CI.
- Add automatic alerting hook for live smoke failures.

## Shipped This Week

1. Smoke reporting outputs
- Updated [`/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts) to generate JSON/Markdown reports per run:
  - status (`passed|failed|contract_only`),
  - mutation flag state,
  - endpoint-by-endpoint check results.
- Added env controls:
  - `SMOKE_REPORT_JSON_PATH`
  - `SMOKE_REPORT_MD_PATH`
  - `SMOKE_SKIP_REPORTS`

2. Failure alert hook
- Added optional webhook alerting via `SMOKE_ALERT_WEBHOOK_URL`.
- On failure, script sends payload with error summary and last failed check metadata.

3. CI artifact uploads
- Updated [`/Users/lsendel/Projects/commerce/.github/workflows/admin-api-smoke.yml`](/Users/lsendel/Projects/commerce/.github/workflows/admin-api-smoke.yml):
  - writes contract and live reports to `output/smoke/*`,
  - uploads artifacts for both jobs via `actions/upload-artifact@v4`.

4. Runbook updates
- Updated [`/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md`](/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md) with report paths and alerting configuration.

## Validation

- `pnpm typecheck`
- `pnpm smoke:admin-parity` (contract-only mode)

## Next Week Kickoff

- Add scoped mutation checks for integration verify and store-template clone with deterministic cleanup strategy.
- Add trend dashboard from daily smoke report artifacts (pass rates, flaky endpoints, median status latency).
