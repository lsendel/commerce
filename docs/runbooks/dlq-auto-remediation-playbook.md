# DLQ Auto-Remediation Playbook

## Scope

- Policy: `docs/policies/dlq-auto-remediation-v1.json`
- Runtime module: `src/queues/dlq-remediation.ts`
- Queue handler integration: `src/queues/handler.ts`
- Gate: `pnpm smoke:dlq-remediation`

## Objective

- Handle dead-letter candidates with queue-specific auto-remediation actions.
- Keep remediation bounded (`maxAutoRequeues`) and observable via metrics events.
- Escalate non-remediable failures into manual review with clear action trails.

## Operating Procedure

1. Run `pnpm smoke:dlq-remediation`.
2. Confirm artifacts:
   - `output/smoke/dlq-remediation-report.json`
   - `output/smoke/dlq-remediation-report.md`
3. If policy checks fail:
   - fix queue coverage, allowed actions, metric targets, or review window fields.
4. If snippet checks fail:
   - restore DLQ decision logic, queue-handler invocation, or compensation hooks.
5. If simulation checks fail:
   - align `resolveDeadLetterDecision(...)` outcomes with policy expectations.
6. Re-run:
   - `pnpm smoke:dlq-remediation`
   - `pnpm smoke:compliance-controls`
   - `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`

## Incident Triggers

- Dead-letter candidates not emitting DLQ metric events.
- Auto-remediation decisions not matching queue policy rules.
- Missing manual-review escalation when auto-remediation is not eligible.
- Requeue/fallback actions exceeding configured `maxAutoRequeues`.

## Recovery Prioritization

1. `p0`: order-fulfillment dead-letter accumulation.
2. `p1`: checkout recovery notification DLQ spikes.
3. `p2`: ai-generation dead-letter backlog requiring manual review.
