# petm8.io Platform Evolution Plan

## Context

petm8.io is a Cloudflare Workers + Hono commerce platform with DDD architecture, Drizzle ORM on Neon PostgreSQL, and Stripe payments. Currently single-tenant with 174 TS files, 25 DB tables, and solid Printful integration.

**Goal**: Transform into a multi-domain SaaS platform where anyone can create their own store (like premiumstores.net, premiums.shop, shopermind.com), with multi-provider fulfillment, affiliate programs, venue management with maps, and expanded product types.

---

## Phase 1: Multi-Tenant Foundation

**Why first**: Everything else depends on store isolation. Must be rock-solid before adding features.

### New Bounded Context: Platform

**New tables** in `src/infrastructure/db/schema.ts`:
- `stores` — id, name, slug, subdomain, customDomain, logo, primaryColor, secondaryColor, status (trial/active/suspended/deactivated), planId, stripeConnectAccountId
- `store_members` — storeId, userId, role (owner/admin/staff), unique(storeId, userId)
- `store_domains` — storeId, domain, verificationStatus, verificationToken, isPrimary
- `store_settings` — storeId, key, value (flexible config)
- `platform_plans` — name, slug, monthlyPrice, transactionFeePercent, maxProducts, maxStaff, features (jsonb), stripePriceId

**New enums**: `store_status`, `store_member_role`, `platform_role` (super_admin/group_admin/user), `domain_verification_status`

### Migration Strategy (storeId on existing tables)
1. Add nullable `storeId` FK to aggregate root tables: `products`, `collections`, `carts`, `orders`, `subscriptions`, `bookings`, `booking_availability`, `pet_profiles`, `art_templates`, `generation_jobs`, `printful_sync_products`, `shipments`, `product_reviews`
2. Insert a "default store" representing current petm8.io data
3. Backfill all existing rows with default store ID
4. Make `storeId` NOT NULL + add indexes
5. Child tables (variants, order_items, cart_items, booking_items) inherit scope via parent FK

### Tenant Middleware
- **File**: `src/middleware/tenant.middleware.ts`
- Extracts `Host` header → checks subdomain pattern (`{slug}.{platform-domain}`) → checks custom domain in `store_domains` → injects `store` and `storeId` into Hono context
- Platform domains (petm8.io, premiumstores.net, etc.) served as platform-level pages (store creation, landing)
- Cloudflare for SaaS handles custom domain SSL/routing

### Repository Scoping
- Pass `storeId` into every repository constructor: `new ProductRepository(db, storeId)`
- All WHERE clauses include `eq(table.storeId, this.storeId)`
- Route handlers change from `new Repo(db)` to `new Repo(db, c.get("storeId"))`

### Admin Hierarchy
- `users.platformRole`: super_admin (all stores), group_admin (assigned store groups), user
- `store_members.role`: owner, admin, staff
- Super-admin can impersonate any store via API

### New Files
- Domain: `src/domain/platform/` — store.entity.ts, store-member.entity.ts, store-domain.entity.ts, platform-plan.entity.ts, store-settings.vo.ts
- Use cases: `src/application/platform/` — create-store, update-store, manage-members, verify-domain, get-store-dashboard, list-stores
- Repository: `src/infrastructure/repositories/store.repository.ts`
- Routes: `src/routes/api/platform.routes.ts` — CRUD stores, members, domains, dashboard
- Contract: `src/contracts/platform.contract.ts`
- Pages: create-store wizard, store dashboard, store settings, team management

### Layout Changes
- `_layout.tsx` accepts store branding (logo, colors, name) from context
- Replace hardcoded "petm8" with `store.name`
- Inject `primaryColor`/`secondaryColor` as CSS variables
- Env: add `PLATFORM_DOMAINS`, `DEFAULT_STORE_ID`

---

## Phase 2: Revenue Model (Stripe Connect + Subscriptions)

### Platform Plans (seeded)
| Plan | Price | Tx Fee | Products | Custom Domain |
|------|-------|--------|----------|---------------|
| Free | $0 | 5% | 10 | No |
| Starter | $19/mo | 3% | 100 | Yes |
| Pro | $49/mo | 2% | Unlimited | Yes |
| Enterprise | $99/mo | 1% | Unlimited | Yes + Priority |

