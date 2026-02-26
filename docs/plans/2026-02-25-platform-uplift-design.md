# Platform Uplift — Design Document

> **Goal:** Fix all broken features, enforce DDD clean code across every bounded context, then layer on branded platform identity, premium commerce aesthetic, SEO/LLM discoverability, marketing automation, and AI-assisted workflows.

> **Approach:** Vertical slice by bounded context — each context is fixed completely (domain → schema → repo → use case → API → page) before moving to the next.

> **Personas:** Store Owner/Marketer + End Customer/Shopper — both equally prioritized.

> **Visual direction:** Branded platform identity + premium commerce aesthetic.

> **Automation level:** Smart defaults + visible automation center + AI-assisted workflows.

> **Sequencing:** Fix-first. DDD and clean code throughout.

---

## DDD Clean Code Standards (applied to every context)

### Domain Layer
- Every entity is a proper interface with value objects for constrained types
- Factory functions for creation with invariant validation
- Guard functions for state transitions
- No `as any` at domain boundaries — typed interfaces everywhere

### Repository Layer
- Consistent per-request DI: `constructor(db, storeId)`
- Return domain types, not Drizzle row types
- Every lookup pattern gets a database index
- `onConflictDoNothing` for idempotency where applicable

### Use Case Layer
- One public method per use case (Single Responsibility)
- Unconnected use cases get wired to routes or deleted
- Business logic in use cases, not route handlers

### Route/API Layer
- Zod validation on every endpoint
- Consistent error responses via `AppError` subclasses
- Fix all path conflicts

### Page Layer
- No `as any` prop types — typed page props interfaces
- Every form pre-populates on edit
- Every list paginates
- Every action has confirmation + feedback
- Empty states on every collection display
- Design system components used consistently

---

## Bounded Context Order

| # | Context | Scope |
|---|---------|-------|
| 1 | Shared Kernel | Design system, layout, nav, SEO framework |
| 2 | Identity | Auth flows, profile, password reset, email verification |
| 3 | Catalog | Products, collections, variants, reviews, admin CRUD |
| 4 | Cart | Totals, coupons, validation, stock warnings |
| 5 | Checkout | Tax, shipping, order review page, refunds |
| 6 | Billing | Subscriptions, plan changes, invoices |
| 7 | Booking | Waitlist, check-in, cancellation policy, admin management |
| 8 | AI Studio | Photo upload fix, gallery, quotas, retry |
| 9 | Fulfillment | Admin dashboard, provider health, audit log, shipping/tax admin |
| 10 | Promotions | Route fix, admin UI, segments, coupon management |
| 11 | Reviews | Product/event reviews, moderation UI, store responses |
| 12 | Affiliates | Attribution wiring, copy-to-clipboard, admin management |
| 13 | Analytics | Conversion funnel, revenue metrics, traffic sources, dashboard |
| 14 | Platform | Invitations, logo upload, plan enforcement, admin shell |
| 15 | Venues | MapLibre fixes, hours, photos, admin management |
| 16 | Cross-Cutting | About/contact pages, error states, performance, a11y, LLM discoverability |

---

## Context 1: Shared Kernel

### Design System Components (`src/components/ui/`)

| Component | Variants | Purpose |
|-----------|----------|---------|
| `Button` | primary, secondary, outline, danger, ghost × sm/md/lg | Replaces inconsistent button styling |
| `Card` | default, elevated, outlined | Consistent padding, radius, dark mode |
| `Badge` | success, warning, error, info, neutral | Status badges across all pages |
| `Input`, `Select`, `Textarea` | With label, helper, error, required indicator | Form consistency |
| `Table` | Sortable headers, pagination, empty state, skeleton rows | Replaces hand-rolled tables |
| `StatCard` | Icon + label + value + trend | Dashboard consistency |
| `Modal` | With focus trap, Escape close, backdrop | Replaces `window.confirm()` and hand-rolled dialogs |
| `EmptyState` | Icon + title + description + CTA | Replaces 5+ different empty patterns |
| `PageHeader` | Title + breadcrumb + actions | Consistent page headers |
| `Tabs` | Horizontal tab navigation | Replaces hand-rolled tabs |
| `Toast` | success, error, warning, info | Typed toast system |
| `Skeleton` | Line, card, table row | Loading placeholders |
| `CopyButton` | Inline copy-to-clipboard with confirmation | Affiliate codes, order IDs, API keys |

