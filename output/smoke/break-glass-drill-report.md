# Break-Glass Drill Report

- Started: 2026-03-06T06:41:14.752Z
- Finished: 2026-03-06T06:41:14.752Z
- Status: passed
- Policy owner: commerce-sre
- Total checks: 9
- Failed checks: 0

## Checks

| Check | Status | Note |
| --- | --- | --- |
| break-glass-approver-quorum | pass | Break-glass policy must require at least 2 approvers. |
| break-glass-window-bound | pass | Break-glass window must be bounded to <= 240 minutes. |
| break-glass-channel-defined | pass | Break-glass escalation channel must be configured. |
| break-glass-scenarios-present | pass | At least one break-glass scenario must be defined. |
| break-glass-date-format | pass | Break-glass drill dates must use YYYY-MM-DD format. |
| break-glass-next-after-last | pass | nextDrillBy must be on or after lastDrillOn. |
| break-glass-window-valid | pass | nextDrillBy must stay within drillCadenceDays window. |
| break-glass-not-overdue | pass | Break-glass drill schedule must not be overdue. |
| break-glass-scenario-evaluation | pass | All break-glass scenarios passed guard preconditions. |

## Scenarios

| Scenario ID | Name | Surface | Expected | Status |
| --- | --- | --- | --- | --- |
| bg-admin-api-emergency | Emergency admin API access restore | /api/admin/* | Temporary elevation requires dual approval and bounded 120-minute window. | pass |
| bg-admin-page-emergency | Emergency admin page access restore | /admin/* | Temporary elevation is revoked after incident closure and logged in audit trail. | pass |