### New Tables
- `store_billing` — storeId, platformPlanId, stripeSubscriptionId, stripeCustomerId, status, period dates
- `platform_transactions` — storeId, orderId, orderTotal, platformFeePercent, platformFeeAmount, stripeTransferId

### Stripe Connect
- **File**: `src/infrastructure/stripe/connect.adapter.ts`
- Each store creates a Stripe Connect Express account during onboarding
- Checkout sessions use `payment_intent_data.application_fee_amount` + `stripe_account` (connected)
- Platform collects fee per transaction automatically
- Webhook handles: `account.updated`, `checkout.session.completed` (with fee tracking), `transfer.created/paid`

### Routes
- `POST /api/platform/stores/:id/billing/subscribe` — subscribe to plan
- `POST /api/platform/stores/:id/connect/onboard` — start Stripe Connect onboarding
- `GET /api/platform/stores/:id/billing` — billing status

---

## Phase 3: Multi-Provider Fulfillment

### Provider Strategy
| Provider | Products | API Base |
|----------|----------|----------|
| **Printful** (existing) | Apparel, packaging, engraving, basic pet items | `api.printful.com` |
| **Gooten** (new) | Magnets, keychains, acrylic blocks, stickers, expanded pet accessories | `api.gooten.com/v1` |
| **Prodigi** (new) | Premium metal/aluminum prints, pin badges, fine art, branded packaging | `api.prodigi.com/v4.0` |
| **Shapeways** (new) | 3D-printed custom figurines from AI Studio output | `api.shapeways.com` |

### Abstraction Layer
- **Interface**: `src/infrastructure/fulfillment/fulfillment-provider.interface.ts`
  ```
  FulfillmentProvider { createOrder, getOrder, cancelOrder, getShippingRates, getCatalog, verifyWebhook }
  ```
- **Implementations**: printful.provider.ts, gooten.provider.ts, prodigi.provider.ts, shapeways.provider.ts
- **Factory**: `src/infrastructure/fulfillment/provider-factory.ts` — type → provider instance
- **Circuit breaker**: `src/infrastructure/fulfillment/circuit-breaker.ts` — 5 failures → open → 60s reset

### New Tables
- `fulfillment_providers` — storeId, name, type (printful/gooten/prodigi/shapeways), apiKey (encrypted), apiSecret, isActive, config (jsonb)
- `provider_product_mappings` — variantId, providerId, externalProductId, externalVariantId, costPrice (for margin tracking)

### Queue Consumer Refactor
- Existing `order-fulfillment.consumer.ts` refactored to:
  1. Look up `provider_product_mappings` for each order item variant
  2. Group items by provider
  3. Route each group to correct `FulfillmentProvider` implementation
- Per-provider webhook endpoints: `/api/webhooks/fulfillment/{printful,gooten,prodigi,shapeways}`

### Use Cases
- Refactored: create-fulfillment-order (multi-provider), sync-provider-catalog (any provider)
- New: configure-provider, map-product-to-provider, get-provider-catalog

---

## Phase 4: Affiliate System

### Tracking Methods (all 3 combined)
1. **Referral links** — `?ref=CODE` → 30-day httpOnly cookie → attribution at checkout
2. **Influencer coupon codes** — discount code tied to affiliate, tracked at checkout
3. **Tiered commissions** — affiliates recruit sub-affiliates, earn from 2 levels

### New Tables
- `affiliate_tiers` — storeId, name, level, commissionRate, bonusRate, minSales, minRevenue
- `affiliates` — userId, storeId, status (pending/approved/suspended), referralCode, customSlug, commissionRate, parentAffiliateId (self-ref for tiers), tierId, totalEarnings, totalClicks, totalConversions
- `affiliate_links` — affiliateId, targetUrl, shortCode, clickCount
- `affiliate_clicks` — linkId, ip, userAgent, referrer, createdAt (indexed)
- `affiliate_conversions` — affiliateId, orderId, orderTotal, commissionAmount, status (pending/approved/paid/rejected), attributionMethod (link/coupon/tier), clickId, couponCode, parentConversionId
- `affiliate_payouts` — affiliateId, amount, stripeTransferId, status, periodStart, periodEnd

