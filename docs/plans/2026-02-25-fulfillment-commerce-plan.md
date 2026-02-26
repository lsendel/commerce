# Fulfillment Commerce Flows — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build end-to-end fulfillment commerce: AI Art to Product creation, multi-provider fulfillment with idempotency, cancellation/refund coordination, digital downloads, and admin tooling.

**Architecture:** Vertical slices shipping thin end-to-end flows. Existing `FulfillmentProvider` interface + `providerProductMappings` (many-to-one) are promoted from interface-level to flow-level via `fulfillment_requests` decoupling table + `FulfillmentRouter`. Idempotency gates at every layer.

**Tech Stack:** Hono + Cloudflare Workers, Drizzle ORM + Neon PostgreSQL, Stripe (dynamic pricing + refunds), R2 (art storage + downloads), Cloudflare Queues.

**Design doc:** `docs/plans/2026-02-25-fulfillment-commerce-design.md`

**Verification:** `npx tsc --noEmit` after every code task.

---

## Slice A: AI Art to Sellable Product (Printful Only)

Closes the number 1 gap: generated art can become purchasable products.

---

### Task 1: Schema — Add art/digital/fulfillment columns + design_placements table

**Files:**
- Modify: `src/infrastructure/db/schema.ts`
- Create: `scripts/sql/add-fulfillment-commerce-tables.sql`

**Step 1:** In `src/infrastructure/db/schema.ts`, add `artJobId` column to `products` table after `seoDescription` (~line 373):
```typescript
artJobId: uuid("art_job_id").references(() => generationJobs.id),
```

**Step 2:** Add columns to `productVariants` after `availableForSale` (~line 402):
```typescript
digitalAssetKey: text("digital_asset_key"),
fulfillmentProvider: text("fulfillment_provider"),
estimatedProductionDays: integer("estimated_production_days"),
```

**Step 3:** Update `productsRelations` to add `artJob` and `designPlacements` relations.

**Step 4:** Add `designPlacements` table after `providerProductMappingsRelations` (~line 1194): columns are `id`, `productId` (FK cascade), `area`, `imageUrl`, `x`, `y`, `scale`, `rotation`, `printAreaId`, `providerMeta` (jsonb), `createdAt`.

**Step 5:** Create `scripts/sql/add-fulfillment-commerce-tables.sql` with `ALTER TABLE` for products/variants and `CREATE TABLE IF NOT EXISTS` for design_placements.

**Step 6:** Run `npx tsc --noEmit` — expect 0 errors.

**Step 7:** Commit: `feat: add art_job_id, digital_asset_key, design_placements schema`

---

### Task 2: Domain — DesignPlacement entity

**Files:**
- Create: `src/domain/catalog/design-placement.entity.ts`

**Step 1:** Create entity interface with fields matching the schema. Add `PLACEMENT_AREAS` const array (`front`, `back`, `all_over`, `left_chest`, etc.) and `PlacementArea` type.

**Step 2:** Run `npx tsc --noEmit`. Commit: `feat: add DesignPlacement domain entity`

---

### Task 3: Use case — CreateProductFromArtUseCase

**Files:**
- Create: `src/application/catalog/create-product-from-art.usecase.ts`

**Step 1:** Write the use case. It:
1. Verifies art job exists, belongs to user, status is `completed`
2. Generates slug from name + timestamp
3. Creates product with `artJobId` FK
4. Creates variants with optional `digitalAssetKey`, `fulfillmentProvider`, `estimatedProductionDays`
5. Creates `providerProductMappings` if `providerId` + `externalVariantId` given
6. Creates `designPlacements` records
7. Creates `productImages` from mockup URLs or art URL
8. Returns `{ product, variants, placementCount, imageCount }`

**Price lock-in:** Retail price on variant. Cost price on provider mapping. Customer pays variant price at checkout.

**Step 2:** Run `npx tsc --noEmit`. Commit: `feat: add CreateProductFromArtUseCase`

---

### Task 4: API routes — Product creation endpoints

**Files:**
- Create: `src/routes/api/admin-products.routes.ts`
- Modify: `src/index.tsx` (~line 152)

**Step 1:** Create Hono router with two endpoints:
- `POST /products/from-art` — Zod-validated body, calls `CreateProductFromArtUseCase`
- `POST /products/:id/mockup` — Calls existing `GenerateMockupUseCase`

Both require auth via `requireAuth()`.

**Step 2:** Mount in index.tsx: `app.route("/api/admin", adminProductRoutes);`

**Step 3:** Run `npx tsc --noEmit`. Commit: `feat: add product creation API endpoints`

---

### Task 5: Page — Product creation wizard

