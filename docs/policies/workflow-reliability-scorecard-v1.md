# Workflow Reliability Scorecard v1

## Purpose

- Define orchestration reliability controls for async workflow execution paths.
- Bind timeout/retry/compensation expectations to concrete implementation files.
- Keep async workflow behavior release-gated via scorecard smoke evidence.

## Source of Truth

- Scorecard policy: `docs/policies/workflow-reliability-scorecard-v1.json`
- Runtime policy module: `src/queues/orchestration-policy.ts`
- Smoke gate: `pnpm smoke:workflow-reliability`
- Artifacts:
  - `output/smoke/workflow-reliability-report.json`
  - `output/smoke/workflow-reliability-report.md`

## Covered Reliability Domains

1. Timeout coverage:
   - bounded execution windows for queue consumers.
2. Retry budget enforcement:
   - retryable classification + max-attempt limits.
3. Compensation coverage:
   - explicit terminal handling when retries are exhausted.
4. Enqueue guardrails:
   - dedup/recent-send suppression in workflow dispatch planners.

## Required Enforcement

1. Every workflow entry must map to source files and required snippets.
2. Queue consumer entries must define positive `timeoutMs` and `maxAttempts`.
3. Scorecard review date (`nextReviewBy`) must stay inside `reviewCadenceDays`.
4. Smoke report must pass before merge for async workflow changes.

## Weekly Review

- Owner: `commerce-workflow-platform`
- Cadence: 14 days
- Output:
  - workflow reliability smoke report,
  - per-workflow pass/fail breakdown,
  - compensation gap remediation backlog.
