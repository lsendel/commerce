# Week 38 Summary

## Scope

- Auth/session/permission hardening with focus on:
  - session-expiry correctness,
  - password-reset/email-verification token edge cases,
  - admin action role-guard enforcement.

## Shipped This Week

1. Session expiry alignment (JWT vs cookie)
- Updated [`/Users/lsendel/Projects/commerce/src/infrastructure/security/jwt.ts`](/Users/lsendel/Projects/commerce/src/infrastructure/security/jwt.ts) to support explicit token TTL.
- Updated [`/Users/lsendel/Projects/commerce/src/routes/api/auth.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/auth.routes.ts) login flow to sign JWTs with the same `maxAge` used for the auth cookie.
- Outcome: non-remembered sessions now expire consistently (JWT and cookie no longer drift).

2. Reset/verify token lifecycle hardening
- Added token invalidation methods in [`/Users/lsendel/Projects/commerce/src/infrastructure/repositories/user.repository.ts`](/Users/lsendel/Projects/commerce/src/infrastructure/repositories/user.repository.ts):
  - `invalidateActivePasswordResetTokens(userId)`
  - `invalidateActiveEmailVerificationTokens(userId)`
- Applied invalidation in identity flows:
  - [`request-password-reset.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/identity/request-password-reset.usecase.ts): revoke old active reset tokens before issuing new one.
  - [`reset-password.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/identity/reset-password.usecase.ts): revoke any remaining active reset tokens after successful reset.
  - [`verify-email.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/identity/verify-email.usecase.ts): revoke remaining active verification tokens after success.
  - [`change-password.usecase.ts`](/Users/lsendel/Projects/commerce/src/application/identity/change-password.usecase.ts): revoke active reset tokens after password change.
  - [`auth.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/auth.routes.ts): invalidate active verification tokens before creating a new verification token.

3. Permission hardening for booking operator actions
- Updated [`/Users/lsendel/Projects/commerce/src/routes/api/bookings.routes.ts`](/Users/lsendel/Projects/commerce/src/routes/api/bookings.routes.ts):
  - added `requireRole("admin")` to:
    - `POST /api/bookings/availability`
    - `POST /api/bookings/availability/bulk`
    - `POST /api/bookings/:id/check-in`
    - `POST /api/bookings/:id/no-show`
- Updated contract statuses in [`/Users/lsendel/Projects/commerce/src/contracts/bookings.contract.ts`](/Users/lsendel/Projects/commerce/src/contracts/bookings.contract.ts) to include `403` where applicable.

4. Auth contract/parity coverage expansion
- Expanded [`/Users/lsendel/Projects/commerce/src/contracts/auth.contract.ts`](/Users/lsendel/Projects/commerce/src/contracts/auth.contract.ts) to include missing implemented auth routes:
  - reset/verify flows,
  - profile CRUD endpoints,
  - request verification/change password,
  - address CRUD endpoints.
- Expanded route parity checks in [`/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-policy-control-tower.ts) for auth route method/path drift detection.

5. Auth edge-case smoke matrix coverage
- Expanded [`/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts`](/Users/lsendel/Projects/commerce/scripts/smoke-e2e-matrix.ts) with auth edge-case checks:
  - forgot-password validation path,
  - invalid reset-token behavior,
  - invalid email-verification-token behavior,
  - unauthenticated gates for profile/request-verification/change-password,
  - booking operator action unauth gates (`check-in`, `no-show`).
- Updated runbooks:
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md`](/Users/lsendel/Projects/commerce/docs/runbooks/admin-api-parity-smoke.md)
  - [`/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md`](/Users/lsendel/Projects/commerce/docs/runbooks/e2e-smoke-matrix.md)

## Validation

- `pnpm -s tsc --noEmit --pretty false`
- `pnpm smoke:admin-parity` (contract-only mode)
- `pnpm smoke:e2e-matrix`

## Next Week Kickoff

- Expand billing/subscription reliability checks (idempotency + retry safety + state-transition guards).
- Add subscription-focused smoke matrix sections covering portal, cancel, resume, and plan-change edge cases.
