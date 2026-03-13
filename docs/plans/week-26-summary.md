# Week 26 Summary

## Scope

- Continue post-week-24 production hardening.
- Add CI automation for admin API parity smoke and expand coverage to additional method/response-shape surfaces.

## Shipped This Week

1. Expanded admin parity smoke coverage
- Updated [`/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts) to validate additional contract and live API parity for:
  - pricing experiments list + performance endpoints;
  - workflow builder list endpoint.
- Existing checks for policies and control tower remain in place, including partial policy update merge assertions and restore behavior.

2. CI automation for parity smoke
- Added [`/Users/lsendel/Projects/commerce/.github/workflows/admin-api-smoke.yml`](/Users/lsendel/Projects/commerce/.github/workflows/admin-api-smoke.yml):
  - `contract-smoke` on PR/push/schedule/manual;
  - `live-smoke` on non-PR runs when smoke secrets are configured.

3. Script alias for parity smoke
- Added `smoke:admin-parity` script in [`/Users/lsendel/Projects/commerce/package.json`](/Users/lsendel/Projects/commerce/package.json).

4. Runbook updates
- Updated smoke instructions and CI notes in:
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/policy-engine-guardrails.md`](/Users/lsendel/Projects/commerce/docs/runbooks/policy-engine-guardrails.md)
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/executive-control-tower.md`](/Users/lsendel/Projects/commerce/docs/runbooks/executive-control-tower.md)

## Validation

- `pnpm typecheck`
- `pnpm smoke:admin-parity` (contract-only mode without `SMOKE_BASE_URL`)

## Next Week Kickoff

- Add parity smoke coverage for integration marketplace and headless/store-template admin APIs.
- Add scheduled live smoke result reporting to Slack/email incident channel.
