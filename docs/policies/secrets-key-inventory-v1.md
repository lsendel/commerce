# Secrets/Key Inventory v1

## Purpose

- Define an auditable inventory of runtime and CI secret scopes.
- Enforce explicit rotation ownership and cadence for all discovered secret-bearing keys.
- Keep coverage policy machine-verifiable via `pnpm smoke:secrets-hygiene`.

## Source of Truth

- Machine-readable inventory: `docs/policies/secrets-key-inventory-v1.json`
- Validation gate: `pnpm smoke:secrets-hygiene`
- Artifacts:
  - `output/smoke/secrets-hygiene-report.json`
  - `output/smoke/secrets-hygiene-report.md`

## Coverage Model

- `runtime_env` rules cover secret-like keys discovered from `src/env.ts`.
- `github_actions_secret` rules cover secret references discovered from `.github/workflows/*.yml`.
- Rule match styles:
  - `exact` for one key,
  - `prefix` for grouped names (for example `SMOKE_*`),
  - `regex` for bounded key families (for example OAuth provider secrets).

## Rotation Policy Baseline

- Auth/session + audit + encryption secrets:
  - target cadence: 45 days.
- Provider/API and deploy credentials:
  - target cadence: 60 to 90 days depending on blast radius.
- CI smoke/access credentials:
  - target cadence: 30 days (short-lived operational secrets).

## Update Rules

1. Any new secret-like env key in `src/env.ts` must match at least one `runtime_env` rule.
2. Any new `secrets.*` key in GitHub workflows must match at least one `github_actions_secret` rule.
3. Every rule must include:
- owner,
- runbook path,
- `rotation.cadenceDays`, `lastRotatedOn`, `nextRotationBy`.
4. Rotation windows must stay non-overdue relative to current date and within cadence bounds.
