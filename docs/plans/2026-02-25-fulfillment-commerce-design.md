# Fulfillment Commerce Flows — Design Document

## Goals

1. Close the "AI Art → Sellable Product" gap so generated art can become purchasable items.
2. Build multi-provider fulfillment infrastructure that routes, tracks, and reconciles orders across Printful, Gooten, and Prodigi.
3. Add cancellation/refund coordination between Stripe and fulfillment providers.
4. Enable digital product downloads with access control.
5. Provide admin tooling for fulfillment operations (dashboard, retry, margin reporting).
6. Ship incrementally via vertical slices — each slice is a thin end-to-end flow, not a horizontal layer.

## Non-Goals

- **Returns/RMA**: Out of scope. Handled manually through provider dashboards.
- **Buyer personalization at cart time**: We support configured designs at product creation time. We do NOT yet support buyer personalization (names, dates, custom text) at cart time.
- **Shapeways**: Explicitly deferred. Placeholder in Phase 7 so it's tracked.
- **Multi-currency**: All prices in USD for now. Currency fields are added to the schema for future use.
- **Subscription fulfillment**: Subscription products remain digital/service-based, not physical.

---

## Domain Model

### Entities

| Entity | Bounded Context | Purpose |
|---|---|---|
| `Order` | Checkout | Customer order with payment info |
| `OrderItem` | Checkout | Line item with denormalized product data |
| `FulfillmentRequest` | Fulfillment | One provider job per order (1 order → N requests) |
| `FulfillmentRequestItem` | Fulfillment | Normalized join: request ↔ order item (enables partial cancel/ship/refund) |
| `Shipment` | Fulfillment | One physical package (1 request → N shipments) |
| `ProviderEvent` | Fulfillment | Inbound webhook/poll record (audit + idempotency) |
| `DownloadToken` | Catalog | Short-lived access token for digital product delivery |
| `DesignPlacement` | Catalog | Art positioning on product template (portable across providers) |

### Entity Relationships

```
Order 1──* OrderItem
Order 1──* FulfillmentRequest
FulfillmentRequest 1──* FulfillmentRequestItem
FulfillmentRequestItem *──1 OrderItem
FulfillmentRequest 1──* Shipment
FulfillmentRequest *──1 FulfillmentProvider (via provider type)
ProviderEvent *──1 FulfillmentRequest (via external_order_id)
Product 1──* DesignPlacement
ProductVariant *──* FulfillmentProvider (via providerProductMappings, many-to-one)
```

---

## State Machines

### Order Status

```
pending → processing → partially_shipped → shipped → delivered
    ↓         ↓              ↓
 cancelled  cancel_requested  partially_cancelled
    ↓         ↓              ↓
 refunded   cancelled → refunded
```

New statuses to add to `orderStatusEnum`: `partially_shipped`, `partially_cancelled`, `cancel_requested`.

Order status is **derived** from its fulfillment requests:
- ALL requests pending → `processing`
- SOME requests shipped → `partially_shipped`
- ALL requests shipped → `shipped`
- ALL requests delivered → `delivered`
- Cancel requested but pending provider confirmation → `cancel_requested`
- SOME cancelled, rest proceeding → `partially_cancelled`
- ALL cancelled → `cancelled`

### Fulfillment Request Status

```
pending → submitted → processing → shipped → delivered
   ↓         ↓           ↓
 failed   cancel_requested → cancelled
              ↓
           failed (cancel rejected by provider)
```

| Status | Meaning |
|---|---|
| `pending` | Created, not yet sent to provider |
| `submitted` | Sent to provider, awaiting acknowledgment |
| `processing` | Provider confirmed, in production |
| `shipped` | All items in this request shipped |
| `delivered` | Carrier confirmed delivery |
| `cancel_requested` | Cancel sent to provider, awaiting confirmation |
| `cancelled` | Provider confirmed cancellation |
| `failed` | Provider rejected order or unrecoverable error |

### Shipment Status

```
pending → in_transit → delivered
                ↓
             returned
```

---

## Core Flows

### Flow 1: AI Art → Sellable Product

