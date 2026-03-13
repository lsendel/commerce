# Printful Ecommerce Production Plan

Date: **March 6, 2026**

## Product Direction

This is a **best-in-class ecommerce product**, not a social network.

The core business is:

> Help operators create, sell, and automatically fulfill products online, with Printful-first workflows, strong storefront conversion, reliable checkout, elegant UI, rich usability, and production-safe operations.

Social or community features, if they exist, should support merchandising, reviews, trust, and growth. They are not the primary product.

## Corrected Product Thesis

petm8 should be positioned as:

**A premium ecommerce platform for personalized pet merchandise and related products, with AI-assisted creation and automated fulfillment.**

Primary pillars:

1. **Storefront conversion**
   Beautiful merchandising, clear product discovery, persuasive product detail pages, strong cart and checkout UX
2. **Printful-first fulfillment**
   Reliable product mapping, mockups, order submission, tracking, cancellation, refund handling, and webhook reconciliation
3. **Operator control**
   Admin, catalog, integrations, analytics, pricing, fulfillment dashboards, and exception handling
4. **AI-assisted product creation**
   Turn uploaded or generated pet art into sellable products with minimal operator friction
5. **Production readiness**
   Smoke coverage, observability, retries, idempotency, permissions, and safe failure modes
6. **Design quality**
   Elegant, premium, mobile-first ecommerce experience across storefront and admin

## Current State Summary

### What already exists

- Cloudflare Workers + Hono + Drizzle + Neon foundation
- Public storefront, account, cart, checkout, AI studio, admin, platform, integrations, analytics, bookings, venues
- Stripe integration and fulfillment abstractions
- Strong Printful-related groundwork and existing fulfillment planning
- Many production-readiness docs and smoke scripts
- Current baseline checks pass:
  - `pnpm typecheck`
  - `pnpm check:routes`

### What is still missing or incomplete

- The consumer experience is not yet clearly optimized for ecommerce conversion
- Some planned fulfillment and auto-fulfillment capabilities appear partially implemented or only documented
- Printful-first product creation flow still needs to be treated as a primary value stream
- Admin/operator tooling is broad, but some flows look unfinished or uneven
- There is no single, current traceability matrix from requirement -> implementation -> smoke coverage
- The overall visual system is still competent but not yet premium enough for a best-in-class commerce product

## Strategic Decision

Treat the product as **commerce-first, operations-first, fulfillment-first**.

That means:

- Prioritize storefront, checkout, catalog, product creation, and fulfillment over social/community expansion
- Keep AI features only where they improve conversion or reduce operator effort
- Keep events/venues/services only if they support merchandising or customer acquisition
- Measure success by conversion, fulfillment reliability, repeat purchase, operator speed, and production safety

## Program Goals

### Outcome goals

- Make it extremely easy to create and publish sellable products
- Make storefront browsing and checkout feel premium, clear, and fast
- Make Printful auto-fulfillment dependable and observable
- Make admin and integrations usable enough for real daily operations
- Eliminate dead-end or half-implemented features from the main product path

### Launch gates

- No blocking `500` responses on storefront, auth, cart, checkout, product creation, fulfillment, admin, or integrations paths
- Every critical ecommerce flow is covered by smoke and end-to-end tests
- Printful sync, order submission, webhook handling, and recovery paths are explicit and monitored
- UI, accessibility, responsive behavior, and content quality are consistent across public and admin surfaces

## Gap Map By Area

### Storefront UI and Graphic Design

Current state:

- The storefront exists and has a usable design baseline
- Product, cart, and layout surfaces are present but not yet clearly best-in-class
- The homepage still communicates a broad pet platform rather than a sharper ecommerce value proposition

Needed:

- Stronger premium ecommerce brand direction
- Better merchandising hierarchy on home, collection, and product pages
- Tighter photography/mockup treatment and product-card polish
- Better mobile-first shopping flows
- Consistent empty, error, loading, and success states

### Usability and Conversion

Current state:

- Catalog, cart, checkout, account, and AI studio flows exist
- Several admin and account pages already have usable foundations

