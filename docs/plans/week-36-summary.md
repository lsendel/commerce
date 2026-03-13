# Week 36 Summary

## Scope

- Execute API parity wave 2 across admin/platform/storefront with focus on method/status/response-shape mismatches.
- Expand parity smoke coverage beyond admin-only surfaces.

## Shipped This Week

1. Platform contract parity expansion
- Updated [`/Users/lsendel/Projects/commerce/src/contracts/platform.contract.ts`](/Users/lsendel/Projects/commerce/src/contracts/platform.contract.ts) to cover frontend-used and backend-implemented endpoints missing from contract parity:
  - `DELETE /api/platform/stores/:id/members/:userId`
  - `PATCH /api/platform/stores/:id/members/:userId/role`
  - `POST /api/platform/stores/:id/invite`
  - `POST /api/platform/invitations/:token/accept`
  - `POST /api/platform/stores/:id/logo`
- Added/normalized error response statuses (`401/403/404/409/410/500`) where runtime already emits them.

2. Bookings + reviews contract parity closure
- Updated [`/Users/lsendel/Projects/commerce/src/contracts/bookings.contract.ts`](/Users/lsendel/Projects/commerce/src/contracts/bookings.contract.ts) to include missing routes used by current UI/API flows:
  - `POST /api/bookings/:id/no-show`
  - `POST /api/bookings/availability/:id/waitlist`
  - `GET /api/bookings/waitlist`
  - `DELETE /api/bookings/waitlist/:id`
- Updated [`/Users/lsendel/Projects/commerce/src/contracts/reviews.contract.ts`](/Users/lsendel/Projects/commerce/src/contracts/reviews.contract.ts):
  - added `POST /api/reviews/:id/respond`,
  - added missing auth/role error statuses for moderation endpoints.

3. Reduced schema drift in platform route validation
- Updated [`/Users/lsendel/Projects/commerce/src/routes/api/platform.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/platform.routes.ts) to reuse contract-exported request schemas for:
  - invite member payload,
  - change member role payload.

4. Expanded parity smoke to platform/storefront response-shape checks
- Updated [`/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts):
  - added contract metadata checks for new platform/bookings/reviews routes,
  - added live response-shape validation checks for:
    - `GET /api/platform/plans`
    - `GET /api/products`
    - `GET /api/products/:slug` (404 path)
    - `GET /api/collections`
    - `GET /api/cart`
    - `POST /api/cart/validate`
    - `GET /api/products/:slug/reviews` (404 path)
    - `POST /api/reviews/:id/helpful` (404 path)
    - `POST /api/reviews/:id/report` (404 path)
  - enriched route ownership metadata for platform/storefront domains.

5. Runbook coverage update
- Updated [`/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md`](/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md) to document platform/storefront wave-2 coverage.

## Validation

- `pnpm -s tsc --noEmit --pretty false`
- `pnpm smoke:admin-parity` (contract-only mode)

## Next Week Kickoff

- Add CI-level detection that requires schema snapshot refresh whenever smoke report descriptor changes.
- Add owner-latency SLO trend/burn-rate deltas (current vs trailing baseline) in smoke report output.
