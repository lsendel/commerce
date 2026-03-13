# Week 34 Summary

## Scope

- Add strict smoke report schema snapshot enforcement to prevent JSON shape drift.
- Add per-owner latency rollups (`p50/p95`) to top-level report metrics.

## Shipped This Week

1. Strict report schema snapshot enforcement
- Updated [`/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts) to:
  - define a canonical schema descriptor for smoke report payloads,
  - normalize/compare descriptor against a checked-in snapshot,
  - validate generated reports against schema before writing artifacts.
- Snapshot controls:
  - `SMOKE_UPDATE_REPORT_SCHEMA_SNAPSHOT=true` (intentional snapshot update)
  - `SMOKE_SKIP_REPORT_SCHEMA_CHECK=true` (emergency bypass)
- Snapshot file used:
  - [`/Users/lsendel/Projects/commerce/docs/snapshots/admin-api-parity-report.schema.snapshot.json`](/Users/lsendel/Projects/commerce/docs/snapshots/admin-api-parity-report.schema.snapshot.json)

2. Owner latency rollups
- Added `ownerLatencyRollups[]` to report metrics with per-owner latency aggregates (`count/min/p50/p95/max/avg`).
- Added markdown summary line for owner-latency rollups to improve incident triage speed.

3. Runbook updates
- Updated [`/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md`](/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md) with:
  - schema snapshot enforcement behavior,
  - new owner latency rollup metrics.

## Validation

- `SMOKE_UPDATE_REPORT_SCHEMA_SNAPSHOT=true pnpm smoke:admin-parity` (snapshot refresh path)
- `pnpm smoke:admin-parity` (strict snapshot-check path)

## Next Week Kickoff

- Add smoke report schema CI guard that fails if snapshot file is missing/untracked in PR diff.
- Add optional owner-specific SLO thresholds (warning/fail) based on owner p95 latency rollups.
