# Week 42 Summary

## Scope

- LLM-search surface optimization for:
  - `llms.txt` governance and discoverability controls,
  - AI-plugin manifest consistency checks,
  - automated LLM-surface smoke/report artifacts,
  - policy and checklist documentation for release gating.

## Shipped This Week

1. Centralized LLM-surface governance builders
- Added shared module [`/Users/lsendel/Projects/commerce/src/infrastructure/seo/llm-surface.ts`](/Users/lsendel/Projects/commerce/src/infrastructure/seo/llm-surface.ts):
  - canonical `llms.txt` template builder,
  - required heading/rule constants for enforcement,
  - AI-plugin manifest builder with discoverability guidance.
- Updated route wiring in [`/Users/lsendel/Projects/commerce/src/index.tsx`](/Users/lsendel/Projects/commerce/src/index.tsx):
  - `/llms.txt` now uses the shared governance template,
  - `/.well-known/ai-plugin.json` now uses the shared manifest builder.

2. Added automated LLM-surface smoke
- New script [`/Users/lsendel/Projects/commerce/scripts/smoke-llm-surface.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-llm-surface.ts):
  - validates `llms.txt` heading/rule coverage and endpoint references,
  - validates AI-plugin manifest shape and key fields,
  - performs cross-endpoint consistency checks,
  - writes JSON/Markdown reports in `output/smoke/`.
- Added npm command in [`/Users/lsendel/Projects/commerce/package.json`](/Users/lsendel/Projects/commerce/package.json):
  - `smoke:llm-surface`.

3. Smoke pipeline integration
- Updated matrix smoke in [`/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts):
  - adds `pnpm smoke:llm-surface` command stage,
  - adds HTTP check for `/.well-known/ai-plugin.json`,
  - adds skip control `SMOKE_MATRIX_SKIP_LLM_SURFACE`.
- Updated production smoke in [`/Users/lsendel/Projects/commerce/scripts/smoke-production.sh`](/Users/lsendel/Projects/commerce/scripts/smoke-production.sh):
  - adds `/.well-known/ai-plugin.json` endpoint check.

4. LLM-surface governance docs
- Added checklist:
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/llm-surface-checklist.md`](/Users/lsendel/Projects/commerce/docs/runbooks/llm-surface-checklist.md)
- Added smoke runbook:
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/llm-surface-smoke.md`](/Users/lsendel/Projects/commerce/docs/runbooks/llm-surface-smoke.md)
- Added content policy rules:
  - [`/Users/lsendel/Projects/commerce/docs/policies/llm-discoverability-rules.md`](/Users/lsendel/Projects/commerce/docs/policies/llm-discoverability-rules.md)
- Updated matrix runbook:
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md`](/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md)

## Validation

- `pnpm -s tsc --noEmit --pretty false`
- `SMOKE_LLM_SKIP_HTTP=true pnpm smoke:llm-surface`
- `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`
- `pnpm smoke:production`
- `pnpm smoke:llm-surface` (expected to fail on current deployed target until Week 42 code is deployed)
- `pnpm smoke:e2e-matrix` (expected to fail on command stage while deployed SEO/LLM surfaces lag repo changes)

## Live LLM Audit Snapshot

- Current deployed environment still serves pre-Week-42 `llms.txt` content.
- `pnpm smoke:llm-surface` reports 19 live failures, mainly:
  - missing required governance headings,
  - missing discoverability rule lines,
  - missing canonical line,
  - missing key machine endpoint references (`robots`, `llms`, plugin URL).
- Report artifacts:
  - `output/smoke/llm-surface-report.json`
  - `output/smoke/llm-surface-report.md`

## Next Week Kickoff

- Week 43: structured data/content schema expansion for PDP/category/editorial pages with JSON-LD coverage reporting and schema tests.
