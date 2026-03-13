# Secrets Rotation Hygiene Smoke Report

- Started: 2026-03-06T06:41:14.295Z
- Finished: 2026-03-06T06:41:14.312Z
- Status: passed
- Inventory path: docs/policies/secrets-key-inventory-v1.json
- Runtime coverage: 16/16
- CI coverage: 25/25
- .env.example runtime secret coverage: 100.00%

## Checks

| Check | Status | Note |
| --- | --- | --- |
| inventory-rules-present | pass | Secrets key inventory must define at least one rule. |
| rule-runtime-auth-core:id-present | pass | Rule id must be non-empty. |
| rule-runtime-auth-core:id-unique | pass | Rule id must be unique. |
| rule-runtime-auth-core:runbook-exists | pass | Runbook path must exist: docs/runbooks/secrets-rotation-hygiene.md |
| rule-runtime-auth-core:rotation-cadence-valid | pass | Rotation cadence must be a positive number of days. |
| rule-runtime-auth-core:rotation-dates-format | pass | Rotation dates must use YYYY-MM-DD format. |
| rule-runtime-auth-core:rotation-order | pass | nextRotationBy must be on or after lastRotatedOn. |
| rule-runtime-auth-core:rotation-window | pass | nextRotationBy must be within cadenceDays window of lastRotatedOn. |
| rule-runtime-auth-core:rotation-not-overdue | pass | Secret rotation window must not be overdue for rule runtime-auth-core. |
| rule-runtime-audit-log-secret:id-present | pass | Rule id must be non-empty. |
| rule-runtime-audit-log-secret:id-unique | pass | Rule id must be unique. |
| rule-runtime-audit-log-secret:runbook-exists | pass | Runbook path must exist: docs/runbooks/secrets-rotation-hygiene.md |
| rule-runtime-audit-log-secret:rotation-cadence-valid | pass | Rotation cadence must be a positive number of days. |
| rule-runtime-audit-log-secret:rotation-dates-format | pass | Rotation dates must use YYYY-MM-DD format. |
| rule-runtime-audit-log-secret:rotation-order | pass | nextRotationBy must be on or after lastRotatedOn. |
| rule-runtime-audit-log-secret:rotation-window | pass | nextRotationBy must be within cadenceDays window of lastRotatedOn. |
| rule-runtime-audit-log-secret:rotation-not-overdue | pass | Secret rotation window must not be overdue for rule runtime-audit-log-secret. |
| rule-runtime-oauth-client-secrets:id-present | pass | Rule id must be non-empty. |
| rule-runtime-oauth-client-secrets:id-unique | pass | Rule id must be unique. |
| rule-runtime-oauth-client-secrets:runbook-exists | pass | Runbook path must exist: docs/runbooks/secrets-rotation-hygiene.md |
| rule-runtime-oauth-client-secrets:rotation-cadence-valid | pass | Rotation cadence must be a positive number of days. |
| rule-runtime-oauth-client-secrets:rotation-dates-format | pass | Rotation dates must use YYYY-MM-DD format. |
| rule-runtime-oauth-client-secrets:rotation-order | pass | nextRotationBy must be on or after lastRotatedOn. |
| rule-runtime-oauth-client-secrets:rotation-window | pass | nextRotationBy must be within cadenceDays window of lastRotatedOn. |
| rule-runtime-oauth-client-secrets:rotation-not-overdue | pass | Secret rotation window must not be overdue for rule runtime-oauth-client-secrets. |
| rule-runtime-stripe-credentials:id-present | pass | Rule id must be non-empty. |
| rule-runtime-stripe-credentials:id-unique | pass | Rule id must be unique. |
| rule-runtime-stripe-credentials:runbook-exists | pass | Runbook path must exist: docs/runbooks/secrets-rotation-hygiene.md |
| rule-runtime-stripe-credentials:rotation-cadence-valid | pass | Rotation cadence must be a positive number of days. |
| rule-runtime-stripe-credentials:rotation-dates-format | pass | Rotation dates must use YYYY-MM-DD format. |
| rule-runtime-stripe-credentials:rotation-order | pass | nextRotationBy must be on or after lastRotatedOn. |
| rule-runtime-stripe-credentials:rotation-window | pass | nextRotationBy must be within cadenceDays window of lastRotatedOn. |
| rule-runtime-stripe-credentials:rotation-not-overdue | pass | Secret rotation window must not be overdue for rule runtime-stripe-credentials. |
| rule-runtime-printful-credentials:id-present | pass | Rule id must be non-empty. |
| rule-runtime-printful-credentials:id-unique | pass | Rule id must be unique. |
| rule-runtime-printful-credentials:runbook-exists | pass | Runbook path must exist: docs/runbooks/secrets-rotation-hygiene.md |
| rule-runtime-printful-credentials:rotation-cadence-valid | pass | Rotation cadence must be a positive number of days. |
| rule-runtime-printful-credentials:rotation-dates-format | pass | Rotation dates must use YYYY-MM-DD format. |
| rule-runtime-printful-credentials:rotation-order | pass | nextRotationBy must be on or after lastRotatedOn. |
| rule-runtime-printful-credentials:rotation-window | pass | nextRotationBy must be within cadenceDays window of lastRotatedOn. |
| rule-runtime-printful-credentials:rotation-not-overdue | pass | Secret rotation window must not be overdue for rule runtime-printful-credentials. |
| rule-runtime-prodigi-webhook:id-present | pass | Rule id must be non-empty. |
| rule-runtime-prodigi-webhook:id-unique | pass | Rule id must be unique. |
| rule-runtime-prodigi-webhook:runbook-exists | pass | Runbook path must exist: docs/runbooks/secrets-rotation-hygiene.md |
| rule-runtime-prodigi-webhook:rotation-cadence-valid | pass | Rotation cadence must be a positive number of days. |
| rule-runtime-prodigi-webhook:rotation-dates-format | pass | Rotation dates must use YYYY-MM-DD format. |
| rule-runtime-prodigi-webhook:rotation-order | pass | nextRotationBy must be on or after lastRotatedOn. |
| rule-runtime-prodigi-webhook:rotation-window | pass | nextRotationBy must be within cadenceDays window of lastRotatedOn. |
| rule-runtime-prodigi-webhook:rotation-not-overdue | pass | Secret rotation window must not be overdue for rule runtime-prodigi-webhook. |
| rule-runtime-ai-provider-keys:id-present | pass | Rule id must be non-empty. |
| rule-runtime-ai-provider-keys:id-unique | pass | Rule id must be unique. |
| rule-runtime-ai-provider-keys:runbook-exists | pass | Runbook path must exist: docs/runbooks/secrets-rotation-hygiene.md |
| rule-runtime-ai-provider-keys:rotation-cadence-valid | pass | Rotation cadence must be a positive number of days. |
| rule-runtime-ai-provider-keys:rotation-dates-format | pass | Rotation dates must use YYYY-MM-DD format. |
| rule-runtime-ai-provider-keys:rotation-order | pass | nextRotationBy must be on or after lastRotatedOn. |
| rule-runtime-ai-provider-keys:rotation-window | pass | nextRotationBy must be within cadenceDays window of lastRotatedOn. |
| rule-runtime-ai-provider-keys:rotation-not-overdue | pass | Secret rotation window must not be overdue for rule runtime-ai-provider-keys. |
| rule-runtime-notification-credentials:id-present | pass | Rule id must be non-empty. |
| rule-runtime-notification-credentials:id-unique | pass | Rule id must be unique. |
| rule-runtime-notification-credentials:runbook-exists | pass | Runbook path must exist: docs/runbooks/secrets-rotation-hygiene.md |
| rule-runtime-notification-credentials:rotation-cadence-valid | pass | Rotation cadence must be a positive number of days. |
| rule-runtime-notification-credentials:rotation-dates-format | pass | Rotation dates must use YYYY-MM-DD format. |
| rule-runtime-notification-credentials:rotation-order | pass | nextRotationBy must be on or after lastRotatedOn. |
| rule-runtime-notification-credentials:rotation-window | pass | nextRotationBy must be within cadenceDays window of lastRotatedOn. |
| rule-runtime-notification-credentials:rotation-not-overdue | pass | Secret rotation window must not be overdue for rule runtime-notification-credentials. |
| rule-runtime-encryption-key:id-present | pass | Rule id must be non-empty. |
| rule-runtime-encryption-key:id-unique | pass | Rule id must be unique. |
| rule-runtime-encryption-key:runbook-exists | pass | Runbook path must exist: docs/runbooks/secrets-rotation-hygiene.md |
| rule-runtime-encryption-key:rotation-cadence-valid | pass | Rotation cadence must be a positive number of days. |
| rule-runtime-encryption-key:rotation-dates-format | pass | Rotation dates must use YYYY-MM-DD format. |
| rule-runtime-encryption-key:rotation-order | pass | nextRotationBy must be on or after lastRotatedOn. |
| rule-runtime-encryption-key:rotation-window | pass | nextRotationBy must be within cadenceDays window of lastRotatedOn. |
| rule-runtime-encryption-key:rotation-not-overdue | pass | Secret rotation window must not be overdue for rule runtime-encryption-key. |
| rule-runtime-cache-webhook-secret:id-present | pass | Rule id must be non-empty. |
| rule-runtime-cache-webhook-secret:id-unique | pass | Rule id must be unique. |
| rule-runtime-cache-webhook-secret:runbook-exists | pass | Runbook path must exist: docs/runbooks/secrets-rotation-hygiene.md |
| rule-runtime-cache-webhook-secret:rotation-cadence-valid | pass | Rotation cadence must be a positive number of days. |
| rule-runtime-cache-webhook-secret:rotation-dates-format | pass | Rotation dates must use YYYY-MM-DD format. |
| rule-runtime-cache-webhook-secret:rotation-order | pass | nextRotationBy must be on or after lastRotatedOn. |
| rule-runtime-cache-webhook-secret:rotation-window | pass | nextRotationBy must be within cadenceDays window of lastRotatedOn. |
| rule-runtime-cache-webhook-secret:rotation-not-overdue | pass | Secret rotation window must not be overdue for rule runtime-cache-webhook-secret. |
| rule-ci-cloudflare-secrets:id-present | pass | Rule id must be non-empty. |
| rule-ci-cloudflare-secrets:id-unique | pass | Rule id must be unique. |
| rule-ci-cloudflare-secrets:runbook-exists | pass | Runbook path must exist: docs/runbooks/secrets-rotation-hygiene.md |
| rule-ci-cloudflare-secrets:rotation-cadence-valid | pass | Rotation cadence must be a positive number of days. |
| rule-ci-cloudflare-secrets:rotation-dates-format | pass | Rotation dates must use YYYY-MM-DD format. |
| rule-ci-cloudflare-secrets:rotation-order | pass | nextRotationBy must be on or after lastRotatedOn. |
| rule-ci-cloudflare-secrets:rotation-window | pass | nextRotationBy must be within cadenceDays window of lastRotatedOn. |
| rule-ci-cloudflare-secrets:rotation-not-overdue | pass | Secret rotation window must not be overdue for rule ci-cloudflare-secrets. |
| rule-ci-smoke-secrets:id-present | pass | Rule id must be non-empty. |
| rule-ci-smoke-secrets:id-unique | pass | Rule id must be unique. |
| rule-ci-smoke-secrets:runbook-exists | pass | Runbook path must exist: docs/runbooks/secrets-rotation-hygiene.md |
| rule-ci-smoke-secrets:rotation-cadence-valid | pass | Rotation cadence must be a positive number of days. |
| rule-ci-smoke-secrets:rotation-dates-format | pass | Rotation dates must use YYYY-MM-DD format. |
| rule-ci-smoke-secrets:rotation-order | pass | nextRotationBy must be on or after lastRotatedOn. |
| rule-ci-smoke-secrets:rotation-window | pass | nextRotationBy must be within cadenceDays window of lastRotatedOn. |
| rule-ci-smoke-secrets:rotation-not-overdue | pass | Secret rotation window must not be overdue for rule ci-smoke-secrets. |
| rule-ci-claude-oauth:id-present | pass | Rule id must be non-empty. |
| rule-ci-claude-oauth:id-unique | pass | Rule id must be unique. |
| rule-ci-claude-oauth:runbook-exists | pass | Runbook path must exist: docs/runbooks/secrets-rotation-hygiene.md |
| rule-ci-claude-oauth:rotation-cadence-valid | pass | Rotation cadence must be a positive number of days. |
| rule-ci-claude-oauth:rotation-dates-format | pass | Rotation dates must use YYYY-MM-DD format. |
| rule-ci-claude-oauth:rotation-order | pass | nextRotationBy must be on or after lastRotatedOn. |
| rule-ci-claude-oauth:rotation-window | pass | nextRotationBy must be within cadenceDays window of lastRotatedOn. |
| rule-ci-claude-oauth:rotation-not-overdue | pass | Secret rotation window must not be overdue for rule ci-claude-oauth. |
| runtime-coverage | pass | All runtime secret keys are covered (16). |
| ci-coverage | pass | All workflow secret keys are covered (25). |
| env-example-runtime-secret-coverage | pass | .env.example contains all runtime secret-like env keys. |

