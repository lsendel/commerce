# Commerce Features Design — 9 Features

**Date:** 2026-02-25
**Status:** Approved
**Estimated Total:** 56 story points, ~200 hours

## Overview

Nine features extending the petm8.io commerce platform, following existing DDD architecture with per-request DI, Drizzle ORM on Neon PostgreSQL, and multi-tenant `storeId` scoping.

### Feature Summary

| # | Feature | Priority | Points | Hours |
|---|---------|----------|--------|-------|
| 1 | Coupons & Discounts (Full Promotion Engine) | High | 8 | 24 |
| 2 | Inventory Reservations + Safe Decrement | High | 5 | 16 |
| 3 | Shipping Zones & Rates (Hybrid) | High | 8 | 32 |
| 4 | Tax Engine (Hybrid Adapter Pattern) | High | 13 | 80 |
| 5 | Products CSV Export | Medium | 3 | 4 |
| 6 | Digital Downloads Access Control | Medium | 3 | 8 |
| 7 | Product Reviews + Moderation | Medium | 3 | 8 |
| 8 | Reports & Analytics (Full Event-Driven) | Low | 13 | ~80 |
| 9 | Multi-Currency Pricing | Low/Med | 5 | ~24 |

---

## 1. Architectural Decisions

### Promotion Engine: Strategy Pattern + Condition DSL Hybrid

Each promotion type is a class implementing `PromotionStrategy.evaluate(cart): Discount`. Conditions are stored as a composable JSON DSL tree (AND/OR operators with typed predicates). The strategy pattern executes discount logic; the DSL decides when it applies.

**Strategy types:** `percentage_off`, `fixed_amount`, `free_shipping`, `bogo`, `buy_x_get_y`, `tiered_percentage`, `bundle_price`

**Condition predicates:** `cart_total`, `item_count`, `product_in`, `collection_in`, `customer_segment`, `first_purchase`, `min_quantity`

### Event Tracking: Append-Only Events + External Pipeline

Write events to an `analytics_events` table. A daily cron rolls up into pre-aggregated `analytics_daily_rollups`. Optional forwarding to Segment/Mixpanel via the integration adapter system.

### Multi-Currency: Domain Service + Presentation Helper

A `CurrencyConverter` domain service converts Money VOs on demand. Stripe always charges in the store's base currency; conversion is purely presentational. Exchange rates fetched daily from ExchangeRate-API (open access, no key required).

---

## 2. New Bounded Contexts

| Context | Features |
|---------|----------|
| **Promotions** | Coupons, automatic discounts, BOGO, tiered, bundle, flash sales, segment targeting |
| **Tax** | Tax rules, tax providers (built-in + TaxJar/Avalara adapter) |
| **Analytics** | Event tracking, rollup aggregation, conversion funnels, dashboards |
| **Currency** | Exchange rates, conversion service, store currency config |

### Extended Contexts

| Context | Extensions |
|---------|-----------|
| **Catalog** | Inventory reservations, CSV export, digital download files, review CRUD + moderation |
| **Checkout** | Promotion application, tax calculation, shipping rate calculation, multi-currency display |
| **Fulfillment** | Shipping zones & rates, carrier API adapters |
| **Platform** | New integrations (tax providers, carrier APIs, analytics pipelines, exchange rate sources) |

---

## 3. Domain Entities (22 new)

### Promotions Context (8 entities)

- **Promotion** — id, storeId, name, type (coupon|automatic|flash_sale), status (active|scheduled|expired|disabled), priority, stackable, strategyType, strategyParams (jsonb), conditions (jsonb DSL tree), startsAt, endsAt, usageLimit, usageCount
- **PromotionRule** — VO: composable conditions tree (AND/OR with typed predicates)
- **PromotionAction** — VO: strategy type + parameters
- **CouponCode** — id, promotionId, code, maxRedemptions, redemptionCount, singleUsePerCustomer
- **PromotionRedemption** — id, promotionId, couponCodeId, orderId, customerId, discountAmount
- **CustomerSegment** — id, storeId, name, rules (jsonb), memberCount, lastRefreshedAt
- **CustomerSegmentMembership** — customerId, segmentId (composite PK, refreshed by cron)
- **FlashSale** — VO extending Promotion with countdown display config

