# Week 21 Summary

## Scope

- Feature 26: integration marketplace.

## Delivered

1. Feature flag
- Added `integration_marketplace` (feature `26`, week `21`) in [`/Users/lsendel/Projects/commerce/src/shared/feature-flags.ts`](/Users/lsendel/Projects/commerce/src/shared/feature-flags.ts).

2. Marketplace domain use case
- Added [`/Users/lsendel/Projects/commerce/src/application/platform/integration-marketplace.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/platform/integration-marketplace.usecase.ts):
  - first-party + partner app catalog model;
  - installed/source/status projection by store;
  - store-level install and uninstall flows.

3. Marketplace admin API
- Added [`/Users/lsendel/Projects/commerce/src/routes/api/integration-marketplace.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/integration-marketplace.routes.ts):
  - `GET /api/admin/integration-marketplace/apps`
  - `POST /api/admin/integration-marketplace/apps/:provider/install`
  - `POST /api/admin/integration-marketplace/apps/:provider/uninstall`
  - `POST /api/admin/integration-marketplace/apps/:provider/verify`
- Added feature-gate enforcement, rate limits, and analytics event instrumentation.

4. Contract wiring
- Added [`/Users/lsendel/Projects/commerce/src/contracts/integration-marketplace.contract.ts`](/Users/lsendel/Projects/commerce/src/contracts/integration-marketplace.contract.ts).
- Exported and mounted in [`/Users/lsendel/Projects/commerce/src/contracts/index.ts`](/Users/lsendel/Projects/commerce/src/contracts/index.ts).

5. Admin UI and app wiring
- Added page [`/Users/lsendel/Projects/commerce/src/routes/pages/admin/integration-marketplace.page.tsx`](/Users/lsendel/Projects/commerce/src/routes/pages/admin/integration-marketplace.page.tsx).
- Added script [`/Users/lsendel/Projects/commerce/public/scripts/admin-integration-marketplace.js`](/Users/lsendel/Projects/commerce/public/scripts/admin-integration-marketplace.js) with install/uninstall/verify actions.
- Added route wiring in [`/Users/lsendel/Projects/commerce/src/index.tsx`](/Users/lsendel/Projects/commerce/src/index.tsx):
  - mounted marketplace API routes;
  - `GET /admin/integrations/marketplace` with flag-gated redirect.
- Added navigation entry in [`/Users/lsendel/Projects/commerce/src/components/layout/admin-sidebar.tsx`](/Users/lsendel/Projects/commerce/src/components/layout/admin-sidebar.tsx).
- Added marketplace entry CTA on integrations page in [`/Users/lsendel/Projects/commerce/src/routes/pages/admin/integrations.page.tsx`](/Users/lsendel/Projects/commerce/src/routes/pages/admin/integrations.page.tsx).

6. Runbook
- Added [`/Users/lsendel/Projects/commerce/docs/runbooks/integration-marketplace.md`](/Users/lsendel/Projects/commerce/docs/runbooks/integration-marketplace.md).

## Validation

- `pnpm typecheck` (pass).

## Next Week Kickoff

- Week 22: features 27 and 28 (headless API packs + store clone/templates).
