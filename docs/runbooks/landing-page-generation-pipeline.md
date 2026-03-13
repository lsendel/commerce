# Landing Page Generation Pipeline Runbook

## Scope

- Command: `pnpm smoke:landing-pages`
- Script: `scripts/run-landing-page-pipeline.ts`
- Purpose:
  - generate campaign landing page artifacts from structured inputs,
  - enforce quality gates and brand consistency checks,
  - emit report artifacts for release decisions.

## Inputs

- Default input set:
  - embedded in `src/infrastructure/marketing/landing-page-pipeline.ts`
- Optional custom input file:
  - set `LP_PIPELINE_INPUT_PATH=<path-to-json-array>`

## Output Artifacts

- Generated landing pages:
  - `output/landing-pages/<slug>.json`
  - `output/landing-pages/<slug>.md`
- Pipeline reports:
  - `output/smoke/landing-page-pipeline-report.json`
  - `output/smoke/landing-page-pipeline-report.md`

## Environment Overrides

- `LP_PIPELINE_OUTPUT_DIR`
- `LP_PIPELINE_REPORT_JSON_PATH`
- `LP_PIPELINE_REPORT_MD_PATH`

## Matrix Integration

- `pnpm smoke:e2e-matrix` includes `pnpm smoke:landing-pages` command stage.
- Skip control:
  - `SMOKE_MATRIX_SKIP_LANDING_PAGES=true`
- Note:
  - this stage is content-pipeline validation (not HTTP-bound), so it still runs in `SMOKE_MATRIX_SKIP_HTTP=true` mode unless explicitly skipped.

## Failure Handling

1. Open `output/smoke/landing-page-pipeline-report.md`.
2. Identify failed gates by slug and check id.
3. Fix one of:
   - campaign input values,
   - pipeline generation logic,
   - brand guardrail configuration.
4. Re-run `pnpm smoke:landing-pages`.

## Quality Standard

- Follow rubric:
  - `docs/policies/landing-page-qa-rubric.md`