### Shipping Context (3 entities — inside Fulfillment)

- **ShippingZone** — id, storeId, name, countries[], regions[], postalCodeRanges[], isRestOfWorld
- **ShippingRate** — id, zoneId, name, type (flat|weight_based|price_based|carrier_calculated), price, minWeight, maxWeight, minOrderTotal, maxOrderTotal, estimatedDaysMin, estimatedDaysMax
- **CarrierAccount** — id, storeId, carrier, integrationId (FK to platform_integrations), isActive

### Tax Context (3 entities)

- **TaxZone** — id, storeId, name, countries[], regions[], postalCodes[], priority
- **TaxRate** — id, taxZoneId, name, rate (decimal), type (sales_tax|vat|gst), appliesTo (all|physical|digital|shipping), compound
- **TaxProvider** — interface: `calculateTax(order, address): TaxBreakdown`

### Analytics Context (3 entities)

- **AnalyticsEvent** — id, storeId, sessionId, userId?, eventType, properties (jsonb), pageUrl, referrer, userAgent, ipHash, createdAt
- **DailyRollup** — id, storeId, date, metric, dimensions (jsonb), value, count
- **ConversionFunnel** — VO: step definitions for funnel analysis

### Currency Context (2 entities)

- **ExchangeRate** — baseCurrency, targetCurrency, rate, source, fetchedAt
- **StoreCurrency** — storeId, baseCurrency, enabledCurrencies[], displayFormat, autoDetectLocale

### Catalog Extensions (3 entities)

- **InventoryReservation** — id, variantId, cartItemId, quantity, status (held|released|converted), expiresAt
- **DigitalAsset** — id, productId, fileName, fileSize, storageKey (R2 bucket path), contentType
- **DownloadToken** — id, digitalAssetId, orderId, userId, token, downloadsUsed, maxDownloads, expiresAt

---

## 4. Database Schema

### 4.1 New Tables (17)

#### Promotions Tables (6)

```sql
-- promotions
id uuid PK, store_id FK stores, name text, description text,
type promotion_type_enum (coupon|automatic|flash_sale),
status promotion_status_enum (active|scheduled|expired|disabled),
priority integer, stackable boolean,
strategy_type promotion_strategy_enum (percentage_off|fixed_amount|free_shipping|bogo|buy_x_get_y|tiered|bundle),
strategy_params jsonb, conditions jsonb,
starts_at timestamp, ends_at timestamp,
usage_limit integer, usage_count integer DEFAULT 0,
created_at timestamp, updated_at timestamp

-- coupon_codes
id uuid PK, promotion_id FK promotions, code text,
max_redemptions integer, redemption_count integer DEFAULT 0,
single_use_per_customer boolean DEFAULT false, created_at timestamp
UNIQUE INDEX (promotion_id, code) -- unique code per promotion

-- promotion_redemptions
id uuid PK, promotion_id FK promotions, coupon_code_id FK coupon_codes NULL,
order_id FK orders, customer_id FK users,
discount_amount decimal(10,2), line_items_affected jsonb, created_at timestamp

-- customer_segments
id uuid PK, store_id FK stores, name text, description text,
rules jsonb, member_count integer DEFAULT 0,
last_refreshed_at timestamp, created_at timestamp

-- customer_segment_memberships
customer_id FK users, segment_id FK customer_segments
COMPOSITE PK (customer_id, segment_id), added_at timestamp

-- promotion_product_eligibility
id uuid PK, promotion_id FK promotions,
product_id FK products NULL, collection_id FK collections NULL,
type eligibility_type_enum (include|exclude)
```

#### Shipping Tables (3)

