# Audit/PII Smoke Report

- Started: 2026-03-06T06:41:13.830Z
- Finished: 2026-03-06T06:41:13.856Z
- Status: passed
- Route files analyzed: 41
- Endpoints discovered: 287
- Mutation endpoints discovered: 162
- Coverage: 287/287 (100.00%)
- Mutation coverage: 162/162 (100.00%)

## Checks

| Check | Status | Note |
| --- | --- | --- |
| audit-middleware-registered | pass | Audit middleware must be mounted on /api/* in src/index.tsx. |
| route-discovery-has-endpoints | pass | API coverage discovery must identify route files and endpoints. |
| audit-coverage-all-endpoints | pass | Global middleware coverage requires /api/* auditing for all discovered endpoints (287). |
| audit-coverage-mutation-endpoints | pass | Mutation coverage requires /api/* auditing for discovered mutation endpoints (162). |
| pii-redaction-sensitive-keys | pass | PII keys (email/phone/password) must be replaced with [REDACTED]. |
| pii-redaction-nested-secrets | pass | Nested authorization and token fields must be redacted. |
| pii-redaction-freeform-string | pass | Freeform log strings containing bearer/email/token markers must be redacted. |
| audit-integrity-hash-shape | pass | Audit integrity hash must be a 64-char lowercase SHA-256 hex digest. |
| error-handler-redaction-hook | pass | Error handler must redact structured log entries before emitting. |
| audit-middleware-redaction-and-integrity | pass | Audit middleware must redact log payloads and include integrity hash generation. |

## File Coverage

| Route File | Mount Prefixes | Endpoints | Mutation Endpoints |
| --- | --- | --- | --- |
| src/routes/api/account.routes.ts | /api/account | 18 | 4 |
| src/routes/api/admin-collections.routes.ts | /api/admin/collections | 12 | 5 |
| src/routes/api/admin-orders.routes.ts | /api/admin | 9 | 2 |
| src/routes/api/admin-products.routes.ts | /api/admin | 27 | 12 |
| src/routes/api/affiliate.routes.ts | /api/affiliates | 32 | 5 |
| src/routes/api/ai-studio.routes.ts | /api/studio | 32 | 7 |
| src/routes/api/analytics.routes.ts | /api | 19 | 2 |
| src/routes/api/api-versioning.routes.ts | /api | 2 | 0 |
| src/routes/api/auth.routes.ts | /api/auth | 32 | 14 |
| src/routes/api/bookings.routes.ts | /api/bookings | 30 | 8 |
| src/routes/api/cache.routes.ts | /api | 2 | 1 |
| src/routes/api/cancellations.routes.ts | /api | 3 | 1 |
| src/routes/api/cart.routes.ts | /api | 34 | 6 |
| src/routes/api/checkout.routes.ts | /api | 8 | 1 |
| src/routes/api/control-tower.routes.ts | /api/admin | 2 | 0 |
| src/routes/api/currency.routes.ts | /api | 4 | 1 |
| src/routes/api/downloads.routes.ts | /api | 5 | 1 |
| src/routes/api/events.routes.ts | /api/events | 4 | 0 |
| src/routes/api/fulfillment-exceptions.routes.ts | /api/admin | 12 | 2 |
| src/routes/api/fulfillment.routes.ts | /api | 10 | 4 |
| src/routes/api/headless-api-packs.routes.ts | /api/admin | 6 | 2 |
| src/routes/api/headless-channel.routes.ts | /api/headless | 4 | 0 |
| src/routes/api/incident-responder.routes.ts | /api/admin | 9 | 2 |
| src/routes/api/integration-marketplace.routes.ts | /api/admin | 14 | 5 |
| src/routes/api/integrations.routes.ts | /api/integrations | 9 | 6 |
| src/routes/api/loyalty.routes.ts | /api | 6 | 1 |
| src/routes/api/orders.routes.ts | /api | 23 | 2 |
| src/routes/api/platform.routes.ts | /api/platform | 24 | 12 |
| src/routes/api/policies.routes.ts | /api/admin | 5 | 1 |
| src/routes/api/pricing-experiments.routes.ts | /api/admin | 15 | 4 |
| src/routes/api/products.routes.ts | /api | 11 | 0 |
| src/routes/api/promotions.routes.ts | /api/promotions | 31 | 10 |
| src/routes/api/reviews.routes.ts | /api | 15 | 5 |
| src/routes/api/shipping-zones.routes.ts | /api | 21 | 7 |
| src/routes/api/store-templates.routes.ts | /api/admin | 8 | 3 |
| src/routes/api/subscriptions.routes.ts | /api | 24 | 7 |
| src/routes/api/support.routes.ts | /api | 7 | 2 |
| src/routes/api/tax.routes.ts | /api/tax | 18 | 7 |
| src/routes/api/venue.routes.ts | /api/venues | 12 | 3 |
| src/routes/api/webhooks.routes.ts | /api | 5 | 1 |
| src/routes/api/workflows.routes.ts | /api/admin | 15 | 6 |

