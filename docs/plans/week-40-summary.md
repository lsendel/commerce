# Week 40 Summary

## Scope

- Checkout/payment edge automation for:
  - coupon correctness in checkout pricing,
  - shipping/tax fallback behavior on dependency failures,
  - checkout idempotency + transient failure recovery,
  - smoke and runbook coverage for checkout failure modes.

## Shipped This Week

1. Checkout request model + contract hardening
- Extended checkout request schema in [`/Users/lsendel/Projects/commerce/src/shared/validators.ts`](/Users/lsendel/Projects/commerce/src/shared/validators.ts):
  - optional `couponCode`,
  - optional `shippingAddress` payload.
- Updated checkout contract in [`/Users/lsendel/Projects/commerce/src/contracts/checkout.contract.ts`](/Users/lsendel/Projects/commerce/src/contracts/checkout.contract.ts):
  - create response now includes `appliedCouponCode` and `warnings`,
  - added explicit `404` and `503` recovery response shapes.

2. Checkout idempotency + transient error recovery
- Added idempotency key handling for `POST /api/checkout` in [`/Users/lsendel/Projects/commerce/src/routes/api/checkout.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/checkout.routes.ts):
  - request header in/out: `Idempotency-Key`,
  - deterministic fallback key generation.
- Added structured transient error response (`503`) with retry guidance.

3. Checkout Stripe mutation reliability
- Updated Stripe checkout adapter [`/Users/lsendel/Projects/commerce/src/infrastructure/stripe/checkout.adapter.ts`](/Users/lsendel/Projects/commerce/src/infrastructure/stripe/checkout.adapter.ts):
  - retry with backoff for transient Stripe/network failures,
  - Stripe request idempotency propagation,
  - support for explicit line-item display labels.

4. Coupon/shipping/tax edge automation in checkout pricing
- Updated [`/Users/lsendel/Projects/commerce/src/application/checkout/create-checkout.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/checkout/create-checkout.usecase.ts):
  - validates and applies explicit or persisted cart coupons at checkout time,
  - prevents coupon-only promotions from auto-applying unless coupon is applied,
  - applies free-shipping promotions to computed shipping cost,
  - uses fallback shipping estimate when shipping calculation cannot produce priced options,
  - emits checkout warnings for coupon/shipping/tax fallback conditions,
  - charges Stripe with discount-adjusted cart lines plus shipping/tax lines for charge-total parity,
  - propagates checkout idempotency key to Stripe session creation.

5. Tax-provider failure fallback
- Updated [`/Users/lsendel/Projects/commerce/src/application/tax/calculate-tax.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/tax/calculate-tax.usecase.ts):
  - external tax-provider failures now fall back to local tax rules instead of hard-failing.

6. Cart coupon persistence visibility + parity coverage
- Cart repository now returns applied coupon snapshot in [`/Users/lsendel/Projects/commerce/src/infrastructure/repositories/cart.repository.ts`](/Users/lsendel/Projects/commerce/src/infrastructure/repositories/cart.repository.ts).
- Cart page context now hydrates `couponCode` from cart state in [`/Users/lsendel/Projects/commerce/src/index.tsx`](/Users/lsendel/Projects/commerce/src/index.tsx).
- Added cart coupon endpoints to cart contract in [`/Users/lsendel/Projects/commerce/src/contracts/cart.contract.ts`](/Users/lsendel/Projects/commerce/src/contracts/cart.contract.ts).
- Added coupon lookup by ID for persisted cart coupons in [`/Users/lsendel/Projects/commerce/src/infrastructure/repositories/promotion.repository.ts`](/Users/lsendel/Projects/commerce/src/infrastructure/repositories/promotion.repository.ts).
- Extended promotion evaluation controls in [`/Users/lsendel/Projects/commerce/src/application/promotions/evaluate-cart-promotions.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/promotions/evaluate-cart-promotions.usecase.ts).

7. Checkout failure-mode smoke and rollback ops docs
- Expanded parity smoke contract checks in [`/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts):
  - `POST /api/cart/apply-coupon`
  - `DELETE /api/cart/remove-coupon`
  - `POST /api/checkout`
  - `GET /api/checkout/success`
- Expanded E2E failure-mode checks in [`/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts):
  - coupon validation/not-found paths,
  - shipping calculate validation path,
  - checkout unauth gate.
- Expanded production smoke coverage in [`/Users/lsendel/Projects/commerce/scripts/smoke-production.sh`](/Users/lsendel/Projects/commerce/scripts/smoke-production.sh):
  - `POST /api/cart/apply-coupon` validation path,
  - `POST /api/checkout` unauth gate.
- Added checkout incident/rollback runbook:
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/checkout-failure-recovery.md`](/Users/lsendel/Projects/commerce/docs/runbooks/checkout-failure-recovery.md)
- Updated smoke runbooks:
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md`](/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md)
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md`](/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md)

## Validation

- `pnpm -s tsc --noEmit --pretty false`
- `pnpm smoke:admin-parity`
- `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`
- `pnpm smoke:e2e-matrix`
- `pnpm smoke:production`

## Next Week Kickoff

- Week 41: technical SEO automation (metadata/canonical/sitemap/robots/structured-basics) with automated checks and report artifacts.
