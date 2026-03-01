# Integration Marketplace Runbook

## Scope

- Feature flag: `integration_marketplace`
- Surfaces:
  - `/admin/integrations/marketplace`
  - `/api/admin/integration-marketplace/apps`
  - `/api/admin/integration-marketplace/apps/:provider/install`
  - `/api/admin/integration-marketplace/apps/:provider/uninstall`
  - `/api/admin/integration-marketplace/apps/:provider/verify`

## Current Catalog

- First-party: `stripe`, `gemini`, `resend`
- Partners: `printful`, `gooten`, `prodigi`, `shapeways`

## Rollout

1. Enable `integration_marketplace` for internal admin users.
2. Open `/admin/integrations/marketplace` and install at least one first-party and one partner app.
3. Configure credentials in `/admin/integrations`.
4. Run verify for each installed app from marketplace.
5. Confirm analytics events:
   - `integration_marketplace_app_installed`
   - `integration_marketplace_app_uninstalled`
   - `integration_marketplace_app_verified`
   - `integration_marketplace_app_verification_failed` (when expected)

## Guardrails

- Endpoints are admin-only via `/api/admin/*` middleware.
- Install/uninstall/verify endpoints are rate-limited.
- Install creates a store-level override in disabled state until credentials are configured.
- Uninstall removes only the store override and preserves platform defaults.

## Rollback

1. Remove `integration_marketplace` from `FEATURE_FLAGS`.
2. Redeploy.
3. Verify:
   - `/admin/integrations/marketplace` redirects to integrations;
   - marketplace APIs return `FEATURE_DISABLED`.
