# Workflow Reliability Smoke Report

- Started: 2026-03-06T06:41:16.526Z
- Finished: 2026-03-06T06:41:16.530Z
- Status: passed
- Policy path: docs/policies/workflow-reliability-scorecard-v1.json
- Reliability score: 100%
- Dimensions covered: 4
- Workflow count: 5
- Workflows passing: 5
- Total checks: 100
- Failed checks: 0

## Workflow Status

| Workflow | Status | Checks | Failed |
| --- | --- | --- | --- |
| ai-generation-consumer | pass | 18 | 0 |
| order-fulfillment-consumer | pass | 18 | 0 |
| notifications-consumer | pass | 18 | 0 |
| queue-handler-fallback | pass | 14 | 0 |
| workflow-builder-dispatch | pass | 13 | 0 |

## Checks

| Check | Status | Note |
| --- | --- | --- |
| policy-owner-present | pass | Policy owner must be defined. |
| workflows-present | pass | Policy must define at least one workflow scorecard entry. |
| dimensions-present | pass | Policy must define scorecard dimensions. |
| workflow-id-coverage | pass | Policy workflows must include required IDs: ai-generation-consumer, order-fulfillment-consumer, notifications-consumer, queue-handler-fallback, workflow-builder-dispatch |
| dimension-id-coverage | pass | Policy dimensions must include required IDs: timeout-coverage, retry-budget-enforcement, compensation-path-coverage, enqueue-dedup-guardrails |
| review-cadence-valid | pass | reviewCadenceDays must be a positive number. |
| review-dates-format | pass | lastReviewedOn and nextReviewBy must use YYYY-MM-DD format. |
| review-next-after-last | pass | nextReviewBy must be on or after lastReviewedOn. |
| review-window-valid | pass | nextReviewBy must stay within reviewCadenceDays window. |
| review-not-overdue | pass | Workflow reliability policy review date must not be overdue. |
| wf-ai-generation-consumer-label-present | pass | Workflow label must be non-empty. |
| wf-ai-generation-consumer-source-paths-present | pass | Workflow sourcePaths must include at least one path. |
| wf-ai-generation-consumer-required-snippets-present | pass | Workflow requiredSnippets must include at least one snippet. |
| wf-ai-generation-consumer-retry-signals-present | pass | Workflow retrySignals must include at least one signal. |
| wf-ai-generation-consumer-compensation-present | pass | Workflow compensationPlan must be non-empty. |
| wf-ai-generation-consumer-timeout-valid | pass | Queue consumer timeoutMs must be positive: 120000 |
| wf-ai-generation-consumer-max-attempts-valid | pass | Queue consumer maxAttempts must be positive: 2 |
| wf-ai-generation-consumer-runtime-timeout-aligned | pass | Policy timeoutMs must align with runtime queue policy for ai-generation. |
| wf-ai-generation-consumer-runtime-attempts-aligned | pass | Policy maxAttempts must align with runtime queue policy for ai-generation. |
| wf-ai-generation-consumer-slo-success-rate-valid | pass | sloTargets.successRatePercent must be in range (0, 100]. |
| wf-ai-generation-consumer-slo-error-budget-valid | pass | sloTargets.errorBudgetPercent must be in range [0, 100]. |
| wf-ai-generation-consumer-source-1 | pass | Source path must exist: src/queues/ai-generation.consumer.ts |
| wf-ai-generation-consumer-source-2 | pass | Source path must exist: src/queues/orchestration-policy.ts |
| wf-ai-generation-consumer-snippet-1 | pass | Required snippet must be present for ai-generation-consumer: QUEUE_WORKFLOW_POLICIES["ai-generation"] |
| wf-ai-generation-consumer-snippet-2 | pass | Required snippet must be present for ai-generation-consumer: for (let attempt = 1; attempt <= workflowSettings.maxAttempts; attempt++) |
| wf-ai-generation-consumer-snippet-3 | pass | Required snippet must be present for ai-generation-consumer: withWorkflowTimeout( |
| wf-ai-generation-consumer-snippet-4 | pass | Required snippet must be present for ai-generation-consumer: isRetryableWorkflowError(error) |
| wf-ai-generation-consumer-snippet-5 | pass | Required snippet must be present for ai-generation-consumer: message.ack(); |
| wf-order-fulfillment-consumer-label-present | pass | Workflow label must be non-empty. |
| wf-order-fulfillment-consumer-source-paths-present | pass | Workflow sourcePaths must include at least one path. |
| wf-order-fulfillment-consumer-required-snippets-present | pass | Workflow requiredSnippets must include at least one snippet. |
| wf-order-fulfillment-consumer-retry-signals-present | pass | Workflow retrySignals must include at least one signal. |
| wf-order-fulfillment-consumer-compensation-present | pass | Workflow compensationPlan must be non-empty. |
| wf-order-fulfillment-consumer-timeout-valid | pass | Queue consumer timeoutMs must be positive: 45000 |
| wf-order-fulfillment-consumer-max-attempts-valid | pass | Queue consumer maxAttempts must be positive: 4 |
| wf-order-fulfillment-consumer-runtime-timeout-aligned | pass | Policy timeoutMs must align with runtime queue policy for order-fulfillment. |
| wf-order-fulfillment-consumer-runtime-attempts-aligned | pass | Policy maxAttempts must align with runtime queue policy for order-fulfillment. |
| wf-order-fulfillment-consumer-slo-success-rate-valid | pass | sloTargets.successRatePercent must be in range (0, 100]. |
| wf-order-fulfillment-consumer-slo-error-budget-valid | pass | sloTargets.errorBudgetPercent must be in range [0, 100]. |
| wf-order-fulfillment-consumer-source-1 | pass | Source path must exist: src/queues/order-fulfillment.consumer.ts |
| wf-order-fulfillment-consumer-source-2 | pass | Source path must exist: src/queues/orchestration-policy.ts |
| wf-order-fulfillment-consumer-snippet-1 | pass | Required snippet must be present for order-fulfillment-consumer: QUEUE_WORKFLOW_POLICIES["order-fulfillment"] |
| wf-order-fulfillment-consumer-snippet-2 | pass | Required snippet must be present for order-fulfillment-consumer: withWorkflowTimeout( |
| wf-order-fulfillment-consumer-snippet-3 | pass | Required snippet must be present for order-fulfillment-consumer: if (attempt >= workflowSettings.maxAttempts) |
| wf-order-fulfillment-consumer-snippet-4 | pass | Required snippet must be present for order-fulfillment-consumer: compensateOrderFulfillmentFailure |
| wf-order-fulfillment-consumer-snippet-5 | pass | Required snippet must be present for order-fulfillment-consumer: message.retry(); |
| wf-notifications-consumer-label-present | pass | Workflow label must be non-empty. |
| wf-notifications-consumer-source-paths-present | pass | Workflow sourcePaths must include at least one path. |
| wf-notifications-consumer-required-snippets-present | pass | Workflow requiredSnippets must include at least one snippet. |
| wf-notifications-consumer-retry-signals-present | pass | Workflow retrySignals must include at least one signal. |
| wf-notifications-consumer-compensation-present | pass | Workflow compensationPlan must be non-empty. |
| wf-notifications-consumer-timeout-valid | pass | Queue consumer timeoutMs must be positive: 20000 |
| wf-notifications-consumer-max-attempts-valid | pass | Queue consumer maxAttempts must be positive: 3 |
| wf-notifications-consumer-runtime-timeout-aligned | pass | Policy timeoutMs must align with runtime queue policy for notifications. |
| wf-notifications-consumer-runtime-attempts-aligned | pass | Policy maxAttempts must align with runtime queue policy for notifications. |
| wf-notifications-consumer-slo-success-rate-valid | pass | sloTargets.successRatePercent must be in range (0, 100]. |
| wf-notifications-consumer-slo-error-budget-valid | pass | sloTargets.errorBudgetPercent must be in range [0, 100]. |
| wf-notifications-consumer-source-1 | pass | Source path must exist: src/queues/notification.consumer.ts |
| wf-notifications-consumer-source-2 | pass | Source path must exist: src/queues/orchestration-policy.ts |
| wf-notifications-consumer-snippet-1 | pass | Required snippet must be present for notifications-consumer: QUEUE_WORKFLOW_POLICIES.notifications |
| wf-notifications-consumer-snippet-2 | pass | Required snippet must be present for notifications-consumer: withWorkflowTimeout( |
| wf-notifications-consumer-snippet-3 | pass | Required snippet must be present for notifications-consumer: compensateNotificationFailure |
| wf-notifications-consumer-snippet-4 | pass | Required snippet must be present for notifications-consumer: eventType: "checkout_recovery_delivery_failed" |
| wf-notifications-consumer-snippet-5 | pass | Required snippet must be present for notifications-consumer: message.ack(); |
| wf-queue-handler-fallback-label-present | pass | Workflow label must be non-empty. |
| wf-queue-handler-fallback-source-paths-present | pass | Workflow sourcePaths must include at least one path. |
| wf-queue-handler-fallback-required-snippets-present | pass | Workflow requiredSnippets must include at least one snippet. |
| wf-queue-handler-fallback-retry-signals-present | pass | Workflow retrySignals must include at least one signal. |
| wf-queue-handler-fallback-compensation-present | pass | Workflow compensationPlan must be non-empty. |
| wf-queue-handler-fallback-slo-success-rate-valid | pass | sloTargets.successRatePercent must be in range (0, 100]. |
| wf-queue-handler-fallback-slo-error-budget-valid | pass | sloTargets.errorBudgetPercent must be in range [0, 100]. |
| wf-queue-handler-fallback-source-1 | pass | Source path must exist: src/queues/handler.ts |
| wf-queue-handler-fallback-source-2 | pass | Source path must exist: src/queues/orchestration-policy.ts |
| wf-queue-handler-fallback-snippet-1 | pass | Required snippet must be present for queue-handler-fallback: QUEUE_WORKFLOW_POLICIES |
| wf-queue-handler-fallback-snippet-2 | pass | Required snippet must be present for queue-handler-fallback: isRetryableWorkflowError(error) |
| wf-queue-handler-fallback-snippet-3 | pass | Required snippet must be present for queue-handler-fallback: if (retryable && attempt < policy.maxAttempts) |
| wf-queue-handler-fallback-snippet-4 | pass | Required snippet must be present for queue-handler-fallback: compensateNotificationFailure |
| wf-queue-handler-fallback-snippet-5 | pass | Required snippet must be present for queue-handler-fallback: compensateOrderFulfillmentFailure |
| wf-workflow-builder-dispatch-label-present | pass | Workflow label must be non-empty. |
| wf-workflow-builder-dispatch-source-paths-present | pass | Workflow sourcePaths must include at least one path. |
| wf-workflow-builder-dispatch-required-snippets-present | pass | Workflow requiredSnippets must include at least one snippet. |
| wf-workflow-builder-dispatch-retry-signals-present | pass | Workflow retrySignals must include at least one signal. |
| wf-workflow-builder-dispatch-compensation-present | pass | Workflow compensationPlan must be non-empty. |
| wf-workflow-builder-dispatch-slo-success-rate-valid | pass | sloTargets.successRatePercent must be in range (0, 100]. |
| wf-workflow-builder-dispatch-slo-error-budget-valid | pass | sloTargets.errorBudgetPercent must be in range [0, 100]. |
| wf-workflow-builder-dispatch-source-1 | pass | Source path must exist: src/routes/api/workflows.routes.ts |
| wf-workflow-builder-dispatch-source-2 | pass | Source path must exist: src/application/ops/no-code-workflow-builder.usecase.ts |
| wf-workflow-builder-dispatch-snippet-1 | pass | Required snippet must be present for workflow-builder-dispatch: c.env.NOTIFICATION_QUEUE.send({ |
| wf-workflow-builder-dispatch-snippet-2 | pass | Required snippet must be present for workflow-builder-dispatch: eventType: "checkout_recovery_enqueued" |
| wf-workflow-builder-dispatch-snippet-3 | pass | Required snippet must be present for workflow-builder-dispatch: skippedRecentlyEnqueued |
| wf-workflow-builder-dispatch-snippet-4 | pass | Required snippet must be present for workflow-builder-dispatch: skippedMissingChannelAddress |
| helper-attempt-default | pass | resolveQueueMessageAttempt defaults to 1. |
| helper-attempt-explicit | pass | resolveQueueMessageAttempt honors attempts metadata. |
| helper-retryable-timeout | pass | Timeout errors are retryable. |
| helper-retryable-5xx | pass | 503 errors are retryable. |
| helper-non-retryable-4xx | pass | 422 errors are non-retryable. |
| helper-backoff-positive | pass | Retry backoff must be positive. |
| helper-backoff-growth | pass | Retry backoff should generally increase with attempt number. |
| runbook-exists | pass | Runbook must exist: docs/runbooks/async-workflow-orchestration.md |
| policy-md-exists | pass | Policy markdown must exist: docs/policies/workflow-reliability-scorecard-v1.md |

