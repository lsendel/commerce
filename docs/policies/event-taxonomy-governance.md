# Event Taxonomy Governance

## Objective

Keep analytics/event telemetry contract-stable by enforcing canonical event names, dedupe keys, and replay-safe delivery metadata.

## Scope

- Ingestion endpoint: `/api/analytics/events`
- Taxonomy source: `src/shared/analytics-taxonomy.ts`
- Delivery-key logic: `src/shared/analytics-delivery.ts`

## Required Rules

1. Canonical event naming
- All event names must resolve to a canonical lowercase taxonomy event.
- Allowed format is lowercase tokens joined by `_` or `.`.
- Unknown events must be rejected with `UNKNOWN_EVENT_TYPE`.

2. Dedupe requirement
- Every ingested event must carry a `deliveryKey` (explicit or derived).
- Duplicate deliveries in the dedupe window must return a deduped acknowledgment instead of writing duplicate rows.

3. Delivery metadata requirement
- Ingestion response must include delivery metadata:
  - key
  - attempts/retries
  - taxonomy version
  - taxonomy category

4. Replay compatibility
- Replay tooling must normalize events through the same taxonomy resolver used by ingestion.
- Replay retries must be bounded and auditable.

## Enforcement

- Contract/taxonomy smoke:
  - `pnpm smoke:event-pipeline`
- Replay tooling:
  - `pnpm replay:analytics-events`
- Matrix stage:
  - `pnpm smoke:e2e-matrix` (event-pipeline command stage)

## Artifacts

- `output/smoke/event-pipeline-contract-report.json`
- `output/smoke/event-pipeline-contract-report.md`
- `output/replay/event-replay-report.json`
- `output/replay/event-replay-report.md`

## Change Control

- Any taxonomy or delivery-key rule update must update:
  - this policy file,
  - `src/shared/analytics-taxonomy.ts`,
  - `src/shared/analytics-delivery.ts`,
  - current week summary.
