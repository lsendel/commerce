# Week 15 Summary

## Scope

- Feature 19 (phase 2): AI promotion copilot GA hardening.
- Feature 20 (phase 1): AI support deflection MVP.

## Delivered

1. Feature flags
- Added `ai_support_deflection` (feature `20`, week `15`) in [`/Users/lsendel/Projects/commerce/src/shared/feature-flags.ts`](/Users/lsendel/Projects/commerce/src/shared/feature-flags.ts).

2. Promotion copilot GA hardening (Feature 19 phase 2)
- Added `POST /api/promotions/copilot/apply` in [`/Users/lsendel/Projects/commerce/src/routes/api/promotions.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/promotions.routes.ts) to create promotions directly from copilot output.
- Added collision-safe coupon code creation fallback for coupon-type promotions in the same apply flow.
- Extended contract coverage in [`/Users/lsendel/Projects/commerce/src/contracts/promotions.contract.ts`](/Users/lsendel/Projects/commerce/src/contracts/promotions.contract.ts) with `promotionCopilotApplySchema` and `applyPromotionCopilot`.
- Updated admin promotions UI in [`/Users/lsendel/Projects/commerce/src/routes/pages/admin/promotions.page.tsx`](/Users/lsendel/Projects/commerce/src/routes/pages/admin/promotions.page.tsx):
  - new “Create With Copilot” action;
  - applies optional schedule fields and calls `/api/promotions/copilot/apply`.

3. Support deflection MVP (Feature 20 phase 1)
- Added support deflection use case in [`/Users/lsendel/Projects/commerce/src/application/support/ai-support-deflection.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/support/ai-support-deflection.usecase.ts):
  - tier-1 intent detection (`order_tracking`, `returns_exchange`, `subscription_billing`, `address_update`, `coupon_help`, `account_access`);
  - action-link suggestions;
  - deflection decision + escalation guidance;
  - optional Gemini rewrite with deterministic fallback when unavailable.
- Added support API route `POST /api/support/deflect` (auth + feature-gated) in [`/Users/lsendel/Projects/commerce/src/routes/api/support.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/support.routes.ts) and mounted it in [`/Users/lsendel/Projects/commerce/src/index.tsx`](/Users/lsendel/Projects/commerce/src/index.tsx).
- Added support contract in [`/Users/lsendel/Projects/commerce/src/contracts/support.contract.ts`](/Users/lsendel/Projects/commerce/src/contracts/support.contract.ts) and wired it into [`/Users/lsendel/Projects/commerce/src/contracts/index.ts`](/Users/lsendel/Projects/commerce/src/contracts/index.ts).
- Added dashboard support assistant panel and client flow in [`/Users/lsendel/Projects/commerce/src/routes/pages/account/dashboard.page.tsx`](/Users/lsendel/Projects/commerce/src/routes/pages/account/dashboard.page.tsx), gated via `isSupportDeflectionEnabled`.

## Validation

- `pnpm typecheck` passed.

## Next Week Kickoff

- Week 16: Feature 20 phase 2 (support deflection GA stabilization) + Feature 21 phase 1 (AI studio-to-product pipeline MVP).
