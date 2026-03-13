# DLQ Auto-Remediation Smoke Report

- Started: 2026-03-06T06:41:17.265Z
- Finished: 2026-03-06T06:41:17.271Z
- Status: passed
- Policy path: docs/policies/dlq-auto-remediation-v1.json
- Queue count: 3
- Simulation cases: 5
- Simulation passing: 5
- Total checks: 61
- Failed checks: 0

## Queue Metrics

| Queue | Cases | Auto | Manual | Auto Rate | Manual Rate |
| --- | --- | --- | --- | --- | --- |
| ai-generation | 1 | 0 | 1 | 0% | 100% |
| order-fulfillment | 2 | 1 | 0 | 50% | 0% |
| notifications | 2 | 1 | 1 | 50% | 50% |

## Simulation Results

| Case | Queue | Expected Action | Actual Action | Expected Auto | Actual Auto | Status |
| --- | --- | --- | --- | --- | --- | --- |
| of-retryable-first | order-fulfillment | requeue_original_once | requeue_original_once | true | true | pass |
| of-non-retryable | order-fulfillment | mark_failed_and_drop | mark_failed_and_drop | false | false | pass |
| notif-sms-fallback | notifications | reroute_notification_email_once | reroute_notification_email_once | true | true | pass |
| notif-email-manual | notifications | manual_review | manual_review | false | false | pass |
| ai-manual | ai-generation | manual_review | manual_review | false | false | pass |

## Checks

