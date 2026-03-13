# Week 46 Summary

## Scope

- Event pipeline reliability:
  - taxonomy enforcement on analytics ingestion,
  - dedupe and delivery-retry guarantees,
  - event contract report,
  - replay tooling for deterministic reprocessing.

## Shipped This Week

1. Implemented taxonomy enforcement + delivery metadata on `/api/analytics/events`
- Updated [`/Users/lsendel/Projects/commerce/src/shared/analytics-taxonomy.ts`](/Users/lsendel/Projects/commerce/src/shared/analytics-taxonomy.ts):
  - introduced canonical Week 46 taxonomy (`week-46-v1`),
  - added category classification and strict resolver,
  - added known-event and format validation helpers.
- Added delivery-key utilities in [`/Users/lsendel/Projects/commerce/src/shared/analytics-delivery.ts`](/Users/lsendel/Projects/commerce/src/shared/analytics-delivery.ts).
- Updated [`/Users/lsendel/Projects/commerce/src/routes/api/analytics.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/analytics.routes.ts):
  - enforces taxonomy on incoming `eventType`/`eventName`,
  - rejects unknown event types (`UNKNOWN_EVENT_TYPE`),
  - computes/attaches `deliveryKey`,
  - suppresses duplicates via recent-window lookup,
  - retries event writes with bounded backoff,
  - returns delivery metadata (`key`, `attempts`, `retries`, taxonomy version/category).

2. Added dedupe lookup support in analytics repository
- Updated [`/Users/lsendel/Projects/commerce/src/infrastructure/repositories/analytics.repository.ts`](/Users/lsendel/Projects/commerce/src/infrastructure/repositories/analytics.repository.ts):
  - added `findRecentEventByDeliveryKey` for dedupe checks.

3. Updated analytics API contract for Week 46 response/body shape
- Updated [`/Users/lsendel/Projects/commerce/src/contracts/analytics.contract.ts`](/Users/lsendel/Projects/commerce/src/contracts/analytics.contract.ts):
  - `trackEvent` now supports `eventName`, `payload`, `dedupeKey`, `eventId`, `source`, `occurredAt`,
  - includes both `200` (deduped ack) and `201` (new write) response contracts with delivery metadata.

4. Added event contract report command (Week 46 deliverable)
- Added [`/Users/lsendel/Projects/commerce/scripts/smoke-event-pipeline.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-event-pipeline.ts):
  - validates analytics contract reliability checks,
  - scans literal event emitters and verifies taxonomy coverage,
  - writes report artifacts:
    - `output/smoke/event-pipeline-contract-report.json`
    - `output/smoke/event-pipeline-contract-report.md`.

5. Added replay tooling (Week 46 deliverable)
- Added [`/Users/lsendel/Projects/commerce/scripts/replay-analytics-events.ts`](/Users/lsendel/Projects/commerce/scripts/replay-analytics-events.ts):
  - dry-run safe by default,
  - normalizes events through taxonomy resolver,
  - computes dedupe-safe delivery keys,
  - supports bounded retries for live replay mode,
  - writes replay artifacts:
    - `output/replay/event-replay-report.json`
    - `output/replay/event-replay-report.md`
    - `output/replay/event-replay-input.sample.json` (auto-generated when missing).

6. Pipeline/runbook integration
- Updated [`/Users/lsendel/Projects/commerce/package.json`](/Users/lsendel/Projects/commerce/package.json):
  - added `smoke:event-pipeline`,
  - added `replay:analytics-events`.
- Updated [`/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts):
  - added `pnpm smoke:event-pipeline` command stage,
  - added `SMOKE_MATRIX_SKIP_EVENT_PIPELINE` skip control.
- Updated matrix runbook:
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md`](/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md)
- Added Week 46 policy/runbook:
  - [`/Users/lsendel/Projects/commerce/docs/policies/event-taxonomy-governance.md`](/Users/lsendel/Projects/commerce/docs/policies/event-taxonomy-governance.md)
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/event-pipeline-reliability.md`](/Users/lsendel/Projects/commerce/docs/runbooks/event-pipeline-reliability.md)

## Validation

- `pnpm -s tsc --noEmit --pretty false`
- `pnpm smoke:event-pipeline`
- `pnpm replay:analytics-events`
- `pnpm smoke:admin-parity`
- `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`
- `pnpm smoke:production`

## Week 46 Artifact Snapshot

- Event contract report:
  - status: `passed`
  - known taxonomy events: `51`
  - discovered literal events: `46`
  - unknown events: `0`
- Replay report:
  - status: `passed` (dry-run)
  - total input events: `3`
  - replayed: `0`, deduped: `0`, dry-run simulated: `3`, failed: `0`
- Matrix status:
  - includes `pnpm smoke:event-pipeline` stage and passes.
- Production smoke:
  - `ALL PASS: 81/81` on `https://petm8.io`.

## Next Week Kickoff

- Week 47: segmentation refresh and identity resolution hardening.