### Middleware
- **File**: `src/middleware/affiliate.middleware.ts`
- On every storefront request: check `?ref=` or `?utm_medium=` → set 30-day cookie → record click via queue
- During checkout: read cookie → look up affiliate → calculate commission → create conversion

### Conversion Attribution Flow
1. Checkout webhook fires `checkout.session.completed`
2. Check for affiliate cookie in session metadata
3. Look up affiliate by referral code OR coupon code
4. Calculate commission based on affiliate's tier rate
5. Create `affiliate_conversions` record (status: pending)
6. If affiliate has `parentAffiliateId` → create tier-2 conversion at sub-rate

### Scheduled Job
- Monthly (1st of month): process approved conversions → create payout records → transfer via Stripe Connect

### Routes
- `POST /api/affiliates/register` — apply to become affiliate
- `GET /api/affiliates/dashboard` — earnings, clicks, conversions
- `POST/GET /api/affiliates/links` — create/list tracking links
- `GET /api/affiliates/conversions` — list conversions
- `GET /api/affiliates/payouts` — payout history
- Admin: `GET /api/affiliates/admin/pending`, `PATCH /:id/approve`, `POST /admin/payouts`

### Pages
- `src/routes/pages/affiliates/` — dashboard, links, payouts, register

---

## Phase 5: Venue Management + Maps + Geosearch

### Tech Stack (Free)
- **MapLibre GL JS** — open source WebGL map rendering (BSD license)
- **OpenFreeMap** tiles — free vector tiles, no API key needed
- **PostGIS on Neon** — `CREATE EXTENSION postgis`, spatial indexes, `ST_DWithin()` queries
- **Mapbox Geocoding API** (free tier) — address-to-coordinates lookup

### New Table
- `venues` — storeId, name, slug, address, city, state, country, postalCode, latitude, longitude, amenities (jsonb), photos (jsonb), capacity, description, contactEmail, contactPhone, isActive

