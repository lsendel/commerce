# No-code Workflow Builder Runbook

## Scope

- Feature flag: `no_code_workflow_builder`
- Surfaces:
  - `/admin/workflows`
  - `/api/admin/workflows`
  - `/api/admin/workflows/:id`
  - `/api/admin/workflows/:id/toggle`
  - `/api/admin/workflows/:id/preview`
  - `/api/admin/workflows/:id/run`

## Current MVP Capability

- Trigger type: `abandoned_checkout`
- Action type: `checkout_recovery_message`
- Channels: `email`, `sms`, `whatsapp`
- Stages: `recovery_1h`, `recovery_24h`, `recovery_72h`

## Rollout

1. Enable `no_code_workflow_builder` for internal admin users.
2. Open `/admin/workflows` and create a workflow.
3. Run `Preview` and verify matched candidate carts are plausible.
4. Execute `Dry Run` and verify run summary metrics.
5. Execute `Run Now` on a small segment (`maxPerRun <= 20`).
6. Verify analytics events:
   - `workflow_builder_workflow_created`
   - `workflow_builder_preview_requested`
   - `workflow_builder_run_executed`
   - `checkout_recovery_enqueued` (source = `workflow_builder`)

## Guardrails

- Endpoints are admin-only via `/api/admin/*` middleware.
- Run and preview endpoints are rate-limited.
- Workflow run dedupes against carts with:
  - recent completed purchases after cart update;
  - recent `checkout_recovery_enqueued` events for same cart/channel/stage.
- Inactive workflows cannot run until re-activated.

## Rollback

1. Remove `no_code_workflow_builder` from `FEATURE_FLAGS`.
2. Redeploy.
3. Verify:
   - `/admin/workflows` redirects to analytics;
   - workflow APIs return `FEATURE_DISABLED`.
