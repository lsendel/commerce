# Week 12 Summary

## Scope

- Feature 15: intelligent upsell rules
- Feature 16: split-shipment optimizer
- Feature 17: carrier fallback routing

## Delivered

1. Feature flags
- Added `intelligent_upsell_rules` (15), `split_shipment_optimizer` (16), and `carrier_fallback_routing` (17) to [`/Users/lsendel/Projects/commerce/src/shared/feature-flags.ts`](/Users/lsendel/Projects/commerce/src/shared/feature-flags.ts).

2. Intelligent upsell rules engine
- Added `GetUpsellRecommendationsUseCase` with cart-aware related-product scoring and catalog fallback.
- Added `GET /api/cart/upsell-recommendations` endpoint behind `intelligent_upsell_rules`.
- Added contract parity for this endpoint in `cart.contract`.
- Updated `/cart` page server flow to prefer intelligent upsell suggestions and fall back to dynamic bundles.

3. Split-shipment optimizer and provider-shape hardening
- Updated fulfillment router provider selection to:
  - normalize provider types to the supported enum;
  - optionally optimize by lowest `costPrice` when enabled.
- Updated order fulfillment flow to:
  - request optimized routing when `split_shipment_optimizer` is on;
  - skip unroutable variants instead of casting invalid provider values into fulfillment request enums.
- Wired `split_shipment_optimizer` into Stripe webhook fulfillment execution.

4. Carrier fallback routing
- Updated shipping calculation to support `carrier_fallback` options when carrier-calculated rates are unavailable and fallback routing is enabled.
- Extended shipping option response shape with optional `fallbackRateId` and `fallbackReason`.
- Updated shipping contract schema to reflect the new `type` enum and fallback fields.
- Wired `carrier_fallback_routing` into:
  - `/api/shipping/calculate`;
  - checkout shipping estimation path.

## Parity and reliability impact

- Removed a provider-method/shape mismatch where unmapped fulfillment lines could be forced into invalid provider enum values.
- Brought backend responses and contracts into parity for upsell and shipping fallback shapes.
- Added explicit feature gating for newly introduced Week 12 behaviors.