```sql
-- shipping_zones
id uuid PK, store_id FK stores, name text,
countries jsonb, regions jsonb, postal_code_ranges jsonb,
is_rest_of_world boolean DEFAULT false, created_at timestamp

-- shipping_rates
id uuid PK, zone_id FK shipping_zones, name text,
type shipping_rate_type_enum (flat|weight_based|price_based|carrier_calculated),
price decimal(10,2), min_weight decimal(10,2), max_weight decimal(10,2),
min_order_total decimal(10,2), max_order_total decimal(10,2),
carrier_provider text, estimated_days_min integer, estimated_days_max integer,
created_at timestamp

-- carrier_accounts
id uuid PK, store_id FK stores,
carrier carrier_enum (usps|fedex|ups),
integration_id FK platform_integrations,
is_active boolean DEFAULT true, created_at timestamp
```

#### Tax Tables (2)

```sql
-- tax_zones
id uuid PK, store_id FK stores, name text,
countries jsonb, regions jsonb, postal_codes jsonb,
priority integer DEFAULT 0, created_at timestamp

-- tax_rates
id uuid PK, tax_zone_id FK tax_zones, name text,
rate decimal(5,4), type tax_type_enum (sales_tax|vat|gst),
applies_to tax_applies_to_enum (all|physical|digital|shipping),
compound boolean DEFAULT false, created_at timestamp
```

#### Analytics Tables (2)

```sql
-- analytics_events (append-only)
id uuid PK, store_id FK stores, session_id text, user_id FK users NULL,
event_type text, properties jsonb, page_url text,
referrer text, user_agent text, ip_hash text, created_at timestamp
INDEX (store_id, event_type, created_at) -- rollup queries

-- analytics_daily_rollups
id uuid PK, store_id FK stores, date text,
metric text (page_views|unique_visitors|add_to_cart|checkout_started|purchases|revenue|aov|cart_abandonment_rate),
dimensions jsonb, value decimal(12,2), count integer, created_at timestamp
INDEX (store_id, date, metric) -- dashboard queries
```

#### Currency Tables (2)

```sql
-- exchange_rates
id uuid PK, base_currency text, target_currency text,
rate decimal(12,6), source text (exchangerate_api|manual),
fetched_at timestamp, created_at timestamp
UNIQUE (base_currency, target_currency)

-- store_currencies
id uuid PK, store_id FK stores UNIQUE,
base_currency text DEFAULT 'USD', enabled_currencies jsonb,
display_format text (symbol_first|code_first),
auto_detect_locale boolean DEFAULT false, created_at timestamp
```

#### Catalog Extension Tables (2 new + extend reviews)

```sql
-- inventory_reservations
id uuid PK, variant_id FK product_variants, cart_item_id FK cart_items,
quantity integer, status reservation_status_enum (held|released|converted),
expires_at timestamp, created_at timestamp
INDEX (variant_id, status)
INDEX (expires_at) -- cron cleanup

-- digital_assets
id uuid PK, product_id FK products, file_name text,
file_size integer, storage_key text, content_type text, created_at timestamp

-- download_tokens
id uuid PK, digital_asset_id FK digital_assets,
order_id FK orders, user_id FK users,
token text UNIQUE, downloads_used integer DEFAULT 0,
max_downloads integer DEFAULT 3, expires_at timestamp, created_at timestamp
```

### 4.2 Table Modifications (3)

#### `orders` — Add columns

```sql
discount decimal(10,2) DEFAULT '0'    -- matches existing tax/shipping_cost naming
coupon_code text                       -- applied coupon code (link via promotion_redemptions)
currency text DEFAULT 'USD'            -- customer display currency
exchange_rate decimal(12,6)            -- rate at time of order
```

#### `product_reviews` — Add columns

```sql
status review_status_enum (pending|approved|rejected|flagged) DEFAULT 'approved'
moderated_at timestamp
helpful_count integer DEFAULT 0
reported_count integer DEFAULT 0
```

#### `product_variants` — Add columns

```sql
weight decimal(10,2)
weight_unit text DEFAULT 'oz'          -- oz|lb|g|kg
reserved_quantity integer DEFAULT 0
```

### 4.3 Enum Extensions

```sql
-- integrationProviderEnum: add
'taxjar', 'avalara', 'usps', 'fedex', 'ups', 'exchangerate_api', 'segment', 'mixpanel'
```