```
AI Studio → Generate Art → R2 Storage
  ↓
"Create Product" button on art detail page
  ↓
ProductCreationWizard (3 steps):

  Step 1: Choose product template
    - Fetches available templates from active fulfillment providers
    - Templates are provider catalog items (t-shirt, mug, poster, etc.)
    - Shows estimated cost price per provider

  Step 2: Configure design placement + variants
    - Position art on product (front, back, all-over, etc.)
    - Select available sizes/colors
    - Provider-specific options loaded dynamically
    - Print readiness validation:
      * Minimum resolution (300 DPI for print, 150 DPI for large format)
      * Color space check (RGB for digital, CMYK conversion noted)
      * Bleed/safe-area warnings per product template
      * Background handling (transparent PNG vs flattened)

  Step 3: Preview mockups + set pricing
    - Generate mockups via provider API (Printful has this)
    - Fallback for providers without mockup API:
      * Use original art + generic product frame overlay
      * Or static placeholder with art thumbnail
    - Set retail price per variant
    - Show cost breakdown: provider cost + shipping estimate = margin
    - Default pricing rules: suggest retail = cost × 2.5, rounded to .99
    - Product status: "draft" until user clicks "Publish"
  ↓
CreateProductFromArtUseCase:
  - Creates product record (artJobId FK to generation_jobs)
  - Creates variants with selected sizes/colors
  - Creates providerProductMappings (one per variant per provider)
  - Creates designPlacements records
  - Generates mockup images → productImages table
  - Status: draft
```

**Price lock-in**: The retail price set at creation time is stored on the variant. The cost price at order time is recorded on the fulfillment request (estimated) and updated when the provider invoices (actual). The customer always pays the variant's retail price at time of checkout.

### Flow 2: Checkout → Fulfillment

```
Customer adds to cart → Stripe Checkout
  ↓
Stripe webhook: checkout.session.completed
  ↓
FulfillOrderUseCase (enhanced):
  1. Idempotency check: findByStripeSessionId (existing, works)
  2. Create order + order items (existing, works)
  3. NEW: Group order items by fulfillment provider
     - Look up providerProductMappings for each variant
     - Use FulfillmentRouter to select provider (default: primary mapping)
  4. NEW: Create one FulfillmentRequest per provider group
     - Status: pending
     - Store cost_estimated_total from providerProductMappings.costPrice
     - Create FulfillmentRequestItems joining to order items
  5. NEW: Enqueue one message per FulfillmentRequest
     - Message: { fulfillmentRequestId, provider }
     - NOT just { orderId } — each request is independently fulfillable
  6. Handle bookable items (existing, unchanged)
  7. Handle digital items: no fulfillment request, just mark as available for download
  8. Decrement inventory (existing, unchanged)
  9. Clear cart (existing, unchanged)
```

### Flow 3: Queue Consumer → Provider Order Creation

```
FulfillmentQueueConsumer receives { fulfillmentRequestId, provider }
  ↓
1. Load FulfillmentRequest from DB
2. IDEMPOTENCY GATE:
   - If request.externalId is NOT NULL → already submitted, ack and skip
   - If request.status is NOT 'pending' → already processed, ack and skip
3. Use ProviderFactory.create(provider) to get provider adapter
4. Build provider order payload from request items
5. Call provider.createOrder()
6. IN SAME TRANSACTION:
   - Set request.externalId = provider's order ID
   - Set request.status = 'submitted'
   - Set request.submittedAt = now()
7. Ack message

On failure:
  - If provider returned 4xx (bad request): mark request as 'failed', ack (don't retry)
  - If provider returned 5xx or network error: retry (message.retry())
  - If provider supports idempotency keys: include fulfillmentRequestId as key
```

### Flow 4: Provider Updates (Webhooks + Polling)

```
Inbound webhook or poll result
  ↓
1. Write to provider_events table
   - Check unique(provider, external_event_id) — if duplicate, skip
   - Store full payload for audit
2. Route to provider-specific handler
3. Handler maps provider status → fulfillment request status
4. Update fulfillment_request status
5. If shipped: create Shipment record
6. Aggregate order status from all its fulfillment requests
7. Mark provider_event as processed

Gooten special case:
  - No webhooks — use scheduled polling job
  - Poll every 5 minutes for orders in 'submitted' or 'processing' status
  - Synthetic events written to provider_events with event_type = 'poll_status_update'
  - Same handler pipeline after that
```

### Flow 5: Cancellation + Refund

