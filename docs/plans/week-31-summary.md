# Week 31 Summary

## Scope

- Add latency visibility to smoke checks.
- Add flaky-check retry/suppression policy for non-deterministic integration verification paths.

## Shipped This Week

1. Latency capture and rollups
- Updated [`/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts) to record per-check `durationMs`.
- Added report-level latency aggregates:
  - `min`, `p50`, `p95`, `max`, `avg`,
  - counts for total, failed, and suppressed checks.
- Expanded Markdown report table with duration, attempts, suppression, and note columns.

2. Flaky verify retry + suppression policy
- Added retry controls for `verifyIntegrationApp`:
  - `SMOKE_VERIFY_MAX_ATTEMPTS` (default `3`)
  - `SMOKE_VERIFY_RETRY_DELAY_MS` (default `750`)
- Added optional suppression behavior:
  - `SMOKE_SUPPRESS_FLAKY_VERIFY_FAILURES=true`
  - records suppressed failure metadata and allows run to finish as `passed_with_suppressed`.

3. CI and alerting env wiring
- Updated [`/Users/lsendel/Projects/commerce/.github/workflows/admin-api-smoke.yml`](/Users/lsendel/Projects/commerce/.github/workflows/admin-api-smoke.yml) live job env to pass:
  - verify retry/suppression settings,
  - alert webhook URL.

4. Runbook updates
- Updated [`/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md`](/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md) with flaky policy and latency metric documentation.

## Validation

- `pnpm typecheck`
- `pnpm smoke:admin-parity` (contract-only mode)

## Next Week Kickoff

- Add endpoint tags/owners in report metadata for faster incident routing.
- Add configurable retry policy for additional flaky external-provider endpoints (beyond verify).
