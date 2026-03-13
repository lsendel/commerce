# Week 14 Summary

## Scope

- Feature 18 (phase 2): merchandising copilot GA hardening.
- Feature 19 (phase 1): AI promotion copilot MVP.

## Delivered

1. Feature flags
- Added `ai_promotion_copilot` (feature `19`, week `14`) in [`/Users/lsendel/Projects/commerce/src/shared/feature-flags.ts`](/Users/lsendel/Projects/commerce/src/shared/feature-flags.ts).

2. Merchandising copilot hardening (Feature 18 phase 2)
- Updated [`/Users/lsendel/Projects/commerce/src/application/catalog/ai-merchandising-copilot.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/catalog/ai-merchandising-copilot.usecase.ts) to fail soft when `GEMINI_API_KEY` is missing and use deterministic fallback copy with explicit warnings.

3. Promotion copilot domain logic (Feature 19 phase 1)
- Added [`/Users/lsendel/Projects/commerce/src/application/promotions/ai-promotion-copilot.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/promotions/ai-promotion-copilot.usecase.ts).
- Capabilities:
  - `draft` and `enrich` modes;
  - generated promotion name/description/type/strategy/conditions;
  - guardrails on discount bounds and strategy normalization;
  - deterministic fallback behavior and warning surface.

4. Promotion copilot API + contracts
- Updated [`/Users/lsendel/Projects/commerce/src/routes/api/promotions.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/promotions.routes.ts):
  - `POST /api/promotions/copilot/draft`
  - `POST /api/promotions/:id/copilot/enrich`
  - both are feature-gated by `ai_promotion_copilot`.
- Updated [`/Users/lsendel/Projects/commerce/src/contracts/promotions.contract.ts`](/Users/lsendel/Projects/commerce/src/contracts/promotions.contract.ts) with request/response schemas and contract entries for both endpoints.

5. Admin promotions UI integration
- Updated [`/Users/lsendel/Projects/commerce/src/routes/pages/admin/promotions.page.tsx`](/Users/lsendel/Projects/commerce/src/routes/pages/admin/promotions.page.tsx):
  - added “AI Promotion Copilot” panel with brief/objective/audience inputs;
  - added generate/apply flow;
  - suggestion output includes warnings;
  - create-promotion submission now uses copilot `strategyParams`/`conditions` when applicable.
- Updated [`/Users/lsendel/Projects/commerce/src/index.tsx`](/Users/lsendel/Projects/commerce/src/index.tsx) to pass `isPromotionCopilotEnabled` to the admin promotions page.

## Validation

- `pnpm typecheck` passed.

## Next Week Kickoff

- Week 15: Feature 19 phase 2 (promotion copilot GA hardening) + Feature 20 phase 1 (AI support deflection MVP).
