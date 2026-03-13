# Testing Architecture Design

## Summary

Multi-layer testing infrastructure for petm8.io using **Vitest** as the universal test runner and **Playwright** for browser-based E2E. Covers unit, integration, API contract, smoke, and end-to-end testing across storefront and admin surfaces.

## Decisions

- **Vitest-centric**: Single runner for unit, integration, API, and smoke tests. Playwright only for browser E2E.
- **OpenAPI from ts-rest**: Auto-generate OpenAPI spec from the 18 existing ts-rest contracts; API tests validate live responses against this spec.
- **Shared dev DB**: Integration tests run against a shared dev Neon database (no branch per test run).
- **Manual trigger only**: All test layers invoked via `pnpm test:*` scripts — no automated CI triggers initially.
- **Production smoke scope**: Health, pages, GraphQL, all integrations (Printful, Stripe, TaxJar, Segment, USPS, email), infrastructure (Neon DB, R2 bucket, CF Queues, cron status), and fulfillment providers (Printful, Gooten, Prodigi, Shapeways).

## Folder Structure

```
tests/
├── vitest.config.ts              # Root workspace config
├── setup/
│   ├── global-setup.ts           # Env validation, connection pre-checks
│   └── test-env.ts               # Shared BASE_URL, API keys, DB URL helpers
├── unit/
│   ├── domain/                   # Entity validation, value objects, services
│   │   ├── user.entity.test.ts
│   │   ├── cart-total.vo.test.ts
│   │   ├── promotion-evaluator.test.ts
│   │   └── tax-calculator.test.ts
│   └── application/              # Use case logic with mocked repositories
│       ├── create-checkout.test.ts
│       └── calculate-shipping.test.ts
├── integration/
│   ├── repositories/             # Repo methods against shared dev Neon DB
│   │   ├── user.repository.test.ts
│   │   ├── product.repository.test.ts
│   │   └── order.repository.test.ts
│   └── usecases/                 # Use cases with real DB, mocked externals
│       ├── add-to-cart.test.ts
│       └── create-checkout.test.ts
├── api/
│   ├── helpers/
│   │   ├── api-client.ts         # Typed HTTP client wrapping fetch
│   │   └── auth-helper.ts        # Login, get JWT for authenticated requests
│   ├── auth.api.test.ts
│   ├── products.api.test.ts
│   ├── cart.api.test.ts
│   ├── checkout.api.test.ts
│   ├── orders.api.test.ts
│   ├── subscriptions.api.test.ts
│   ├── bookings.api.test.ts
│   ├── ai-studio.api.test.ts
│   ├── fulfillment.api.test.ts
│   ├── affiliates.api.test.ts
│   ├── platform.api.test.ts
│   ├── venues.api.test.ts
│   ├── promotions.api.test.ts
│   ├── shipping.api.test.ts
│   ├── tax.api.test.ts
│   ├── reviews.api.test.ts
│   ├── analytics.api.test.ts
│   └── currency.api.test.ts
├── e2e/
│   ├── playwright.config.ts
│   ├── storefront/
│   │   ├── homepage.spec.ts
│   │   ├── product-browse.spec.ts
│   │   ├── cart-flow.spec.ts
│   │   └── auth-flow.spec.ts
│   └── admin/
│       ├── dashboard.spec.ts
│       ├── orders.spec.ts
│       ├── fulfillment.spec.ts
│       └── analytics.spec.ts
├── smoke/
│   ├── health.smoke.test.ts          # /health → 200, response < 2s
│   ├── pages.smoke.test.ts           # Key pages return 200 with expected content
│   ├── graphql.smoke.test.ts         # /graphql introspection returns valid schema
│   ├── integrations.smoke.test.ts    # Printful, Stripe, TaxJar, Segment, USPS, email
│   ├── infrastructure.smoke.test.ts  # Neon DB, R2 bucket, CF Queues, cron status
│   └── fulfillment.smoke.test.ts     # Printful, Gooten, Prodigi, Shapeways providers
└── fixtures/
    ├── test-user.ts                  # Test account credentials
    ├── test-products.ts              # Known product IDs for API tests
    └── factories.ts                  # Reusable test data factories
```

## Vitest Workspace Configuration

