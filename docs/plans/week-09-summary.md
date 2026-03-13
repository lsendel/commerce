# Week 09 Summary (Self-Serve Returns + Instant Exchanges)

## Status

- Week 9 execution started in YOLO mode.
- Scope: feature ID `9` (`self_serve_returns_exchange`).

## Shipped This Week

- Added Week 9 feature flag:
  - `self_serve_returns_exchange` in `src/shared/feature-flags.ts`.
- Added return/exchange request persistence model:
  - new enums: `return_request_type`, `return_request_status`.
  - new table: `order_return_requests`.
  - migration: `0016_order_returns_exchange_requests.sql`.
- Added backend repository + use case:
  - `OrderReturnRepository` for creating/listing return/exchange requests.
  - `ManageReturnExchangeUseCase` for eligibility checks, return-window policy, amount calculation, and request submission.
- Added API endpoints (feature-flag gated, authenticated):
  - `GET /api/orders/returns`
  - `GET /api/orders/:id/return-options`
  - `POST /api/orders/:id/returns`
- Implemented instant exchange behavior:
  - exchange requests can automatically add replacement variants to cart.
  - supports partial add-to-cart failures with `207` response and failure details.
- Extended account orders UX:
  - new `Return/Exchange` action on eligible orders.
  - eligibility signals wired from account route (status + return window).
  - new client script `public/scripts/order-returns.js` for end-user request flow.
- Updated contract parity:
  - `orders.contract.ts` now includes returns/exchange endpoints and response shapes.
  - shared validators include `createReturnExchangeRequestSchema`.

## Verification

- `pnpm typecheck` (run after implementation).

## Rollback

1. Disable `self_serve_returns_exchange` in `FEATURE_FLAGS`.
2. Remove or block `/api/orders/returns` and `/api/orders/:id/return-options`, `/api/orders/:id/returns` endpoints.
3. Hide return/exchange button in account orders page by disabling feature flag wiring.
4. Leave `order_return_requests` table in place; stop writes/reads from the feature paths.

## Next (Auto)

1. Week 10: affiliate mission dashboard + creator storefront pages implementation kickoff.
2. Add Week 10 artifact with acquisition flow parity and smoke evidence.