Needed:

- Faster path from landing -> product discovery -> add to cart -> checkout
- Clearer pricing, shipping, tax, ETA, and refund expectations
- Better variant selection, stock messaging, bundle logic, and upsells
- Stronger cart/checkout recovery and customer reassurance patterns

### AI-Assisted Commerce

Current state:

- AI studio exists and can generate pet art
- Existing planning already points toward art-to-product workflows

Needed:

- First-class "create product from art" flow
- Mockup generation and product publishing as a primary workflow
- Better template-to-product conversion UX
- Reliable handoff from AI generation into catalog and fulfillment

### Printful and Auto-Fulfillment

Current state:

- Printful infrastructure already exists
- Multi-provider and fulfillment request planning is already documented
- Queue, webhook, and repository layers are present

Needed:

- Hard guarantee that Printful-first flows are complete and stable
- Product mapping confidence and validation
- Better retry, idempotency, exception handling, and cost visibility
- Strong admin tooling for failed orders, retries, cancellations, and refunds

### Admin and Integrations

Current state:

- Admin surface is broad: products, orders, promotions, shipping, tax, fulfillment, integrations, analytics
- Integrations and marketplace pages exist

Needed:

- Parity audit: implemented backend vs available frontend entry points
- Complete happy-path and failure-path support for operators
- Clearer system health, integration verification, and action feedback
- Stronger operator affordances for editing products, pricing, and provider mappings

### Production Readiness

Current state:

- There is already substantial production-readiness planning and smoke infrastructure
- The repo contains many reliability, compliance, and operations artifacts

Needed:

- One execution plan centered on ecommerce readiness, not generalized platform ambition
- Full traceability for critical money flows
- Staging-grade end-to-end coverage for checkout and fulfillment
- Clear operational dashboards and incident playbooks for live selling

## Execution Plan

## Phase 0: Scope Lock and Traceability

Duration: **1 week**

Goal: lock the product around ecommerce and auto-fulfillment, then map exactly what exists and what is missing.

Work:

- Inventory all ecommerce-critical routes, APIs, queues, jobs, and admin pages
- Mark features as `production-ready`, `partial`, `planned-only`, `dead-end`, or `defer`
- Create a traceability matrix:
  requirement -> schema/domain -> use case -> route -> page/script -> smoke coverage
- Identify which current non-core features can be deprioritized from the main roadmap

Deliverables:

- Ecommerce requirements matrix
- feature inventory with implementation status
- storefront and admin critical path map
- launch-scope list for v1

Definition of done:

- No ambiguity about the primary product
- No major ecommerce flow exists without an owner and implementation status
- No planned feature remains "assumed complete" without evidence

## Phase 1: Runtime Stabilization and Flow Audit

Duration: **2 weeks**

Goal: make the current platform safe to extend without carrying hidden runtime defects.

Work:

- Re-run and extend smoke coverage for:
  - home
  - products
  - product detail
  - cart
  - checkout
  - checkout success
  - account orders
  - admin orders
  - admin products
  - admin fulfillment
  - integrations
- Fix schema drift, route drift, and broken scripts
- Standardize form validation, toasts, and action feedback
- Verify env coverage for payments, fulfillment, tax, shipping, queues, and storage

Definition of done:

- Core ecommerce flows are green
- No blocking 500s on critical buying or operating paths
- Regressions are caught before deployment

## Phase 2: Storefront and Design Excellence

Duration: **2 weeks**

Goal: make the buying experience feel premium and conversion-oriented.

Work:

- Refocus homepage around:
  - personalized products
  - quality
  - trust
  - fulfillment confidence
  - fast gifting and easy ordering
- Upgrade collection and product detail pages:
  - stronger media layout
  - clearer variant selection
  - delivery/production expectations
  - reviews and trust signals
  - bundle and upsell placement
- Improve cart and checkout clarity:
  - coupon state
  - savings
  - shipping/tax breakdown
  - ETA messaging
  - failure recovery