---

## 5. Use Cases (34 new)

### Promotions Context (8)

| Use Case | Description |
|----------|-------------|
| `create-promotion` | CRUD promotions with condition DSL validation |
| `manage-coupon-codes` | Generate/list/deactivate codes for a promotion |
| `evaluate-cart-promotions` | Core engine — run all active promotions against cart, return applicable discounts |
| `apply-coupon` | Validate code → find promotion → check conditions → return discount preview |
| `redeem-promotion` | Record redemption on order confirm, increment usage counters |
| `manage-customer-segments` | CRUD segments with rule definitions |
| `refresh-segment-memberships` | Cron — re-evaluate segment rules, update membership table |
| `get-promotion-analytics` | Redemption counts, revenue impact per promotion |

### Inventory Context (3 — extends Catalog)

| Use Case | Description |
|----------|-------------|
| `reserve-inventory` | Atomic `UPDATE SET reserved_quantity += ? WHERE inventory_quantity - reserved_quantity >= ?` |
| `release-inventory` | On cart item remove or reservation expiry: decrement reserved_quantity |
| `commit-inventory` | On order confirm: decrement inventory_quantity, release reservation — single transaction |

### Shipping Context (4 — extends Fulfillment)

| Use Case | Description |
|----------|-------------|
| `manage-shipping-zones` | CRUD zones with country/region/postal targeting |
| `manage-shipping-rates` | CRUD rates per zone |
| `calculate-shipping` | Cart + address → match zone → compute rate → fallback to rest-of-world |
| `get-carrier-rates` | Optional — call carrier API via integration adapter |

### Tax Context (3)

| Use Case | Description |
|----------|-------------|
| `manage-tax-zones` | CRUD tax zones + rates |
| `calculate-tax` | Order items + address → match zones → apply rates via TaxProvider interface |
| `sync-tax-provider` | For TaxJar/Avalara — call external API, cache result |

### Digital Downloads (3 — extends Catalog)

| Use Case | Description |
|----------|-------------|
| `manage-digital-assets` | Upload file to R2, create asset record |
| `generate-download-token` | On order confirm for digital products: create token with limits + expiry |
| `redeem-download` | Validate token → check limits → signed R2 URL (1hr) → increment downloads_used |

### Product Reviews (3 — extends Catalog)

| Use Case | Description |
|----------|-------------|
| `submit-review` | Create review, check verified purchase, content filter, set status |
| `moderate-review` | Admin approve/reject flagged reviews |
| `list-reviews` | Paginated reviews with average rating aggregation |

### CSV Export (1 — extends Catalog)

| Use Case | Description |
|----------|-------------|
| `export-products-csv` | Stream products + variants as CSV |

### Analytics Context (4)

| Use Case | Description |
|----------|-------------|
| `track-event` | Write event to analytics_events — lightweight |
| `rollup-daily-metrics` | Cron — aggregate yesterday's events into daily rollups |
| `get-dashboard-metrics` | Query rollups: revenue, orders, AOV, top products, conversion rate |
| `push-to-external` | Optional — forward events to Segment/Mixpanel |

### Currency Context (3)

| Use Case | Description |
|----------|-------------|
| `configure-store-currency` | Set base currency, enabled currencies, display format |
| `sync-exchange-rates` | Daily cron — fetch from ExchangeRate-API, upsert rates |
| `convert-price` | Domain service — Money.convert(targetCurrency, rateTable): Money |

---

## 6. Domain Services (3)

| Service | Purpose |
|---------|---------|
| `PromotionEvaluator` | Walk condition DSL tree, select matching promotions, run strategy classes, handle stacking rules, return `DiscountBreakdown[]` |
| `TaxCalculator` | Dispatch to built-in rate matcher or external provider adapter based on store config |
| `CurrencyConverter` | Stateless: Money VO + target currency + rate → converted Money |

---

## 7. Modified Checkout Flow

### Checkout Creation