```
Customer requests cancellation (via API or UI)
  ↓
CancelOrderUseCase:
  1. Load order with fulfillment requests
  2. For each fulfillment_request:
     a. If status = 'pending' (not yet submitted):
        - Set status = 'cancelled' directly
     b. If status = 'submitted' or 'processing':
        - Call provider.cancelOrder(externalId)
        - Set status = 'cancel_requested'
        - Wait for provider webhook/poll to confirm
     c. If status = 'shipped' or 'delivered':
        - Cannot cancel (reject for this request)
  3. Compute refund:
     - Sum retail prices of cancellable items (from fulfillment_request_items → order_items)
     - If ALL requests cancellable: full refund
     - If SOME requests cancellable: partial refund for cancelled items only
     - If NONE cancellable: reject cancellation entirely
  4. Issue Stripe refund:
     - IDEMPOTENCY: Check if refund already exists (unique refund per fulfillment_request)
     - Store: refund_stripe_id, refund_amount, refund_status on fulfillment_request
     - Stripe handles partial refunds natively
  5. Update order status based on aggregate request statuses

Provider-initiated cancellation (e.g., out of stock):
  - Provider webhook → update fulfillment_request → 'cancelled'
  - Auto-trigger refund for affected items
  - Notify customer via email
  - Update order status
```

### Flow 6: Digital Downloads

```
Customer purchases digital/hybrid product
  ↓
FulfillOrderUseCase:
  - For digital items: no fulfillment request created
  - Mark order item as downloadable immediately
  ↓
Customer visits "My Orders" → clicks "Download"
  ↓
GET /api/orders/:orderId/items/:itemId/download
  ↓
GenerateDownloadUrlUseCase:
  1. Validate: user owns order, order is paid, item is digital
  2. Create DownloadToken:
     - Stored server-side with: userId, orderId, orderItemId, expiresAt (1 hour)
     - Check: is order refunded? If yes, deny download
     - Check: download count limit (optional, default unlimited)
  3. Generate signed R2 URL (1 hour expiry) for the digital asset
  4. Log download event for audit
  5. Return redirect to signed URL

Access control:
  - Downloads disabled after full refund or chargeback
  - Download tokens are revocable (set expiresAt = now)
  - Rate limiting: max 10 downloads per hour per user per item
  - Preview: watermarked version shown on product page; full resolution after purchase

Asset format:
  - Deliver the original generation output (SVG or PNG)
  - For hybrid products: same art file, not the mockup
```

---

## Provider Adapter Contract

### Required Methods (all providers must implement)

| Method | Purpose |
|---|---|
| `createOrder(externalId, recipient, items, options?)` | Submit order to provider |
| `getOrder(externalOrderId)` | Fetch order status + tracking |
| `cancelOrder(externalOrderId)` | Request cancellation |
| `getCatalog(page?)` | Fetch product templates |
| `verifyWebhook(payload, signature)` | Validate inbound webhook |

### Optional Methods (provider-specific capabilities)

| Method | Purpose | Providers |
|---|---|---|
| `getShippingRates(recipient, items)` | Real-time shipping quotes | Printful, Gooten |
| `generateMockup(productId, files, options)` | Product mockup images | Printful |
| `getOrderCosts(externalOrderId)` | Actual fulfillment costs | All (where available) |

### Provider-Specific Notes

| Provider | Webhook Model | Pricing Model | Catalog Model | Status |
|---|---|---|---|---|
| Printful | Push (HMAC-SHA256) | Cost + shipping separate | Sync products | Reference impl |
| Gooten | Poll (no webhooks) | Cost + shipping separate | Recipe-based | Phase 4 |
| Prodigi | Push (signature header) | All-inclusive (shipping included) | SKU-based | Phase 5 |
| Shapeways | Push (TBD) | Cost + shipping | Material-based | Deferred (Phase 7) |

### FulfillmentRouter

Selects which provider mapping to use when a variant has multiple provider options.

```
FulfillmentRouter.selectProvider(variantId, storeId):
  1. Fetch all providerProductMappings for variant
  2. Filter to active providers only
  3. Selection strategy (initially: "default")
     - "default": use the first active mapping (by creation order)
     - Future: "cheapest", "fastest", "region-based"
  4. Return selected mapping (providerId, externalVariantId, costPrice)
```

The data model already supports this — `providerProductMappings` has a unique index on `(variantId, providerId)`, not on `variantId` alone. A variant can already map to multiple providers.

---

## Data Model + Migrations

### New Enums

```sql
-- Add to orderStatusEnum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'partially_shipped';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'partially_cancelled';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancel_requested';

-- New enum for fulfillment request status
CREATE TYPE fulfillment_request_status AS ENUM (
  'pending', 'submitted', 'processing', 'shipped',
  'delivered', 'cancel_requested', 'cancelled', 'failed'
);
```

### New Tables

#### `fulfillment_requests`

The core decoupling primitive: one provider job per order group.

