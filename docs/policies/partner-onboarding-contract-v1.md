# Partner Onboarding Contract Policy v1

## Purpose

- Provide a deterministic self-serve onboarding contract for marketplace partner providers.
- Ensure onboarding flow integrity across API routes, UI controls, analytics events, and contract verification checks.

## Inputs

- Machine-readable policy: `docs/policies/partner-onboarding-contract-v1.json`
- Runtime implementation:
  - `src/application/platform/partner-onboarding.usecase.ts`
  - `src/routes/api/integration-marketplace.routes.ts`
  - `src/contracts/integration-marketplace.contract.ts`
  - `public/scripts/admin-integration-marketplace.js`
- Validation gate: `pnpm smoke:partner-onboarding`
- Artifacts:
  - `output/smoke/partner-onboarding-report.json`
  - `output/smoke/partner-onboarding-report.md`

## Governance Rules

1. Partner onboarding routes must be contract-defined and implemented for list/read/complete/contract-verify actions.
2. Onboarding contract verification must enforce:
   - partner catalog classification,
   - store-override install state,
   - required secret presence,
   - terms acceptance and contact metadata,
   - provider verification status.
3. Partner onboarding completion and contract verification outcomes must emit analytics events in taxonomy.
4. Policy review window must remain current (no overdue review dates).