**Files:**
- Create: `src/routes/pages/platform/create-product.page.tsx`
- Create: `public/scripts/create-product.js`
- Modify: `src/index.tsx` (add page route at `/products/create/:artJobId`)
- Modify: `src/routes/pages/studio/preview.page.tsx` (change "Order as Print" to "Create Product")

**Step 1:** Create wizard page component with:
- Art preview image
- Product Details fieldset (name, description, type select: physical/digital)
- Design Placement fieldset (area select)
- Variants fieldset (dynamic rows: title + price, "Add Variant" button)
- Fulfillment Provider select (from active providers)
- Save as Draft / Publish buttons

**Step 2:** Create `create-product.js` client script:
- Add/remove variant rows using DOM createElement (not innerHTML for XSS safety)
- Form submit handler: collects variants, builds JSON body, POSTs to `/api/admin/products/from-art`
- Redirects to product page on success

**Step 3:** Add page route in index.tsx at `/products/create/:artJobId`. Loads art job from `AiJobRepository`, loads providers from `fulfillmentProviders` table.

**Step 4:** Update studio preview page: change "Order as Print" button href to `/products/create/${jobId}` and label to "Create Product".

**Step 5:** Run `npx tsc --noEmit`. Commit: `feat: add product creation wizard page and client JS`

---

## Slice B: Fulfillment Requests + Multi-Provider Infrastructure

Makes the flow-level abstraction real. Decouples orders from providers.

---

### Task 6: Schema — fulfillment_requests, fulfillment_request_items, provider_events tables

**Files:**
- Modify: `src/infrastructure/db/schema.ts`
- Modify: `scripts/sql/add-fulfillment-commerce-tables.sql`

**Step 1:** Add `fulfillmentRequestStatusEnum` after `integrationStatusEnum` (~line 168): `pending`, `submitted`, `processing`, `shipped`, `delivered`, `cancel_requested`, `cancelled`, `failed`.

**Step 2:** Add `fulfillmentRequests` table: `id`, `storeId`, `orderId`, `provider`, `providerId`, `externalId`, `status`, `itemsSnapshot` (jsonb), `costEstimatedTotal`, `costActualTotal`, `costShipping`, `costTax`, `currency`, `refundStripeId`, `refundAmount`, `refundStatus`, `errorMessage`, `submittedAt`, `completedAt`, `createdAt`, `updatedAt`. Indexes on `orderId` and `(provider, externalId)`.

**Step 3:** Add `fulfillmentRequestItems` join table: `id`, `fulfillmentRequestId` (FK cascade), `orderItemId`, `providerLineId`, `quantity`, `status`, `createdAt`, `updatedAt`.

**Step 4:** Add `providerEvents` table: `id`, `storeId`, `provider`, `externalEventId`, `externalOrderId`, `eventType`, `payload` (jsonb), `receivedAt`, `processedAt`, `errorMessage`. Unique index on `(provider, externalEventId)` WHERE not null.

**Step 5:** Modify `shipments` table: add `fulfillmentRequestId` FK and `raw` jsonb column.

**Step 6:** Modify `orders` table: add `cancelReason` text and `cancelledAt` timestamp.

**Step 7:** Update `ordersRelations`: add `fulfillmentRequests: many(fulfillmentRequests)`.

**Step 8:** Append all DDL to `scripts/sql/add-fulfillment-commerce-tables.sql`.

**Step 9:** Run `npx tsc --noEmit`. Commit: `feat: add fulfillment_requests, fulfillment_request_items, provider_events schema`

---

### Task 7: Domain — FulfillmentRequest and ProviderEvent entities

**Files:**
- Create: `src/domain/fulfillment/fulfillment-request.entity.ts`
- Create: `src/domain/fulfillment/provider-event.entity.ts`

**Step 1:** Create `FulfillmentRequest` interface, `FulfillmentRequestItem` interface, `FulfillmentRequestStatus` type, `CANCELLABLE_STATUSES` const, `SUBMITTED_STATUSES` const.

**Step 2:** Create `ProviderEvent` interface.

**Step 3:** Run `npx tsc --noEmit`. Commit: `feat: add FulfillmentRequest and ProviderEvent domain entities`

---

### Task 8: Repository — FulfillmentRequestRepository

**Files:**
- Create: `src/infrastructure/repositories/fulfillment-request.repository.ts`

**Step 1:** Write repository with standard per-request DI: `constructor(db, storeId)`. Methods:
- `create(data)` — inserts request + items
- `findById(id)` — scoped by storeId
- `findByOrderId(orderId)`
- `findByExternalId(provider, externalId)`
- `findItemsByRequestId(requestId)`
- `updateStatus(id, status, extra?)` — flexible update with optional fields
- `findPendingByProvider(provider)` — for polling jobs
- `insertProviderEvent(data)` — uses `onConflictDoNothing().returning()`, returns null for duplicates (Layer 4 idempotency gate)
- `markEventProcessed(eventId)`