- Apply a premium commerce visual language across public surfaces

Suggested anchor files:

- `/Users/lsendel/Projects/commerce/src/routes/pages/home.page.tsx`
- `/Users/lsendel/Projects/commerce/src/routes/pages/product-list.page.tsx`
- `/Users/lsendel/Projects/commerce/src/routes/pages/product-detail.page.tsx`
- `/Users/lsendel/Projects/commerce/src/routes/pages/cart.page.tsx`
- `/Users/lsendel/Projects/commerce/src/components/product/`
- `/Users/lsendel/Projects/commerce/src/components/cart/`

Definition of done:

- The product clearly feels like a premium ecommerce experience
- Mobile shopping flows are easy and persuasive
- Product discovery and checkout are materially stronger

## Phase 3: AI Art to Sellable Product

Duration: **2 weeks**

Goal: turn AI generation into a real merchandising pipeline.

Work:

- Promote `AI Studio -> Create Product -> Mockup -> Publish` into a first-class flow
- Complete or harden:
  - product creation from art
  - design placements
  - variant pricing and margin visibility
  - provider mappings
  - draft vs published status
- Make generated art immediately useful to operators selling online
- Improve template selection and preview confidence

Suggested anchor files:

- `/Users/lsendel/Projects/commerce/src/routes/pages/studio/create.page.tsx`
- `/Users/lsendel/Projects/commerce/src/routes/pages/studio/preview.page.tsx`
- `/Users/lsendel/Projects/commerce/src/routes/pages/platform/create-product.page.tsx`
- `/Users/lsendel/Projects/commerce/src/application/ai-studio/`
- `/Users/lsendel/Projects/commerce/src/application/catalog/create-product-from-art.usecase.ts`

Definition of done:

- An operator can turn generated art into a purchasable product without manual back-office work
- Product creation feels intentional, fast, and reliable

## Phase 4: Printful-First Fulfillment Completion

Duration: **3 weeks**

Goal: make Printful auto-fulfillment fully production-safe.

Work:

- Audit and complete:
  - provider product mappings
  - fulfillment requests
  - queue submission
  - webhook reconciliation
  - shipment tracking
  - cancellations
  - refunds
  - exception handling
- Treat Printful as the primary live provider path
- Ensure idempotency at checkout webhook, queue consumer, and provider event layers
- Expose fulfillment health, retries, and raw event visibility in admin

Suggested anchor files:

- `/Users/lsendel/Projects/commerce/src/application/checkout/fulfill-order.usecase.ts`
- `/Users/lsendel/Projects/commerce/src/queues/order-fulfillment.consumer.ts`
- `/Users/lsendel/Projects/commerce/src/infrastructure/printful/`
- `/Users/lsendel/Projects/commerce/src/infrastructure/fulfillment/`
- `/Users/lsendel/Projects/commerce/src/routes/api/fulfillment.routes.ts`
- `/Users/lsendel/Projects/commerce/src/routes/pages/admin/fulfillment-dashboard.page.tsx`

Definition of done:

- Paid orders reliably enter fulfillment
- Operator can see, understand, retry, and resolve failed fulfillment states
- Webhooks cannot silently corrupt order state

## Phase 5: Checkout, Money Flows, and Customer Confidence

Duration: **2 weeks**

Goal: remove uncertainty from the transaction path.

Work:

- Make tax and shipping fully real, not placeholder behavior
- Tighten checkout review and order confirmation flows
- Improve order detail, returns, cancellations, and exchanges
- Add better customer-facing delivery and next-step communication
- Verify Stripe session metadata, webhook state reconciliation, and refund accounting

Suggested anchor files:

- `/Users/lsendel/Projects/commerce/src/application/checkout/create-checkout.usecase.ts`
- `/Users/lsendel/Projects/commerce/src/application/tax/calculate-tax.usecase.ts`
- `/Users/lsendel/Projects/commerce/src/application/fulfillment/calculate-shipping.usecase.ts`
- `/Users/lsendel/Projects/commerce/src/routes/api/checkout.routes.ts`
- `/Users/lsendel/Projects/commerce/src/routes/pages/checkout-success.page.tsx`

