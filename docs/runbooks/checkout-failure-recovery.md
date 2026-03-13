# Checkout Failure Recovery Runbook

## Scope

- Primary endpoint: `POST /api/checkout`
- Dependent checkout edge endpoints:
  - `POST /api/cart/apply-coupon`
  - `DELETE /api/cart/remove-coupon`
  - `POST /api/shipping/calculate`
  - `POST /api/tax/calculate` (admin/internal calculations)
- Reliability controls:
  - request idempotency via `Idempotency-Key`,
  - Stripe checkout retries with bounded backoff,
  - structured transient error responses (`503` + recovery action),
  - coupon, shipping, and tax fallbacks with checkout warnings.

## Detection Signals

- Increased `503` or `5xx` from `POST /api/checkout`.
- Spike in `checkout_started` with drop in `purchase`.
- Support reports: coupon not applying, shipping/tax mismatches, checkout redirects failing.
- Repeated Stripe API transient errors (`429`, `5xx`, connection errors).

## Triage Checklist

1. Verify if failing requests include `Idempotency-Key`.
2. Check response class:
   - `400`: cart or validation issue,
   - `401`: auth/session issue,
   - `503`: transient provider/checkout dependency issue.
3. Confirm fallback warnings on checkout response payload (`warnings` array).
4. Inspect recent coupon state for affected carts (`coupon_code_id` presence and validity).
5. Validate shipping/tax dependency health (zones/rates/provider integration status).

## Recovery Playbooks

### 1) Stripe transient failures (`503`)

1. Retry checkout with the same `Idempotency-Key`.
2. If repeated failures continue:
   - pause aggressive checkout retries on clients,
   - monitor Stripe status and API error rates,
   - keep cart state intact and prompt retry.
3. If persistent beyond incident window, trigger customer communication + support workflow.

### 2) Coupon edge failures

1. Validate coupon still resolves to an active promotion.
2. If coupon is invalid/expired/over-limit, clear it from cart and continue checkout without coupon.
3. For eligibility misses (minimum/order conditions), keep cart alive and return actionable warning.

### 3) Shipping calculation failures

1. Validate shipping zone coverage for impacted address regions.
2. If carrier/zone calculation fails, fallback shipping estimate is applied.
3. If fallback estimates trend high, prioritize zone/rate data correction before full rollback.

### 4) Tax provider failures

1. Validate external tax provider connectivity.
2. If provider fails, local tax calculation fallback should auto-apply.
3. If both fail, proceed with tax `0` and flag warning; open follow-up for reconciliation.

## Rollback Procedure

1. Revert checkout reliability changes in a controlled deploy if regression is confirmed.
2. Disable high-risk checkout entry points in UI if needed (temporary checkout hold).
3. Preserve cart and coupon state; do not clear user carts during rollback.
4. Re-run smoke gates before re-enabling full checkout traffic.

## Validation Gates

- `pnpm -s tsc --noEmit --pretty false`
- `pnpm smoke:admin-parity`
- `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`
- `pnpm smoke:production`
