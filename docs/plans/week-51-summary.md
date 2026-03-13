# Week 51 Summary

## Scope

- Compliance control framework (SOC2-style control mapping to code/runbooks):
  - control-matrix v1 with explicit implementation + runbook mappings,
  - evidence-path policy and command-gate validation,
  - smoke/matrix/production coverage for compliance-critical surfaces.

## Shipped This Week

1. Added compliance control matrix v1 (policy + machine-readable source)
- Added [`/Users/lsendel/Projects/commerce/docs/policies/compliance-control-matrix-v1.md`](/Users/lsendel/Projects/commerce/docs/policies/compliance-control-matrix-v1.md):
  - SOC2-style control framework purpose, coverage snapshot, and update rules.
- Added [`/Users/lsendel/Projects/commerce/docs/policies/compliance-control-matrix-v1.json`](/Users/lsendel/Projects/commerce/docs/policies/compliance-control-matrix-v1.json):
  - source-of-truth control records (`CC-001` .. `CC-008`),
  - per-control implementation paths, runbooks, evidence paths, and smoke command gates.

2. Added compliance controls smoke gate
- Added [`/Users/lsendel/Projects/commerce/scripts/smoke-compliance-controls.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-compliance-controls.ts):
  - validates matrix integrity (`version`, unique `controlId`, required fields),
  - validates repository paths for implementation/runbook mappings,
  - validates evidence-path policy (`repo_file` must exist, `generated_artifact` must live under `output/smoke/`),
  - validates command gates exist in `package.json` scripts,
  - writes artifacts:
    - `output/smoke/compliance-controls-report.json`
    - `output/smoke/compliance-controls-report.md`.
- Updated [`/Users/lsendel/Projects/commerce/package.json`](/Users/lsendel/Projects/commerce/package.json):
  - added `smoke:compliance-controls`.

3. Wired compliance gate into matrix and production smoke coverage
- Updated [`/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts):
  - added `pnpm smoke:compliance-controls` command stage,
  - added skip flag `SMOKE_MATRIX_SKIP_COMPLIANCE_CONTROLS`.
- Updated [`/Users/lsendel/Projects/commerce/scripts/smoke-production.sh`](/Users/lsendel/Projects/commerce/scripts/smoke-production.sh):
  - added unauth admin compliance endpoint checks:
    - `GET /api/admin/policies/violations` -> `401`
    - `GET /api/admin/control-tower/summary` -> `401`.

4. Added Week 51 runbook updates
- Added [`/Users/lsendel/Projects/commerce/docs/runbooks/compliance-control-framework.md`](/Users/lsendel/Projects/commerce/docs/runbooks/compliance-control-framework.md):
  - control-matrix operating procedure and failure handling.
- Updated [`/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md`](/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md):
  - documented `smoke:compliance-controls` stage, skip flag, and HTTP-off behavior.

## Validation

- `pnpm -s tsc --noEmit --pretty false`
- `pnpm smoke:compliance-controls`
- `pnpm smoke:admin-parity`
- `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`
- `pnpm smoke:production`

## Week 51 Artifact Snapshot

- Compliance controls smoke report:
  - status: `passed`
  - controls: `8`
  - checks: `162/162` passed, `0` failed
  - artifact: `output/smoke/compliance-controls-report.json`
- Matrix:
  - includes `pnpm smoke:compliance-controls` stage and passes.
- Production smoke:
  - `ALL PASS: 85/85` on `https://petm8.io`.

## Next Week Kickoff

- Week 52: audit trail integrity and PII minimization retrofits.
