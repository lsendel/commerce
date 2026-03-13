# End-to-End Smoke Matrix Runbook

## Scope

- Command: `pnpm smoke:e2e-matrix`
- Script: `scripts/smoke-e2e-matrix.ts`
- Purpose:
  - run a single smoke matrix over critical user/operator journeys,
  - keep admin parity + SEO + LLM + structured-data smoke in one execution/report pipeline,
  - publish JSON/Markdown artifacts for section-level triage.

## Covered Journey Sections

- `public-pages`:
  - `/`, `/products`, `/events`
- `public-api`:
  - `/health`, `/api/products`, `/api/cart`, `/api/platform/plans`
- `seo-public-assets`:
  - `/robots.txt`, `/sitemap.xml`, `/llms.txt`
- `llm-surface-assets`:
  - `/.well-known/ai-plugin.json`
- `auth-pages` + `auth-api-validation`:
  - login/register/forgot-password pages,
  - validation-path POST checks for `/api/auth/login` and `/api/auth/register`
- `auth-api-edge-cases`:
  - `/api/auth/forgot-password` validation-path behavior,
  - invalid-token behavior for `/api/auth/reset-password`,
  - invalid-token behavior for `/api/auth/verify-email`.
- `checkout-failure-modes`:
  - `/api/cart/apply-coupon` validation and not-found paths,
  - `/api/shipping/calculate` validation failure path (`400`) to detect checkout shipping input-regression behavior.
- `account-page-gates` + `account-api-gates` (unauth behavior):
  - redirect and `401` expectations for account surfaces
  - page-gate coverage includes:
    - `/account/settings`
    - `/account/subscriptions`
    - `/account/orders`
    - `/account/addresses`
    - `/account/pets`
    - `/account/artwork`
    - `/account/loyalty`
  - account API gate coverage also includes:
    - `/api/account/profile`
    - `/api/account/orders`
    - `/api/account/subscriptions`
    - `/api/account/addresses`
    - `/api/analytics/readiness`
    - `/api/analytics/top-products`
    - `/api/analytics/revenue`
  - includes checkout-create auth gate for `/api/checkout`
  - includes cost-observability auth gate for `/api/analytics/cost-observability`
  - includes subscription API gate checks:
    - `/api/subscriptions`
    - `/api/subscriptions/builder/options`
    - `/api/subscriptions/builder/quote`
    - `/api/subscriptions/builder/checkout`
    - `/api/subscriptions/portal`
    - `/api/subscriptions/:id` (cancel)
    - `/api/subscriptions/:id/change-plan`
    - `/api/subscriptions/:id/resume`
- `platform-page-gates` + `platform-api-gates` (unauth behavior)
- `admin-page-gates` + `admin-api-gates` (unauth behavior)
  - platform page-gate coverage includes:
    - `/platform/dashboard`
    - `/platform/settings`
    - `/platform/members`
    - `/platform/integrations`
  - admin page-gate coverage includes:
    - `/admin/orders`
    - `/admin/analytics`
    - `/admin/bookings`
    - `/admin/reviews`
    - `/admin/segments`
    - `/admin/affiliates`
    - `/admin/fulfillment`
    - `/admin/promotions`
    - `/admin/promotion-codes`
    - `/admin/shipping`
    - `/admin/tax`
    - `/admin/workflows`
  - includes booking operator action gate checks (`check-in`, `no-show`) for unauth sessions
  - includes fulfillment SLA gate checks:
    - `/api/admin/ops/fulfillment-sla`
    - `/api/admin/ops/fulfillment-sla/interventions`
  - includes additional admin API gate checks:
    - `/api/admin/orders`
    - `/api/admin/reviews`
    - `/api/admin/segments`
    - `/api/admin/affiliates`
    - `/api/admin/bookings`
    - `/api/admin/fulfillment-dashboard`
    - `/api/admin/loyalty/program`
    - `/api/admin/loyalty/members`
    - `/api/admin/loyalty/transactions`
    - `/api/admin/support/tickets`
    - `/api/admin/support/tickets/stats`
    - `/api/admin/pricing-experiments`
    - `/api/admin/returns`
    - `/api/admin/control-tower/summary`
    - `/api/admin/control-tower/health`
    - `/api/admin/integration-marketplace/apps`
    - `/api/admin/headless/api-packs`
    - `/api/admin/policies`
    - `/api/admin/policies/violations`
    - `/api/admin/store-templates`
    - `/api/admin/ops/incidents/runbooks`