**Step 2:** Run `npx tsc --noEmit`. Commit: `feat: add FulfillmentRequestRepository with idempotent event insertion`

---

### Task 9: FulfillmentRouter — Provider selection

**Files:**
- Create: `src/infrastructure/fulfillment/fulfillment-router.ts`

**Step 1:** Write the router. It queries `providerProductMappings` joined with `fulfillmentProviders` (active only). Strategy: "default" — first active mapping. Methods:
- `selectProvider(variantId, storeId)` returns `RoutingResult | null`
- `selectProvidersForVariants(variantIds[], storeId)` returns `Map<string, RoutingResult>`

The data model already supports many-to-one (unique on `variantId + providerId`). Future strategies are a router change, not a schema change.

**Step 2:** Run `npx tsc --noEmit`. Commit: `feat: add FulfillmentRouter for provider selection`

---

### Task 10: Enhanced FulfillOrderUseCase — create fulfillment requests

**Files:**
- Modify: `src/application/checkout/fulfill-order.usecase.ts` (lines 136-146)

**Step 1:** Replace the "Queue fulfillment for physical items" section with:
1. Use `FulfillmentRouter.selectProvidersForVariants()` to resolve providers
2. Group items by provider type
3. Create one `FulfillmentRequest` per group via `FulfillmentRequestRepository`
4. Enqueue one message per request: `{ fulfillmentRequestId, provider, storeId }`

Idempotency: requests are created in the same flow as orders (Layer 1 + Layer 2).

**Step 2:** Run `npx tsc --noEmit`. Commit: `feat: enhance FulfillOrderUseCase to create fulfillment requests per provider`

---

### Task 11: New FulfillmentQueueConsumer with idempotency

**Files:**
- Modify: `src/queues/order-fulfillment.consumer.ts` (full rewrite)

**Step 1:** Rewrite consumer:
1. Parse `{ fulfillmentRequestId, provider, storeId }` from message
2. Handle legacy `{ orderId }` messages (ack and skip)
3. **Idempotency gate:** `request.externalId != null` or `request.status != 'pending'` means skip
4. Resolve API key via `ResolveSecretUseCase`
5. Build provider via `createFulfillmentProvider()`
6. Build `FulfillmentOrderItem[]` from request items + order items + variants + mappings
7. Call `provider.createOrder()`
8. Write `externalId` + `status = 'submitted'` in same DB operation
9. 4xx errors: mark failed, ack. 5xx/network: retry.

**Step 2:** Run `npx tsc --noEmit`. Commit: `feat: rewrite fulfillment queue consumer with multi-provider + idempotency`

---

### Task 12: Webhook router with provider event recording

**Files:**
- Create: `src/infrastructure/fulfillment/webhook-router.ts`
- Modify: `src/routes/api/fulfillment.routes.ts`

**Step 1:** Create `FulfillmentWebhookRouter` class:
- `processEvent(event)` — records event (dedup), finds request by externalOrderId, updates status, creates shipment, aggregates order status
- `aggregateOrderStatus(orderId)` — derives order status from all its requests

**Step 2:** Update Printful webhook handler in `fulfillment.routes.ts` to also record events via router. Add Prodigi webhook endpoint (stub verification for now).

**Step 3:** Run `npx tsc --noEmit`. Commit: `feat: add webhook router with provider event recording and idempotency`

---

### Task 13: Admin fulfillment dashboard page

**Files:**
- Create: `src/routes/pages/admin/fulfillment-dashboard.page.tsx`
- Create: `public/scripts/admin-fulfillment.js`
- Modify: `src/index.tsx` (add page route)

**Step 1:** Create dashboard page with stats cards and requests table (status badges, retry buttons for failed).

**Step 2:** Create `admin-fulfillment.js` for retry button clicks.

**Step 3:** Add page route at `/admin/fulfillment`.

**Step 4:** Run `npx tsc --noEmit`. Commit: `feat: add admin fulfillment dashboard with request table and retry`

---

## Slice C: Cancellation + Refund Coordination

---

### Task 14: CancelOrderUseCase

**Files:**
- Create: `src/application/checkout/cancel-order.usecase.ts`

**Step 1:** Write use case:
1. Verify order belongs to user and is cancellable
2. For each fulfillment request: pending=cancel locally, submitted/processing=call provider.cancelOrder, shipped=reject
3. Compute refund amount from cancellable items
4. Update order status
5. Return `{ success, cancelledRequests, failedRequests, refundAmount, message }`

**Step 2:** Run `npx tsc --noEmit`. Commit: `feat: add CancelOrderUseCase with per-request cancellation`

