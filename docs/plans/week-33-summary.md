# Week 33 Summary

## Scope

- Add top-level report rollups by owner/tag for faster triage.
- Add owner-aware alert routing fields and policy context to failure webhooks.

## Shipped This Week

1. Owner/tag grouped metrics
- Updated [`/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts) to compute grouped rollups:
  - `ownerRollups[]` with `total`, `passed`, `failed`, `suppressed`.
  - `tagRollups[]` with the same counters.
- Added top rollup summaries to markdown report header for quick incident routing.

2. Owner-aware failure alert enrichment
- Updated alert payload generation to include:
  - `failedOwner`, `failedTags`,
  - `retryPolicyKey` and effective retry policy object (for managed endpoints),
  - `escalation` object with route resolution outcome.
- Added owner-route config parsing from env:
  - `SMOKE_ALERT_OWNER_ROUTING_JSON`
  - `SMOKE_ALERT_DEFAULT_ROUTE`

3. CI + runbook wiring
- Updated [`/Users/lsendel/Projects/commerce/.github/workflows/admin-api-smoke.yml`](/Users/lsendel/Projects/commerce/.github/workflows/admin-api-smoke.yml) to pass alert-routing secrets.
- Updated [`/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md`](/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md) with routing and rollup metric docs.

## Validation

- `pnpm typecheck`
- `pnpm smoke:admin-parity` (contract-only mode)

## Next Week Kickoff

- Add strict report-schema contract snapshots for smoke report JSON structure to prevent accidental field drift.
- Add per-owner latency rollups (`p50/p95`) to highlight slow domains directly in top-level summary.
