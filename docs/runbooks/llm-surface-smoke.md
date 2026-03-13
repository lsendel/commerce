# LLM Surface Smoke Runbook

## Scope

- Command: `pnpm smoke:llm-surface`
- Script: `scripts/smoke-llm-surface.ts`
- Purpose:
  - enforce `llms.txt` governance shape and minimum quality,
  - validate AI-plugin manifest integrity,
  - verify discoverability consistency between LLM-facing endpoints.

## Coverage

- `llms.txt`:
  - status + content-type checks,
  - required governance headings,
  - required discoverability rules,
  - key public page URLs,
  - machine endpoint URLs (`sitemap`, `robots`, `llms`, plugin manifest, GraphQL).
- `/.well-known/ai-plugin.json`:
  - status + content-type checks,
  - JSON parse validity,
  - required top-level fields,
  - GraphQL API descriptor validity,
  - legal info URL validity.
- Consistency checks:
  - `llms.txt` references plugin manifest and GraphQL endpoint,
  - plugin API endpoint is represented in `llms.txt`.

## Modes

1. Default live audit:
   - `SMOKE_BASE_URL=https://<env-host> pnpm smoke:llm-surface`
2. Skip HTTP mode (pipeline wiring validation only):
   - `SMOKE_LLM_SKIP_HTTP=true pnpm smoke:llm-surface`

## Artifacts

- JSON report:
  - `output/smoke/llm-surface-report.json`
- Markdown report:
  - `output/smoke/llm-surface-report.md`
- Optional path overrides:
  - `SMOKE_LLM_JSON_PATH`
  - `SMOKE_LLM_MD_PATH`

## Matrix Integration

- `pnpm smoke:e2e-matrix` runs `pnpm smoke:llm-surface` as a command stage.
- Skip controls:
  - `SMOKE_MATRIX_SKIP_LLM_SURFACE=true` skips only LLM-surface command stage.
  - `SMOKE_MATRIX_SKIP_HTTP=true` skips HTTP checks and LLM/SEO command stages.

## Failure Handling

1. Open `output/smoke/llm-surface-report.md`.
2. Fix section failures in this order:
   - `llms` (governance/content rules),
   - `ai-plugin` (manifest correctness),
   - `consistency` (cross-endpoint references).
3. Re-run `pnpm smoke:llm-surface`, then `pnpm smoke:e2e-matrix`.