### Design Tokens (CSS custom properties)
- Typography: Display/H1/H2/H3/Body/Small/Caption with Inter weights
- Colors: Primary (indigo), Success (emerald), Warning (amber), Danger (red), Neutral (slate) — each 50-950
- Spacing: 4px grid
- Border radius: sm(4)/md(8)/lg(12)/xl(16)
- Shadows: subtle, card, dropdown, modal
- Transitions: fast(150ms), normal(200ms), slow(300ms)

### Layout Fixes
- Add sign-out button to header dropdown and account page
- Implement actual password reset flow (not dead-end redirect)
- Conditional script loading (booking.js, studio.js, gallery.js only where needed)
- Self-host MapLibre GL or add SRI integrity hashes

### Navigation Redesign
- **Storefront nav**: Shop, Events, Studio, About
- **Account nav**: Dashboard, Orders, Addresses, Pets, Subscriptions, Artwork, Sign Out
- **Admin nav** (sidebar): Dashboard, Products, Collections, Orders, Fulfillment, Promotions, Reviews, Analytics, Affiliates, Bookings, Venues, Shipping, Tax, Settings, Integrations
- **Platform nav** (super_admin): Stores, Integrations, Infrastructure

### SEO Framework
- JSON-LD on every page type: Organization, BreadcrumbList, WebSite, Product, Event, FAQPage, Review, CollectionPage, Place
- `rel=prev/next` on paginated pages
- Meta description auto-generation from content
- Sitemap expansion (collections, venues, about, contact) with `lastmod`
- `robots.txt` Sitemap directive
- `/llms.txt` for LLM discoverability
- `redirects` table for slug change 301s
- SEO preview component for admin product editing

---

## Context 2: Identity

### Schema Changes
- Add `email_verified_at` timestamp to `users`
- Add `avatar_url`, `locale`, `timezone`, `marketing_opt_in` to `users`
- Create `password_reset_tokens` table (id, userId, token unique, expiresAt, usedAt, createdAt)
- Create `email_verification_tokens` table (same shape)

### New Use Cases
- `RequestPasswordResetUseCase` — generate token, enqueue email, always return success
- `ResetPasswordUseCase` — validate token, hash new password, mark used
- `VerifyEmailUseCase` — validate token, set email_verified_at
- `UpdateProfileUseCase` — name, avatar, locale, timezone, marketing opt-in
- `ChangePasswordUseCase` — verify current, validate new, update hash

### Use Case Fixes
- `RegisterUseCase` — generate verification token, enqueue verification email
- `LoginUseCase` — respect "remember me" (7d vs 24h JWT), update lastLoginAt

### New Pages
- `/auth/forgot-password` — email input, "Send Reset Link"
- `/auth/reset-password?token=` — new password form
- `/auth/verify-email?token=` — auto-verify on load
- `/account/settings` — profile edit, password change, preferences, delete account

### Page Fixes
- Login: fix forgot password link, add password show/hide
- Register: add terms checkbox, redirect to verification page
- Account dashboard: add sign-out button, edit profile link
- Addresses: fix edit pre-population, add country dropdown

---

## Context 3: Catalog

### Schema Changes
- Add `status` column to `products` (draft/active/archived)
- Create `redirects` table (id, storeId, fromPath, toPath, statusCode, createdAt)
- Create `inventory_transactions` table (id, storeId, variantId, type enum, quantity, reference, note, createdAt)
- Add indexes: `products(store_id, status)`, `product_variants(product_id)`, `product_images(product_id)`, `product_reviews(product_id, status)`
- Consolidate dual Printful systems → migrate to generic `provider_product_mappings`
- Fix `digital_assets` ↔ `download_tokens` FK
- Fix `product_variants.fulfillment_provider` text → enum

