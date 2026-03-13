# Recommendation Ranking Quality Runbook

## Scope

- Ranking module:
  - `src/infrastructure/marketing/recommendation-ranking.ts`
- Upsell recommendation surface:
  - `src/application/cart/get-upsell-recommendations.usecase.ts`
- Related product fallback surface:
  - `src/infrastructure/repositories/product.repository.ts`
- Quality command:
  - `pnpm smoke:recommendation-quality`

## Ranking Behavior

1. Primary ranking signals
- co-purchase/related source boost
- collection overlap boost
- cart price-fit boost
- inventory availability boost/penalty
- value signal boost (`compareAtPrice > price`)
- recency freshness boost

2. Fallback tiers
- Tier 1: related/co-purchase candidates
- Tier 2: same-type catalog fallback
- Tier 3: newest catalog fallback

3. Traceability
- Ranked recommendation reasons include model version tag (`wk48-ranking-v1`).

## Quality Gate

1. Run:
- `pnpm smoke:recommendation-quality`
2. Report artifacts:
- `output/smoke/recommendation-quality-report.json`
- `output/smoke/recommendation-quality-report.md`
3. Gate criteria:
- no failed checks,
- fallback reason coverage checks pass.

## Matrix Integration

- Included in `pnpm smoke:e2e-matrix`.
- Skip only this stage:
  - `SMOKE_MATRIX_SKIP_RECOMMENDATION_QUALITY=true pnpm smoke:e2e-matrix`

## Failure Handling

1. If quality check fails:
- inspect failed checks in markdown report,
- adjust ranking weights/reasons/fallback tier logic,
- re-run `pnpm smoke:recommendation-quality`.

2. If recommendation output quality regresses:
- revert to catalog fallback by disabling intelligent upsell flag:
  - remove `intelligent_upsell_rules` from `FEATURE_FLAGS`,
- redeploy and re-run smoke matrix.
