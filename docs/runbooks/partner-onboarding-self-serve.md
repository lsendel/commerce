# Partner Onboarding Self-Serve Runbook

## Scope

- Policy: `docs/policies/partner-onboarding-contract-v1.json`
- Admin UI: `/admin/integrations/marketplace`
- API endpoints:
  - `GET /api/admin/integration-marketplace/partners/onboarding`
  - `GET /api/admin/integration-marketplace/partners/:provider/onboarding`
  - `POST /api/admin/integration-marketplace/partners/:provider/onboarding/complete`
  - `POST /api/admin/integration-marketplace/partners/:provider/contract-verify`
- Validation command: `pnpm smoke:partner-onboarding`

## Operator Procedure

1. Ensure `integration_marketplace` feature flag is enabled.
2. Open `/admin/integrations/marketplace`.
3. For each partner app (`printful`, `gooten`, `prodigi`, `shapeways`):
   - click `Partner Onboard`,
   - provide onboarding contact + callback/webhook URLs,
   - provide required credentials,
   - complete flow and review verification result.
4. Click `Contract Verify` for each partner and confirm:
   - `contractVerification.verified = true`,
   - no blocking (`severity=error`) failed checks.
5. Run gates:
   - `pnpm smoke:partner-onboarding`
   - `pnpm smoke:compliance-controls`
   - `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`

## Expected Analytics Events

- `integration_partner_onboarding_completed`
- `integration_partner_contract_verified`
- `integration_partner_contract_verification_failed`

## Failure Handling

1. If onboarding completion fails:
   - verify `ENCRYPTION_KEY` is configured,
   - verify required secret values are provided,
   - verify provider-specific credentials are valid.
2. If contract verification fails:
   - inspect `checks` and resolve blocking errors first:
     - missing store override install
     - missing required secrets
     - missing contact/terms metadata
     - provider status not `connected`
3. Re-run verification endpoint and `pnpm smoke:partner-onboarding`.