### Domain Additions
- `ProductStatus` type (draft/active/archived)
- `ProductType` VO with `isPhysical()`, `isDigital()`, `requiresFulfillment()`, `requiresShipping()`
- `Price` VO — amount + currency, formatting, comparison
- `InventoryLevel` VO — quantity, reserved, `availableCount()`, `isLowStock()`
- `SEOMetadata` VO — title, description, slug, `generateDefaults()`
- Guard: `canPurchase(variant)`, `canReview(product, userId, orders)`

### New Use Cases
- `ManageProductUseCase` — full admin CRUD (create, update, archive, manage images/variants)
- `ManageCollectionUseCase` — admin CRUD for collections
- `ManageRedirectsUseCase` — auto-create on slug change, admin CRUD

### Use Case Fixes
- `ListProductsUseCase` — SQL price sorting (not in-memory), status filter
- `GetProductUseCase` — include review summary, move related products loading from route
- `CreateProductFromArtUseCase` — use domain factory, auto-generate SEO, support draft status
- `SubmitReviewUseCase` — verified purchase check
- Wire `SearchProductsUseCase` or delete
- Wire `ManageDigitalAssetsUseCase` or delete

### New Pages
- `/admin/products` — product table with status filter, search, pagination
- `/admin/products/:id/edit` — full product editor with SEO preview
- `/admin/collections` — collection management

### Page Fixes
- Product listing: empty state, active filter chips, currency in price inputs, `rel=prev/next`
- Product detail: review display + submission, notify-when-available, share button, breadcrumb JSON-LD
- Create product from art: draft support, SEO fields, price suggestions

---

## Context 4: Cart

### Schema Changes
- Add index on `cart_items(cart_id)`
- Add `coupon_code_id` FK to `carts` (persist coupon across navigation)

### Domain Additions
- `CartTotal` VO — subtotal, shipping, tax, discount, total, `recalculate()`
- Guard: `canCheckout(cart)` — not empty, all in stock, no expired slots
- Guard: `canApplyCoupon(cart, coupon)` — minimum order, eligibility, limits

### Use Case Fixes
- `GetCartUseCase` — return server-calculated `CartTotal`, include `warnings[]`
- `AddToCartUseCase` — user-friendly stock messages
- `ApplyCouponUseCase` — persist on cart, return discount amount
- Implement `RemoveCouponUseCase` (currently stub)
- New `ValidateCartUseCase` — itemized problem list

### Page Fixes
- Cart page: add coupon input field, show applied coupon with discount, real-time shipping calculation, item-level warnings, order notes textarea, savings display
- Cart drawer: coupon badge, validation warnings

---

## Context 5: Checkout

### Schema Changes
- Add `notes` and `internal_notes` to `orders`
- Create `refunds` table (id, storeId, orderId, stripeRefundId, amount, currency, reason, status, lineItems jsonb, createdAt, processedAt)
- Create `order_notes` table (id, orderId, userId, type, content, createdAt)
- Add indexes: `orders(user_id)`, `orders(store_id, status)`, `orders(stripe_checkout_session_id)`, `orders(stripe_payment_intent_id)`, `order_items(order_id)`
- Add `currency` to `order_items`

### Domain Additions
- `OrderStatus` VO with transition guards
- `RefundRequest` VO — amount, reason, lineItems, status
- `OrderNote` VO — text, type, createdAt, authorId

### Critical Fixes
- `CreateCheckoutUseCase` — calculate real shipping + tax before Stripe session. Store breakdown in session metadata.
- `FulfillOrderUseCase` — read real tax/shipping from session metadata (not hardcoded $0)
- `CancelOrderUseCase` — actually call `stripe.refunds.create()` (currently calculates but never refunds)

### New Use Cases
- `RequestRefundUseCase` — partial refunds, Stripe integration, record in refunds table
- `GetOrderAdminUseCase` — admin view with fulfillment, shipments, refunds, notes
- `AddOrderNoteUseCase` — customer or internal notes