```sql
CREATE TABLE fulfillment_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              uuid NOT NULL REFERENCES stores(id),
  order_id              uuid NOT NULL REFERENCES orders(id),
  provider              fulfillment_provider_type NOT NULL,
  provider_id           uuid REFERENCES fulfillment_providers(id),
  external_id           text,                          -- provider's order ID (idempotency gate)
  status                fulfillment_request_status DEFAULT 'pending',
  items_snapshot        jsonb NOT NULL,                 -- immutable snapshot for audit
  cost_estimated_total  decimal(10,2),                  -- estimated at order time
  cost_actual_total     decimal(10,2),                  -- filled from provider invoice/settlement
  cost_shipping         decimal(10,2),                  -- provider shipping cost
  cost_tax              decimal(10,2),                  -- provider tax/VAT
  currency              text DEFAULT 'USD',
  refund_stripe_id      text,                           -- Stripe refund ID if cancelled
  refund_amount         decimal(10,2),
  refund_status         text,                           -- 'pending', 'succeeded', 'failed'
  error_message         text,
  submitted_at          timestamp,
  completed_at          timestamp,
  created_at            timestamp DEFAULT now(),
  updated_at            timestamp DEFAULT now()
);

CREATE INDEX fulfillment_requests_order_idx ON fulfillment_requests(order_id);
CREATE INDEX fulfillment_requests_external_idx ON fulfillment_requests(provider, external_id);
```

#### `fulfillment_request_items`

Normalized join table — enables partial cancel/ship/refund and per-item status tracking.

```sql
CREATE TABLE fulfillment_request_items (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_request_id  uuid NOT NULL REFERENCES fulfillment_requests(id) ON DELETE CASCADE,
  order_item_id           uuid NOT NULL REFERENCES order_items(id),
  provider_line_id        text,                -- provider's per-line identifier (if available)
  quantity                integer NOT NULL,
  status                  text DEFAULT 'pending',  -- mirrors request status or item-level override
  created_at              timestamp DEFAULT now(),
  updated_at              timestamp DEFAULT now()
);

CREATE INDEX fulfillment_request_items_request_idx ON fulfillment_request_items(fulfillment_request_id);
```

#### `provider_events`

Webhook/poll audit log + idempotency for inbound events.

```sql
CREATE TABLE provider_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          uuid NOT NULL REFERENCES stores(id),
  provider          fulfillment_provider_type NOT NULL,
  external_event_id text,                     -- provider's event ID (for dedup)
  external_order_id text,                     -- provider's order ID (for lookup)
  event_type        text NOT NULL,
  payload           jsonb NOT NULL,           -- full raw payload for debugging
  received_at       timestamp DEFAULT now(),
  processed_at      timestamp,
  error_message     text
);

-- Idempotency: skip duplicate webhooks
CREATE UNIQUE INDEX provider_events_dedup_idx
  ON provider_events(provider, external_event_id)
  WHERE external_event_id IS NOT NULL;
```

#### `download_tokens`

Server-side access tokens for digital product delivery.

```sql
CREATE TABLE download_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid NOT NULL REFERENCES stores(id),
  user_id         uuid NOT NULL REFERENCES users(id),
  order_id        uuid NOT NULL REFERENCES orders(id),
  order_item_id   uuid NOT NULL REFERENCES order_items(id),
  token           text NOT NULL UNIQUE,
  expires_at      timestamp NOT NULL,
  downloaded_at   timestamp,
  revoked         boolean DEFAULT false,
  created_at      timestamp DEFAULT now()
);

CREATE INDEX download_tokens_token_idx ON download_tokens(token);
```

#### `design_placements`

Art positioning on product templates — portable across providers.

```sql
CREATE TABLE design_placements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  area            text NOT NULL,               -- 'front', 'back', 'all_over', 'left_chest', etc.
  image_url       text NOT NULL,               -- R2 URL of the art file
  x               decimal(8,2) DEFAULT 0,      -- position offset
  y               decimal(8,2) DEFAULT 0,
  scale           decimal(5,3) DEFAULT 1.0,
  rotation        decimal(5,2) DEFAULT 0,
  print_area_id   text,                        -- provider-specific print area identifier
  provider_meta   jsonb DEFAULT '{}',          -- provider-specific placement data
  created_at      timestamp DEFAULT now()
);

CREATE INDEX design_placements_product_idx ON design_placements(product_id);
```

### Schema Modifications

#### `products` — add art reference

```sql
ALTER TABLE products ADD COLUMN art_job_id uuid REFERENCES generation_jobs(id);
```

