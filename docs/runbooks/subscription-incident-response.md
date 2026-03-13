# Subscription Incident Response Runbook

## Scope

- APIs:
  - `POST /api/subscriptions`
  - `POST /api/subscriptions/builder/checkout`
  - `POST /api/subscriptions/portal`
  - `DELETE /api/subscriptions/:id`
  - `PATCH /api/subscriptions/:id/change-plan`
  - `POST /api/subscriptions/:id/resume`
- Reliability controls:
  - request idempotency keys (`Idempotency-Key` request/response header),
  - Stripe mutation retry with backoff for transient errors,
  - idempotent local state transitions for cancel/resume/change-plan retries.

## Detection Signals

- Elevated `5xx` on subscription mutation endpoints.
- Duplicate checkout/portal session complaints from support.
- Increased Stripe `429` or `5xx` errors in logs.
- Subscription state mismatch reports:
  - cancel requested but not reflected,
  - resume requested but still scheduled to cancel,
  - plan-change appears to succeed in UI but not persisted.

## Triage Checklist

1. Confirm endpoint, tenant/store, and user impact radius.
2. Confirm whether the failing request included `Idempotency-Key`.
3. Inspect Stripe error shape:
   - `statusCode` and `type` (`rate_limit_error`, `api_error`, `api_connection_error`).
4. Validate local subscription row:
   - `status`,
   - `planId`,
   - `cancelAtPeriodEnd`,
   - `updatedAt`.
5. Confirm webhook delivery health for `customer.subscription.updated/deleted`.

## Response Playbooks

### 1) Checkout/session duplication

1. Verify the same mutation key was reused on retry attempts.
2. If client-side retries are generating new keys, patch caller to reuse key per user action.
3. Temporarily disable high-risk UI actions if duplication continues:
   - hide/manage buttons on account subscription page,
   - optionally disable `subscription_builder` flag.
4. Backfill support resolution list by grouping affected rows by user + plan + creation window.

### 2) Cancel/resume transition drift

1. Re-run the exact API action with the same `Idempotency-Key` when available.
2. If local row is stale but Stripe is updated, let webhook reconcile; if webhook is delayed, replay Stripe event or perform controlled local update.
3. For repeated cancels/resumes, API should return current subscription snapshot (idempotent success path). If not, rollback to previous stable build and patch transition guard logic.

### 3) Plan-change reliability failures

1. Confirm current subscription has a Stripe item and target plan has `stripePriceId`.
2. Retry with same idempotency key to avoid duplicate prorations.
3. If Stripe change succeeded but local `planId` is stale, run targeted fix on affected subscription IDs and verify webhook/update path.

### 4) Stripe transient failure spikes

1. Confirm retry helper is active in current deploy (`runStripeMutationWithRetry` path).
2. Monitor retry success rate and tail latency.
3. If failure rate breaches SLO, rate-limit mutation buttons in UI and shift non-critical actions to degraded mode.

## Rollback Options

1. Disable subscription builder (`subscription_builder` flag) to reduce mutation volume.
2. Temporarily block `change-plan` and `resume` actions in UI while retaining read access.
3. Revert to last known stable deploy if regression started with current release.

## Recovery Validation

- Run:
  - `pnpm smoke:admin-parity`
  - `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`
  - live smoke matrix against environment if credentials available.
- Confirm no drift on:
  - contract method/path,
  - expected status codes for auth gates and validation paths,
  - subscription transition behavior in account UI.
