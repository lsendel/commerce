# Week 20 Summary

## Scope

- Feature 25: no-code workflow builder.

## Delivered

1. Feature flag
- Added `no_code_workflow_builder` (feature `25`, week `20`) in [`/Users/lsendel/Projects/commerce/src/shared/feature-flags.ts`](/Users/lsendel/Projects/commerce/src/shared/feature-flags.ts).

2. Workflow persistence model
- Added workflow table in [`/Users/lsendel/Projects/commerce/src/infrastructure/db/schema.ts`](/Users/lsendel/Projects/commerce/src/infrastructure/db/schema.ts):
  - `store_workflows` with trigger/action configs, active state, and run metadata.
- Added migration [`/Users/lsendel/Projects/commerce/src/infrastructure/db/migrations/0017_no_code_workflows.sql`](/Users/lsendel/Projects/commerce/src/infrastructure/db/migrations/0017_no_code_workflows.sql).

3. Workflow domain + repository
- Added repository [`/Users/lsendel/Projects/commerce/src/infrastructure/repositories/workflow.repository.ts`](/Users/lsendel/Projects/commerce/src/infrastructure/repositories/workflow.repository.ts).
- Added use case [`/Users/lsendel/Projects/commerce/src/application/ops/no-code-workflow-builder.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/ops/no-code-workflow-builder.usecase.ts):
  - workflow CRUD orchestration;
  - candidate preview for abandoned checkout trigger;
  - run-plan generation with purchase/enqueue dedupe;
  - recovery URL generation and execution prep payloads.

4. Admin API
- Added routes [`/Users/lsendel/Projects/commerce/src/routes/api/workflows.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/workflows.routes.ts):
  - `GET /api/admin/workflows`
  - `POST /api/admin/workflows`
  - `PATCH /api/admin/workflows/:id`
  - `POST /api/admin/workflows/:id/toggle`
  - `POST /api/admin/workflows/:id/preview`
  - `POST /api/admin/workflows/:id/run`
  - `DELETE /api/admin/workflows/:id`
- Added feature-gate enforcement, rate limits, workflow analytics, and queue enqueue integration for checkout recovery actions.

5. Contracts and app wiring
- Added contract [`/Users/lsendel/Projects/commerce/src/contracts/workflows.contract.ts`](/Users/lsendel/Projects/commerce/src/contracts/workflows.contract.ts).
- Exported in [`/Users/lsendel/Projects/commerce/src/contracts/index.ts`](/Users/lsendel/Projects/commerce/src/contracts/index.ts).
- Mounted API and page routes in [`/Users/lsendel/Projects/commerce/src/index.tsx`](/Users/lsendel/Projects/commerce/src/index.tsx):
  - API mount for workflow routes
  - `GET /admin/workflows` page route with feature-flag redirect when disabled.

6. Admin UI
- Added page [`/Users/lsendel/Projects/commerce/src/routes/pages/admin/workflows.page.tsx`](/Users/lsendel/Projects/commerce/src/routes/pages/admin/workflows.page.tsx).
- Added script [`/Users/lsendel/Projects/commerce/public/scripts/admin-workflows.js`](/Users/lsendel/Projects/commerce/public/scripts/admin-workflows.js) for:
  - create/refresh/toggle/delete workflows;
  - preview;
  - dry-run and run-now execution actions.
- Added sidebar navigation entry in [`/Users/lsendel/Projects/commerce/src/components/layout/admin-sidebar.tsx`](/Users/lsendel/Projects/commerce/src/components/layout/admin-sidebar.tsx).

7. Runbook
- Added [`/Users/lsendel/Projects/commerce/docs/runbooks/no-code-workflow-builder.md`](/Users/lsendel/Projects/commerce/docs/runbooks/no-code-workflow-builder.md).

## Validation

- `pnpm typecheck` (pass).

## Next Week Kickoff

- Week 21: feature 26 (integration marketplace).