#### `product_variants` — add digital asset + fulfillment metadata

```sql
ALTER TABLE product_variants ADD COLUMN digital_asset_key text;       -- R2 key for downloadable file
ALTER TABLE product_variants ADD COLUMN fulfillment_provider text;    -- default provider type
ALTER TABLE product_variants ADD COLUMN estimated_production_days integer;
```

#### `shipments` — add fulfillment_request FK

```sql
ALTER TABLE shipments ADD COLUMN fulfillment_request_id uuid REFERENCES fulfillment_requests(id);
ALTER TABLE shipments ADD COLUMN raw jsonb;  -- provider payload snapshot
```

#### `orders` — cancellation tracking

The existing `orderStatusEnum` is extended (see enums above). Add columns:

```sql
ALTER TABLE orders ADD COLUMN cancel_reason text;
ALTER TABLE orders ADD COLUMN cancelled_at timestamp;
```

---

## Idempotency Guarantees

### Layer 1: Stripe → Order Creation

**Existing and correct.** `FulfillOrderUseCase` checks `findByStripeSessionId` before creating. Stripe webhook retries are safe.

### Layer 2: Order → Fulfillment Request Creation

New guarantee: `FulfillOrderUseCase` creates fulfillment requests inside the same flow as order creation. If the flow is re-entered (webhook retry), the order already exists (Layer 1 catches it), so requests are never duplicated.

### Layer 3: Queue Consumer → Provider Order Submission

**The most critical gate.** Queue messages are at-least-once.

Rule: If `fulfillment_request.external_id IS NOT NULL`, do NOT call `provider.createOrder()`.

```
1. Load fulfillment_request
2. IF external_id IS NOT NULL → ack, skip (already submitted)
3. IF status != 'pending' → ack, skip (already processed)
4. Call provider.createOrder()
5. IN SAME DB WRITE:
   - SET external_id = provider response ID
   - SET status = 'submitted'
6. Ack message
```

If the DB write succeeds but ack fails → message retries → step 2 catches it.
If `createOrder()` succeeds but DB write fails → message retries → provider may see duplicate. Mitigation: use `fulfillmentRequestId` as provider idempotency key where supported. For Printful, `external_id` (our order UUID) serves this purpose.

### Layer 4: Webhook/Poll → Status Updates

`provider_events` table with `UNIQUE(provider, external_event_id)` prevents processing the same webhook twice. Insert-or-skip pattern:

```sql
INSERT INTO provider_events (provider, external_event_id, ...)
VALUES ($1, $2, ...)
ON CONFLICT (provider, external_event_id) DO NOTHING
RETURNING id;
-- If no row returned → duplicate, skip processing
```

### Layer 5: Refunds

Store `refund_stripe_id` on `fulfillment_request`. Before issuing refund, check if one already exists. Stripe also rejects duplicate refund requests for the same charge beyond the original amount.

---

## Operational Concerns

### Retries + Dead Letter Queue

- Queue consumer retries on 5xx/network errors (message.retry())
- After 3 retries (configurable), message goes to DLQ
- `fulfillment_request.status = 'failed'` + `error_message` logged
- Admin dashboard shows failed requests with "Retry" button

### Gooten Polling

- Scheduled job every 5 minutes
- Queries `fulfillment_requests WHERE provider = 'gooten' AND status IN ('submitted', 'processing')`
- Calls `gooten.getOrder(externalId)` for each
- Maps status changes to synthetic `provider_events`
- Respects rate limits: max 60 requests per minute (batch with 1s delays)
- Exponential backoff on API errors

### Admin Fulfillment Dashboard

Build early (Slice B) — critical for debugging provider integrations.

Pages:
- **Fulfillment Requests list**: filter by status, provider, date range
- **Request detail**: items, status history, provider events, shipments, raw payloads
- **Retry/Cancel buttons**: re-enqueue failed requests or cancel pending ones
- **Margin report**: revenue (Stripe) vs cost (provider estimated + actual) per order/period
- **Provider health**: last event times, error rates, circuit breaker status

### Migration Strategy for Existing Printful Orders

- Existing orders predate `fulfillment_requests` table
- Backfill script: for each order with `status = 'processing'` or `'shipped'`:
  - Create a `fulfillment_request` with `provider = 'printful'`
  - Populate `external_id` from Printful if available
  - Link existing `shipments` via new `fulfillment_request_id` FK
- Run as one-time migration script, not automated

### Secret Migration

