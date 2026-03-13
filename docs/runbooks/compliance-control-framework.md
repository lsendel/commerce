# Compliance Control Framework Runbook

## Scope

- Policy doc: `docs/policies/compliance-control-matrix-v1.md`
- Matrix source: `docs/policies/compliance-control-matrix-v1.json`
- Validation command: `pnpm smoke:compliance-controls`
- Purpose:
  - maintain SOC2-style control mappings from objective -> implementation -> runbook -> evidence,
  - prevent stale or non-actionable compliance documentation.

## Operating Procedure

1. Edit matrix records in `docs/policies/compliance-control-matrix-v1.json`.
2. For each control, include:
   - `controlId`, `soc2Domain`, `objective`,
   - `implementationPaths`, `runbookPaths`,
   - `evidencePaths` with `kind` (`repo_file` or `generated_artifact`),
   - `commandGates` (must exist in `package.json` scripts).
3. Run `pnpm smoke:compliance-controls`.
4. Confirm generated artifacts:
   - `output/smoke/compliance-controls-report.json`
   - `output/smoke/compliance-controls-report.md`.
5. If matrix changes affect related smoke flows, rerun:
   - `pnpm smoke:admin-parity`
  - `pnpm smoke:audit-pii`
  - `pnpm smoke:secrets-hygiene`
  - `pnpm smoke:access-governance`
  - `pnpm smoke:cost-observability`
  - `pnpm smoke:query-performance`
  - `pnpm smoke:cache-invalidation`
  - `pnpm smoke:workflow-reliability`
  - `pnpm smoke:dlq-remediation`
  - `pnpm smoke:api-versioning`
  - `pnpm smoke:partner-onboarding`
  - `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`.

## Gate Rules Enforced by Smoke

- Matrix file uses `version: "v1"` and has at least one control.
- `controlId` values are non-empty and unique.
- Implementation and runbook paths exist.
- Evidence entries are valid:
  - `repo_file` paths must exist,
  - `generated_artifact` paths must be under `output/smoke/`.
- Command gates listed in controls exist under `package.json` scripts.

## Failure Handling

1. If path checks fail:
   - correct stale paths or move references to the right files.
2. If command gate checks fail:
   - add/rename the script in `package.json`, or update matrix command names.
3. If evidence policy checks fail:
   - move generated artifact paths under `output/smoke/`,
   - keep static evidence under repo-tracked docs/snapshots/source paths.
4. Re-run `pnpm smoke:compliance-controls` until all checks pass.
