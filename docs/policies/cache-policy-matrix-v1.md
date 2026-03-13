# Cache Policy Matrix v1

## Purpose

- Define cache TTL/tag policy for high-traffic surfaces.
- Tie cache invalidation triggers to concrete mutation and webhook paths.
- Keep edge-cache behavior verifiable via smoke evidence before release.

## Source of Truth

- Policy: `docs/policies/cache-policy-matrix-v1.json`
- Invalidation plan: `src/infrastructure/cache/invalidation-plan.ts`
- Invalidation executor: `src/infrastructure/cache/invalidation-executor.ts`
- Smoke gate: `pnpm smoke:cache-invalidation`
- Artifacts:
  - `output/smoke/cache-invalidation-report.json`
  - `output/smoke/cache-invalidation-report.md`

## Surface Domains

1. Catalog listing/detail:
   - `/api/products`
   - `/api/products/:slug`
   - `/api/collections`
   - `/api/products/collections`
   - `/api/collections/:slug`
2. Bookable events:
   - `/api/events`
   - `/api/events/:slug`
3. Currency pricing context:
   - `/api/currency/rates`

## Required Enforcement

1. Every `surfaces[*]` entry must include:
   - `routePath`, `sourcePath`, `ttlSeconds`, `tags`, `requiredSnippets`, and `targetHitRatePercent`.
2. Every `invalidationTriggers[*]` entry must include:
   - `sourcePath`, `resourceTypes`, and `requiredSnippets`.
3. `resourceTypeCoverage` must include all supported invalidation resources:
   - `product`, `collection`, `event`, `currency_rates`, `products_listing`, `collections_listing`, `events_listing`.
4. Policy review window (`nextReviewBy`) must stay inside `reviewCadenceDays`.

## Weekly Review

- Owner: `commerce-edge-platform`
- Cadence: 14 days
- Review output:
  - cache invalidation smoke report,
  - stale-surface triage list,
  - any required invalidation-plan updates.