---

### Task 15: Cancellation API route + orders page cancel button

**Files:**
- Create: `src/routes/api/cancellations.routes.ts`
- Create: `public/scripts/order-cancel.js`
- Modify: `src/index.tsx` (mount route)
- Modify: `src/routes/pages/account/orders.page.tsx` (add cancel button + script)

**Step 1:** Create `POST /orders/:orderId/cancel` API route.

**Step 2:** Create external `order-cancel.js` script for cancel button click handler.

**Step 3:** Add cancel button to orders page for processing/pending orders. Add script reference.

**Step 4:** Run `npx tsc --noEmit`. Commit: `feat: add cancellation API route and cancel button on orders page`

---

## Slice D: Digital Downloads

---

### Task 16: Schema — download_tokens table

**Files:**
- Modify: `src/infrastructure/db/schema.ts`
- Modify: `scripts/sql/add-fulfillment-commerce-tables.sql`

**Step 1:** Add `downloadTokens` table with `id`, `storeId`, `userId`, `orderId`, `orderItemId`, `token` (unique), `expiresAt`, `downloadedAt`, `revoked`, `createdAt`. Index on `token`.

**Step 2:** Append DDL to SQL migration script.

**Step 3:** Run `npx tsc --noEmit`. Commit: `feat: add download_tokens table for digital product delivery`

---

### Task 17: GenerateDownloadUrlUseCase + API route

**Files:**
- Create: `src/application/catalog/generate-download-url.usecase.ts`
- Create: `src/routes/api/downloads.routes.ts`
- Modify: `src/index.tsx` (mount route)

**Step 1:** Write use case: verify ownership, check not refunded, check variant has digitalAssetKey, rate limit (10/hour), create token, return URL.

**Step 2:** Create downloads route:
- `POST /downloads/generate` — auth required, creates token
- `GET /downloads/:token` — validates token, serves file from R2 or redirects to URL

**Step 3:** Mount route in index.tsx.

**Step 4:** Run `npx tsc --noEmit`. Commit: `feat: add digital download with token-based access control`

---

## Slice E: Gooten Polling Job

---

### Task 18: Gooten order status polling job

**Files:**
- Create: `src/scheduled/gooten-polling.job.ts`
- Modify: `src/scheduled/handler.ts`

**Step 1:** Write polling job: queries Gooten requests in submitted/processing, polls `getOrder()` for each, maps status, processes via `FulfillmentWebhookRouter.processEvent()` as synthetic events. Rate limited: 1s between calls, max 60 per run.

**Step 2:** Wire into `*/5 * * * *` cron in handler.ts.

**Step 3:** Run `npx tsc --noEmit`. Commit: `feat: add Gooten order status polling job (every 5 minutes)`

---

## Slice F: Prodigi Webhook Verification

---

### Task 19: Prodigi webhook signature verification

**Files:**
- Modify: `src/infrastructure/fulfillment/prodigi.provider.ts`

**Step 1:** Replace stubbed `verifyWebhook` with HMAC-SHA256 via Web Crypto. Constant-time comparison.

**Step 2:** Run `npx tsc --noEmit`. Commit: `feat: implement Prodigi webhook HMAC-SHA256 signature verification`

---

## Final Tasks

---

### Task 20: Retry endpoint for admin fulfillment dashboard

**Files:**
- Modify: `src/routes/api/admin-products.routes.ts`

**Step 1:** Add `POST /admin/fulfillment/:id/retry`: load request, verify failed status, reset to pending, re-enqueue.

**Step 2:** Run `npx tsc --noEmit`. Commit: `feat: add fulfillment request retry endpoint for admin dashboard`

---

### Task 21: Final verification

**Step 1:** Run `npx tsc --noEmit` — expect 0 errors.

**Step 2:** Review `scripts/sql/add-fulfillment-commerce-tables.sql` for completeness.

**Step 3:** Commit any fixes: `fix: address remaining type errors from full verification`

---

## Summary

| Slice | Tasks | What it delivers |
|---|---|---|
| A: AI Art to Product | 1-5 | Product creation wizard, schema, use case, API, page |
| B: Fulfillment Requests | 6-13 | Multi-provider infrastructure, idempotency, webhook router, admin dashboard |
| C: Cancellation | 14-15 | Cancel use case, API route, customer UI |
| D: Digital Downloads | 16-17 | Download tokens, use case, API route, R2 serving |
| E: Gooten Polling | 18 | Status polling job for webhook-less provider |
| F: Prodigi Webhooks | 19 | HMAC signature verification |
| Final | 20-21 | Admin retry endpoint, full verification |

**Total: 21 tasks across 6 vertical slices.**
