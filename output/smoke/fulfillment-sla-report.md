# Fulfillment SLA Smoke Report

- Started: 2026-03-06T06:41:12.934Z
- Finished: 2026-03-06T06:41:12.935Z
- Status: passed
- Total checks: 5
- Failed checks: 0

| Check | Status | Note |
| --- | --- | --- |
| failed-transient-auto-retry | pass | Failed transient fulfillment requests are auto-retry high risk. |
| submitted-missing-external-id | pass | Submitted requests without provider external id are intervention candidates. |
| return-submitted-review-action | pass | Aged submitted returns are classified for prioritized review. |
| return-approved-completion-action | pass | Aged approved returns are classified for prioritized completion. |
| summary-at-risk-coverage | pass | Dashboard summary reflects at-risk load and auto-action eligibility. |