### PostGIS Migration (raw SQL)
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
ALTER TABLE venues ADD COLUMN location GEOGRAPHY(POINT, 4326);
CREATE INDEX venues_location_gist_idx ON venues USING GIST (location);
-- Trigger to auto-populate location from lat/lng on insert/update
```

### Link to Booking System
- Add `venueId` FK to `booking_config` table
- Events (bookable products) assigned to specific venues
- Existing `location` text field kept for backward compat

### Frontend
- Client script: `public/scripts/map.js` — MapLibre GL JS initialization
- Server component: `src/components/map/venue-map.tsx` — renders `<div>` with data attributes
- Admin: `src/components/map/map-picker.tsx` — click-to-set-location on map

### Geosearch Repository
- `src/infrastructure/repositories/venue.repository.ts`
- `findNearby(lat, lng, radiusKm)` → `ST_DWithin()` with GiST spatial index
- Returns venues sorted by distance

### Routes
- CRUD: `POST/GET/PATCH/DELETE /api/venues`
- Geosearch: `GET /api/venues/nearby?lat=X&lng=Y&r=Z`
- Events nearby: `GET /api/events/nearby?lat=X&lng=Y&r=Z`

### Pages
- `src/routes/pages/venues/` — list (with map), detail (with map + events)
- Modify existing `events/list.page.tsx` — add "near me" filter
- Modify existing `events/detail.page.tsx` — add venue map embed

---

## Phase 6: Printful Integration Improvements

**File modifications** (existing files):

1. **Order confirmation**: Change `order.adapter.ts` to pass `confirm: true` (configurable per store)
2. **Return/refund workflow**: New use case `create-return.usecase.ts`, route `POST /api/orders/:id/return`
3. **Expanded webhooks** in `webhook.handler.ts`: add `product_updated`, `order_failed`, `order_canceled`, `package_returned`
4. **Cost/margin tracking**: Use `providerProductMappings.costPrice` from Phase 3 → compute margins in product admin
5. **Circuit breaker**: Apply from Phase 3's `circuit-breaker.ts` to Printful client calls
6. **Mockup auto-polling**: Scheduled job checks processing mockup tasks → polls Printful → stores result URLs

---

## Inspiring Product Ideas

### Trending Categories to Explore
- **Custom pet figurines** — AI Studio generates 3D model from pet photo → Shapeways prints it (unique, high-margin ~$30-60)
- **Holographic stickers** — Pet art as holographic/prismatic stickers via Gooten (viral, shareable, $3-8 each)
- **Metal pet portrait wall art** — AI-generated pet art printed on brushed aluminum via Prodigi (premium, $40-120)
- **Acrylic photo blocks** — Pet photos as desk-sized acrylic blocks via Gooten ($15-35)
- **Custom pet ID tags** — Engraved metal tags with AI-generated designs via Printful
- **Pet bandana + matching sticker sets** — Bundle deals across providers
- **Seasonal/holiday themed pet art** — Limited editions drive urgency
- **Pet memorial products** — Sensitive niche but high emotional value (metal prints, figurines)
- **Custom pet playing cards** — AI art on card backs
- **Pet-themed phone cases with NFC** — Tap to share pet's profile

### SaaS Store Niches (for other domains)
- **premiumstores.net** — Curated premium home decor (metal prints, acrylic, wood)
- **premiums.shop** — Corporate gifts & branded merchandise
- **shopermind.com** — AI-powered personalized products (leveraging your AI Studio)
- **Sticker-focused stores** — Low barrier to entry, high volume, great for influencers

---

## Complete New File Inventory

### Domain Layer (10 files)
```
src/domain/platform/    — store, store-member, store-domain, platform-plan, store-settings
src/domain/affiliates/  — affiliate, affiliate-tier, affiliate-link, affiliate-conversion
src/domain/venues/      — venue
```

### Application Layer (18 use cases)
```
src/application/platform/    — create-store, update-store, manage-members, verify-domain, get-store-dashboard, list-stores
src/application/affiliates/  — register-affiliate, create-link, record-click, attribute-conversion, calculate-payouts, get-affiliate-dashboard
src/application/fulfillment/ — configure-provider, map-product-to-provider, get-provider-catalog, create-return (+ refactor existing)
src/application/venues/      — manage-venue, search-nearby
```

### Infrastructure Layer (14 files)
```
src/infrastructure/repositories/  — store, affiliate, venue
src/infrastructure/stripe/        — connect.adapter.ts
src/infrastructure/fulfillment/   — interface, printful.provider, gooten.provider, prodigi.provider, shapeways.provider, provider-factory, circuit-breaker
```

### Middleware (2 files)
```
src/middleware/tenant.middleware.ts
src/middleware/affiliate.middleware.ts
```

### Routes & Contracts (6 files)
```
src/routes/api/    — platform.routes.ts, affiliate.routes.ts, venue.routes.ts
src/contracts/     — platform.contract.ts, affiliates.contract.ts, venues.contract.ts
```

### Pages (10+ new pages)
```
src/routes/pages/platform/   — create-store, store-dashboard, store-settings, members
src/routes/pages/affiliates/ — dashboard, links, payouts, register
src/routes/pages/venues/     — list, detail
```

### Client Scripts (1 file)
```
public/scripts/map.js — MapLibre GL JS initialization
```

### Migrations (10 sequential)
1. Platform tables (stores, members, domains, settings, plans)
2. Add nullable storeId to existing tables
3. Backfill storeId + NOT NULL + indexes
4. Add platformRole to users
5. Store billing + platform transactions
6. Fulfillment providers + product mappings
7. All affiliate tables (6 tables)
8. Venues table
9. PostGIS extension + geography column + trigger
10. Add venueId to booking_config

---

## Verification

### Per-Phase Testing
1. **Phase 1**: Create two stores, verify product isolation, test domain routing with `Host` header mocking
2. **Phase 2**: Mock Stripe Connect, verify fee calculation, test plan upgrades
3. **Phase 3**: Mock each provider API, verify correct routing per variant, test circuit breaker
4. **Phase 4**: Full click → checkout → conversion flow, verify tier calculations
5. **Phase 5**: Insert venues with known coordinates, verify `ST_DWithin()` results, test map rendering
6. **Phase 6**: Verify Printful order confirmation, test webhook handlers

### Integration
- `tsc --noEmit` must pass after each phase
- Run `pnpm dev` and verify health check + page rendering per store
- Neon branch per test run for DB isolation

### E2E (Playwright)
- Store creation wizard flow
- Product browsing scoped to store
- Checkout with affiliate tracking cookie
- Event geosearch "near me"