The `fulfillmentProviders` table currently stores `apiKey` in plaintext. After the admin integrations work (merged), providers should resolve keys via `ResolveSecretUseCase` (env → DB encrypted store → platform global). The `fulfillmentProviders.apiKey` column becomes deprecated — providers read keys from the encrypted integration secrets system.

---

## Rollout Plan (Vertical Slices)

### Slice A: AI Art → Product + Purchase + Fulfillment + Tracking (Printful only)

Closes the #1 gap: "AI Art → Sellable Product conversion."

- `CreateProductFromArtUseCase` + wizard page
- `DesignPlacement` entity + schema
- Print readiness validation
- Mockup generation (Printful API)
- Product publishes → purchasable via existing cart/checkout
- Fulfillment via existing Printful queue consumer
- Tracking via existing Printful webhook handler

### Slice B: Fulfillment Requests + Multi-Provider Consumer + Admin Dashboard

Makes the flow-level abstraction real. Still Printful only.

- `fulfillment_requests` + `fulfillment_request_items` + `provider_events` tables
- Enhanced `FulfillOrderUseCase`: groups items by provider, creates requests
- New `FulfillmentQueueConsumer`: reads provider from message, uses ProviderFactory
- `FulfillmentRouter` (trivial: "use default mapping")
- Webhook router: routes by provider type
- Idempotency gates (all 5 layers)
- Admin fulfillment dashboard (request list, detail, retry, raw payloads)
- Backfill existing Printful orders
- Migrate shipments to reference fulfillment_requests

### Slice C: Cancellation + Refund Coordination (Printful only)

Hard problem — do it once with the reference provider.

- `CancelOrderUseCase` with per-request cancellation logic
- `ProcessRefundUseCase` with Stripe partial refund support
- `cancel_requested` state + provider confirmation via webhooks
- Refund idempotency (refund_stripe_id on fulfillment_request)
- Customer-facing cancel button on "My Orders" page
- Provider-initiated cancellation handling (out of stock, print failure)
- Email notifications: cancellation confirmed, refund processed

### Slice D: Digital Downloads

Independent from physical fulfillment but has security/accounting implications.

- `download_tokens` table
- `GenerateDownloadUrlUseCase` with token-based access control
- Download API route with validation (owns order, paid, not refunded)
- `FulfillOrderUseCase` enhancement: digital items skip fulfillment, immediately downloadable
- Revocation on refund/chargeback
- "My Orders" page: download button for digital items
- Product page: watermarked preview vs full resolution after purchase

### Slice E: Gooten Integration

Add second provider through the now-proven flow.

- Implement `GootenWebhookHandler` (or rather, polling job since Gooten lacks webhooks)
- Gooten polling scheduled job (5-min cadence, rate-limited)
- Recipe-based catalog mapping (different from Printful's sync model)
- Cost tracking with Gooten pricing model
- Verify all flows: order → track → cancel → refund
- Mockup fallback (no Gooten mockup API): art overlay on generic product frame

### Slice F: Prodigi Integration

Third provider — should be nearly mechanical at this point.

- `ProdigiWebhookHandler` with signature verification
- SKU-based catalog mapping
- All-inclusive pricing: `getShippingRates()` returns empty (shipping included in cost)
- Margin calculation accounts for inclusive pricing
- Verify all flows

### Slice G (Deferred): Shapeways Integration

Placeholder. Not scheduled. Material-based catalog model differs significantly.

### Slice H: UX Polish + Margin Reporting

- Cart fulfillment info badges (provider, estimated delivery)
- Multi-shipment order tracking UI
- Email notifications: shipped (per shipment, with tracking), delivered
- Margin reporting dashboard: revenue vs estimated vs actual cost, by provider/period
- Cost reconciliation: compare estimated vs actual after provider settlement

---

## Appendix: Duplicate Order Prevention Summary

| Failure Mode | Prevention Mechanism |
|---|---|
| Stripe webhook replayed | `findByStripeSessionId` on order creation |
| Queue message replayed | `external_id IS NOT NULL` check before calling provider |
| Provider API timeout (sent but we think failed) | Provider idempotency key (our fulfillment_request.id) |
| Webhook replayed by provider | `UNIQUE(provider, external_event_id)` on provider_events |
| Double refund | `refund_stripe_id` check + Stripe rejects over-refund |
| Cancel + fulfill race | `status != 'pending'` check in consumer; `cancel_requested` blocks fulfillment |
| Multiple fulfillment requests for same order/provider | Created atomically in FulfillOrderUseCase; idempotent on order creation |