- Embedded command stage:
  - `pnpm smoke:admin-parity` (default contract mode)
  - `pnpm smoke:seo` (default live HTTP mode)
  - `pnpm smoke:llm-surface` (default live HTTP mode)
  - `pnpm smoke:structured-data` (default live HTTP mode)
  - `pnpm smoke:admin-analytics-automation` (authenticated admin recommendation-automation mode)
  - `pnpm smoke:landing-pages` (content pipeline quality-gate mode)
  - `pnpm smoke:growth-experiments` (registry + KPI guardrail mode)
  - `pnpm smoke:event-pipeline` (event taxonomy + contract reliability mode)
  - `pnpm smoke:segment-freshness` (segment refresh freshness + drift mode)
  - `pnpm smoke:identity-resolution` (identity mapping conflict mode)
  - `pnpm smoke:recommendation-quality` (ranking model quality + fallback mode)
  - `pnpm smoke:pricing-policy-simulation` (pricing/discount preflight risk simulation mode)
  - `pnpm smoke:fulfillment-sla` (returns/fulfillment SLA risk prediction mode)
  - `pnpm smoke:compliance-controls` (SOC2-style control matrix + evidence-path integrity mode)
  - `pnpm smoke:audit-pii` (audit trail coverage + PII redaction guardrail mode)
  - `pnpm smoke:secrets-hygiene` (secrets/key inventory rotation hygiene mode)
  - `pnpm smoke:access-governance` (RBAC governance + break-glass drill mode)
  - `pnpm smoke:cost-observability` (feature/team/tenant unit-economics telemetry mode)
  - `pnpm smoke:query-performance` (hot-path query budget and index coverage mode)
  - `pnpm smoke:cache-invalidation` (edge cache policy matrix + invalidation-plan integrity mode)
  - `pnpm smoke:workflow-reliability` (async workflow timeout/retry/compensation scorecard mode)
  - `pnpm smoke:dlq-remediation` (dead-letter auto-remediation policy + simulation metrics mode)
  - `pnpm smoke:api-versioning` (API version negotiation + deprecation lifecycle governance mode)
  - `pnpm smoke:partner-onboarding` (partner self-serve onboarding contract verification mode)

## Modes

1. Default mode (HTTP + parity command):
   - `SMOKE_BASE_URL=https://<env-host> pnpm smoke:e2e-matrix`
2. Contract-only matrix mode (skip HTTP checks):
   - `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`
3. Skip admin-parity command stage:
   - `SMOKE_MATRIX_SKIP_ADMIN_PARITY=true pnpm smoke:e2e-matrix`
4. Skip SEO command stage:
   - `SMOKE_MATRIX_SKIP_SEO=true pnpm smoke:e2e-matrix`
5. Skip LLM-surface command stage:
   - `SMOKE_MATRIX_SKIP_LLM_SURFACE=true pnpm smoke:e2e-matrix`
6. Skip structured-data command stage:
   - `SMOKE_MATRIX_SKIP_STRUCTURED_DATA=true pnpm smoke:e2e-matrix`
7. Skip admin-analytics-automation command stage:
   - `SMOKE_MATRIX_SKIP_ADMIN_ANALYTICS_AUTOMATION=true pnpm smoke:e2e-matrix`
8. Skip landing-pages command stage:
   - `SMOKE_MATRIX_SKIP_LANDING_PAGES=true pnpm smoke:e2e-matrix`
9. Skip growth-experiments command stage:
   - `SMOKE_MATRIX_SKIP_GROWTH_EXPERIMENTS=true pnpm smoke:e2e-matrix`
10. Skip event-pipeline command stage:
   - `SMOKE_MATRIX_SKIP_EVENT_PIPELINE=true pnpm smoke:e2e-matrix`
11. Skip segment-freshness command stage:
   - `SMOKE_MATRIX_SKIP_SEGMENT_FRESHNESS=true pnpm smoke:e2e-matrix`
12. Skip identity-resolution command stage:
   - `SMOKE_MATRIX_SKIP_IDENTITY_RESOLUTION=true pnpm smoke:e2e-matrix`
13. Skip recommendation-quality command stage:
   - `SMOKE_MATRIX_SKIP_RECOMMENDATION_QUALITY=true pnpm smoke:e2e-matrix`
14. Skip pricing-policy-simulation command stage:
   - `SMOKE_MATRIX_SKIP_PRICING_POLICY_SIMULATION=true pnpm smoke:e2e-matrix`
15. Skip fulfillment-sla command stage:
   - `SMOKE_MATRIX_SKIP_FULFILLMENT_SLA=true pnpm smoke:e2e-matrix`
16. Skip compliance-controls command stage:
   - `SMOKE_MATRIX_SKIP_COMPLIANCE_CONTROLS=true pnpm smoke:e2e-matrix`
17. Skip audit-pii command stage:
   - `SMOKE_MATRIX_SKIP_AUDIT_PII=true pnpm smoke:e2e-matrix`
18. Skip secrets-hygiene command stage:
   - `SMOKE_MATRIX_SKIP_SECRETS_HYGIENE=true pnpm smoke:e2e-matrix`
