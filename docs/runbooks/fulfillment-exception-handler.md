# Fulfillment Exception Handler Runbook

## Scope

- Feature flag: `ai_fulfillment_exception_handler`
- Surfaces:
  - `/admin/fulfillment` (exception scan + auto-resolve controls)
  - `/api/admin/ops/fulfillment-exceptions`
  - `/api/admin/ops/fulfillment-exceptions/auto-resolve`

## What It Handles

- `failed` requests with transient failure signatures (timeout/network/429/5xx) -> auto retry.
- `pending` requests stale beyond threshold -> auto retry.
- `submitted`/`processing` stale without external provider ID -> auto retry.
- `submitted`/`processing` stale with external provider ID -> monitor (no auto action).
- `cancel_requested` stale -> monitor (no auto action).

## Rollout

1. Enable flag for admin users.
2. Open `/admin/fulfillment` and run **Scan Exceptions**.
3. Verify scan summary appears and exception list is populated when stale requests exist.
4. Run **Auto-resolve** and verify retried requests are re-queued.
5. Verify analytics events:
   - `fulfillment_exception_scan_requested`
   - `fulfillment_exception_auto_resolve_executed`

## Guardrails

- Endpoints are admin-only via `/api/admin/*` middleware.
- Scan and auto-resolve endpoints are rate-limited.
- Only retry-safe exceptions are auto-resolved; monitor/manual-review items remain untouched.

## Rollback

1. Remove `ai_fulfillment_exception_handler` from `FEATURE_FLAGS`.
2. Redeploy.
3. Verify dashboard exception controls disappear and API returns `FEATURE_DISABLED`.
