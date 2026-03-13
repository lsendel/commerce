# Event Pipeline Reliability Runbook

## Scope

- Contract report command: `pnpm smoke:event-pipeline`
- Replay command: `pnpm replay:analytics-events`
- Ingestion route: `/api/analytics/events`
- Purpose:
  - enforce taxonomy contract consistency,
  - prevent duplicate event delivery,
  - provide replay tooling for backfill/retry scenarios.

## Reliability Controls

1. Taxonomy enforcement
- Route validates incoming event names against canonical taxonomy.
- Alias inputs normalize to canonical event names.

2. Dedupe enforcement
- Route computes/uses `deliveryKey`.
- Recent duplicates return `200` with `deduped: true`.

3. Delivery retry
- Ingestion write retries with bounded backoff before failing.
- Response includes attempts/retries for auditability.

## Contract Report

1. Run:
- `pnpm smoke:event-pipeline`
2. Review artifacts:
- `output/smoke/event-pipeline-contract-report.json`
- `output/smoke/event-pipeline-contract-report.md`
3. Pass criteria:
- all checks pass,
- unknown discovered event count is `0`.

## Replay Tooling

1. Dry-run (default):
- `pnpm replay:analytics-events`
2. Live replay:
- `REPLAY_DRY_RUN=false REPLAY_BASE_URL=https://<host> pnpm replay:analytics-events`
3. Optional input override:
- `REPLAY_EVENTS_INPUT_PATH=<path> pnpm replay:analytics-events`
4. Report artifacts:
- `output/replay/event-replay-report.json`
- `output/replay/event-replay-report.md`

## Failure Handling

1. Contract report fails:
- add missing event names to taxonomy or remove stale emitters,
- re-run `pnpm smoke:event-pipeline`.

2. Replay failures:
- inspect failed rows in replay report,
- fix endpoint/contract mismatch or auth/base URL,
- re-run replay with the same input; dedupe key prevents double-write.