### New Pages
- `/checkout/review` — order review with address selection, shipping options, tax breakdown, total
- `/admin/orders` — admin order management with filters, pagination, search
- `/admin/orders/:id` — admin order detail with fulfillment, shipments, refunds, notes

### Page Fixes
- Checkout success: next-steps guidance by product type, estimated delivery, download button for digital
- Orders: pagination, fix deep-link, return request button, reorder button, proper date formatting

---

## Context 6: Billing

### Schema Changes
- Add index on `subscriptions(user_id)` and `subscriptions(stripe_subscription_id)`
- Add `features` jsonb to `subscription_plans`

### Domain Additions
- `SubscriptionStatus` VO with guards (canCancel, canResume, canUpgrade)
- `BillingPeriod` VO — `formatDisplay()` ("$9.99/month")

### New Use Cases
- Plan change (upgrade/downgrade) via Stripe proration
- Resume subscription (undo cancel_at_period_end)

### Page Fixes
- Subscriptions: plan comparison table, upgrade/downgrade buttons, resume button, billing history, dark mode fix

---

## Context 7: Booking

### Schema Changes
- Create `booking_waitlist` table (id, storeId, userId, availabilityId, position, status, notifiedAt, expiredAt, createdAt)
- Add indexes: `booking_requests(user_id, status)`, `booking_requests(availability_id, status)`, `booking_availability(store_id, slot_datetime)`
- Add `booking_request_id` FK to `bookings`
- Deprecate `slot_date`/`slot_time` text columns (use `slot_datetime` as authoritative)

### Domain Additions
- `BookingStatus` VO with policy-aware guards (canCancel within policy window)
- `SlotAvailability` VO — `remainingSpots()`, `isFull()`, `isAlmostFull()`
- `WaitlistEntry` interface
- `BookingConfirmation` VO with QR code data

### New Use Cases
- `JoinWaitlistUseCase`, `ProcessWaitlistUseCase`
- `MarkNoShowUseCase`
- `GetBookingConfirmationUseCase` (QR data)

### Use Case Fixes
- `CreateBookingRequestUseCase` — enforce cutoff time and max advance time
- `CheckInUseCase` — validate day-of-event window
- `CancelBookingUseCase` — enforce cancellation policy

### New Pages
- My Bookings detail view with QR code, calendar add (.ics), cancel with policy warning
- `/admin/bookings` — upcoming bookings, check-in, no-show, attendance stats, waitlist management

### Page Fixes
- Events list: category filter, search, pagination, human-readable dates
- Event detail: wire reviews, waitlist button, cancellation policy preview, calendar keyboard nav
- Event calendar: keyboard navigation, month/year jump, ARIA descriptions

---

## Context 8: AI Studio

### Schema Changes
- Add `photo_storage_key` to `pet_profiles`
- Add indexes: `generation_jobs(user_id, status)`, `generation_jobs(store_id, status)`
- Add generation quota tracking

### Critical Fix
- Pet photo upload broken — form submits JSON, silently drops file. Add multipart upload endpoint `POST /api/studio/pets/:id/photo`.

### New Use Cases
- `RetryGenerationUseCase`
- `ListUserArtworkUseCase`
- `DeleteArtworkUseCase`

### Use Case Fixes
- `GenerateArtworkUseCase` — quota check, validate pet has photo
- `ManagePetProfileUseCase` — add `uploadPhoto()` method

### New Pages
- `/account/artwork` (or `/studio/my-gallery`) — user's completed generations

### Page Fixes
- Pets page: fix photo upload, pre-populate edit form, make buttons touch-accessible
- Studio gallery: search, client-side tab filtering, "Your Creations" section
- Studio create: visual step progress, photo warning, quota display, retry on failure
- Studio preview: social sharing, conditional "Create Product" for admins only

---

## Context 9: Fulfillment

