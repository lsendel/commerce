# Booking Bounded Context — DDD & Clean Code Refactor

**Date:** 2026-02-27
**Status:** Approved
**Approach:** Bounded Context Refactor (Booking as gold standard, then replicate)

## Problem

The codebase has a solid DDD foundation (~7/10) but exhibits scaling issues:

1. **Anemic domain model** — Entities are plain interfaces; business logic lives in use cases
2. **Infrastructure coupling** — Use cases import concrete repositories from infrastructure
3. **Missing transactional safety** — Multi-step operations (create request + increment count) aren't atomic
4. **Fat repositories** — BookingRepository is 888 lines handling 4 separate concerns
5. **DI boilerplate** — Every route handler manually creates db, repos, and use cases
6. **Inconsistent error handling** — Some routes catch errors, others let them bubble

## Design Decisions

### Entity Style: Classes for aggregates, plain objects for value objects
- **Booking**, **BookingRequest**, **AvailabilitySlot** become classes with behavior methods
- **BookingItem**, **BookingSettings**, **PersonTypePrice** stay as plain interfaces/objects
- Classes enforce invariants at construction and expose transition methods

### Repository Interfaces: Dependency inversion
- Repository interfaces defined in domain layer
- Infrastructure implements those interfaces
- Use cases depend on interfaces, not concrete implementations

### DI Strategy: Hono middleware factory
- Per-bounded-context middleware creates and attaches repos to request context
- Eliminates repeated `createDb → new Repo → new UseCase` in every handler

### Error Handling: Centralized middleware
- `app.onError()` maps domain errors (NotFoundError, ValidationError, etc.) to HTTP status codes
- Individual routes no longer need try/catch blocks

## Domain Layer Changes

```
src/domain/booking/
  ├── booking.aggregate.ts          # Booking class (aggregate root)
  │     - holds items, enforces status transitions
  │     - cancel(), checkIn(), markNoShow() throw on invalid transitions
  │     - static create() factory with invariant validation
  │
  ├── booking-request.entity.ts     # BookingRequest class
  │     - isExpired() method
  │     - confirm() validates state, returns confirmed request
  │
  ├── availability-slot.entity.ts   # AvailabilitySlot class
  │     - reserve(quantities, settings) — validates cutoff, capacity, person types
  │     - calculatePrice(personTypeQuantities) — validates types + computes total
  │     - remainingSpots, isFull, isBookable as getters
  │
  ├── booking-item.vo.ts            # Value object (plain interface, no change)
  ├── booking-settings.vo.ts        # Value object (plain interface, no change)
  ├── person-type-price.vo.ts       # Value object (plain interface, no change)
  ├── booking-status.vo.ts          # Status transitions (absorbed into Booking class)
  ├── slot-availability.vo.ts       # Slot logic (absorbed into AvailabilitySlot class)
  └── booking.repository.ts         # Repository INTERFACE (new)
        - IAvailabilityRepository
        - IBookingRepository
        - IWaitlistRepository
```

### Key Behavior Migrations

**AvailabilitySlot.reserve(quantities, settings)** absorbs:
- Cutoff time validation (currently use case lines 34-58)
- Capacity validation (currently use case lines 70-76)
- Person type validation (currently use case lines 79-86)
- Price calculation (currently use case lines 88-98)

**Booking.cancel() / .checkIn() / .markNoShow()** absorbs:
- Status transition validation (currently in booking-status.vo.ts)
- Returns new state or throws ConflictError

## Application Layer Changes

Use cases become thin orchestrators (~30 lines each):

```ts
// CreateBookingRequestUseCase — Before: 131 lines, After: ~30 lines
// 1. Fetch slot from repo
// 2. slot.reserve(quantities, settings) — all validation + price calc
// 3. repo.reserveSlot(request, quantity) — atomic persist
// 4. Return result
```

Use cases import interfaces, not concrete repos:
```ts
import type { IBookingRepository } from "../../domain/booking/booking.repository";
```

## Infrastructure Layer Changes

Split BookingRepository (888 lines) into 3 focused repos:

```
src/infrastructure/repositories/booking/
  ├── availability.repository.ts    # implements IAvailabilityRepository (~300 lines)
  │     - CRUD for slots, prices, settings
  │     - reserveSlot() — atomic: insert request + increment count in transaction
  │
  ├── booking.repository.ts         # implements IBookingRepository (~200 lines)
  │     - createBooking() with items atomically
  │     - status transitions, enrichment queries
  │
  └── waitlist.repository.ts        # implements IWaitlistRepository (~100 lines)
        - join, process, notify
```

### Transactional Safety Fixes
- `reserveSlot()`: wraps createBookingRequest + incrementReservedCount in Drizzle transaction
- `createBooking()`: inserts booking + items atomically

## Routes Layer Changes

### DI Middleware
```ts
// src/middleware/di.middleware.ts
export function withBookingContext() {
  return async (c, next) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId");
    c.set("availabilityRepo", new AvailabilityRepository(db, storeId));
    c.set("bookingRepo", new BookingRepository(db, storeId));
    c.set("waitlistRepo", new WaitlistRepository(db, storeId));
    await next();
  };
}
```

### Centralized Error Handler
```ts
// src/middleware/error.middleware.ts
app.onError((err, c) => {
  if (err instanceof NotFoundError) return c.json({ error: err.message }, 404);
  if (err instanceof ValidationError) return c.json({ error: err.message }, 400);
  if (err instanceof ConflictError) return c.json({ error: err.message }, 409);
  if (err instanceof AuthError) return c.json({ error: err.message }, 401);
  throw err;
});
```

## Scope

**In scope (Booking bounded context):**
- 10 domain files
- 9 use cases
- 1 repository → 3 repositories
- 1 route file
- 2 new middleware files (DI + error handler)

**Out of scope (future work):**
- Other bounded contexts (Identity, Catalog, Cart, Checkout, etc.)
- Once Booking is validated, replicate the pattern to remaining contexts

## Success Criteria

1. `tsc --noEmit` passes clean
2. Domain classes enforce invariants — invalid states are unrepresentable
3. Use cases are <40 lines each, no business logic
4. Repository operations that must be atomic use transactions
5. Route handlers have zero DI boilerplate and zero try/catch blocks
6. BookingRepository is split into 3 files, none exceeding 300 lines
