# Headless API Packs Runbook

## Scope

- Feature flag: `headless_api_packs`
- Surfaces:
  - `/admin/headless`
  - `/api/admin/headless/packs`
  - `/api/admin/headless/packs/:id/revoke`
  - `/api/headless/catalog/products`
  - `/api/headless/catalog/products/:slug`
  - `/api/headless/catalog/collections`
  - `/api/headless/catalog/collections/:slug`

## Key Behavior

- Headless pack keys are generated once and only stored as SHA-256 hashes.
- Keys support scoped access:
  - `catalog:read`
  - `products:read`
  - `collections:read`
- Revoked keys immediately lose access.

## Rollout

1. Enable `headless_api_packs` for internal admin users.
2. Open `/admin/headless` and create a pack with `catalog:read`.
3. Copy the generated key and validate headless channel calls with `x-api-key` or `Authorization: Bearer <key>`.
4. Confirm usage telemetry via `last_used_at` and analytics events:
   - `headless_api_pack_created`
   - `headless_api_pack_revoked`

## Guardrails

- Pack management APIs are admin-only.
- Pack list/create/revoke routes are rate-limited.
- Public headless channel requires a valid active key and scope check per route.

## Rollback

1. Remove `headless_api_packs` from `FEATURE_FLAGS`.
2. Redeploy.
3. Verify:
   - `/admin/headless` redirects away;
   - all `/api/headless/*` routes return `FEATURE_DISABLED`.
