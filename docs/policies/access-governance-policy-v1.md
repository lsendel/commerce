# Access Governance Policy v1

## Purpose

- Define RBAC governance controls for platform/admin surfaces.
- Enforce break-glass constraints for emergency privilege elevation.
- Keep access governance checks machine-verifiable via `pnpm smoke:access-governance`.

## Source of Truth

- Machine-readable policy: `docs/policies/access-governance-policy-v1.json`
- Validation gate: `pnpm smoke:access-governance`
- Artifacts:
  - `output/smoke/access-governance-report.json`
  - `output/smoke/break-glass-drill-report.json`

## RBAC Baseline

- Platform roles:
  - `super_admin`, `group_admin`, `user`
- Store membership roles:
  - `owner`, `admin`, `staff`
- Admin alias mapping in middleware:
  - `admin` => `super_admin` + `group_admin`

## Guardrail Surfaces

- Admin pages:
  - global guard on `/admin/*` in `src/index.tsx`
- Admin APIs:
  - global guard on `/api/admin/*` using `requireAuth()` + `requireRole("admin")`
- Platform privileged operation scope:
  - `/api/platform/stores` remains `super_admin` scoped.

## Break-Glass Requirements

- Dual approval minimum (`approversRequired >= 2`).
- Time-bounded access window (`maxWindowMinutes <= 240`; policy target `120`).
- Defined escalation channel for incident response coordination.
- Recurring drill cadence with non-overdue schedule window.
