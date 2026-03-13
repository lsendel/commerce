# Technical SEO Smoke Runbook

## Scope

- Command: `pnpm smoke:seo`
- Script: `scripts/smoke-seo-audit.ts`
- Purpose:
  - audit technical SEO fundamentals on live pages,
  - publish machine-readable and human-readable reports,
  - catch metadata/canonical/sitemap/robots/JSON-LD regressions before rollout.

## Coverage

- `robots.txt`:
  - status and content-type checks,
  - required disallow rules (`/api`, `/admin`, `/platform`, `/account`, `/auth`),
  - sitemap directive exists and points to `/sitemap.xml`.
- `sitemap.xml`:
  - status and XML content-type checks,
  - non-empty URL set and duplicate detection,
  - required indexable path presence (`/`, `/products`, `/events`, `/venues`),
  - disallowed path exclusion (`/api`, `/admin`, `/platform`, `/account`, `/auth`).
- Metadata/canonical basics on key pages:
  - home, products list, events list, venues list,
  - sampled product/event detail pages from sitemap.
- Structured data basics:
  - JSON-LD payload parse validity,
  - required JSON-LD presence and schema `@type` extraction on detail pages.

## Modes

1. Default live audit:
   - `SMOKE_BASE_URL=https://<env-host> pnpm smoke:seo`
2. Skip HTTP mode (pipeline wiring smoke only):
   - `SMOKE_SEO_SKIP_HTTP=true pnpm smoke:seo`
3. Strict canonical-origin enforcement:
   - `SMOKE_SEO_STRICT_CANONICAL_ORIGIN=true pnpm smoke:seo`

## Artifacts

- JSON report:
  - `output/smoke/seo-audit-report.json`
- Markdown report:
  - `output/smoke/seo-audit-report.md`
- Optional path overrides:
  - `SMOKE_SEO_JSON_PATH`
  - `SMOKE_SEO_MD_PATH`

## Matrix Integration

- `pnpm smoke:e2e-matrix` runs `pnpm smoke:seo` as a command stage in live mode.
- SEO stage skip controls:
  - `SMOKE_MATRIX_SKIP_SEO=true` skips SEO stage.
  - `SMOKE_MATRIX_SKIP_HTTP=true` also skips SEO stage to preserve contract-only matrix runs.

## Failure Handling

1. Open `output/smoke/seo-audit-report.md` and triage by section:
   - `robots`, `sitemap`, `metadata`, `canonical`, `structured-data`.
2. Fix route behavior first (canonical/meta/output shape), then rerun `pnpm smoke:seo`.
3. Re-run `pnpm smoke:e2e-matrix` to verify command-stage integration.
