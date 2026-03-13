# Week 11 Summary (Segment Orchestration + Geo-Aware Catalog/Pricing)

## Status

- Week 11 execution started in YOLO mode.
- Scope: feature IDs `13` and `14`.

## Shipped This Week

- Added Week 11 feature flags:
  - `segment_orchestration`
  - `geo_aware_catalog_pricing`

- Segment orchestration implementation:
  - Added segment rule evaluator service scoped by `storeId` to prevent cross-store membership leakage.
  - Updated scheduled segment refresh job to use store-scoped evaluator.
  - Added admin API endpoint:
    - `POST /api/promotions/segments/:id/refresh`
  - Added repository methods for segment lookup and membership refresh persistence.
  - Wired admin segments UI `Refresh` action to call backend refresh endpoint.
  - Gated segment endpoints with `segment_orchestration` feature flag.

- Geo-aware catalog/pricing implementation:
  - Added geo pricing context resolver (country/currency detection + store currency config + exchange rate selection).
  - Added price conversion layer for product payloads.
  - Enabled geo-aware pricing in:
    - `GET /api/products`
    - `GET /api/products/:slug`
    - `GET /api/collections/:slug`
    - storefront pages `/products` and `/products/:slug`
  - Added pricing context in product responses where applicable.
  - Updated product UI components to render currency-aware formatting:
    - product cards, price display, variant selector, product list, product detail.
  - Updated variant-selector client script to format dynamic price changes in active currency.

- Contract parity updates:
  - Expanded `products.contract.ts` to include optional pricing metadata/context.
  - Expanded `promotions.contract.ts` with segment refresh endpoint + feature-disabled/error responses.

## Verification

- `pnpm typecheck` passed after Week 11 changes.

## Rollback

1. Disable `segment_orchestration` and `geo_aware_catalog_pricing` in `FEATURE_FLAGS`.
2. Disable or remove `/api/promotions/segments/:id/refresh` route and segment UI refresh action.
3. Remove geo-pricing transformation from product APIs/pages and revert to base-currency display.

## Next (Auto)

1. Week 12: upsell rules + split-shipment optimizer + carrier fallback routing kickoff.
2. Add Week 12 artifact with fulfillment/pricing automation parity and rollout checks.