| Project       | Pattern                              | Required Env           | Timeout |
|---------------|--------------------------------------|------------------------|---------|
| `unit`        | `tests/unit/**/*.test.ts`            | None                   | 5s      |
| `integration` | `tests/integration/**/*.test.ts`     | `DATABASE_URL`         | 30s     |
| `api`         | `tests/api/**/*.test.ts`             | `BASE_URL`             | 15s     |
| `smoke`       | `tests/smoke/**/*.smoke.test.ts`     | `BASE_URL` + API keys  | 10s     |

Playwright runs separately via `pnpm test:e2e`.

## Package Scripts

```json
{
  "test": "vitest run",
  "test:unit": "vitest run --project unit",
  "test:integration": "vitest run --project integration",
  "test:api": "vitest run --project api",
  "test:smoke": "vitest run --project smoke",
  "test:e2e": "playwright test --config tests/e2e/playwright.config.ts",
  "test:watch": "vitest --project unit",
  "openapi:generate": "tsx scripts/generate-openapi.ts"
}
```

## OpenAPI Generation

A script at `scripts/generate-openapi.ts` uses `@ts-rest/open-api` to convert the unified ts-rest contract (`src/contracts/index.ts`, 18 sub-contracts) into `docs/openapi.json`. API tests import this spec to validate that live endpoint responses match the declared schemas.

## Smoke Test Details

### health.smoke.test.ts
- `GET {BASE_URL}/health` → status 200, body contains `{status: "ok"}`, response time < 2000ms

### pages.smoke.test.ts
- Homepage `/` → 200, contains `<title>` with "petm8"
- `/products` → 200, contains product listing markup
- `/login` → 200, contains login form
- `/register` → 200, contains registration form
- Admin pages (`/admin/dashboard`, `/admin/orders`) → 200 (with admin auth cookie)

### graphql.smoke.test.ts
- `POST {BASE_URL}/graphql` with `{ query: "{ __schema { types { name } } }" }` → 200, returns schema with expected type names

### integrations.smoke.test.ts
- **Printful**: `GET https://api.printful.com/stores` with Bearer token → 200
- **Stripe**: `stripe.accounts.retrieve()` succeeds
- **TaxJar**: `GET https://api.taxjar.com/v2/categories` with API key → 200
- **Segment**: Analytics endpoint reachable
- **USPS**: Carrier API endpoint responds
- **Email**: Notification provider API reachable

### infrastructure.smoke.test.ts
- **Neon DB**: Execute `SELECT 1` via the app's DB connection → returns `1`
- **R2 Bucket**: HEAD request to known test object in `petm8-images` → 200 or 404 (bucket accessible)
- **CF Queues**: Verify queue bindings exist (via app health/infra endpoint)
- **Cron Status**: Query `provider_health_snapshots` table for recent entries (within last cron interval)

### fulfillment.smoke.test.ts
- **Printful**: Provider health check (API reachable, store connected)
- **Gooten**: Provider health endpoint
- **Prodigi**: Provider health endpoint
- **Shapeways**: Provider health endpoint

## E2E Test Details

### Storefront (Playwright)
1. Homepage loads, header/navigation visible
2. Browse to `/products`, product cards render
3. Click a product → detail page loads with price, images
4. Add to cart → cart drawer updates count
5. Login/register forms submit without errors

### Admin (Playwright)
1. Login as admin user
2. Dashboard loads with analytics widgets
3. Navigate to orders → order table renders
4. Navigate to fulfillment → provider status visible
5. Navigate to analytics → charts render

## Dependencies to Add

```json
{
  "devDependencies": {
    "vitest": "^3.0.0",
    "@playwright/test": "^1.50.0",
    "@ts-rest/open-api": "^3.51.0"
  }
}
```

## Environment Variables for Tests

```env
# tests/.env.test (not committed)
BASE_URL=https://petm8.io
DATABASE_URL=postgresql://...  (shared dev)
PRINTFUL_API_KEY=...
STRIPE_SECRET_KEY=...
TAXJAR_API_KEY=...
```

## Non-Goals (for now)

- No automated CI triggers (manual only)
- No Neon branch-per-test-run
- No load/performance testing
- No visual regression testing
- No test coverage thresholds
