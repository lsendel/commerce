# Week 39 Summary

## Scope

- Billing/subscription reliability hardening focused on:
  - idempotency across subscription mutations,
  - transient Stripe retry safety,
  - deterministic state transitions for cancel/resume/change-plan,
  - frontend-vs-backend parity coverage for subscription routes.

## Shipped This Week

1. Request idempotency baseline for subscription mutations
- Added shared key resolution in [`/Users/lsendel/Projects/commerce/src/shared/idempotency.ts`](/Users/lsendel/Projects/commerce/src/shared/idempotency.ts):
  - accepts caller-provided `Idempotency-Key`,
  - auto-derives stable short-window keys when caller does not provide one.
- Wired mutation key resolution and response header propagation in [`/Users/lsendel/Projects/commerce/src/routes/api/subscriptions.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/subscriptions.routes.ts) for:
  - create,
  - builder checkout,
  - portal session,
  - cancel,
  - change-plan,
  - resume.

2. Stripe mutation retry safety
- Added [`/Users/lsendel/Projects/commerce/src/infrastructure/stripe/retry.ts`](/Users/lsendel/Projects/commerce/src/infrastructure/stripe/retry.ts):
  - bounded retry with exponential backoff + jitter for retryable Stripe/network failures,
  - request options helper for Stripe idempotency key propagation.
- Updated [`/Users/lsendel/Projects/commerce/src/infrastructure/stripe/portal.adapter.ts`](/Users/lsendel/Projects/commerce/src/infrastructure/stripe/portal.adapter.ts) to apply retry + idempotency request options for:
  - customer portal sessions,
  - single-plan subscription checkout sessions,
  - builder checkout sessions.

3. State-transition idempotency hardening
- Updated subscription use cases:
  - [`manage-subscription.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/billing/manage-subscription.usecase.ts)
  - [`resume-subscription.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/billing/resume-subscription.usecase.ts)
  - [`build-subscription-bundle.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/billing/build-subscription-bundle.usecase.ts)
  - [`create-portal-session.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/billing/create-portal-session.usecase.ts)
- Reliability outcomes:
  - cancel is idempotent when already cancelled or already `cancelAtPeriodEnd`,
  - resume is idempotent when already active (not scheduled for cancellation),
  - plan-change is idempotent when requested plan matches current plan,
  - Stripe customer/session/subscription mutations now pass scoped idempotency keys.

4. Frontend retry/idempotency propagation
- Updated [`/Users/lsendel/Projects/commerce/src/routes/pages/account/subscriptions.page.tsx`](/Users/lsendel/Projects/commerce/src/routes/pages/account/subscriptions.page.tsx):
  - mutation requests now send `Idempotency-Key`,
  - mutation fetches now use retry wrapper for transient network/server failures while reusing the same key.

5. Contract and smoke parity updates
- Updated [`/Users/lsendel/Projects/commerce/src/contracts/subscriptions.contract.ts`](/Users/lsendel/Projects/commerce/src/contracts/subscriptions.contract.ts) to align runtime response statuses:
  - `portal`: add `400`,
  - `cancel`: add `400`.
- Expanded contract drift checks + route metadata in [`/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts) for all subscription endpoints.
- Expanded unauth gate coverage in [`/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts) for subscription API surfaces.

6. Incident operations
- Added subscription incident runbook:
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/subscription-incident-response.md`](/Users/lsendel/Projects/commerce/docs/runbooks/subscription-incident-response.md)
- Updated smoke runbooks:
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md`](/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md)
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md`](/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md)

## Validation

- `pnpm -s tsc --noEmit --pretty false`
- `pnpm smoke:admin-parity` (contract-only mode)
- `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`
- `pnpm smoke:production`

## Next Week Kickoff

- Week 40: checkout/payment edge automation:
  - coupon/tax/shipping failure-mode handling,
  - failure recovery and rollback playbooks,
  - checkout edge-case smoke expansion.
