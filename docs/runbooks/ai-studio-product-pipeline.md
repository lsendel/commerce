# AI Studio to Product Pipeline Runbook

## Scope

- Feature flag: `ai_studio_product_pipeline`
- Surfaces:
  - `/studio/preview/:id` (admin CTA)
  - `/products/create/:artJobId` (admin-only workflow)
  - `/api/admin/products/from-art/copilot-draft`
  - `/api/admin/products/from-art`

## Rollout

1. Enable flag for internal operators only.
2. Validate `copilot-draft` response quality on at least 5 completed art jobs.
3. Validate product creation and storefront render for:
   - one `physical` product;
   - one `digital` product.
4. Confirm analytics events:
   - `studio_pipeline_draft_generated`
   - `studio_pipeline_product_created`

## Guardrails

- Access control:
  - only admin users can open `/products/create/:artJobId`.
  - admin API endpoints remain under `/api/admin/*` role enforcement.
- Rate limits:
  - draft generation is limited to control abuse.
- Feature kill-switch:
  - disable `ai_studio_product_pipeline` to stop draft/create flows immediately.

## Rollback

1. Remove `ai_studio_product_pipeline` from `FEATURE_FLAGS`.
2. Redeploy.
3. Verify API returns `FEATURE_DISABLED` on both pipeline endpoints.
4. Verify studio preview no longer renders “Create Product” CTA.
