# Structured Data Coverage Smoke Runbook

## Scope

- Command: `pnpm smoke:structured-data`
- Script: `scripts/smoke-structured-data-coverage.ts`
- Purpose:
  - verify JSON-LD builder contracts (schema tests),
  - audit live structured-data coverage across indexable pages,
  - publish coverage evidence artifacts for release gating.

## Coverage

- Builder schema tests:
  - `buildOrganization`
  - `buildWebSite`
  - `buildCollectionPage`
  - `buildItemList`
  - `buildWebPage`
  - `buildPlace`
- Live JSON-LD coverage checks:
  - static pages: `/`, `/products`, `/events`, `/events/calendar`, `/venues`, `/about`, `/contact`
  - sampled detail pages from sitemap:
    - `/products/:slug`
    - `/events/:slug`
    - `/venues/:slug`
- Per-route expected schema type checks (examples):
  - home: `Organization`, `WebSite`
  - product/events/venues listings: `CollectionPage`, `ItemList`
  - about/contact: `AboutPage`, `ContactPage`
  - detail pages: `Product`, `Event`, `Place`

## Modes

1. Default live audit:
   - `SMOKE_BASE_URL=https://<env-host> pnpm smoke:structured-data`
2. Skip HTTP mode (builder tests only):
   - `SMOKE_STRUCTURED_DATA_SKIP_HTTP=true pnpm smoke:structured-data`

## Artifacts

- JSON report:
  - `output/smoke/structured-data-coverage-report.json`
- Markdown report:
  - `output/smoke/structured-data-coverage-report.md`
- Optional path overrides:
  - `SMOKE_STRUCTURED_DATA_JSON_PATH`
  - `SMOKE_STRUCTURED_DATA_MD_PATH`

## Matrix Integration

- `pnpm smoke:e2e-matrix` runs `pnpm smoke:structured-data` as a command stage.
- Skip controls:
  - `SMOKE_MATRIX_SKIP_STRUCTURED_DATA=true`
  - `SMOKE_MATRIX_SKIP_HTTP=true` (skips structured-data command stage with other live HTTP stages)

## Failure Handling

1. Open `output/smoke/structured-data-coverage-report.md`.
2. Triage failures in this order:
   - `schema-tests` failures in builder output contracts,
   - `live-coverage` JSON parse failures,
   - missing expected schema types on specific routes.
3. Patch route JSON-LD output and rerun:
   - `pnpm smoke:structured-data`
   - `pnpm smoke:e2e-matrix`
