# Fulfillment SLA Prediction Runbook

## Scope

- Feature flag: `ai_fulfillment_exception_handler`
- SLA prediction use case:
  - `src/application/fulfillment/fulfillment-sla-prediction.usecase.ts`
- Surfaces:
  - `/admin/fulfillment` (SLA risk panel)
  - `GET /api/admin/ops/fulfillment-sla`
  - `POST /api/admin/ops/fulfillment-sla/interventions`
- Validation gate:
  - `pnpm smoke:fulfillment-sla`

## What It Predicts

1. Fulfillment request risk
- open statuses (`pending`, `submitted`, `processing`, `cancel_requested`, `failed`),
- age vs SLA target window by status,
- missing external provider references,
- failure signature (transient vs non-transient).

2. Return request risk
- open statuses (`submitted`, `approved`),
- age vs return-processing SLA target,
- instant exchange urgency weighting.

3. Output model
- risk score + level (`low`, `medium`, `high`),
- recommended action queue:
  - `retry`
  - `expedite_provider`
  - `manual_review`
  - `prioritize_return_review`
  - `prioritize_return_completion`
  - `monitor`.

## Proactive Intervention Triggers

1. Endpoint
- `POST /api/admin/ops/fulfillment-sla/interventions`

2. Trigger policy
- executes only auto-safe `retry` actions on fulfillment requests,
- candidates are filtered by `minRiskLevel`,
- supports dry-run mode (`dryRun: true`) for planning-only output.

3. Execution effect
- resets selected fulfillment requests to `pending`,
- clears stale provider/error fields,
- requeues `fulfillment.submit` messages.

## Operator Flow

1. Open `/admin/fulfillment`.
2. Click **Refresh SLA Risk** to inspect high-risk items and action queue.
3. Click **Run Interventions** for safe auto-retries.
4. Recheck request list and provider health cards after intervention run.

## Smoke Gate

1. Run:
- `pnpm smoke:fulfillment-sla`

2. Artifacts:
- `output/smoke/fulfillment-sla-report.json`
- `output/smoke/fulfillment-sla-report.md`

3. Pass criteria:
- all prediction/action-rule checks pass,
- high-risk stale/failed fixtures map to expected intervention recommendations.
