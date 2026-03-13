# Week 41 Summary

## Scope

- Technical SEO automation for:
  - metadata/canonical baseline checks,
  - `robots.txt` and `sitemap.xml` governance checks,
  - structured-data parse/coverage basics,
  - smoke artifact generation and runbook integration.

## Shipped This Week

1. Added technical SEO smoke/audit automation
- New script: [`/Users/lsendel/Projects/commerce/scripts/smoke-seo-audit.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-seo-audit.ts)
  - validates `robots.txt` rules and sitemap directive,
  - validates `sitemap.xml` URL coverage and disallowed-path exclusions,
  - audits metadata/canonical tags on key indexable routes,
  - validates JSON-LD parseability and basic schema coverage,
  - emits JSON + Markdown artifacts under `output/smoke/`.

2. Integrated SEO checks into smoke execution pipeline
- Added npm script in [`/Users/lsendel/Projects/commerce/package.json`](/Users/lsendel/Projects/commerce/package.json):
  - `smoke:seo`
- Updated matrix orchestration in [`/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts):
  - new command stage `pnpm smoke:seo`,
  - new `seo-public-assets` HTTP checks (`/robots.txt`, `/sitemap.xml`, `/llms.txt`),
  - skip controls for SEO stage in contract-only mode.
- Updated production smoke in [`/Users/lsendel/Projects/commerce/scripts/smoke-production.sh`](/Users/lsendel/Projects/commerce/scripts/smoke-production.sh):
  - added SEO endpoint checks for `/robots.txt`, `/sitemap.xml`, `/llms.txt`.

3. Runtime SEO baseline improvements
- Updated [`/Users/lsendel/Projects/commerce/src/index.tsx`](/Users/lsendel/Projects/commerce/src/index.tsx):
  - `robots.txt`: added `Disallow: /auth/`,
  - `sitemap.xml`: removed auth pages from indexed URL set,
  - added meta descriptions to key indexable routes (`/`, `/events`, `/venues`).
- Updated [`/Users/lsendel/Projects/commerce/src/routes/pages/product-detail.page.tsx`](/Users/lsendel/Projects/commerce/src/routes/pages/product-detail.page.tsx):
  - switched product/breadcrumb JSON-LD script injection to valid `dangerouslySetInnerHTML` JSON output.

4. Runbooks and operational docs
- New runbook:
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/technical-seo-smoke.md`](/Users/lsendel/Projects/commerce/docs/runbooks/technical-seo-smoke.md)
- Updated matrix runbook:
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md`](/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md)

## Validation

- `pnpm -s tsc --noEmit --pretty false`
- `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`
- `pnpm smoke:production`
- `pnpm smoke:seo` (expected to fail on current deployed target while surfacing live SEO gaps)
- `pnpm smoke:e2e-matrix` (fails on SEO command stage for the same live gaps)

## Live SEO Audit Snapshot

- `pnpm smoke:seo` currently reports live-environment gaps in the deployed target:
  - `robots.txt` missing `Disallow: /auth/`,
  - `sitemap.xml` still includes auth URLs,
  - some indexable pages missing meta description in deployed output.
- These findings are captured in:
  - `output/smoke/seo-audit-report.json`
  - `output/smoke/seo-audit-report.md`

## Next Week Kickoff

- Week 42: LLM-search surface optimization (`llms.txt` governance, discoverability policy rules, and enforcement checks).