19. Skip access-governance command stage:
   - `SMOKE_MATRIX_SKIP_ACCESS_GOVERNANCE=true pnpm smoke:e2e-matrix`
20. Skip cost-observability command stage:
   - `SMOKE_MATRIX_SKIP_COST_OBSERVABILITY=true pnpm smoke:e2e-matrix`
21. Skip query-performance command stage:
   - `SMOKE_MATRIX_SKIP_QUERY_PERFORMANCE=true pnpm smoke:e2e-matrix`
22. Skip cache-invalidation command stage:
   - `SMOKE_MATRIX_SKIP_CACHE_INVALIDATION=true pnpm smoke:e2e-matrix`
23. Skip workflow-reliability command stage:
   - `SMOKE_MATRIX_SKIP_WORKFLOW_RELIABILITY=true pnpm smoke:e2e-matrix`
24. Skip dlq-remediation command stage:
   - `SMOKE_MATRIX_SKIP_DLQ_REMEDIATION=true pnpm smoke:e2e-matrix`
25. Skip api-versioning command stage:
   - `SMOKE_MATRIX_SKIP_API_VERSIONING=true pnpm smoke:e2e-matrix`
26. Skip partner-onboarding command stage:
   - `SMOKE_MATRIX_SKIP_PARTNER_ONBOARDING=true pnpm smoke:e2e-matrix`
27. Admin parity stage mode selection:
   - `SMOKE_MATRIX_ADMIN_PARITY_MODE=contract` (default)
   - `SMOKE_MATRIX_ADMIN_PARITY_MODE=inherit` (inherits current env for live parity run)
28. HTTP-off matrix mode behavior:
   - `SMOKE_MATRIX_SKIP_HTTP=true` skips HTTP checks and SEO/LLM/structured-data/admin-analytics-automation command stages.
   - landing-pages, growth-experiments, event-pipeline, segment-freshness, identity-resolution, recommendation-quality, pricing-policy-simulation, fulfillment-sla, compliance-controls, audit-pii, secrets-hygiene, access-governance, cost-observability, query-performance, cache-invalidation, workflow-reliability, dlq-remediation, api-versioning, and partner-onboarding command stages still run unless explicitly skipped.
29. Authenticated admin-analytics-automation stage behavior:
   - supports direct auth headers via `SMOKE_COOKIE` or `SMOKE_AUTHORIZATION`.
   - supports login bootstrap via `SMOKE_ADMIN_EMAIL` + `SMOKE_ADMIN_PASSWORD` (script calls `POST /api/auth/login` and reuses returned cookie).
   - if neither auth headers nor login credentials are present, `pnpm smoke:admin-analytics-automation` exits successfully with a clear skipped message.
   - set `SMOKE_ADMIN_ANALYTICS_REQUIRE_AUTH=true` to fail the stage instead of skipping when auth is absent.

## Artifacts

- JSON report:
  - `output/smoke/e2e-smoke-matrix-report.json`
- Markdown report:
  - `output/smoke/e2e-smoke-matrix-report.md`
- Optional path overrides:
  - `SMOKE_MATRIX_JSON_PATH`
  - `SMOKE_MATRIX_MD_PATH`

## CI Automation

- Workflow: `.github/workflows/e2e-smoke-matrix.yml`
- `contract-matrix`:
  - runs on PR/push/schedule/manual dispatch,
  - executes matrix in `SMOKE_MATRIX_SKIP_HTTP=true` mode.
- `live-matrix`:
  - runs on non-PR events when `SMOKE_BASE_URL` secret is set,
  - executes full HTTP matrix against configured environment,
  - forwards `SMOKE_COOKIE`/`SMOKE_AUTHORIZATION` and `SMOKE_ADMIN_EMAIL`/`SMOKE_ADMIN_PASSWORD` secrets when present for authenticated admin analytics automation coverage.
  - sets `SMOKE_ADMIN_ANALYTICS_REQUIRE_AUTH` automatically when any supported auth source is configured, so broken/missing auth fails fast instead of silently skipping.

## Failure Handling

1. If command stage fails:
   - inspect admin parity, SEO, LLM-surface, structured-data, admin-analytics-automation, landing-page pipeline, growth-experiment OS, event-pipeline, segment-freshness, identity-resolution, recommendation-quality, pricing-policy-simulation, fulfillment-sla, compliance-controls, audit-pii, secrets-hygiene, access-governance, cost-observability, query-performance, cache-invalidation, workflow-reliability, dlq-remediation, api-versioning, and/or partner-onboarding reports and fix drift first.
2. If HTTP matrix fails:
   - fix section-level endpoint mismatch (status/path/method),
   - rerun matrix command.
3. If only gate checks fail:
   - verify auth middleware and redirects for account/platform/admin routes.
