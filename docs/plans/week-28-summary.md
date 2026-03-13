# Week 28 Summary

## Scope

- Continue admin API parity hardening by adding reversible mutation checks.
- Ensure mutation-path method/status/response-shape mismatches are caught, not only list/read paths.

## Shipped This Week

1. Reversible mutation parity checks
- Updated [`/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts) to support `SMOKE_ENABLE_MUTATIONS=true`.
- Added contract metadata checks for mutation routes:
  - integration marketplace install/uninstall,
  - headless pack create/revoke,
  - store template create/delete.
- Added live mutation smoke flow with cleanup/rollback safety:
  - installs a safe integration candidate and uninstalls it,
  - creates and revokes a headless pack,
  - creates and deletes a store template,
  - executes fallback cleanup in `finally` if any step fails.

2. CI mutation toggle
- Updated [`/Users/lsendel/Projects/commerce/.github/workflows/admin-api-smoke.yml`](/Users/lsendel/Projects/commerce/.github/workflows/admin-api-smoke.yml) to pass `SMOKE_ENABLE_MUTATIONS` from secrets for live smoke runs.

3. Runbook update
- Updated [`/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md`](/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md) with mutation mode commands and CI behavior.

## Validation

- `pnpm typecheck`
- `pnpm smoke:admin-parity` (contract-only mode; live mutation mode requires env/secrets)

## Next Week Kickoff

- Add endpoint-by-endpoint live smoke reporting artifact (JSON/Markdown) for CI upload.
- Add automatic alerting hooks (Slack/email) for live smoke failures with failing endpoint and status/shape mismatch details.
