# Week 19 Summary

## Scope

- Feature 24: agentic pricing experiments.

## Delivered

1. Feature flag
- Added `ai_pricing_experiments` (feature `24`, week `19`) in [`/Users/lsendel/Projects/commerce/src/shared/feature-flags.ts`](/Users/lsendel/Projects/commerce/src/shared/feature-flags.ts).

2. Pricing experiments domain logic
- Added use case [`/Users/lsendel/Projects/commerce/src/application/pricing/agentic-pricing-experiments.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/pricing/agentic-pricing-experiments.usecase.ts):
  - proposal generation with guardrails and demand/inventory heuristics;
  - assignment apply and baseline restore;
  - experiment history reconstruction from analytics events;
  - experiment performance windows (pre vs post) with lift metrics.

3. Pricing experiments API
- Added admin API routes [`/Users/lsendel/Projects/commerce/src/routes/api/pricing-experiments.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/pricing-experiments.routes.ts):
  - `GET /api/admin/pricing-experiments`
  - `POST /api/admin/pricing-experiments/propose`
  - `POST /api/admin/pricing-experiments/start`
  - `POST /api/admin/pricing-experiments/:id/stop`
  - `GET /api/admin/pricing-experiments/:id/performance`
- Added feature gate enforcement, rate limits, and analytics tracking for proposal/start/stop lifecycle events.

4. API contract wiring
- Added contract [`/Users/lsendel/Projects/commerce/src/contracts/pricing-experiment.contract.ts`](/Users/lsendel/Projects/commerce/src/contracts/pricing-experiment.contract.ts).
- Exported and mounted in [`/Users/lsendel/Projects/commerce/src/contracts/index.ts`](/Users/lsendel/Projects/commerce/src/contracts/index.ts).

5. Admin UI and route wiring
- Added page [`/Users/lsendel/Projects/commerce/src/routes/pages/admin/pricing-experiments.page.tsx`](/Users/lsendel/Projects/commerce/src/routes/pages/admin/pricing-experiments.page.tsx).
- Added browser script [`/Users/lsendel/Projects/commerce/public/scripts/admin-pricing-experiments.js`](/Users/lsendel/Projects/commerce/public/scripts/admin-pricing-experiments.js) with:
  - proposal generation;
  - experiment start;
  - experiment stop + restore;
  - performance fetch;
  - list refresh and inline status/error handling.
- Added page route and initial data load in [`/Users/lsendel/Projects/commerce/src/index.tsx`](/Users/lsendel/Projects/commerce/src/index.tsx):
  - `GET /admin/pricing-experiments`
  - feature-gated redirect when disabled.
- Added admin navigation entry in [`/Users/lsendel/Projects/commerce/src/components/layout/admin-sidebar.tsx`](/Users/lsendel/Projects/commerce/src/components/layout/admin-sidebar.tsx).

6. Runbook
- Added [`/Users/lsendel/Projects/commerce/docs/runbooks/agentic-pricing-experiments.md`](/Users/lsendel/Projects/commerce/docs/runbooks/agentic-pricing-experiments.md).

## Validation

- `pnpm typecheck` (pass).

## Next Week Kickoff

- Week 20: feature 25 (agentic checkout recovery).
