# Partner Onboarding Smoke Report

- Started: 2026-03-06T06:41:18.140Z
- Finished: 2026-03-06T06:41:18.144Z
- Status: passed
- Policy path: docs/policies/partner-onboarding-contract-v1.json
- Total checks: 34
- Failed checks: 0
- Simulation cases: 3
- Simulation passing: 3

## Simulation Results

| Case | Expected Verified | Actual Verified | Expected Blocking | Actual Blocking | Progress% | Status |
| --- | --- | --- | --- | --- | --- | --- |
| ready-partner-connected | true | true | 0 | 0 | 100 | pass |
| partner-missing-secrets | false | false | 3 | 3 | 25 | pass |
| not-installed-partner | false | false | 5 | 5 | 0 | pass |

## Checks

| Check | Status | Note |
| --- | --- | --- |
| policy-owner-present | pass | Policy owner must be defined. |
| required-partner-providers-covered | pass | Policy must match required partner providers: printful, gooten, prodigi, shapeways |
| required-event-types-covered | pass | Required analytics event types must exist in taxonomy. |
| review-cadence-valid | pass | reviewCadenceDays must be a positive number. |
| review-dates-format | pass | lastReviewedOn and nextReviewBy must use YYYY-MM-DD format. |
| review-next-after-last | pass | nextReviewBy must be on or after lastReviewedOn. |
| review-window-valid | pass | nextReviewBy must stay within reviewCadenceDays window. |
| review-not-overdue | pass | Partner onboarding policy review date must not be overdue. |
| source-path-1 | pass | Source path must exist: src/application/platform/partner-onboarding.usecase.ts |
| source-path-2 | pass | Source path must exist: src/routes/api/integration-marketplace.routes.ts |
| source-path-3 | pass | Source path must exist: src/contracts/integration-marketplace.contract.ts |
| source-path-4 | pass | Source path must exist: public/scripts/admin-integration-marketplace.js |
| required-snippet-1 | pass | Required snippet must be present: /integration-marketplace/partners/:provider/onboarding/complete |
| required-snippet-2 | pass | Required snippet must be present: /integration-marketplace/partners/:provider/contract-verify |
| required-snippet-3 | pass | Required snippet must be present: completePartnerOnboarding |
| required-snippet-4 | pass | Required snippet must be present: verifyPartnerContract |
| required-snippet-5 | pass | Required snippet must be present: marketplace-onboard-btn |
| required-snippet-6 | pass | Required snippet must be present: marketplace-contract-verify-btn |
| required-snippet-7 | pass | Required snippet must be present: integration_partner_onboarding_completed |
| contract-route-list-onboarding | pass | Contract listPartnerOnboarding must match method/path. |
| contract-route-get-onboarding | pass | Contract getPartnerOnboarding must match method/path. |
| contract-route-complete-onboarding | pass | Contract completePartnerOnboarding must match method/path. |
| contract-route-verify-partner-contract | pass | Contract verifyPartnerContract must match method/path. |
| policy-md-exists | pass | Policy markdown must exist: docs/policies/partner-onboarding-contract-v1.md |
| runbook-exists | pass | Runbook must exist: docs/runbooks/partner-onboarding-self-serve.md |
| simulation-ready-partner-connected-verified | pass | Expected verified=true, got true |
| simulation-ready-partner-connected-blocking-failures | pass | Expected blockingFailures=0, got 0 |
| simulation-ready-partner-connected-progress-min | pass | Expected progress >= 75, got 100 |
| simulation-partner-missing-secrets-verified | pass | Expected verified=false, got false |
| simulation-partner-missing-secrets-blocking-failures | pass | Expected blockingFailures=3, got 3 |
| simulation-partner-missing-secrets-progress-min | pass | Expected progress >= 25, got 25 |
| simulation-not-installed-partner-verified | pass | Expected verified=false, got false |
| simulation-not-installed-partner-blocking-failures | pass | Expected blockingFailures=5, got 5 |
| simulation-not-installed-partner-progress-min | pass | Expected progress >= 0, got 0 |
