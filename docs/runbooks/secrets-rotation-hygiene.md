# Secrets Rotation + Credential Hygiene Runbook

## Scope

- Inventory policy:
  - `docs/policies/secrets-key-inventory-v1.json`
  - `docs/policies/secrets-key-inventory-v1.md`
- Validation gate:
  - `pnpm smoke:secrets-hygiene`
- Supporting files:
  - `src/env.ts`
  - `.env.example`
  - `.github/workflows/*.yml`

## Objectives

- Keep runtime and CI secret scopes fully inventoried.
- Enforce explicit owner and rotation cadence for every secret class.
- Block drift where new secrets are introduced without rotation governance.

## Operating Procedure

1. Update secret inventory rules in `docs/policies/secrets-key-inventory-v1.json`.
2. Ensure every rule includes owner, runbook, cadence, and rotation dates.
3. Verify `.env.example` includes all runtime secret-like keys from `src/env.ts`.
4. Run:
- `pnpm smoke:secrets-hygiene`
5. Confirm artifacts:
- `output/smoke/secrets-hygiene-report.json`
- `output/smoke/secrets-hygiene-report.md`
6. For release gates, rerun:
- `pnpm smoke:compliance-controls`
- `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`

## What `smoke:secrets-hygiene` Enforces

- Inventory schema integrity (`version`, non-empty rules, unique rule IDs).
- Rule quality:
- runbook path exists,
- cadence and date fields are valid,
- `nextRotationBy` remains within cadence window and is not overdue.
- Runtime coverage:
- secret-like keys discovered in `src/env.ts` are matched by `runtime_env` rules.
- CI coverage:
- workflow `secrets.*` references are matched by `github_actions_secret` rules.
- Hygiene coverage:
- `.env.example` includes all runtime secret-like env keys.

## Failure Handling

1. If runtime/CI coverage fails:
- add or adjust matching rules in the inventory JSON.
2. If rotation window checks fail:
- rotate affected credential(s),
- update `lastRotatedOn` and `nextRotationBy` in inventory.
3. If `.env.example` coverage fails:
- add missing secret-like keys to `.env.example` placeholders.
4. Re-run `pnpm smoke:secrets-hygiene` until all checks pass.