### Schema Changes
- Add indexes: `shipments(order_id)`, `fulfillment_request_items(fulfillment_request_id)`, `fulfillment_request_items(order_item_id)`
- Create `provider_health_snapshots` table
- Create `audit_log` table (serves all contexts)
- Fix `fulfillment_requests.provider` text → enum
- Fix `product_variants.fulfillment_provider` text → enum

### Domain Additions
- `FulfillmentRequestStatus` VO with transition guards
- `ProviderHealth` concept — success/failure rates

### New Use Cases
- `GetProviderHealthUseCase`
- `RetryFulfillmentBatchUseCase`
- `AuditLogUseCase` (serves all contexts)

### Use Case Fixes
- Wire `GetProviderCatalogUseCase` to admin
- Wire `MapProductToProviderUseCase` to admin
- Delete `CreatePrintfulOrderUseCase` (superseded)
- Delete `ConfigureProviderUseCase` (or wire it)

### Provider Fixes
- Gooten/Shapeways: document or implement webhook verification
- Audit Prodigi HMAC implementation
- Remove legacy Printful tables, migrate to generic system

### New Pages
- `/admin/fulfillment/:id` — request detail with timeline, events, shipment
- `/admin/shipping` — shipping zone management
- `/admin/tax` — tax zone management

### Page Fixes
- Fulfillment dashboard: pagination, filters, clickable IDs, confirmation dialogs, date formatting, auto-refresh, provider health cards

---

## Context 10: Promotions

### Critical Fix
- Fix route registration: `app.route("/api", promotionRoutes)` → `app.route("/api/promotions", promotionRoutes)`

### Schema Changes
- Add indexes: `promotion_redemptions(promotion_id)`, `promotion_redemptions(order_id)`, `coupon_codes(code)`, `customer_segment_memberships(customer_id)`

### Use Case Fixes
- Wire `EvaluateCartPromotionsUseCase` into checkout (auto-apply automatic promotions)
- Wire `RedeemPromotionUseCase` into order creation (record redemption)
- Formalize `RefreshSegmentMembershipUseCase`

### New Pages
- `/admin/promotions` — promotion management with create wizard, status filters, edit, duplicate, disable
- `/admin/promotions/:id/codes` — coupon code management, bulk generate, export
- `/admin/segments` — customer segment management with rule builder
- Promotion analytics section

---

## Context 11: Reviews

### Schema Changes
- Add `response_text`, `response_at` to `product_reviews`
- Add `verified_purchase_order_id` to `product_reviews`
- Add unique constraint on `(product_id, user_id)`
- Add index on `product_reviews(store_id, status)`

### New Use Cases
- `RespondToReviewUseCase` — store owner public reply
- `RequestReviewUseCase` — post-delivery email requesting review

### Use Case Fixes
- `SubmitReviewUseCase` — verified purchase check, duplicate prevention
- `ListReviewsUseCase` — include ReviewSummary (avg, distribution)

### Page Fixes
- Product detail: full review display with stars, submission form, summary histogram, store owner responses, Review + AggregateRating JSON-LD
- `/admin/reviews` — moderation queue with filters, approve/reject, reply inline

---

## Context 12: Affiliates

### Schema Changes
- Fix `affiliates.parent_affiliate_id` FK constraint
- Fix `affiliate_conversions.parent_conversion_id` FK constraint
- Add indexes: `affiliate_conversions(affiliate_id, status)`, `affiliate_conversions(order_id)`
- Add `minimum_payout_amount` to `affiliate_tiers`
- Add `payout_email` to `affiliates`

### Use Case Fixes
- Extract inline route handlers to proper use cases (register, dashboard, links)
- Wire `AttributeConversionUseCase` into order creation (read affiliate cookie)
- Add link analytics, payout settings, admin management

### Page Fixes
- Register: show commission rates, terms
- Dashboard: remove `any` types, add trends, copy-to-clipboard, earnings chart
- Links: copy-to-clipboard, per-link stats, delete button
- Payouts: payout settings, next payout estimate
- Add "Affiliates" to account nav for registered affiliates
- `/admin/affiliates` — manage affiliates, approve/suspend, performance view

