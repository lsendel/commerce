# Incident Responder Runbook

## Scope

- Feature flag: `ai_incident_responder`
- Surfaces:
  - `/admin/operations/incidents`
  - `/api/admin/ops/incidents/triage`
  - `/api/admin/ops/incidents/history`
  - `/api/admin/ops/incidents/acknowledge`
  - `/api/admin/ops/incidents/runbooks`

## Rollout

1. Enable flag for admin users.
2. Open `/admin/operations/incidents` and verify:
   - runbook library loads;
   - history panel loads.
3. Submit at least one triage request for each high-priority signal:
   - `checkout_conversion_drop`
   - `fulfillment_failure_spike`
   - `p1_open_over_60m`
4. Record an outcome from the UI (mitigated, monitoring, escalated, or false_positive).
5. Verify analytics events:
   - `incident_responder_triage_requested`
   - `incident_responder_triage_generated`
   - `incident_responder_triage_acknowledged`

## Guardrails

- Endpoints are admin-only via `/api/admin/*` middleware.
- Triage, history, and acknowledge endpoints are rate-limited.
- If AI provider is unavailable, deterministic fallbacks still produce recommendations with warnings.

## Rollback

1. Remove `ai_incident_responder` from `FEATURE_FLAGS`.
2. Redeploy.
3. Validate admin incident page redirects away and API returns `FEATURE_DISABLED`.