Definition of done:

- Customers see accurate totals and reliable confirmation states
- Order creation, payment, and fulfillment handoff are internally consistent
- Refund and cancellation logic is predictable and supportable

## Phase 6: Admin, Catalog, and Integration Parity

Duration: **2 weeks**

Goal: make the operator side complete enough for real selling.

Work:

- Close backend/frontend gaps in:
  - products
  - collections
  - orders
  - fulfillment
  - shipping
  - tax
  - promotions
  - analytics
  - integrations
- Improve product editing, inventory messaging, pricing controls, and provider mapping workflows
- Strengthen integration verification and health feedback
- Remove or hide incomplete operator surfaces that are not launch-ready

Definition of done:

- Operators can manage the store without falling into dead ends
- Important admin pages are complete and trustworthy
- Integration failures are visible and actionable

## Phase 7: Production Readiness Gate

Duration: **2 weeks**

Goal: prove the ecommerce system is ready for real transactions.

Work:

- Full end-to-end coverage for:
  - product browse
  - product detail
  - add to cart
  - coupon
  - checkout
  - success
  - order history
  - admin order review
  - admin fulfillment retry
  - Printful webhook path
- Security review:
  - authz
  - tenant isolation
  - secret handling
  - webhook verification
  - PII handling
- Performance review:
  - storefront latency
  - cart and checkout responsiveness
  - admin load time
  - queue and webhook processing
- Operations:
  - alerting
  - incident playbooks
  - release rollback
  - smoke reports

Definition of done:

- No unresolved P0/P1 launch blockers
- Staging smoke is green
- The team can operate the product during real sales activity

## Cross-Functional Workstreams

### Design System and Brand

- Establish a premium ecommerce visual system
- Use stronger product storytelling, merchandising hierarchy, and trust cues
- Unify public and admin interaction patterns without making them look identical

### Analytics and Reporting

- Track:
  - product views
  - add-to-cart rate
  - checkout start rate
  - order conversion rate
  - AOV
  - refund rate
  - fulfillment failure rate
  - time-to-ship
- Build dashboards for conversion and fulfillment operations

### Accessibility and Quality

- Keyboard and screen-reader support across forms, product selectors, and admin tools
- Responsive QA on mobile shopping paths
- Consistent contrast, focus states, and loading behavior

### Optional Growth Layer

- Reviews, referrals, loyalty, events, and light community features can stay as growth levers
- These should only be expanded if they help conversion, retention, or trust

## Priority Backlog

### P0

- Ecommerce requirement matrix
- storefront and checkout hardening
- AI art to product flow
- Printful fulfillment completion
- admin fulfillment and order parity
- smoke coverage for money and fulfillment paths

### P1

- premium public design uplift
- product editor and provider mapping UX
- analytics dashboard accuracy
- cancellation/refund/operator tooling

### P2

- broader multi-provider expansion
- advanced growth features
- deeper recommendation and merchandising automation

## Recommended Success Metrics

- Conversion rate
- add-to-cart rate
- checkout completion rate
- average order value
- product publish time from art generation
- fulfillment submission success rate
- fulfillment exception resolution time
- refund rate
- repeat purchase rate
- 5xx rate on commerce-critical routes

## Immediate Next Actions

1. Freeze the plan around ecommerce and Printful-first fulfillment.
2. Build the requirement and traceability matrix for the critical commerce path.
3. Prioritize the `AI Studio -> Product -> Checkout -> Printful fulfillment` flow as the flagship system.
4. Rework the homepage and product surfaces to communicate a sharper ecommerce offer.
5. Remove or defer non-core features from the main release path unless they directly help selling.

## Recommended First Build Targets

1. **Homepage and product-detail conversion uplift**
2. **Create-product-from-art happy path**
3. **Printful mapping and fulfillment request hardening**
4. **Checkout totals, success state, and order detail integrity**
5. **Admin fulfillment dashboard and retry/recovery tooling**
