# DLQ Auto-Remediation Policy v1

## Purpose

- Define deterministic dead-letter handling behavior for queue workflows.
- Enforce bounded auto-remediation actions before manual escalation.
- Keep DLQ metrics and runbooks release-gated.

## Source of Truth

- Policy: `docs/policies/dlq-auto-remediation-v1.json`
- Runtime implementation: `src/queues/dlq-remediation.ts`
- Gate: `pnpm smoke:dlq-remediation`
- Artifacts:
  - `output/smoke/dlq-remediation-report.json`
  - `output/smoke/dlq-remediation-report.md`

## Queue Domains

1. `ai-generation`:
   - manual-review default after bounded retries.
2. `order-fulfillment`:
   - one-shot requeue for retryable dead-letter candidates,
   - then fail-and-drop with manual-review requirement.
3. `notifications`:
   - one-shot channel fallback (`sms/whatsapp` to `email`) for retryable checkout recovery messages,
   - otherwise manual review.

## Required Enforcement

1. Queue policies must include:
   - `maxAutoRequeues`, `allowedActions`, `sourcePaths`, `requiredSnippets`, and metric targets.
2. Required DLQ metrics events must remain in analytics taxonomy.
3. Simulation cases must pass expected action and auto-remediation outcomes.
4. Policy review window (`nextReviewBy`) must stay inside `reviewCadenceDays`.

## Weekly Review

- Owner: `commerce-workflow-platform`
- Cadence: 14 days
- Output:
  - queue-level auto-remediation rate metrics,
  - manual-review queue of unresolved dead-letter cases,
  - remediation rule tuning backlog.
