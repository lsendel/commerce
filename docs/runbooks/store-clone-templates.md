# Store Clone Templates Runbook

## Scope

- Feature flag: `store_clone_templates`
- Surfaces:
  - `/admin/store-templates`
  - `/api/admin/store-templates`
  - `/api/admin/store-templates/:id/clone`
  - `/api/admin/store-templates/:id`

## Key Behavior

- Template capture snapshots current store:
  - store settings (`store_settings`)
  - products, variants, images
  - collections and product mappings
- Clone creates a brand-new store and copies selected snapshot sections.
- Product and collection slugs are rewritten with clone-store suffixes to avoid global uniqueness conflicts.
- Variant SKUs are rewritten with clone suffixes when source SKUs exist.

## Rollout

1. Enable `store_clone_templates` for internal admin users.
2. Open `/admin/store-templates` and create a template from a well-formed source store.
3. Clone into a new slug/subdomain and verify:
   - new store row exists;
   - owner membership is attached to requester;
   - selected settings/products/collections are copied.
4. Confirm analytics events:
   - `store_template_created`
   - `store_template_clone_created`
   - `store_template_deleted`

## Guardrails

- Template management and clone APIs are admin-only.
- Clone path is rate-limited.
- Clone validates unique `stores.slug` and `stores.subdomain` before creation.

## Rollback

1. Remove `store_clone_templates` from `FEATURE_FLAGS`.
2. Redeploy.
3. Verify:
   - `/admin/store-templates` redirects away;
   - store template APIs return `FEATURE_DISABLED`.
