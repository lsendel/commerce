# End-to-End Smoke Matrix Report

- Started: 2026-03-06T06:41:07.983Z
- Finished: 2026-03-06T06:41:18.158Z
- Status: passed
- Base URL: https://petm8.io
- Skip HTTP checks: true
- Metrics: total=0, passed=0, failed=0, skipped=98

## Command Results

| Command | Ran | Status | Exit Code | Duration(ms) | Summary |
| --- | --- | --- | --- | --- | --- |
| pnpm smoke:admin-parity | yes | passed | 0 | 467 | > tsx scripts/smoke-policy-control-tower.ts \| Contract metadata checks passed. \| Live smoke skipped: set SMOKE_BASE_URL (and auth headers) to run HTTP checks. |
| pnpm smoke:storefront-browser | no | skipped |  | 0 | Skipped via SMOKE_MATRIX_SKIP_HTTP |
| pnpm smoke:seo | no | skipped |  | 0 | Skipped via SMOKE_MATRIX_SKIP_HTTP |
| pnpm smoke:llm-surface | no | skipped |  | 0 | Skipped via SMOKE_MATRIX_SKIP_HTTP |
| pnpm smoke:structured-data | no | skipped |  | 0 | Skipped via SMOKE_MATRIX_SKIP_HTTP |
| pnpm smoke:admin-analytics-automation | no | skipped |  | 0 | Skipped via SMOKE_MATRIX_SKIP_HTTP |
| pnpm smoke:landing-pages | yes | passed | 0 | 409 | > petm8@0.1.0 smoke:landing-pages /Users/lsendel/Projects/commerce \| > tsx scripts/run-landing-page-pipeline.ts \| Landing page pipeline passed. |
| pnpm smoke:growth-experiments | yes | passed | 0 | 414 | > petm8@0.1.0 smoke:growth-experiments /Users/lsendel/Projects/commerce \| > tsx scripts/smoke-growth-experiment-os.ts \| Growth experiment OS smoke passed with warnings: 1 experiment(s) warned. |
| pnpm smoke:event-pipeline | yes | passed | 0 | 619 | > petm8@0.1.0 smoke:event-pipeline /Users/lsendel/Projects/commerce \| > tsx scripts/smoke-event-pipeline.ts \| Event pipeline contract smoke passed. |
| pnpm smoke:segment-freshness | yes | passed | 0 | 774 | > petm8@0.1.0 smoke:segment-freshness /Users/lsendel/Projects/commerce \| > tsx scripts/smoke-segment-freshness.ts \| Segment freshness smoke passed with warnings. |
| pnpm smoke:identity-resolution | yes | passed | 0 | 677 | > petm8@0.1.0 smoke:identity-resolution /Users/lsendel/Projects/commerce \| > tsx scripts/smoke-identity-resolution.ts \| Identity resolution smoke passed with warnings. |
| pnpm smoke:recommendation-quality | yes | passed | 0 | 534 | > petm8@0.1.0 smoke:recommendation-quality /Users/lsendel/Projects/commerce \| > tsx scripts/smoke-recommendation-quality.ts \| Recommendation quality smoke passed. |
| pnpm smoke:pricing-policy-simulation | yes | passed | 0 | 425 | > petm8@0.1.0 smoke:pricing-policy-simulation /Users/lsendel/Projects/commerce \| > tsx scripts/smoke-pricing-policy-simulation.ts \| Pricing policy simulation smoke passed. |
| pnpm smoke:fulfillment-sla | yes | passed | 0 | 649 | > petm8@0.1.0 smoke:fulfillment-sla /Users/lsendel/Projects/commerce \| > tsx scripts/smoke-fulfillment-sla.ts \| Fulfillment SLA smoke passed. |
| pnpm smoke:compliance-controls | yes | passed | 0 | 415 | > petm8@0.1.0 smoke:compliance-controls /Users/lsendel/Projects/commerce \| > tsx scripts/smoke-compliance-controls.ts \| Compliance controls smoke passed. |
| pnpm smoke:audit-pii | yes | passed | 0 | 502 | > petm8@0.1.0 smoke:audit-pii /Users/lsendel/Projects/commerce \| > tsx scripts/smoke-audit-pii.ts \| Audit/PII smoke passed. |
| pnpm smoke:secrets-hygiene | yes | passed | 0 | 456 | > petm8@0.1.0 smoke:secrets-hygiene /Users/lsendel/Projects/commerce \| > tsx scripts/smoke-secrets-hygiene.ts \| Secrets hygiene smoke passed. |
| pnpm smoke:access-governance | yes | passed | 0 | 440 | > petm8@0.1.0 smoke:access-governance /Users/lsendel/Projects/commerce \| > tsx scripts/smoke-access-governance.ts \| Access governance smoke passed. |
| pnpm smoke:cost-observability | yes | passed | 0 | 431 | > petm8@0.1.0 smoke:cost-observability /Users/lsendel/Projects/commerce \| > tsx scripts/smoke-cost-observability.ts \| Cost observability smoke passed. |
| pnpm smoke:query-performance | yes | passed | 0 | 442 | > petm8@0.1.0 smoke:query-performance /Users/lsendel/Projects/commerce \| > tsx scripts/smoke-query-performance.ts \| Query performance smoke passed. |
| pnpm smoke:cache-invalidation | yes | passed | 0 | 469 | > petm8@0.1.0 smoke:cache-invalidation /Users/lsendel/Projects/commerce \| > tsx scripts/smoke-cache-invalidation.ts \| Cache invalidation smoke passed. |
| pnpm smoke:workflow-reliability | yes | passed | 0 | 436 | > petm8@0.1.0 smoke:workflow-reliability /Users/lsendel/Projects/commerce \| > tsx scripts/smoke-workflow-reliability.ts \| Workflow reliability smoke passed. |
| pnpm smoke:dlq-remediation | yes | passed | 0 | 745 | > petm8@0.1.0 smoke:dlq-remediation /Users/lsendel/Projects/commerce \| > tsx scripts/smoke-dlq-remediation.ts \| DLQ auto-remediation smoke passed. |
| pnpm smoke:api-versioning | yes | passed | 0 | 413 | > petm8@0.1.0 smoke:api-versioning /Users/lsendel/Projects/commerce \| > tsx scripts/smoke-api-versioning.ts \| API versioning smoke passed. |
| pnpm smoke:partner-onboarding | yes | passed | 0 | 456 | > petm8@0.1.0 smoke:partner-onboarding /Users/lsendel/Projects/commerce \| > tsx scripts/smoke-partner-onboarding.ts \| Partner onboarding smoke passed. |

## Section Results

| Section | Total | Passed | Failed |
| --- | --- | --- | --- |

