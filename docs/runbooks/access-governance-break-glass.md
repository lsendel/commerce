# Access Governance + Break-Glass Runbook

## Scope

- Policy files:
  - `docs/policies/access-governance-policy-v1.json`
  - `docs/policies/access-governance-policy-v1.md`
- Validation command:
  - `pnpm smoke:access-governance`
- Evidence artifacts:
  - `output/smoke/access-governance-report.json`
  - `output/smoke/break-glass-drill-report.json`

## Objectives

- Keep RBAC controls explicit and continuously validated.
- Ensure emergency elevation is bounded, approved, and drill-tested.
- Prevent drift between policy definitions and runtime guard wiring.

## Operating Procedure

1. Update RBAC and break-glass policy in `docs/policies/access-governance-policy-v1.json`.
2. Keep role-binding and guard assertions aligned with code changes.
3. Run:
- `pnpm smoke:access-governance`
4. Review artifacts:
- `output/smoke/access-governance-report.json`
- `output/smoke/break-glass-drill-report.json`
5. For release gates rerun:
- `pnpm smoke:compliance-controls`
- `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`

## What `smoke:access-governance` Enforces

- Role model completeness for platform/store roles and admin alias mapping.
- Source-level role binding integrity for key privileged surfaces.
- Guard assertion integrity for `/admin/*` and `/api/admin/*` fences.
- API discovery confirms non-zero admin and role-protected endpoint surfaces.
- Break-glass drill simulation checks:
- dual approver quorum,
- bounded elevation window,
- escalation channel set,
- scenario coverage,
- non-overdue drill schedule.

## Failure Handling

1. If role binding/guard checks fail:
- restore expected middleware guards or update policy assertions intentionally.
2. If break-glass schedule checks fail:
- execute drill,
- update `lastDrillOn` and `nextDrillBy` in policy.
3. If scenario checks fail:
- validate admin page/API fences and re-run smoke.
4. Re-run `pnpm smoke:access-governance` until all checks pass.
