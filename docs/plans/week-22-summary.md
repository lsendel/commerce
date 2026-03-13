# Week 22 Summary

## Scope

- Feature 27: headless API packs.
- Feature 28: store clone/templates.

## Delivered

1. Feature flags
- Added `headless_api_packs` (feature `27`, week `22`) in [`/Users/lsendel/Projects/commerce/src/shared/feature-flags.ts`](/Users/lsendel/Projects/commerce/src/shared/feature-flags.ts).
- Added `store_clone_templates` (feature `28`, week `22`) in [`/Users/lsendel/Projects/commerce/src/shared/feature-flags.ts`](/Users/lsendel/Projects/commerce/src/shared/feature-flags.ts).

2. Persistence model
- Added new schema tables in [`/Users/lsendel/Projects/commerce/src/infrastructure/db/schema.ts`](/Users/lsendel/Projects/commerce/src/infrastructure/db/schema.ts):
  - `headless_api_packs`
  - `store_templates`
- Added migration [`/Users/lsendel/Projects/commerce/src/infrastructure/db/migrations/0018_headless_api_packs_store_templates.sql`](/Users/lsendel/Projects/commerce/src/infrastructure/db/migrations/0018_headless_api_packs_store_templates.sql).

3. Domain, repositories, and use cases
- Added repositories:
  - [`/Users/lsendel/Projects/commerce/src/infrastructure/repositories/headless-api-pack.repository.ts`](/Users/lsendel/Projects/commerce/src/infrastructure/repositories/headless-api-pack.repository.ts)
  - [`/Users/lsendel/Projects/commerce/src/infrastructure/repositories/store-template.repository.ts`](/Users/lsendel/Projects/commerce/src/infrastructure/repositories/store-template.repository.ts)
- Added use cases:
  - [`/Users/lsendel/Projects/commerce/src/application/platform/headless-api-pack.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/platform/headless-api-pack.usecase.ts)
  - [`/Users/lsendel/Projects/commerce/src/application/platform/store-clone-template.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/platform/store-clone-template.usecase.ts)

4. API surfaces
- Added admin + public headless routes:
  - [`/Users/lsendel/Projects/commerce/src/routes/api/headless-api-packs.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/headless-api-packs.routes.ts)
  - [`/Users/lsendel/Projects/commerce/src/routes/api/headless-channel.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/headless-channel.routes.ts)
- Added store template routes:
  - [`/Users/lsendel/Projects/commerce/src/routes/api/store-templates.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/store-templates.routes.ts)

5. Contracts and app wiring
- Added contracts:
  - [`/Users/lsendel/Projects/commerce/src/contracts/headless-api-packs.contract.ts`](/Users/lsendel/Projects/commerce/src/contracts/headless-api-packs.contract.ts)
  - [`/Users/lsendel/Projects/commerce/src/contracts/store-templates.contract.ts`](/Users/lsendel/Projects/commerce/src/contracts/store-templates.contract.ts)
- Exported in [`/Users/lsendel/Projects/commerce/src/contracts/index.ts`](/Users/lsendel/Projects/commerce/src/contracts/index.ts).
- Mounted API and page routes in [`/Users/lsendel/Projects/commerce/src/index.tsx`](/Users/lsendel/Projects/commerce/src/index.tsx):
  - API mounts for headless pack routes, headless channel routes, and store template routes.
  - Admin pages `/admin/headless` and `/admin/store-templates` with feature-flag redirects.

6. Admin UI
- Added pages:
  - [`/Users/lsendel/Projects/commerce/src/routes/pages/admin/headless-api-packs.page.tsx`](/Users/lsendel/Projects/commerce/src/routes/pages/admin/headless-api-packs.page.tsx)
  - [`/Users/lsendel/Projects/commerce/src/routes/pages/admin/store-templates.page.tsx`](/Users/lsendel/Projects/commerce/src/routes/pages/admin/store-templates.page.tsx)
- Added scripts:
  - [`/Users/lsendel/Projects/commerce/public/scripts/admin-headless-packs.js`](/Users/lsendel/Projects/commerce/public/scripts/admin-headless-packs.js)
  - [`/Users/lsendel/Projects/commerce/public/scripts/admin-store-templates.js`](/Users/lsendel/Projects/commerce/public/scripts/admin-store-templates.js)
- Added sidebar entries in [`/Users/lsendel/Projects/commerce/src/components/layout/admin-sidebar.tsx`](/Users/lsendel/Projects/commerce/src/components/layout/admin-sidebar.tsx).

7. Runbooks
- Added [`/Users/lsendel/Projects/commerce/docs/runbooks/headless-api-packs.md`](/Users/lsendel/Projects/commerce/docs/runbooks/headless-api-packs.md).
- Added [`/Users/lsendel/Projects/commerce/docs/runbooks/store-clone-templates.md`](/Users/lsendel/Projects/commerce/docs/runbooks/store-clone-templates.md).

## Validation

- `pnpm typecheck` (pass).

## Next Week Kickoff

- Week 23: feature 29 (policy engine guardrails across pricing, shipping, and promotion actions).
