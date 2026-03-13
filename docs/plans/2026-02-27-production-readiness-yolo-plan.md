# Production Readiness YOLO Plan (Week-by-Week)

Start date: **Monday, March 2, 2026**  
Mode: **YOLO** (execute continuously in planned order, no approval pauses between tasks)

## Operating Rules

1. Prioritize production blockers first: `500`s, data/schema drift, auth/permission regressions.
2. No new feature work before critical flows are green.
3. Daily smoke run and defect triage.
4. Merge in small batches, always preserving a releasable main branch.
5. Every fix must include a smoke assertion to prevent regression.

## Week 1 (Mar 2 - Mar 8): Stabilize Runtime and Schema

1. Reconcile DB drift for missing columns causing runtime failures (`discount`, `photo_storage_key`, `payout_email`) and any additional drift discovered.
2. Re-run full local smoke baseline and eliminate all `500` responses on core paths.
3. Produce v1 backend/frontend traceability matrix (contracts vs routes vs UI usage).
4. Output: no critical runtime errors on public + account + affiliate entry points.

Definition of done:
1. `/account`, `/account/orders`, `/account/pets`, `/api/affiliates/dashboard` return non-500.
2. Typecheck passes.
3. Drift reconciliation migration committed.

## Week 2 (Mar 9 - Mar 15): Build Automated Smoke Infrastructure

1. Implement test scaffold (`tests/`, Vitest workspace, smoke projects, env template).
2. Add smoke suites for health/pages/graphql/core API coverage.
3. Add Playwright smoke for critical UI journeys (home/products/cart/auth/account/admin login gate).
4. Output: one command to run smoke baseline locally and in staging.

Definition of done:
1. `pnpm test:smoke` exists and runs.
2. Playwright smoke artifacts saved under `output/playwright/`.
3. Failures produce actionable section-level reports.

## Week 3 (Mar 16 - Mar 22): Storefront and Checkout Hardening

1. Validate and fix product browse, product detail, cart, coupon, checkout, success, downloads.
2. Verify analytics events and error paths (network failures, invalid coupons, empty cart checkout).
3. Ensure SEO surfaces remain valid (`sitemap.xml`, `robots.txt`, `llms.txt`, metadata basics).
4. Output: storefront conversion path consistently green.

Definition of done:
1. Add-to-cart -> checkout session -> success flow passes smoke.
2. No broken links/scripts in storefront paths.
3. All storefront regressions covered by smoke tests.

## Week 4 (Mar 23 - Mar 29): Account and Identity Reliability

1. Validate/fix account dashboard, orders, addresses, subscriptions, pets, artwork, settings.
2. Validate auth lifecycle (register/login/logout/forgot/reset/verify).
3. Remove any remaining blocking UX patterns in customer surfaces and standardize feedback/toasts.
4. Output: account management flows production-safe.

Definition of done:
1. All account screens open and submit without 500s.
2. Auth flows pass both API and UI smoke.
3. Error handling is non-blocking and visible to users.

## Week 5 (Mar 30 - Apr 5): Admin, Platform, and Affiliate Parity

1. Smoke and fix admin modules (orders, products, collections, promotions, tax, shipping, fulfillment, analytics, reviews, segments).
2. Smoke and fix platform modules (create store, settings, members, integrations, dashboard).
3. Close backend-implemented/frontend-missing gaps by adding UI entry points where required.
4. Output: operator workflows are complete and consistent.

Definition of done:
1. No admin/platform section has blocking path failures.
2. Backend/frontend traceability matrix shows ownership/resolution for each gap.
3. Role guards verified across all admin/platform endpoints.

## Week 6 (Apr 6 - Apr 12): Integrations and External Dependencies

1. Validate Printful, Stripe, email (Resend), tax/shipping providers, queue workflows.
2. Add smoke checks for webhook auth/signature and failure/retry behavior.
3. Verify scheduled jobs (where locally feasible) and provider health snapshots.
4. Output: external dependency reliability baseline.

Definition of done:
1. Integration smoke suite passes with configured env.
2. Webhook and queue paths have explicit error and retry handling.
3. Known provider outages degrade gracefully.

## Week 7 (Apr 13 - Apr 19): Security, Performance, and Observability

1. Security pass: authz checks, tenant isolation, sensitive data handling, secret usage.
2. Performance pass on key pages/APIs (response budget and slow query detection).
3. Observability pass: structured logs, error classification, operational dashboards/reporting.
4. Output: production controls expected by enterprise review.

Definition of done:
1. No open P0/P1 security findings.
2. Key endpoints meet baseline latency targets or have tracked remediations.
3. Incident triage data is available and usable.

## Week 8 (Apr 20 - Apr 26): Release Candidate and Readiness Gate

1. Run full end-to-end smoke against staging.
2. Freeze high-risk changes and fix only release blockers.
3. Publish production readiness report with pass/fail by section and residual risks.
4. Output: release candidate with explicit go/no-go recommendation.

Definition of done:
1. Critical smoke suite green.
2. No unresolved P0/P1 defects.
3. Final report delivered with rollback and monitoring plan.

## Weekly Cadence

1. Monday: execute planned batch.
2. Tuesday-Thursday: fix failures and add regression tests.
3. Friday: full smoke, publish status, queue next week automatically.

## Tracking Format (Used Every Week)

1. `Passed`: completed items and newly green flows.
2. `Failed`: defects by severity and owner.
3. `Gaps`: backend-only or frontend-only mismatches.
4. `Next`: exact next execution queue.

