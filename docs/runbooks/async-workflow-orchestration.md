# Async Workflow Orchestration Runbook

## Scope

- Policy: `docs/policies/workflow-reliability-scorecard-v1.json`
- Runtime policy: `src/queues/orchestration-policy.ts`
- Queue handler: `src/queues/handler.ts`
- Consumers:
  - `src/queues/ai-generation.consumer.ts`
  - `src/queues/order-fulfillment.consumer.ts`
  - `src/queues/notification.consumer.ts`
- Workflow dispatch API:
  - `POST /api/admin/workflows/:id/run`
- Gate: `pnpm smoke:workflow-reliability`

## Objective

- Keep queue workflows bounded by timeout and retry budgets.
- Guarantee terminal compensation behavior on retry exhaustion.
- Preserve deduplicated async dispatch behavior for workflow-run triggered notifications.

## Operating Procedure

1. Run `pnpm smoke:workflow-reliability`.
2. Confirm artifacts:
   - `output/smoke/workflow-reliability-report.json`
   - `output/smoke/workflow-reliability-report.md`
3. If timeout coverage fails:
   - restore `withWorkflowTimeout(...)` on affected queue consumers.
4. If retry budget checks fail:
   - restore `maxAttempts` policy references and attempt-based retry guards.
5. If compensation checks fail:
   - restore queue-specific compensation hooks for terminal failures.
6. If dispatch guard checks fail:
   - restore dedup suppression checks (`skipRecovered`, `skipRecentlyEnqueued`, missing-channel guards).
7. Re-run:
   - `pnpm smoke:workflow-reliability`
   - `pnpm smoke:compliance-controls`
   - `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`

## Incident Triggers

- Queue message retries exceed expected budget without terminal state.
- Queue consumer timeout guard removed or bypassed.
- Notification workflow terminal failures missing compensation evidence.
- Workflow run enqueue path missing dedup guard checks.

## Recovery Prioritization

1. `p0`: order-fulfillment queue retry loops or terminal drop without failed-state write.
2. `p1`: notification queue failures without compensation event trail.
3. `p2`: ai-generation queue retry-budget drift or degraded timeout behavior.