| Check | Status | Note |
| --- | --- | --- |
| policy-owner-present | pass | Policy owner must be defined. |
| queues-present | pass | Policy must define at least one queue policy. |
| simulation-cases-present | pass | Policy must define simulation cases. |
| required-queue-coverage | pass | Policy must cover required queues: ai-generation, order-fulfillment, notifications |
| required-event-types-covered | pass | Required DLQ event types must exist in analytics taxonomy. |
| review-cadence-valid | pass | reviewCadenceDays must be a positive number. |
| review-dates-format | pass | lastReviewedOn and nextReviewBy must use YYYY-MM-DD format. |
| review-next-after-last | pass | nextReviewBy must be on or after lastReviewedOn. |
| review-window-valid | pass | nextReviewBy must stay within reviewCadenceDays window. |
| review-not-overdue | pass | DLQ policy review date must not be overdue. |
| queue-ai-generation-allowed-actions-present | pass | Queue policy must declare allowedActions. |
| queue-ai-generation-source-paths-present | pass | Queue policy must declare sourcePaths. |
| queue-ai-generation-required-snippets-present | pass | Queue policy must declare requiredSnippets. |
| queue-ai-generation-max-auto-requeues-valid | pass | Queue maxAutoRequeues must be non-negative. |
| queue-ai-generation-metric-targets-valid | pass | Queue metricTargets must be numeric. |
| queue-ai-generation-source-1 | pass | Source path must exist: src/queues/dlq-remediation.ts |
| queue-ai-generation-source-2 | pass | Source path must exist: src/queues/handler.ts |
| queue-ai-generation-source-3 | pass | Source path must exist: src/queues/ai-generation.consumer.ts |
| queue-ai-generation-snippet-1 | pass | Required snippet must be present for queue ai-generation: queue: "ai-generation" |
| queue-ai-generation-snippet-2 | pass | Required snippet must be present for queue ai-generation: action: "manual_review" |
| queue-ai-generation-snippet-3 | pass | Required snippet must be present for queue ai-generation: processDeadLetterCandidate({ |
| queue-order-fulfillment-allowed-actions-present | pass | Queue policy must declare allowedActions. |
| queue-order-fulfillment-source-paths-present | pass | Queue policy must declare sourcePaths. |
| queue-order-fulfillment-required-snippets-present | pass | Queue policy must declare requiredSnippets. |
| queue-order-fulfillment-max-auto-requeues-valid | pass | Queue maxAutoRequeues must be non-negative. |
| queue-order-fulfillment-metric-targets-valid | pass | Queue metricTargets must be numeric. |
| queue-order-fulfillment-source-1 | pass | Source path must exist: src/queues/dlq-remediation.ts |
| queue-order-fulfillment-source-2 | pass | Source path must exist: src/queues/handler.ts |
| queue-order-fulfillment-source-3 | pass | Source path must exist: src/queues/order-fulfillment.consumer.ts |
| queue-order-fulfillment-snippet-1 | pass | Required snippet must be present for queue order-fulfillment: action: "requeue_original_once" |
| queue-order-fulfillment-snippet-2 | pass | Required snippet must be present for queue order-fulfillment: queue_dlq_auto_remediation_executed |
| queue-order-fulfillment-snippet-3 | pass | Required snippet must be present for queue order-fulfillment: compensateOrderFulfillmentFailure |
| queue-notifications-allowed-actions-present | pass | Queue policy must declare allowedActions. |
| queue-notifications-source-paths-present | pass | Queue policy must declare sourcePaths. |
| queue-notifications-required-snippets-present | pass | Queue policy must declare requiredSnippets. |
| queue-notifications-max-auto-requeues-valid | pass | Queue maxAutoRequeues must be non-negative. |
| queue-notifications-metric-targets-valid | pass | Queue metricTargets must be numeric. |
| queue-notifications-source-1 | pass | Source path must exist: src/queues/dlq-remediation.ts |
| queue-notifications-source-2 | pass | Source path must exist: src/queues/handler.ts |
| queue-notifications-source-3 | pass | Source path must exist: src/queues/notification.consumer.ts |
| queue-notifications-snippet-1 | pass | Required snippet must be present for queue notifications: action: "reroute_notification_email_once" |
| queue-notifications-snippet-2 | pass | Required snippet must be present for queue notifications: channel: "email" |
| queue-notifications-snippet-3 | pass | Required snippet must be present for queue notifications: compensateNotificationFailure |
| simulation-of-retryable-first-action | pass | Expected action requeue_original_once, got requeue_original_once |
| simulation-of-retryable-first-auto-remediate | pass | Expected autoRemediate=true, got true |
| simulation-of-non-retryable-action | pass | Expected action mark_failed_and_drop, got mark_failed_and_drop |
| simulation-of-non-retryable-auto-remediate | pass | Expected autoRemediate=false, got false |
| simulation-notif-sms-fallback-action | pass | Expected action reroute_notification_email_once, got reroute_notification_email_once |
| simulation-notif-sms-fallback-auto-remediate | pass | Expected autoRemediate=true, got true |
| simulation-notif-email-manual-action | pass | Expected action manual_review, got manual_review |
| simulation-notif-email-manual-auto-remediate | pass | Expected autoRemediate=false, got false |
| simulation-ai-manual-action | pass | Expected action manual_review, got manual_review |
| simulation-ai-manual-auto-remediate | pass | Expected autoRemediate=false, got false |
| metrics-ai-generation-auto-rate-min | pass | Auto-remediation rate 0% must be >= 0% |
| metrics-ai-generation-manual-rate-max | pass | Manual-review rate 100% must be <= 100% |
| metrics-order-fulfillment-auto-rate-min | pass | Auto-remediation rate 50% must be >= 50% |
| metrics-order-fulfillment-manual-rate-max | pass | Manual-review rate 0% must be <= 50% |
| metrics-notifications-auto-rate-min | pass | Auto-remediation rate 50% must be >= 50% |
| metrics-notifications-manual-rate-max | pass | Manual-review rate 50% must be <= 50% |
| runbook-exists | pass | Runbook must exist: docs/runbooks/dlq-auto-remediation-playbook.md |
| policy-md-exists | pass | Policy markdown must exist: docs/policies/dlq-auto-remediation-v1.md |

