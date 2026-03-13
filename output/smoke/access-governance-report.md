# Access Governance Smoke Report

- Started: 2026-03-06T06:41:14.736Z
- Finished: 2026-03-06T06:41:14.754Z
- Status: passed
- Policy path: docs/policies/access-governance-policy-v1.json
- Discovered admin API endpoints: 67
- Discovered role-protected API routes: 98
- Drill artifact: output/smoke/break-glass-drill-report.json

## Checks

| Check | Status | Note |
| --- | --- | --- |
| role-model-platform-coverage | pass | Role model must include super_admin/group_admin/user platform roles. |
| role-model-store-coverage | pass | Role model must include owner/admin/staff store roles. |
| admin-alias-coverage | pass | Admin alias must resolve to super_admin and group_admin. |
| binding-platform-admin-alias | pass | Role binding platform-admin-alias source snippets verified. |
| binding-admin-api-global-guard | pass | Role binding admin-api-global-guard source snippets verified. |
| binding-admin-page-global-guard | pass | Role binding admin-page-global-guard source snippets verified. |
| binding-super-admin-platform-scope | pass | Role binding super-admin-platform-scope source snippets verified. |
| guard-admin-page-fence | pass | Guard assertion admin-page-fence verified. |
| guard-admin-api-fence | pass | Guard assertion admin-api-fence verified. |
| guard-role-middleware-enforcement | pass | Guard assertion role-middleware-enforcement verified. |
| admin-api-surface-discovered | pass | Admin API surface discovery must find endpoints (found 67). |
| role-protected-surface-discovered | pass | Role-protected API surface discovery must find endpoints (found 98). |
| break-glass-drill-status | pass | Break-glass drill simulation passed. |

