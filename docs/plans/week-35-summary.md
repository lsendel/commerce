# Week 35 Summary

## Scope

- Add CI guardrails so report-schema snapshot drift cannot silently bypass PR checks.
- Add optional owner-specific p95 latency SLO thresholds (warn/fail) to admin parity smoke reporting.

## Shipped This Week

1. PR schema snapshot guard in CI
- Updated [`/Users/lsendel/Projects/commerce/.github/workflows/admin-api-smoke.yml`](/Users/lsendel/Projects/commerce/.github/workflows/admin-api-smoke.yml) to fail PR runs early when:
  - `docs/snapshots/admin-api-parity-report.schema.snapshot.json` is missing, or
  - the snapshot path is not tracked by git.

2. Owner-specific p95 latency SLO evaluation
- Updated [`/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts) to:
  - parse optional `SMOKE_OWNER_P95_SLO_THRESHOLDS_JSON`,
  - compute owner-level SLO warnings/failures from `ownerLatencyRollups` (`p95`),
  - fail the smoke run when any owner breaches a configured `failP95Ms` threshold,
  - include SLO metrics in JSON/Markdown report outputs and failure alert payloads.
- Added support for `warnP95Ms` / `failP95Ms` aliases (`warnMs` / `failMs`) for backward-compatible config parsing.

3. Schema/runbook updates for new report shape
- Updated schema snapshot:
  - [`/Users/lsendel/Projects/commerce/docs/snapshots/admin-api-parity-report.schema.snapshot.json`](/Users/lsendel/Projects/commerce/docs/snapshots/admin-api-parity-report.schema.snapshot.json)
- Updated runbook:
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md`](/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md)
  - Added PR snapshot guard behavior and owner-p95 SLO env/config documentation.

4. Frontend parity cleanup for orphan admin scripts
- Retired unreferenced browser bundles that duplicated inline admin-page behavior and were not loaded anywhere in runtime pages:
  - [`/Users/lsendel/Projects/commerce/public/scripts/admin-products.js`](/Users/lsendel/Projects/commerce/public/scripts/admin-products.js)
  - [`/Users/lsendel/Projects/commerce/public/scripts/admin-fulfillment.js`](/Users/lsendel/Projects/commerce/public/scripts/admin-fulfillment.js)
- This removes dead code paths and lowers method/response-shape drift risk between frontend behavior and live backend contracts.

## Validation

- `SMOKE_UPDATE_REPORT_SCHEMA_SNAPSHOT=true pnpm smoke:admin-parity`
- `pnpm smoke:admin-parity`
- `pnpm -s tsc --noEmit --pretty false`

## Next Week Kickoff

- Extend CI smoke enforcement to assert snapshot updates when smoke report schema descriptors change in PRs.
- Add owner-level SLO burn-rate style trend lines (current p95 vs trailing baseline) to reduce false-positive one-off spikes.
