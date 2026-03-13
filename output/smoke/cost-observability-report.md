# Cost Observability Smoke Report

- Started: 2026-03-06T06:41:15.179Z
- Finished: 2026-03-06T06:41:15.184Z
- Status: passed
- Policy: docs/policies/cost-observability-unit-economics-v1.json
- Models: feature=4, team=4, tenant=2
- Optimization backlog items: 3
- Checks: total=32, failed=0

| Check | Status | Note |
| --- | --- | --- |
| policy-owner-present | pass | Policy owner must be defined. |
| dimensions-required-coverage | pass | Required dimensions must include feature/team/tenant. |
| feature-models-present | pass | Feature dimension must define at least 3 models. |
| team-models-present | pass | Team dimension must define at least 3 models. |
| tenant-models-present | pass | Tenant dimension must define at least one model. |
| feature-owner-team-coverage | pass | Every feature model ownerTeam must map to a team model. |
| telemetry-metric-catalog | pass | Telemetry metric catalog must include at least 5 metrics. |
| telemetry-required-metrics | pass | Telemetry catalog must include required cost and unit-economics metrics. |
| dashboard-sections-coverage | pass | Dashboard sections must include summary, feature/team/tenant dimensions, and optimization backlog. |
| optimization-backlog-present | pass | Optimization backlog must include at least 3 items. |
| backlog-cost-opt-001-status-valid | pass | Backlog status must be candidate\|planned\|in_progress (cost-opt-001). |
| backlog-cost-opt-001-priority-valid | pass | Backlog priority must be p0\|p1\|p2 (cost-opt-001). |
| backlog-cost-opt-001-date-format | pass | Backlog targetDate must use YYYY-MM-DD (cost-opt-001). |
| backlog-cost-opt-002-status-valid | pass | Backlog status must be candidate\|planned\|in_progress (cost-opt-002). |
| backlog-cost-opt-002-priority-valid | pass | Backlog priority must be p0\|p1\|p2 (cost-opt-002). |
| backlog-cost-opt-002-date-format | pass | Backlog targetDate must use YYYY-MM-DD (cost-opt-002). |
| backlog-cost-opt-003-status-valid | pass | Backlog status must be candidate\|planned\|in_progress (cost-opt-003). |
| backlog-cost-opt-003-priority-valid | pass | Backlog priority must be p0\|p1\|p2 (cost-opt-003). |
| backlog-cost-opt-003-date-format | pass | Backlog targetDate must use YYYY-MM-DD (cost-opt-003). |
| review-cadence-valid | pass | reviewCadenceDays must be a positive number. |
| review-dates-format | pass | lastReviewedOn and nextReviewBy must use YYYY-MM-DD format. |
| review-next-after-last | pass | nextReviewBy must be on or after lastReviewedOn. |
| review-window-valid | pass | nextReviewBy must stay inside reviewCadenceDays window. |
| review-not-overdue | pass | Cost observability policy review date must not be overdue. |
| runbook-exists | pass | Runbook must exist: docs/runbooks/cost-observability-unit-economics.md |
| contract-route-present | pass | Analytics contract must define getCostObservability route. |
| contract-route-method | pass | Cost observability contract route method must be GET. |
| contract-route-path | pass | Cost observability contract route path must match backend route. |
| contract-response-shape | pass | Sample cost observability payload must satisfy analytics contract response schema. |
| api-route-snippet | pass | Analytics API route must gate and serve /analytics/cost-observability. |
| admin-page-section | pass | Admin analytics page must render Cost Observability section. |
| admin-page-data-wiring | pass | Admin analytics route and CSV export must wire cost observability data. |

