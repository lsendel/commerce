# Week 43 Summary

## Scope

- Structured data and content schema expansion for:
  - PDP/category/editorial pages,
  - JSON-LD coverage auditing,
  - schema-level builder tests,
  - smoke pipeline integration and release checklists.

## Shipped This Week

1. Expanded JSON-LD builder primitives
- Updated [`/Users/lsendel/Projects/commerce/src/infrastructure/seo/json-ld.ts`](/Users/lsendel/Projects/commerce/src/infrastructure/seo/json-ld.ts):
  - added `buildItemList`,
  - added `buildWebPage` (`WebPage`/`AboutPage`/`ContactPage` etc.),
  - extended `buildPlace` to include canonical `url`.

2. Expanded route-level structured data coverage
- Updated [`/Users/lsendel/Projects/commerce/src/index.tsx`](/Users/lsendel/Projects/commerce/src/index.tsx):
  - home now emits `Organization` + `WebSite` + `WebPage` graph,
  - products/events/venues listing routes now emit `CollectionPage` + `ItemList`,
  - events calendar now emits `CollectionPage`,
  - about/contact routes now emit `AboutPage` and `ContactPage`,
  - venue detail route now emits `Place`.

3. Added structured-data coverage + schema smoke
- New script [`/Users/lsendel/Projects/commerce/scripts/smoke-structured-data-coverage.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-structured-data-coverage.ts):
  - runs builder schema tests,
  - audits live JSON-LD coverage from public routes + sitemap-sampled detail pages,
  - validates required schema type presence by route,
  - writes coverage artifacts to `output/smoke/`.
- Added script command in [`/Users/lsendel/Projects/commerce/package.json`](/Users/lsendel/Projects/commerce/package.json):
  - `smoke:structured-data`.

4. Integrated into matrix pipeline
- Updated [`/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts):
  - adds `pnpm smoke:structured-data` command stage,
  - adds `SMOKE_MATRIX_SKIP_STRUCTURED_DATA` stage skip control.

5. Runbooks/checklists
- Added runbooks:
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/structured-data-coverage-smoke.md`](/Users/lsendel/Projects/commerce/docs/runbooks/structured-data-coverage-smoke.md)
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/structured-data-coverage-checklist.md`](/Users/lsendel/Projects/commerce/docs/runbooks/structured-data-coverage-checklist.md)
- Updated matrix runbook:
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md`](/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md)

## Validation

- `pnpm -s tsc --noEmit --pretty false`
- `SMOKE_STRUCTURED_DATA_SKIP_HTTP=true pnpm smoke:structured-data`
- `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`
- `pnpm smoke:production`
- `pnpm smoke:structured-data` (expected to fail on current deployed target until Week 43 rollout)
- `pnpm smoke:e2e-matrix` (expected to fail on command stage while deployed SEO/LLM/structured-data surfaces lag repo)

## Live Structured Data Snapshot

- `pnpm smoke:structured-data` currently reports 18 failures in deployed output, mainly:
  - missing listing/editorial JSON-LD on deployed `/products`, `/events`, `/events/calendar`, `/venues`, `/about`, `/contact`,
  - home missing `WebSite` type in deployed output,
  - deployed PDP still contains invalid inline JSON-LD blocks and missing `BreadcrumbList`.
- Report artifacts:
  - `output/smoke/structured-data-coverage-report.json`
  - `output/smoke/structured-data-coverage-report.md`

## Next Week Kickoff

- Week 44: landing page generation pipeline with quality gates and brand consistency checks.
