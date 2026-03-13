# Commerce Critical Path Matrix

Date: **March 6, 2026**

This matrix freezes the YOLO release scope around the core commerce path and records the current implementation status observed in the repo.

| Area | UI | API / Use Case | Smoke Coverage | Status | Notes |
|---|---|---|---|---|---|
| Home | `/` | server-rendered route in `src/index.tsx` | public page checks in smoke matrix | `partial` | Works, but messaging is still too broad and not sharply ecommerce-first. |
| Product list | `/products` | `GET /api/products` | public page + API checks | `green` | Core browse path exists and is already in smoke coverage. |
| Product detail | `/products/:slug` | `GET /api/products/:slug` + review/cart interactions | indirect smoke only | `partial` | Strong implementation, but conversion/trust copy still needs uplift. |
| Cart | `/cart` | `GET /api/cart`, coupon endpoints, cart validation | API checks + failure-mode checks | `green` | Core cart path exists with preflight validation and coupon handling. |
| Checkout create | cart drawer / cart page -> `/api/checkout` | `CreateCheckoutUseCase` | auth-gate + failure-mode coverage | `partial` | Pricing breakdown exists; shipping/tax/fulfillment scoping needed hardening. |
| Checkout success | `/checkout/success` + `/api/checkout/success` | `OrderRepository.findByStripeSessionId` | success endpoint contract check | `partial` | Order summary exists but breakdown exposure and fulfillment metadata integrity were incomplete. |
| Account orders | `/account/orders` | `/api/account/orders` | gate coverage | `partial` | Core view exists; depends on order integrity and shipping detail persistence. |
| AI art -> product | `/studio/preview/:id` -> `/products/create/:artJobId` | `/api/admin/products/from-art`, `/api/admin/products/:id/mockup` | not in main smoke path | `partial` | Flow exists and is feature-gated, but needs stronger operator path validation. |
| Admin products | `/admin/products`, `/admin/products/:id/edit` | admin product routes | admin gate coverage | `partial` | Broad surface exists; happy-path parity is incomplete. |
| Admin orders | `/admin/orders`, `/admin/orders/:id` | admin order routes | admin gate coverage | `partial` | Operator detail exists and needs authoritative order data. |
| Admin fulfillment | `/admin/fulfillment`, `/admin/fulfillment/:id` | fulfillment retry/cancel endpoints | admin gate coverage | `partial` | Good visibility surface; depends on request/idempotency/order integrity. |
| Printful integration | admin integrations + webhooks | Printful client, webhook handler, fulfillment queue | Printful/newman + matrix command stages | `partial` | Infrastructure is present; checkout metadata and webhook scoping were critical gaps. |

## Release Scope

In scope for YOLO:

- storefront conversion path
- checkout totals and success flow
- order creation integrity
- AI studio to sellable product flow
- Printful-first fulfillment
- admin orders and fulfillment
- stable smoke execution

Defer or hide:

- non-core social/community work
- multi-provider depth beyond existing Printful-first path
- operator surfaces that cannot be made trustworthy during this pass