```
Cart
  → evaluate-cart-promotions (apply automatic discounts + validate coupon)
  → reserve-inventory (confirm all items available)
  → calculate-shipping (match zone, compute rate)
  → calculate-tax (match zone, apply rates)
  → convert-price (if customer currency ≠ store base currency)
  → create Stripe checkout session (in base currency, display in customer currency)
  → track-event("checkout_started")
```

### Payment Success (webhook)

```
  → commit-inventory (decrement stock, release reservation)
  → redeem-promotion (record redemption, increment counters)
  → generate-download-token (for digital products)
  → track-event("purchase")
  → push-to-external (if configured)
```

### Modified Cart Flow

```
Add to cart:
  → reserve-inventory (atomic hold, 15min TTL)
  → track-event("add_to_cart")

Remove from cart:
  → release-inventory
  → track-event("remove_from_cart")

Cart page load:
  → evaluate-cart-promotions (show discount preview)
  → calculate-shipping (estimate with default address)
  → convert-price (display in customer currency)
```

---

## 8. API Routes & Contracts

| Route File | Endpoints |
|-----------|-----------|
| `promotions.routes.ts` | POST/GET/PATCH/DELETE `/promotions`, POST `/promotions/:id/codes`, POST `/cart/apply-coupon`, DELETE `/cart/remove-coupon` |
| `shipping-zones.routes.ts` | POST/GET/PATCH/DELETE `/shipping/zones`, POST/GET/PATCH/DELETE `/shipping/zones/:id/rates`, POST `/shipping/calculate` |
| `tax.routes.ts` | POST/GET/PATCH/DELETE `/tax/zones`, POST/GET/PATCH/DELETE `/tax/zones/:id/rates`, POST `/tax/calculate` |
| `reviews.routes.ts` | POST/GET `/products/:slug/reviews`, PATCH `/reviews/:id/moderate` |
| `downloads.routes.ts` | GET `/downloads/:token` |
| `export.routes.ts` | GET `/products/export/csv` |
| `analytics.routes.ts` | GET `/analytics/dashboard`, GET `/analytics/funnel`, POST `/analytics/events` |
| `currency.routes.ts` | GET `/currency/rates`, PATCH `/currency/config` |

---

## 9. Cron Jobs (6 new)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `expire-inventory-reservations.job` | Every 5 min | Release reservations past expires_at |
| `rollup-analytics.job` | Daily 2am | Aggregate events → daily rollups |
| `sync-exchange-rates.job` | Daily 6am | Fetch rates from ExchangeRate-API |
| `refresh-customer-segments.job` | Every 6 hours | Re-evaluate segment membership rules |
| `expire-promotions.job` | Hourly | Mark promotions past ends_at as expired |
| `push-analytics-external.job` | Every 15 min | Batch-forward events to external if configured |

---

## 10. Integration Points

New providers plugged into existing `platform_integrations` + `integration_secrets` system:

| Provider | Type | Purpose |
|----------|------|---------|
| TaxJar | Tax | Automated tax calculation |
| Avalara | Tax | Enterprise tax compliance |
| USPS | Carrier | Real-time shipping rates |
| FedEx | Carrier | Real-time shipping rates |
| UPS | Carrier | Real-time shipping rates |
| ExchangeRate-API | Currency | Daily exchange rates (free, no key) |
| Segment | Analytics | Event forwarding |
| Mixpanel | Analytics | Event forwarding |

---

## 11. Schema Validation Notes

Validated against existing `src/infrastructure/db/schema.ts`:

- **No table name collisions** with existing 44+ tables
- **`product_reviews`** already exists (line 1032) — extend with moderation columns, don't recreate
- **`product_variants.inventoryQuantity`** exists (line 399) — add `weight`, `weightUnit`, `reservedQuantity`
- **`orders`** fields use `tax`, `shippingCost` naming (not `_total` suffix) — new `discount` column follows same pattern
- **`integrationProviderEnum`** (line 153) extended with new provider values
- **`carrier_accounts`** references `platform_integrations` via `integrationId` — no credential duplication
- All FKs reference valid existing tables
- All proposed enums have unique names
