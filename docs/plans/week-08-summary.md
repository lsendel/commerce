# Week 08 Summary (Subscription Builder: Mix-and-Match)

## Status

- Week 8 execution started in YOLO mode.
- Scope: feature ID `8` (`subscription_builder`).

## Shipped This Week

- Added Week 8 feature flag:
  - `subscription_builder` in `src/shared/feature-flags.ts`.
- Implemented subscription bundle persistence support:
  - added `mix_configuration` JSONB column to `subscriptions`.
  - migration: `0015_subscription_mix_configuration.sql`.
- Extended subscription repository for builder + parity:
  - builder plan options query with normalized amount and interval.
  - subscription reads now include `mixConfiguration`.
  - subscription create/update now persist `mixConfiguration`.
- Added bundle checkout/quote application logic:
  - new use case: `BuildSubscriptionBundleUseCase`.
  - validates selection, enforces billing cadence parity, computes quote totals.
  - creates Stripe multi-line subscription checkout sessions.
- Upgraded Stripe adapter for metadata parity:
  - single-plan checkout now also writes `subscription_data.metadata`.
  - new builder checkout method for multi-line recurring line items.
- Added feature-flag-gated builder API endpoints:
  - `GET /api/subscriptions/builder/options`
  - `POST /api/subscriptions/builder/quote`
  - `POST /api/subscriptions/builder/checkout`
- Extended webhook handling:
  - supports metadata `planId` override resolution for bundle anchor plan.
  - parses and stores `mixConfiguration` metadata on subscription create/update.
- Extended account subscriptions page:
  - receives available plans and builder flag from server route wiring.
  - renders bundle composition for active subscriptions when present.
  - adds bundle builder UI with quote preview + checkout action.
- Updated subscriptions contract for runtime parity:
  - fixed create/list/cancel response shapes.
  - added `changePlan`, `resume`, and all builder endpoints.

## Verification

- `pnpm typecheck` (run after implementation).

## Rollback

1. Disable `subscription_builder` in `FEATURE_FLAGS`.
2. Remove or block `/api/subscriptions/builder/*` routes if immediate rollback is needed.
3. Hide builder UI by removing `isSubscriptionBuilderEnabled` wiring on account subscriptions page.
4. Ignore `mix_configuration` field at read-time until rollback is complete.

## Next (Auto)

1. Week 9: self-serve returns + instant exchanges implementation kickoff.
2. Add Week 9 artifact with frontend-backend parity and smoke evidence.