---

## Context 13: Analytics

### Schema Changes
- Add `analytics_funnels` table
- Fix analytics index (move `event_type` after `created_at`)
- Remove duplicate stub endpoint in index.tsx
- Add event retention/archival cron

### New Use Cases
- `GetConversionFunnelUseCase`
- `GetTopProductsUseCase`
- `GetTrafficSourcesUseCase`
- `GetRevenueMetricsUseCase`
- `ArchiveOldEventsUseCase`

### Use Case Fixes
- `TrackEventUseCase` — record funnel steps
- `GetDashboardMetricsUseCase` — make store-scoped, add period comparison

### New Pages
- `/admin/analytics` — summary cards with trends, revenue chart, conversion funnel, top products, traffic sources, date range picker

---

## Context 14: Platform

### Schema Changes
- Create `store_invitations` table
- Add `logo_url`, `favicon_url` to `stores`
- Add index on `platform_transactions(store_id, created_at)`
- Document `store_settings` key schema

### Use Case Fixes
- Extract all 6 inline route handlers to proper use cases
- New: `InviteMemberUseCase`, `AcceptInvitationUseCase`, `ChangeMemberRoleUseCase`
- New: `UploadStoreLogoUseCase`
- New: `EnforcePlanLimitsUseCase`
- New: `GetPlatformOverviewUseCase`

### Admin Shell
- Left sidebar with all admin sections
- Top bar: store name, store switcher, user avatar + sign out
- Breadcrumbs within admin
- Mobile: collapsible sidebar

### Page Fixes
- Store dashboard: member names not UUIDs, revenue stats, action items, SVG icons
- Store settings: logo upload, plan upgrade flow, domain management, social links
- Store members: email invitation (not user ID), role change, invitation state
- Integrations: test connection at store level, setup wizard, copy webhook URLs
- `/platform/overview` — super_admin platform-wide stats

---

## Context 15: Venues

### Schema Changes
- Add `operating_hours` jsonb, `featured_image_url` to `venues`
- Type `amenities` and `photos` JSONB columns

### Use Case Fixes
- Extract inline handlers to use cases
- Add `ListVenueEventsUseCase`

### Page Fixes
- Both venue pages: self-host MapLibre (or SRI), move CSS to head, defer scripts, loading/error states
- Venue list: search, amenity filters, capacity with units, typed props
- Venue detail: photo gallery, operating hours, directions link, Place JSON-LD
- `/admin/venues` — venue management with map pin, hours editor, photo upload

---

## Context 16: Cross-Cutting

### Content Pages
- About page: real content, team section, Organization JSON-LD
- Contact page: contact form, location, hours, ContactPage JSON-LD

### Error/Empty States
- All collections use `EmptyState` component
- 404: search bar, popular links
- 500: friendly message, retry button

### Performance
- Conditional script loading per page
- `loading="lazy"` on below-fold images
- `fetchpriority="high"` on LCP images
- Preconnect to Stripe

### Accessibility
- Fix hover-only interactions
- Calendar keyboard navigation
- Modal focus traps
- Form error `aria-describedby`
- Heading hierarchy audit

### LLM Discoverability
- `/llms.txt` endpoint
- `/.well-known/ai-plugin.json`
- Sufficient unique text content per page
- FAQ sections on product/event pages

---

## Summary

| Metric | Current | After |
|--------|---------|-------|
| Broken features | 6 critical (auth, upload, checkout, refunds, edit forms, deep links) | 0 |
| Pages with `any` types | 8+ | 0 |
| Missing database indexes | 20 | 0 |
| Admin pages | 3 (fulfillment, integrations ×2) | 15+ with admin shell |
| Use cases not wired to routes | 10+ | 0 |
| JSON-LD structured data pages | 2 (product, event) | All pages |
| Design system components | 0 (raw Tailwind) | 13+ typed components |
| Empty states | Inconsistent | Standardized via `EmptyState` component |
