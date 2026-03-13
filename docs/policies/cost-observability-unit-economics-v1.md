# Cost Observability and Unit Economics Policy v1

## Purpose

- Establish a machine-verifiable cost observability baseline for commerce operations.
- Enforce reporting across:
  - `feature` dimension,
  - `team` dimension,
  - `tenant` dimension.
- Keep optimization work continuously queued through an explicit FinOps backlog.

## Source of Truth

- Policy file: `docs/policies/cost-observability-unit-economics-v1.json`
- Smoke gate: `pnpm smoke:cost-observability`
- Artifacts:
  - `output/smoke/cost-observability-report.json`
  - `output/smoke/cost-observability-report.md`

## Required Controls

1. Required dimensions must include `feature`, `team`, and `tenant`.
2. Feature models must define:
   - owner team,
   - target revenue-to-cost ratio,
   - target cost per order,
   - source event types.
3. Dashboard telemetry must include:
   - estimated cost,
   - attributed revenue,
   - cost per order,
   - revenue-to-cost ratio,
   - orders and events.
4. Optimization backlog must include:
   - owner team,
   - monthly savings estimate,
   - status and priority,
   - target execution date.

## Review Cadence

- Control owner: `commerce-finops`
- Cadence: weekly
- `nextReviewBy` in JSON must remain inside `reviewCadenceDays` from `lastReviewedOn`.
- Overdue policy windows fail the smoke gate.

## Enforcement Surface

- API endpoint: `GET /api/analytics/cost-observability` (admin-only)
- Admin dashboard section: `Cost Observability & Unit Economics`
- Export surface: `/admin/analytics/export.csv`

## Update Rules

1. Update policy JSON first for dimension/model/backlog changes.
2. Keep API contract, backend use case, and admin UI aligned with policy dimensions.
3. Run `pnpm smoke:cost-observability` and `pnpm smoke:compliance-controls` before merge.
