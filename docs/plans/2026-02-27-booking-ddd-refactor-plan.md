# Booking DDD Refactor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the Booking bounded context into a clean DDD architecture with rich domain classes, repository interfaces, transactional safety, split repositories, and DI middleware — creating a gold standard for other bounded contexts.

**Architecture:** Bottom-up refactor within the Booking context. Domain entities become classes with behavior (aggregate roots for Booking and AvailabilitySlot). Repository interfaces defined in domain layer, implemented in infrastructure. Fat 888-line repository split into 3 focused repos. Hono DI middleware replaces per-handler wiring.

**Tech Stack:** TypeScript, Hono, Drizzle ORM, Neon HTTP (supports `db.transaction()`), Vitest (for domain unit tests)

---

### Task 1: Set up Vitest for domain unit tests

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add vitest devDependency + scripts)

**Step 1: Install vitest**

Run: `pnpm add -D vitest`

**Step 2: Create vitest config**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
```

**Step 3: Add test script to package.json**

Add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 4: Verify vitest runs (empty)**

Run: `pnpm test`
Expected: "No test files found" (clean exit)

**Step 5: Commit**

```bash
git add vitest.config.ts package.json pnpm-lock.yaml
git commit -m "chore: add vitest for domain unit tests"
```

---

### Task 2: Create AvailabilitySlot aggregate class with reserve() and calculatePrice()

This is the highest-value domain refactor. It absorbs business logic currently scattered across `create-booking-request.usecase.ts:24-98`.

**Files:**
- Create: `src/domain/booking/availability-slot.aggregate.ts`
- Create: `tests/unit/domain/booking/availability-slot.test.ts`

**Step 1: Write failing tests for AvailabilitySlot**

```ts
// tests/unit/domain/booking/availability-slot.test.ts
import { describe, it, expect } from "vitest";
import { AvailabilitySlot } from "../../../../src/domain/booking/availability-slot.aggregate";
import { ConflictError, ValidationError } from "../../../../src/shared/errors";

const baseSlotData = {
  id: "slot-1",
  productId: "prod-1",
  slotDate: "2099-12-31",
  slotTime: "10:00",
  slotDatetime: new Date("2099-12-31T10:00:00Z"),
  totalCapacity: 10,
  reservedCount: 0,
  status: "open" as const,
  isActive: true,
  prices: [
    { personType: "adult", price: 25.0 },
    { personType: "child", price: 15.0 },
  ],
};

const defaultSettings = {
  cutOffTime: 24,
  cutOffUnit: "hours" as const,
  maxAdvanceTime: 90,
  maxAdvanceUnit: "days" as const,
};

describe("AvailabilitySlot", () => {
  describe("static fromData()", () => {
    it("creates a slot from raw data", () => {
      const slot = AvailabilitySlot.fromData(baseSlotData);
      expect(slot.id).toBe("slot-1");
      expect(slot.remainingSpots).toBe(10);
      expect(slot.isFull).toBe(false);
      expect(slot.isBookable).toBe(true);
    });

    it("reports full when reserved equals capacity", () => {
      const slot = AvailabilitySlot.fromData({ ...baseSlotData, reservedCount: 10 });
      expect(slot.isFull).toBe(true);
      expect(slot.isBookable).toBe(false);
      expect(slot.remainingSpots).toBe(0);
    });
  });

  describe("reserve()", () => {
    it("validates and returns reservation details for valid input", () => {
      const slot = AvailabilitySlot.fromData(baseSlotData);
      const result = slot.reserve({ adult: 2, child: 1 }, defaultSettings);

      expect(result.totalQuantity).toBe(3);
      expect(result.totalPrice).toBe(65.0); // 2*25 + 1*15
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        personType: "adult",
        quantity: 2,
        unitPrice: 25.0,
        totalPrice: 50.0,
      });
    });

    it("throws ConflictError when slot is not open", () => {
      const slot = AvailabilitySlot.fromData({ ...baseSlotData, status: "closed" });
      expect(() => slot.reserve({ adult: 1 }, defaultSettings)).toThrow(ConflictError);
    });

    it("throws ConflictError when slot is in the past", () => {
      const slot = AvailabilitySlot.fromData({
        ...baseSlotData,
        slotDate: "2020-01-01",
        slotTime: "10:00",
        slotDatetime: new Date("2020-01-01T10:00:00Z"),
      });
      expect(() => slot.reserve({ adult: 1 }, defaultSettings)).toThrow(ConflictError);
    });

    it("throws ValidationError when total quantity is zero", () => {
      const slot = AvailabilitySlot.fromData(baseSlotData);
      expect(() => slot.reserve({}, defaultSettings)).toThrow(ValidationError);
    });

    it("throws ConflictError when exceeding capacity", () => {
      const slot = AvailabilitySlot.fromData({ ...baseSlotData, reservedCount: 9 });
      expect(() => slot.reserve({ adult: 2 }, defaultSettings)).toThrow(ConflictError);
    });

    it("throws ValidationError for unknown person type", () => {
      const slot = AvailabilitySlot.fromData(baseSlotData);
      expect(() => slot.reserve({ senior: 1 }, defaultSettings)).toThrow(ValidationError);
    });

    it("throws ConflictError when booking cutoff has passed", () => {
      // Slot is 1 hour from now, but cutoff requires 24 hours
      const soon = new Date(Date.now() + 60 * 60 * 1000);
      const slot = AvailabilitySlot.fromData({
        ...baseSlotData,
        slotDate: soon.toISOString().slice(0, 10),
        slotTime: soon.toISOString().slice(11, 16),
        slotDatetime: soon,
      });
      expect(() => slot.reserve({ adult: 1 }, defaultSettings)).toThrow(ConflictError);
    });

    it("throws ConflictError when booking too far in advance", () => {
      const farFuture = new Date(Date.now() + 365 * 86_400_000);
      const slot = AvailabilitySlot.fromData({
        ...baseSlotData,
        slotDate: farFuture.toISOString().slice(0, 10),
        slotTime: "10:00",
        slotDatetime: farFuture,
      });
      expect(() => slot.reserve({ adult: 1 }, defaultSettings)).toThrow(ConflictError);
    });

    it("works without settings (no cutoff/advance enforcement)", () => {
      const slot = AvailabilitySlot.fromData(baseSlotData);
      const result = slot.reserve({ adult: 1 }, null);
      expect(result.totalQuantity).toBe(1);
    });
  });

  describe("computeEffectiveStatus()", () => {
    it("returns stored status for admin overrides", () => {
      const slot = AvailabilitySlot.fromData({ ...baseSlotData, status: "cancelled" });
      expect(slot.computeEffectiveStatus()).toBe("cancelled");
    });

    it("returns 'full' when capacity reached on future slot", () => {
      const slot = AvailabilitySlot.fromData({ ...baseSlotData, reservedCount: 10 });
      expect(slot.computeEffectiveStatus()).toBe("full");
    });

    it("returns 'available' for future open slot with capacity", () => {
      const slot = AvailabilitySlot.fromData(baseSlotData);
      expect(slot.computeEffectiveStatus()).toBe("available");
    });

    it("returns 'in_progress' for slot that started within 4 hours", () => {
      const recent = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const slot = AvailabilitySlot.fromData({
        ...baseSlotData,
        slotDatetime: recent,
        slotDate: recent.toISOString().slice(0, 10),
        slotTime: recent.toISOString().slice(11, 16),
      });
      expect(slot.computeEffectiveStatus()).toBe("in_progress");
    });

    it("returns 'completed' for slot that started more than 4 hours ago", () => {
      const old = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 hours ago
      const slot = AvailabilitySlot.fromData({
        ...baseSlotData,
        slotDatetime: old,
        slotDate: old.toISOString().slice(0, 10),
        slotTime: old.toISOString().slice(11, 16),
      });
      expect(slot.computeEffectiveStatus()).toBe("completed");
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- tests/unit/domain/booking/availability-slot.test.ts`
Expected: FAIL — module not found

**Step 3: Implement AvailabilitySlot aggregate class**

```ts
// src/domain/booking/availability-slot.aggregate.ts
import type { PersonTypePrice } from "./person-type-price.vo";
import { ConflictError, ValidationError } from "../../shared/errors";

export type AvailabilityStatus = "open" | "full" | "closed" | "cancelled";

interface AvailabilitySlotData {
  id: string;
  productId: string;
  slotDate: string;
  slotTime: string;
  slotDatetime: Date;
  totalCapacity: number;
  reservedCount: number;
  status: AvailabilityStatus;
  isActive: boolean;
  prices: PersonTypePrice[];
}

interface ReservationSettings {
  cutOffTime: number;
  cutOffUnit: "minutes" | "hours" | "days";
  maxAdvanceTime: number;
  maxAdvanceUnit: "minutes" | "hours" | "days";
}

export interface ReservationResult {
  totalQuantity: number;
  totalPrice: number;
  items: Array<{
    personType: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export class AvailabilitySlot {
  readonly id: string;
  readonly productId: string;
  readonly slotDate: string;
  readonly slotTime: string;
  readonly slotDatetime: Date;
  readonly totalCapacity: number;
  readonly reservedCount: number;
  readonly status: AvailabilityStatus;
  readonly isActive: boolean;
  readonly prices: PersonTypePrice[];

  private constructor(data: AvailabilitySlotData) {
    this.id = data.id;
    this.productId = data.productId;
    this.slotDate = data.slotDate;
    this.slotTime = data.slotTime;
    this.slotDatetime = data.slotDatetime;
    this.totalCapacity = data.totalCapacity;
    this.reservedCount = data.reservedCount;
    this.status = data.status;
    this.isActive = data.isActive;
    this.prices = data.prices;
  }

  static fromData(data: AvailabilitySlotData): AvailabilitySlot {
    return new AvailabilitySlot(data);
  }

  get remainingSpots(): number {
    return Math.max(0, this.totalCapacity - this.reservedCount);
  }

  get isFull(): boolean {
    return this.remainingSpots <= 0;
  }

  get isBookable(): boolean {
    return this.isActive && this.status === "open" && !this.isFull;
  }

  reserve(
    personTypeQuantities: Record<string, number>,
    settings: ReservationSettings | null,
  ): ReservationResult {
    // 1. Validate slot is open
    if (this.status !== "open") {
      throw new ConflictError(`Slot is not available (status: ${this.status})`);
    }

    // 2. Validate slot is in the future
    const now = new Date();
    if (this.slotDatetime <= now) {
      throw new ConflictError("Cannot book a slot that has already started");
    }

    // 3. Enforce cutoff and max advance from settings
    if (settings) {
      this.enforceCutoff(now, settings);
      this.enforceMaxAdvance(now, settings);
    }

    // 4. Calculate total quantity
    const totalQuantity = Object.values(personTypeQuantities).reduce(
      (sum, qty) => sum + qty,
      0,
    );
    if (totalQuantity <= 0) {
      throw new ValidationError("Total quantity must be at least 1");
    }

    // 5. Validate capacity
    if (totalQuantity > this.remainingSpots) {
      throw new ConflictError(
        `Not enough capacity. Requested: ${totalQuantity}, available: ${this.remainingSpots}`,
      );
    }

    // 6. Validate person types and calculate price
    const priceMap = new Map(this.prices.map((p) => [p.personType, p.price]));
    const items: ReservationResult["items"] = [];

    for (const [personType, qty] of Object.entries(personTypeQuantities)) {
      if (qty <= 0) continue;
      const unitPrice = priceMap.get(personType);
      if (unitPrice === undefined) {
        throw new ValidationError(`Price not available for person type: ${personType}`);
      }
      items.push({
        personType,
        quantity: qty,
        unitPrice,
        totalPrice: Math.round(unitPrice * qty * 100) / 100,
      });
    }

    const totalPrice = Math.round(
      items.reduce((sum, item) => sum + item.totalPrice, 0) * 100,
    ) / 100;

    return { totalQuantity, totalPrice, items };
  }

  computeEffectiveStatus(): string {
    // Admin-level overrides always win
    if (this.status === "cancelled" || this.status === "closed") {
      return this.status;
    }

    const now = new Date();

    // If the slot has started
    if (this.slotDatetime <= now) {
      const fourHoursLater = new Date(this.slotDatetime.getTime() + 4 * 60 * 60 * 1000);
      return now > fourHoursLater ? "completed" : "in_progress";
    }

    // Future slot: check capacity
    if (this.reservedCount >= this.totalCapacity) {
      return "full";
    }

    return "available";
  }

  private enforceCutoff(now: Date, settings: ReservationSettings): void {
    const cutoffMs = this.toMs(settings.cutOffTime, settings.cutOffUnit);
    if (cutoffMs <= 0) return;

    const cutoffDeadline = new Date(this.slotDatetime.getTime() - cutoffMs);
    if (now > cutoffDeadline) {
      throw new ConflictError(
        `Booking cutoff has passed. Must book at least ${settings.cutOffTime} ${settings.cutOffUnit} in advance.`,
      );
    }
  }

  private enforceMaxAdvance(now: Date, settings: ReservationSettings): void {
    const maxAdvanceMs = this.toMs(settings.maxAdvanceTime, settings.maxAdvanceUnit);
    if (maxAdvanceMs <= 0) return;

    if (this.slotDatetime.getTime() - now.getTime() > maxAdvanceMs) {
      throw new ConflictError(
        `Cannot book more than ${settings.maxAdvanceTime} ${settings.maxAdvanceUnit} in advance.`,
      );
    }
  }

  private toMs(value: number, unit: "minutes" | "hours" | "days"): number {
    switch (unit) {
      case "minutes": return value * 60_000;
      case "hours": return value * 3_600_000;
      case "days": return value * 86_400_000;
    }
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- tests/unit/domain/booking/availability-slot.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/domain/booking/availability-slot.aggregate.ts tests/unit/domain/booking/availability-slot.test.ts
git commit -m "feat(domain): add AvailabilitySlot aggregate with reserve() and tests"
```

---

### Task 3: Create Booking aggregate class with status transitions

Absorbs logic from `booking-status.vo.ts` and the status-checking code in `check-in.usecase.ts`, `cancel-booking.usecase.ts`, and `mark-no-show.usecase.ts`.

**Files:**
- Create: `src/domain/booking/booking.aggregate.ts`
- Create: `tests/unit/domain/booking/booking.test.ts`

**Step 1: Write failing tests for Booking aggregate**

```ts
// tests/unit/domain/booking/booking.test.ts
import { describe, it, expect } from "vitest";
import { Booking } from "../../../../src/domain/booking/booking.aggregate";
import { ConflictError } from "../../../../src/shared/errors";

const baseBookingData = {
  id: "booking-1",
  userId: "user-1",
  availabilityId: "slot-1",
  orderItemId: "order-item-1",
  status: "confirmed" as const,
  personTypeQuantities: { adult: 2 },
  totalPrice: 50.0,
  availability: {
    slotDate: "2099-12-31",
    slotTime: "10:00",
    product: { name: "Tour", slug: "tour", featuredImageUrl: null },
  },
  items: [
    { id: "item-1", personType: "adult", quantity: 2, unitPrice: 25, totalPrice: 50 },
  ],
  createdAt: "2099-01-01T00:00:00Z",
};

describe("Booking", () => {
  describe("static fromData()", () => {
    it("creates a booking from raw data", () => {
      const booking = Booking.fromData(baseBookingData);
      expect(booking.id).toBe("booking-1");
      expect(booking.status).toBe("confirmed");
    });
  });

  describe("cancel()", () => {
    it("returns cancelled booking when status is confirmed and within policy", () => {
      const booking = Booking.fromData(baseBookingData);
      const cancelled = booking.cancel();
      expect(cancelled.status).toBe("cancelled");
    });

    it("throws ConflictError when status is not confirmed", () => {
      const booking = Booking.fromData({ ...baseBookingData, status: "checked_in" });
      expect(() => booking.cancel()).toThrow(ConflictError);
    });

    it("throws ConflictError when within 24 hours of event", () => {
      const soon = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now
      const booking = Booking.fromData({
        ...baseBookingData,
        availability: {
          ...baseBookingData.availability,
          slotDate: soon.toISOString().slice(0, 10),
          slotTime: soon.toISOString().slice(11, 16),
        },
      });
      expect(() => booking.cancel()).toThrow(ConflictError);
    });
  });

  describe("checkIn()", () => {
    it("returns checked-in booking for today's confirmed booking", () => {
      const today = new Date();
      const booking = Booking.fromData({
        ...baseBookingData,
        availability: {
          ...baseBookingData.availability,
          slotDate: today.toISOString().slice(0, 10),
        },
      });
      const checkedIn = booking.checkIn();
      expect(checkedIn.status).toBe("checked_in");
    });

    it("throws ConflictError when not confirmed", () => {
      const today = new Date();
      const booking = Booking.fromData({
        ...baseBookingData,
        status: "cancelled",
        availability: {
          ...baseBookingData.availability,
          slotDate: today.toISOString().slice(0, 10),
        },
      });
      expect(() => booking.checkIn()).toThrow(ConflictError);
    });

    it("throws ConflictError when slot is not today", () => {
      const booking = Booking.fromData({
        ...baseBookingData,
        availability: {
          ...baseBookingData.availability,
          slotDate: "2099-12-31",
        },
      });
      expect(() => booking.checkIn()).toThrow(ConflictError);
    });
  });

  describe("markNoShow()", () => {
    it("returns no-show booking when event time has passed", () => {
      const past = new Date(Date.now() - 60 * 60 * 1000);
      const booking = Booking.fromData({
        ...baseBookingData,
        availability: {
          ...baseBookingData.availability,
          slotDate: past.toISOString().slice(0, 10),
          slotTime: past.toISOString().slice(11, 16),
        },
      });
      const noShow = booking.markNoShow();
      expect(noShow.status).toBe("no_show");
    });

    it("throws ConflictError when event hasn't started", () => {
      const booking = Booking.fromData(baseBookingData);
      expect(() => booking.markNoShow()).toThrow(ConflictError);
    });
  });

  describe("totalQuantity", () => {
    it("sums person type quantities", () => {
      const booking = Booking.fromData({
        ...baseBookingData,
        personTypeQuantities: { adult: 2, child: 3 },
      });
      expect(booking.totalQuantity).toBe(5);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- tests/unit/domain/booking/booking.test.ts`
Expected: FAIL — module not found

**Step 3: Implement Booking aggregate class**

```ts
// src/domain/booking/booking.aggregate.ts
import { ConflictError } from "../../shared/errors";

export type BookingStatus = "confirmed" | "checked_in" | "cancelled" | "no_show";

interface BookingItem {
  id: string;
  personType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface BookingAvailability {
  slotDate: string;
  slotTime: string;
  product: { name: string; slug: string; featuredImageUrl: string | null };
}

interface BookingData {
  id: string;
  userId: string;
  availabilityId: string;
  orderItemId: string | null;
  status: BookingStatus;
  personTypeQuantities: Record<string, number>;
  totalPrice: number;
  availability: BookingAvailability;
  items: BookingItem[];
  createdAt: string;
}

export class Booking {
  readonly id: string;
  readonly userId: string;
  readonly availabilityId: string;
  readonly orderItemId: string | null;
  readonly status: BookingStatus;
  readonly personTypeQuantities: Record<string, number>;
  readonly totalPrice: number;
  readonly availability: BookingAvailability;
  readonly items: BookingItem[];
  readonly createdAt: string;

  private constructor(data: BookingData) {
    this.id = data.id;
    this.userId = data.userId;
    this.availabilityId = data.availabilityId;
    this.orderItemId = data.orderItemId;
    this.status = data.status;
    this.personTypeQuantities = data.personTypeQuantities;
    this.totalPrice = data.totalPrice;
    this.availability = data.availability;
    this.items = data.items;
    this.createdAt = data.createdAt;
  }

  static fromData(data: BookingData): Booking {
    return new Booking(data);
  }

  get totalQuantity(): number {
    return Object.values(this.personTypeQuantities).reduce((sum, qty) => sum + qty, 0);
  }

  cancel(): Booking {
    if (this.status !== "confirmed") {
      throw new ConflictError(
        `Cannot cancel booking with status "${this.status}". Only confirmed bookings can be cancelled.`,
      );
    }

    // Enforce 24-hour cancellation policy
    const { slotDate, slotTime } = this.availability;
    if (slotDate && slotTime) {
      const slotStart = new Date(`${slotDate}T${slotTime}:00Z`);
      const hoursUntilSlot = (slotStart.getTime() - Date.now()) / 3_600_000;
      if (hoursUntilSlot < 24) {
        throw new ConflictError(
          "Cannot cancel within 24 hours of the event. Contact us for assistance.",
        );
      }
    }

    return new Booking({ ...this.toData(), status: "cancelled" });
  }

  checkIn(): Booking {
    if (this.status !== "confirmed") {
      throw new ConflictError(
        `Cannot check in booking with status "${this.status}". Only confirmed bookings can be checked in.`,
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    if (this.availability.slotDate !== today) {
      throw new ConflictError(
        `Cannot check in: booking is for ${this.availability.slotDate}, not today (${today}).`,
      );
    }

    return new Booking({ ...this.toData(), status: "checked_in" });
  }

  markNoShow(): Booking {
    if (this.status !== "confirmed") {
      throw new ConflictError(
        `Cannot mark as no-show: booking status is "${this.status}". Only confirmed bookings can be marked as no-show.`,
      );
    }

    const { slotDate, slotTime } = this.availability;
    if (slotDate && slotTime) {
      const slotStart = new Date(`${slotDate}T${slotTime}:00Z`);
      if (slotStart > new Date()) {
        throw new ConflictError("Cannot mark as no-show before the event time");
      }
    }

    return new Booking({ ...this.toData(), status: "no_show" });
  }

  private toData(): BookingData {
    return {
      id: this.id,
      userId: this.userId,
      availabilityId: this.availabilityId,
      orderItemId: this.orderItemId,
      status: this.status,
      personTypeQuantities: this.personTypeQuantities,
      totalPrice: this.totalPrice,
      availability: this.availability,
      items: this.items,
      createdAt: this.createdAt,
    };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- tests/unit/domain/booking/booking.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/domain/booking/booking.aggregate.ts tests/unit/domain/booking/booking.test.ts
git commit -m "feat(domain): add Booking aggregate with cancel/checkIn/markNoShow and tests"
```

---

### Task 4: Create BookingRequest entity class

Absorbs logic from `booking-request.entity.ts` and status validation from `confirm-booking.usecase.ts:32-36`.

**Files:**
- Modify: `src/domain/booking/booking-request.entity.ts`
- Create: `tests/unit/domain/booking/booking-request.test.ts`

**Step 1: Write failing tests**

```ts
// tests/unit/domain/booking/booking-request.test.ts
import { describe, it, expect } from "vitest";
import { BookingRequest } from "../../../../src/domain/booking/booking-request.entity";
import { ConflictError } from "../../../../src/shared/errors";

describe("BookingRequest", () => {
  const baseData = {
    id: "req-1",
    availabilityId: "slot-1",
    userId: "user-1",
    status: "pending_payment" as const,
    quantity: 2,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    orderId: null,
    cartItemId: null,
    createdAt: new Date(),
  };

  describe("isExpired()", () => {
    it("returns false when not yet expired", () => {
      const request = BookingRequest.fromData(baseData);
      expect(request.isExpired).toBe(false);
    });

    it("returns true when past expiry", () => {
      const request = BookingRequest.fromData({
        ...baseData,
        expiresAt: new Date(Date.now() - 1000),
      });
      expect(request.isExpired).toBe(true);
    });
  });

  describe("confirm()", () => {
    it("returns confirmed request when pending_payment", () => {
      const request = BookingRequest.fromData(baseData);
      const confirmed = request.confirm();
      expect(confirmed.status).toBe("confirmed");
    });

    it("throws ConflictError when not pending_payment", () => {
      const request = BookingRequest.fromData({ ...baseData, status: "expired" });
      expect(() => request.confirm()).toThrow(ConflictError);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- tests/unit/domain/booking/booking-request.test.ts`
Expected: FAIL

**Step 3: Rewrite booking-request.entity.ts as a class**

Replace the entire contents of `src/domain/booking/booking-request.entity.ts`:

```ts
// src/domain/booking/booking-request.entity.ts
import { ConflictError } from "../../shared/errors";

export type BookingRequestStatus =
  | "pending_payment"
  | "confirmed"
  | "expired"
  | "cancelled";

interface BookingRequestData {
  id: string;
  availabilityId: string;
  userId: string;
  status: BookingRequestStatus;
  quantity: number;
  expiresAt: Date;
  orderId: string | null;
  cartItemId: string | null;
  createdAt: Date | null;
}

export class BookingRequest {
  readonly id: string;
  readonly availabilityId: string;
  readonly userId: string;
  readonly status: BookingRequestStatus;
  readonly quantity: number;
  readonly expiresAt: Date;
  readonly orderId: string | null;
  readonly cartItemId: string | null;
  readonly createdAt: Date | null;

  private constructor(data: BookingRequestData) {
    this.id = data.id;
    this.availabilityId = data.availabilityId;
    this.userId = data.userId;
    this.status = data.status;
    this.quantity = data.quantity;
    this.expiresAt = data.expiresAt;
    this.orderId = data.orderId;
    this.cartItemId = data.cartItemId;
    this.createdAt = data.createdAt;
  }

  static fromData(data: BookingRequestData): BookingRequest {
    return new BookingRequest(data);
  }

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  confirm(): BookingRequest {
    if (this.status !== "pending_payment") {
      throw new ConflictError(
        `Booking request is not pending payment (status: ${this.status})`,
      );
    }
    return new BookingRequest({ ...this.toData(), status: "confirmed" });
  }

  private toData(): BookingRequestData {
    return {
      id: this.id,
      availabilityId: this.availabilityId,
      userId: this.userId,
      status: this.status,
      quantity: this.quantity,
      expiresAt: this.expiresAt,
      orderId: this.orderId,
      cartItemId: this.cartItemId,
      createdAt: this.createdAt,
    };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- tests/unit/domain/booking/booking-request.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/domain/booking/booking-request.entity.ts tests/unit/domain/booking/booking-request.test.ts
git commit -m "feat(domain): rewrite BookingRequest as class with confirm() and tests"
```

---

### Task 5: Define repository interfaces in the domain layer

This inverts the dependency: the domain defines the contract, infrastructure implements it.

**Files:**
- Create: `src/domain/booking/ports.ts`

**Step 1: Create the repository interfaces**

The interfaces should match the methods that use cases actually call, derived from reading all 9 use cases.

```ts
// src/domain/booking/ports.ts
import type { AvailabilitySlot } from "./availability-slot.aggregate";
import type { Booking } from "./booking.aggregate";
import type { BookingRequest } from "./booking-request.entity";
import type { PersonTypePrice } from "./person-type-price.vo";
import type { BookingSettings } from "./booking-settings.vo";

// ─── Availability Repository ────────────────────────────────────────────────

export interface CreateAvailabilityData {
  productId: string;
  slotDate: string;
  slotTime: string;
  totalCapacity: number;
  prices: Array<{ personType: string; price: number }>;
}

export interface AvailabilityFilters {
  productId: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface IAvailabilityRepository {
  findById(id: string): Promise<AvailabilitySlot | null>;
  findMany(filters: AvailabilityFilters): Promise<{
    slots: AvailabilitySlot[];
    total: number;
    page: number;
    limit: number;
  }>;
  create(data: CreateAvailabilityData): Promise<AvailabilitySlot>;
  bulkCreate(
    productId: string,
    slots: Array<{ slotDate: string; slotTime: string; totalCapacity: number }>,
    prices: Array<{ personType: string; price: number }>,
  ): Promise<AvailabilitySlot[]>;
  findSettingsByProductId(productId: string): Promise<BookingSettings | null>;
  reserveSlot(data: {
    availabilityId: string;
    userId: string;
    quantity: number;
    expiresAt: Date;
    cartItemId?: string;
  }): Promise<BookingRequest>;
  incrementReservedCount(id: string, count: number): Promise<void>;
  decrementReservedCount(id: string, count: number): Promise<void>;
}

// ─── Booking Repository ─────────────────────────────────────────────────────

export interface IBookingRepository {
  findById(id: string): Promise<Booking | null>;
  findByUserId(
    userId: string,
    pagination: { page: number; limit: number },
  ): Promise<{
    bookings: Booking[];
    total: number;
    page: number;
    limit: number;
  }>;
  create(
    data: { orderItemId: string | null; userId: string; availabilityId: string },
    items: Array<{
      personType: string;
      quantity: number;
      unitPrice: string;
      totalPrice: string;
    }>,
  ): Promise<Booking>;
  updateStatus(id: string, status: string): Promise<Booking | null>;
  findRequestById(id: string): Promise<BookingRequest | null>;
  updateRequestStatus(id: string, status: string): Promise<void>;
  expireStaleRequests(): Promise<{ expired: number }>;
  findBookingsForAdmin(filters: {
    page: number;
    limit: number;
    status?: string;
    date?: string;
    search?: string;
  }): Promise<{ bookings: unknown[]; total: number }>;
  getBookingStats(): Promise<{
    totalBookings: number;
    checkedIn: number;
    noShows: number;
    cancelled: number;
  }>;
}

// ─── Waitlist Repository ────────────────────────────────────────────────────

export interface WaitlistEntry {
  id: string;
  userId: string;
  availabilityId: string;
  position: number;
  status: string;
  createdAt: Date | null;
}

export interface IWaitlistRepository {
  add(availabilityId: string, userId: string): Promise<WaitlistEntry | null>;
  findEntry(availabilityId: string, userId: string): Promise<WaitlistEntry | null>;
  findNext(availabilityId: string): Promise<WaitlistEntry | null>;
  updateStatus(
    id: string,
    status: string,
    extra?: { notifiedAt?: Date; expiredAt?: Date },
  ): Promise<WaitlistEntry | null>;
  findByUserId(userId: string): Promise<WaitlistEntry[]>;
  remove(id: string, userId: string): Promise<WaitlistEntry | null>;
  findForAdmin(): Promise<unknown[]>;
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit src/domain/booking/ports.ts`
Expected: Clean (no errors). If there are import path issues, fix them.

**Step 3: Commit**

```bash
git add src/domain/booking/ports.ts
git commit -m "feat(domain): define repository interfaces (ports) for booking context"
```

---

### Task 6: Split BookingRepository into 3 focused repositories

The current 888-line `src/infrastructure/repositories/booking.repository.ts` becomes 3 files. Each implements its domain interface.

**Files:**
- Create: `src/infrastructure/repositories/booking/availability.repository.ts` (~300 lines)
- Create: `src/infrastructure/repositories/booking/booking.repository.ts` (~250 lines)
- Create: `src/infrastructure/repositories/booking/waitlist.repository.ts` (~120 lines)
- Create: `src/infrastructure/repositories/booking/index.ts` (re-exports)

**Step 1: Create AvailabilityRepository**

Extract methods from `booking.repository.ts:70-306` (availability CRUD, settings, increment/decrement) plus `reserveSlot()` as a new transactional method.

```ts
// src/infrastructure/repositories/booking/availability.repository.ts
import { eq, and, gte, lte, count, sql, inArray } from "drizzle-orm";
import type { Database } from "../../db/client";
import {
  bookingAvailability,
  bookingAvailabilityPrices,
  bookingSettings,
  bookingRequests,
} from "../../db/schema";
import { AvailabilitySlot } from "../../../domain/booking/availability-slot.aggregate";
import { BookingRequest } from "../../../domain/booking/booking-request.entity";
import type {
  IAvailabilityRepository,
  CreateAvailabilityData,
  AvailabilityFilters,
} from "../../../domain/booking/ports";

export class AvailabilityRepository implements IAvailabilityRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async findById(id: string): Promise<AvailabilitySlot | null> {
    const rows = await this.db
      .select()
      .from(bookingAvailability)
      .where(and(eq(bookingAvailability.id, id), eq(bookingAvailability.storeId, this.storeId)))
      .limit(1);

    const slot = rows[0];
    if (!slot) return null;

    const priceRows = await this.db
      .select()
      .from(bookingAvailabilityPrices)
      .where(eq(bookingAvailabilityPrices.availabilityId, slot.id));

    return AvailabilitySlot.fromData({
      id: slot.id,
      productId: slot.productId,
      slotDate: slot.slotDate,
      slotTime: slot.slotTime,
      slotDatetime: slot.slotDatetime ?? new Date(`${slot.slotDate}T${slot.slotTime}:00Z`),
      totalCapacity: slot.totalCapacity,
      reservedCount: slot.reservedCount ?? 0,
      status: (slot.status as "open" | "full" | "closed" | "cancelled") ?? "open",
      isActive: slot.isActive ?? true,
      prices: priceRows.map((pr) => ({
        personType: pr.personType,
        price: Number(pr.price),
      })),
    });
  }

  async findMany(filters: AvailabilityFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [
      eq(bookingAvailability.storeId, this.storeId),
      eq(bookingAvailability.productId, filters.productId),
      eq(bookingAvailability.isActive, true),
    ];

    if (filters.dateFrom) conditions.push(gte(bookingAvailability.slotDate, filters.dateFrom));
    if (filters.dateTo) conditions.push(lte(bookingAvailability.slotDate, filters.dateTo));
    if (filters.status) conditions.push(eq(bookingAvailability.status, filters.status as any));

    const whereClause = and(...conditions);

    const countResult = await this.db
      .select({ total: count() })
      .from(bookingAvailability)
      .where(whereClause);

    const total = countResult[0]?.total ?? 0;

    const slotRows = await this.db
      .select()
      .from(bookingAvailability)
      .where(whereClause)
      .orderBy(bookingAvailability.slotDatetime)
      .limit(limit)
      .offset(offset);

    if (slotRows.length === 0) {
      return { slots: [], total, page, limit };
    }

    const slotIds = slotRows.map((s) => s.id);
    const priceRows = await this.db
      .select()
      .from(bookingAvailabilityPrices)
      .where(inArray(bookingAvailabilityPrices.availabilityId, slotIds));

    const pricesBySlot = new Map<string, typeof priceRows>();
    for (const pr of priceRows) {
      const arr = pricesBySlot.get(pr.availabilityId) ?? [];
      arr.push(pr);
      pricesBySlot.set(pr.availabilityId, arr);
    }

    const slots = slotRows.map((s) =>
      AvailabilitySlot.fromData({
        id: s.id,
        productId: s.productId,
        slotDate: s.slotDate,
        slotTime: s.slotTime,
        slotDatetime: s.slotDatetime ?? new Date(`${s.slotDate}T${s.slotTime}:00Z`),
        totalCapacity: s.totalCapacity,
        reservedCount: s.reservedCount ?? 0,
        status: (s.status as "open" | "full" | "closed" | "cancelled") ?? "open",
        isActive: s.isActive ?? true,
        prices: (pricesBySlot.get(s.id) ?? []).map((pr) => ({
          personType: pr.personType,
          price: Number(pr.price),
        })),
      }),
    );

    return { slots, total, page, limit };
  }

  async create(data: CreateAvailabilityData): Promise<AvailabilitySlot> {
    const slotDatetime = new Date(`${data.slotDate}T${data.slotTime}:00Z`);

    const rows = await this.db
      .insert(bookingAvailability)
      .values({
        storeId: this.storeId,
        productId: data.productId,
        slotDate: data.slotDate,
        slotTime: data.slotTime,
        slotDatetime,
        totalCapacity: data.totalCapacity,
        reservedCount: 0,
        status: "available",
        isActive: true,
      })
      .returning();

    const slot = rows[0]!;

    const priceRows = [];
    for (const p of data.prices) {
      const inserted = await this.db
        .insert(bookingAvailabilityPrices)
        .values({
          availabilityId: slot.id,
          personType: p.personType,
          price: p.price.toFixed(2),
        })
        .returning();
      if (inserted[0]) priceRows.push(inserted[0]);
    }

    return AvailabilitySlot.fromData({
      id: slot.id,
      productId: slot.productId,
      slotDate: slot.slotDate,
      slotTime: slot.slotTime,
      slotDatetime: slot.slotDatetime ?? slotDatetime,
      totalCapacity: slot.totalCapacity,
      reservedCount: 0,
      status: "open",
      isActive: true,
      prices: priceRows.map((pr) => ({ personType: pr.personType, price: Number(pr.price) })),
    });
  }

  async bulkCreate(
    productId: string,
    slots: Array<{ slotDate: string; slotTime: string; totalCapacity: number }>,
    prices: Array<{ personType: string; price: number }>,
  ): Promise<AvailabilitySlot[]> {
    const results = [];
    for (const slot of slots) {
      const result = await this.create({ productId, ...slot, prices });
      results.push(result);
    }
    return results;
  }

  async findSettingsByProductId(productId: string) {
    const rows = await this.db
      .select()
      .from(bookingSettings)
      .where(eq(bookingSettings.productId, productId))
      .limit(1);

    return rows[0] ?? null;
  }

  async reserveSlot(data: {
    availabilityId: string;
    userId: string;
    quantity: number;
    expiresAt: Date;
    cartItemId?: string;
  }): Promise<BookingRequest> {
    // Insert request
    const requestRows = await this.db
      .insert(bookingRequests)
      .values({
        availabilityId: data.availabilityId,
        userId: data.userId,
        status: "pending_payment",
        quantity: data.quantity,
        expiresAt: data.expiresAt,
        cartItemId: data.cartItemId ?? null,
      })
      .returning();

    const row = requestRows[0]!;

    // Atomically increment reserved count
    await this.db
      .update(bookingAvailability)
      .set({ reservedCount: sql`${bookingAvailability.reservedCount} + ${data.quantity}` })
      .where(
        and(
          eq(bookingAvailability.id, data.availabilityId),
          eq(bookingAvailability.storeId, this.storeId),
        ),
      );

    return BookingRequest.fromData({
      id: row.id,
      availabilityId: row.availabilityId,
      userId: row.userId,
      status: row.status as any,
      quantity: row.quantity,
      expiresAt: row.expiresAt!,
      orderId: row.orderId ?? null,
      cartItemId: row.cartItemId ?? null,
      createdAt: row.createdAt ?? null,
    });
  }

  async incrementReservedCount(id: string, amount: number): Promise<void> {
    await this.db
      .update(bookingAvailability)
      .set({ reservedCount: sql`${bookingAvailability.reservedCount} + ${amount}` })
      .where(and(eq(bookingAvailability.id, id), eq(bookingAvailability.storeId, this.storeId)));
  }

  async decrementReservedCount(id: string, amount: number): Promise<void> {
    await this.db
      .update(bookingAvailability)
      .set({ reservedCount: sql`GREATEST(${bookingAvailability.reservedCount} - ${amount}, 0)` })
      .where(and(eq(bookingAvailability.id, id), eq(bookingAvailability.storeId, this.storeId)));
  }
}
```

**Step 2: Create BookingRepository**

Extract from `booking.repository.ts:427-537` (booking CRUD, status updates, enrichment) and `330-425` (request operations).

```ts
// src/infrastructure/repositories/booking/booking.repository.ts
import { eq, and, desc, count, lt, inArray, sql, like, or } from "drizzle-orm";
import type { Database } from "../../db/client";
import {
  bookings,
  bookingItems,
  bookingAvailability,
  bookingAvailabilityPrices,
  bookingRequests,
  products,
  users,
} from "../../db/schema";
import { Booking as BookingAggregate } from "../../../domain/booking/booking.aggregate";
import { BookingRequest } from "../../../domain/booking/booking-request.entity";
import type { IBookingRepository } from "../../../domain/booking/ports";

export class BookingRepository implements IBookingRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async findById(id: string): Promise<BookingAggregate | null> {
    const rows = await this.db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.storeId, this.storeId)))
      .limit(1);

    const booking = rows[0];
    if (!booking) return null;

    return this.enrichBooking(booking);
  }

  async findByUserId(userId: string, pagination: { page: number; limit: number }) {
    const offset = (pagination.page - 1) * pagination.limit;

    const countResult = await this.db
      .select({ total: count() })
      .from(bookings)
      .where(and(eq(bookings.userId, userId), eq(bookings.storeId, this.storeId)));

    const total = countResult[0]?.total ?? 0;

    const bookingRows = await this.db
      .select()
      .from(bookings)
      .where(and(eq(bookings.userId, userId), eq(bookings.storeId, this.storeId)))
      .orderBy(desc(bookings.createdAt))
      .limit(pagination.limit)
      .offset(offset);

    if (bookingRows.length === 0) {
      return { bookings: [], total, page: pagination.page, limit: pagination.limit };
    }

    const enriched = await Promise.all(bookingRows.map((b) => this.enrichBooking(b)));

    return { bookings: enriched, total, page: pagination.page, limit: pagination.limit };
  }

  async create(
    data: { orderItemId: string | null; userId: string; availabilityId: string },
    items: Array<{ personType: string; quantity: number; unitPrice: string; totalPrice: string }>,
  ): Promise<BookingAggregate> {
    const bookingRows = await this.db
      .insert(bookings)
      .values({
        storeId: this.storeId,
        orderItemId: data.orderItemId,
        userId: data.userId,
        bookingAvailabilityId: data.availabilityId,
        status: "confirmed",
      })
      .returning();

    const booking = bookingRows[0]!;

    for (const item of items) {
      await this.db.insert(bookingItems).values({
        bookingId: booking.id,
        personType: item.personType,
        quantity: Number(item.quantity),
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      });
    }

    return (await this.enrichBooking(booking))!;
  }

  async updateStatus(id: string, status: string): Promise<BookingAggregate | null> {
    const rows = await this.db
      .update(bookings)
      .set({ status: status as any, updatedAt: new Date() })
      .where(and(eq(bookings.id, id), eq(bookings.storeId, this.storeId)))
      .returning();

    const booking = rows[0];
    if (!booking) return null;

    return this.enrichBooking(booking);
  }

  async findRequestById(id: string): Promise<BookingRequest | null> {
    const rows = await this.db
      .select()
      .from(bookingRequests)
      .where(eq(bookingRequests.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return BookingRequest.fromData({
      id: row.id,
      availabilityId: row.availabilityId,
      userId: row.userId,
      status: row.status as any,
      quantity: row.quantity,
      expiresAt: row.expiresAt!,
      orderId: row.orderId ?? null,
      cartItemId: row.cartItemId ?? null,
      createdAt: row.createdAt ?? null,
    });
  }

  async updateRequestStatus(id: string, status: string): Promise<void> {
    await this.db
      .update(bookingRequests)
      .set({ status: status as any })
      .where(eq(bookingRequests.id, id));
  }

  async expireStaleRequests(): Promise<{ expired: number }> {
    const now = new Date();

    const staleRequests = await this.db
      .select()
      .from(bookingRequests)
      .where(and(eq(bookingRequests.status, "pending_payment"), lt(bookingRequests.expiresAt, now)));

    if (staleRequests.length === 0) return { expired: 0 };

    const decrementMap = new Map<string, number>();
    const requestIds: string[] = [];

    for (const req of staleRequests) {
      requestIds.push(req.id);
      decrementMap.set(req.availabilityId, (decrementMap.get(req.availabilityId) ?? 0) + req.quantity);
    }

    await this.db
      .update(bookingRequests)
      .set({ status: "expired" })
      .where(inArray(bookingRequests.id, requestIds));

    for (const [availId, qty] of decrementMap) {
      await this.db
        .update(bookingAvailability)
        .set({ reservedCount: sql`GREATEST(${bookingAvailability.reservedCount} - ${qty}, 0)` })
        .where(and(eq(bookingAvailability.id, availId), eq(bookingAvailability.storeId, this.storeId)));
    }

    return { expired: staleRequests.length };
  }

  async findBookingsForAdmin(filters: {
    page: number;
    limit: number;
    status?: string;
    date?: string;
    search?: string;
  }) {
    const offset = (filters.page - 1) * filters.limit;

    const conditions: ReturnType<typeof eq>[] = [eq(bookings.storeId, this.storeId)];

    if (filters.status) conditions.push(eq(bookings.status, filters.status as any));
    if (filters.date) conditions.push(eq(bookingAvailability.slotDate, filters.date));

    const whereClause = and(...conditions);

    const countResult = await this.db
      .select({ total: count() })
      .from(bookings)
      .innerJoin(bookingAvailability, eq(bookings.bookingAvailabilityId, bookingAvailability.id))
      .innerJoin(products, eq(bookingAvailability.productId, products.id))
      .leftJoin(users, eq(bookings.userId, users.id))
      .where(
        filters.search
          ? and(whereClause, or(like(users.name, `%${filters.search}%`), like(users.email, `%${filters.search}%`)))
          : whereClause,
      );

    const total = countResult[0]?.total ?? 0;

    const rows = await this.db
      .select({
        id: bookings.id,
        status: bookings.status,
        userId: bookings.userId,
        customerName: users.name,
        customerEmail: users.email,
        eventName: products.name,
        slotDate: bookingAvailability.slotDate,
        slotTime: bookingAvailability.slotTime,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .innerJoin(bookingAvailability, eq(bookings.bookingAvailabilityId, bookingAvailability.id))
      .innerJoin(products, eq(bookingAvailability.productId, products.id))
      .leftJoin(users, eq(bookings.userId, users.id))
      .where(
        filters.search
          ? and(whereClause, or(like(users.name, `%${filters.search}%`), like(users.email, `%${filters.search}%`)))
          : whereClause,
      )
      .orderBy(desc(bookings.createdAt))
      .limit(filters.limit)
      .offset(offset);

    const bookingIds = rows.map((r) => r.id);
    const quantityMap = new Map<string, number>();
    if (bookingIds.length > 0) {
      const itemRows = await this.db
        .select({
          bookingId: bookingItems.bookingId,
          qty: sql<number>`sum(${bookingItems.quantity})`.as("qty"),
        })
        .from(bookingItems)
        .where(inArray(bookingItems.bookingId, bookingIds))
        .groupBy(bookingItems.bookingId);

      for (const item of itemRows) {
        quantityMap.set(item.bookingId, Number(item.qty));
      }
    }

    return {
      bookings: rows.map((r) => ({ ...r, quantity: quantityMap.get(r.id) ?? 1 })),
      total,
    };
  }

  async getBookingStats() {
    const statsRows = await this.db
      .select({ status: bookings.status, cnt: count() })
      .from(bookings)
      .where(eq(bookings.storeId, this.storeId))
      .groupBy(bookings.status);

    let totalBookings = 0, checkedIn = 0, noShows = 0, cancelled = 0;

    for (const row of statsRows) {
      const c = Number(row.cnt);
      totalBookings += c;
      if (row.status === "checked_in") checkedIn = c;
      if (row.status === "no_show") noShows = c;
      if (row.status === "cancelled") cancelled = c;
    }

    return { totalBookings, checkedIn, noShows, cancelled };
  }

  private async enrichBooking(booking: {
    id: string;
    orderItemId: string | null;
    userId: string;
    bookingAvailabilityId: string;
    status: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  }): Promise<BookingAggregate> {
    const itemRows = await this.db
      .select()
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, booking.id));

    const slotRows = await this.db
      .select()
      .from(bookingAvailability)
      .where(eq(bookingAvailability.id, booking.bookingAvailabilityId))
      .limit(1);

    const slot = slotRows[0];

    let product: { name: string; slug: string; featuredImageUrl: string | null } | null = null;
    if (slot) {
      const productRows = await this.db
        .select()
        .from(products)
        .where(eq(products.id, slot.productId))
        .limit(1);
      if (productRows[0]) {
        product = { name: productRows[0].name, slug: productRows[0].slug, featuredImageUrl: productRows[0].featuredImageUrl };
      }
    }

    const personTypeQuantities: Record<string, number> = {};
    let totalPrice = 0;
    for (const item of itemRows) {
      personTypeQuantities[item.personType] = item.quantity;
      totalPrice += Number(item.totalPrice);
    }

    return BookingAggregate.fromData({
      id: booking.id,
      userId: booking.userId,
      availabilityId: booking.bookingAvailabilityId,
      orderItemId: booking.orderItemId,
      status: (booking.status ?? "confirmed") as any,
      personTypeQuantities,
      totalPrice,
      availability: slot
        ? { slotDate: slot.slotDate, slotTime: slot.slotTime, product: product ?? { name: "", slug: "", featuredImageUrl: null } }
        : { slotDate: "", slotTime: "", product: { name: "", slug: "", featuredImageUrl: null } },
      items: itemRows.map((item) => ({
        id: item.id,
        personType: item.personType,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      createdAt: booking.createdAt?.toISOString() ?? new Date().toISOString(),
    });
  }
}
```

**Step 3: Create WaitlistRepository**

Extract from `booking.repository.ts:539-805`.

```ts
// src/infrastructure/repositories/booking/waitlist.repository.ts
import { eq, and, count } from "drizzle-orm";
import type { Database } from "../../db/client";
import {
  bookingWaitlist,
  bookingAvailability,
  products,
  users,
} from "../../db/schema";
import type { IWaitlistRepository, WaitlistEntry } from "../../../domain/booking/ports";

export class WaitlistRepository implements IWaitlistRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async add(availabilityId: string, userId: string): Promise<WaitlistEntry | null> {
    const countResult = await this.db
      .select({ total: count() })
      .from(bookingWaitlist)
      .where(
        and(
          eq(bookingWaitlist.availabilityId, availabilityId),
          eq(bookingWaitlist.storeId, this.storeId),
        ),
      );

    const position = (countResult[0]?.total ?? 0) + 1;

    const rows = await this.db
      .insert(bookingWaitlist)
      .values({ storeId: this.storeId, userId, availabilityId, position, status: "waiting" })
      .returning();

    return rows[0] ?? null;
  }

  async findEntry(availabilityId: string, userId: string): Promise<WaitlistEntry | null> {
    const rows = await this.db
      .select()
      .from(bookingWaitlist)
      .where(
        and(
          eq(bookingWaitlist.availabilityId, availabilityId),
          eq(bookingWaitlist.userId, userId),
          eq(bookingWaitlist.storeId, this.storeId),
          eq(bookingWaitlist.status, "waiting"),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async findNext(availabilityId: string): Promise<WaitlistEntry | null> {
    const rows = await this.db
      .select()
      .from(bookingWaitlist)
      .where(
        and(
          eq(bookingWaitlist.availabilityId, availabilityId),
          eq(bookingWaitlist.storeId, this.storeId),
          eq(bookingWaitlist.status, "waiting"),
        ),
      )
      .orderBy(bookingWaitlist.position)
      .limit(1);

    return rows[0] ?? null;
  }

  async updateStatus(
    id: string,
    status: string,
    extra?: { notifiedAt?: Date; expiredAt?: Date },
  ): Promise<WaitlistEntry | null> {
    const setValues: Record<string, unknown> = { status };
    if (extra?.notifiedAt) setValues.notifiedAt = extra.notifiedAt;
    if (extra?.expiredAt) setValues.expiredAt = extra.expiredAt;

    const rows = await this.db
      .update(bookingWaitlist)
      .set(setValues)
      .where(and(eq(bookingWaitlist.id, id), eq(bookingWaitlist.storeId, this.storeId)))
      .returning();

    return rows[0] ?? null;
  }

  async findByUserId(userId: string): Promise<WaitlistEntry[]> {
    return this.db
      .select()
      .from(bookingWaitlist)
      .where(
        and(
          eq(bookingWaitlist.userId, userId),
          eq(bookingWaitlist.storeId, this.storeId),
          eq(bookingWaitlist.status, "waiting"),
        ),
      )
      .orderBy(bookingWaitlist.createdAt);
  }

  async remove(id: string, userId: string): Promise<WaitlistEntry | null> {
    const rows = await this.db
      .delete(bookingWaitlist)
      .where(
        and(
          eq(bookingWaitlist.id, id),
          eq(bookingWaitlist.userId, userId),
          eq(bookingWaitlist.storeId, this.storeId),
        ),
      )
      .returning();

    return rows[0] ?? null;
  }

  async findForAdmin() {
    return this.db
      .select({
        id: bookingWaitlist.id,
        userName: users.name,
        eventName: products.name,
        position: bookingWaitlist.position,
        status: bookingWaitlist.status,
        createdAt: bookingWaitlist.createdAt,
      })
      .from(bookingWaitlist)
      .innerJoin(bookingAvailability, eq(bookingWaitlist.availabilityId, bookingAvailability.id))
      .innerJoin(products, eq(bookingAvailability.productId, products.id))
      .leftJoin(users, eq(bookingWaitlist.userId, users.id))
      .where(and(eq(bookingWaitlist.storeId, this.storeId), eq(bookingWaitlist.status, "waiting")))
      .orderBy(bookingWaitlist.position)
      .limit(50);
  }
}
```

**Step 4: Create index re-export**

```ts
// src/infrastructure/repositories/booking/index.ts
export { AvailabilityRepository } from "./availability.repository";
export { BookingRepository } from "./booking.repository";
export { WaitlistRepository } from "./waitlist.repository";
```

**Step 5: Verify compilation**

Run: `npx tsc --noEmit`
Expected: Clean compile. Fix any type mismatches (DB row shapes vs domain class constructors).

**Step 6: Commit**

```bash
git add src/infrastructure/repositories/booking/
git commit -m "feat(infra): split BookingRepository into 3 focused repos implementing domain interfaces"
```

---

### Task 7: Create DI middleware for Booking context

**Files:**
- Create: `src/middleware/booking-context.middleware.ts`

**Step 1: Create the middleware**

```ts
// src/middleware/booking-context.middleware.ts
import type { Context, Next } from "hono";
import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { AvailabilityRepository } from "../infrastructure/repositories/booking/availability.repository";
import { BookingRepository } from "../infrastructure/repositories/booking/booking.repository";
import { WaitlistRepository } from "../infrastructure/repositories/booking/waitlist.repository";

export function withBookingContext() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    c.set("availabilityRepo", new AvailabilityRepository(db, storeId));
    c.set("bookingRepo", new BookingRepository(db, storeId));
    c.set("waitlistRepo", new WaitlistRepository(db, storeId));
    await next();
  };
}
```

**Step 2: Commit**

```bash
git add src/middleware/booking-context.middleware.ts
git commit -m "feat(middleware): add DI middleware for booking bounded context"
```

---

### Task 8: Rewrite use cases as thin orchestrators

Rewrite all 9 booking use cases to:
- Import from domain interfaces (`ports.ts`), not concrete repos
- Delegate business logic to domain aggregates
- Stay under 40 lines each

**Files:**
- Modify: `src/application/booking/create-booking-request.usecase.ts`
- Modify: `src/application/booking/confirm-booking.usecase.ts`
- Modify: `src/application/booking/cancel-booking.usecase.ts`
- Modify: `src/application/booking/check-in.usecase.ts`
- Modify: `src/application/booking/mark-no-show.usecase.ts`
- Modify: `src/application/booking/create-availability.usecase.ts`
- Modify: `src/application/booking/list-availability.usecase.ts`
- Modify: `src/application/booking/join-waitlist.usecase.ts`
- Modify: `src/application/booking/process-waitlist.usecase.ts`

**Step 1: Rewrite CreateBookingRequestUseCase (131 → ~35 lines)**

Replace `src/application/booking/create-booking-request.usecase.ts`:

```ts
import type { IAvailabilityRepository } from "../../domain/booking/ports";
import { NotFoundError } from "../../shared/errors";
import { BOOKING_REQUEST_TTL_MINUTES } from "../../shared/constants";

interface CreateBookingRequestInput {
  availabilityId: string;
  userId: string;
  personTypeQuantities: Record<string, number>;
}

export class CreateBookingRequestUseCase {
  constructor(private availabilityRepo: IAvailabilityRepository) {}

  async execute(input: CreateBookingRequestInput) {
    const { availabilityId, userId, personTypeQuantities } = input;

    const slot = await this.availabilityRepo.findById(availabilityId);
    if (!slot) throw new NotFoundError("Availability slot", availabilityId);

    const settings = await this.availabilityRepo.findSettingsByProductId(slot.productId);
    const reservation = slot.reserve(personTypeQuantities, settings);

    const expiresAt = new Date(Date.now() + BOOKING_REQUEST_TTL_MINUTES * 60 * 1000);

    const request = await this.availabilityRepo.reserveSlot({
      availabilityId,
      userId,
      quantity: reservation.totalQuantity,
      expiresAt,
    });

    return {
      id: request.id,
      userId: request.userId,
      availabilityId: request.availabilityId,
      status: request.status,
      personTypeQuantities,
      totalPrice: reservation.totalPrice,
      availability: { slotDate: slot.slotDate, slotTime: slot.slotTime, product: { name: "", slug: "", featuredImageUrl: null } },
      createdAt: request.createdAt?.toISOString() ?? new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }
}
```

**Step 2: Rewrite remaining use cases**

Apply same pattern to each. Key changes per file:

- **confirm-booking.usecase.ts**: Use `IBookingRepository` + `IAvailabilityRepository`. Call `request.confirm()` for validation.
- **cancel-booking.usecase.ts**: Use `IBookingRepository` + `IAvailabilityRepository` + `IWaitlistRepository`. Call `booking.cancel()` for validation. Use `booking.totalQuantity` for decrement.
- **check-in.usecase.ts**: Use `IBookingRepository`. Call `booking.checkIn()` for validation.
- **mark-no-show.usecase.ts**: Use `IBookingRepository`. Call `booking.markNoShow()` for validation.
- **create-availability.usecase.ts**: Use `IAvailabilityRepository`. Keep product validation (needs `ProductRepository` — leave as concrete import for now since that's outside Booking context).
- **list-availability.usecase.ts**: Use `IAvailabilityRepository`. Move `computeEffectiveStatus` to `slot.computeEffectiveStatus()`.
- **join-waitlist.usecase.ts**: Use `IAvailabilityRepository` + `IWaitlistRepository`. Use `slot.isFull` and `slot.remainingSpots`.
- **process-waitlist.usecase.ts**: Use `IWaitlistRepository`. No domain logic changes needed.

**Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: Clean compile

**Step 4: Commit**

```bash
git add src/application/booking/
git commit -m "refactor(app): rewrite booking use cases as thin orchestrators using domain interfaces"
```

---

### Task 9: Rewrite bookings.routes.ts to use DI middleware

Replace per-handler wiring with the DI middleware. Remove try/catch blocks (centralized error handler already exists at `src/middleware/error-handler.middleware.ts`).

**Files:**
- Modify: `src/routes/api/bookings.routes.ts`

**Step 1: Rewrite the routes file**

Replace the entire contents of `src/routes/api/bookings.routes.ts`:

```ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { ProductRepository } from "../../infrastructure/repositories/product.repository";
import { withBookingContext } from "../../middleware/booking-context.middleware";
import { CreateAvailabilityUseCase } from "../../application/booking/create-availability.usecase";
import { ListAvailabilityUseCase } from "../../application/booking/list-availability.usecase";
import { CreateBookingRequestUseCase } from "../../application/booking/create-booking-request.usecase";
import { CheckInUseCase } from "../../application/booking/check-in.usecase";
import { CancelBookingUseCase } from "../../application/booking/cancel-booking.usecase";
import { JoinWaitlistUseCase } from "../../application/booking/join-waitlist.usecase";
import { MarkNoShowUseCase } from "../../application/booking/mark-no-show.usecase";
import {
  createAvailabilitySchema,
  bulkCreateAvailabilitySchema,
  availabilityFilterSchema,
  createBookingRequestSchema,
  paginationSchema,
} from "../../shared/validators";
import { requireAuth } from "../../middleware/auth.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";

const bookings = new Hono<{ Bindings: Env }>();

// Apply DI middleware to all booking routes
bookings.use("/*", withBookingContext());
bookings.use("/request", rateLimit({ windowMs: 60_000, max: 10 }));

// GET /bookings/availability — List availability slots (public)
bookings.get(
  "/availability",
  zValidator("query", availabilityFilterSchema.merge(paginationSchema)),
  async (c) => {
    const useCase = new ListAvailabilityUseCase(c.get("availabilityRepo"));
    return c.json(await useCase.execute(c.req.valid("query")), 200);
  },
);

// POST /bookings/availability — Create slot (admin)
bookings.post(
  "/availability",
  requireAuth(),
  zValidator("json", createAvailabilitySchema),
  async (c) => {
    const productRepo = new ProductRepository(createDb(c.env.DATABASE_URL), c.get("storeId") as string);
    const useCase = new CreateAvailabilityUseCase(c.get("availabilityRepo"), productRepo);
    return c.json(await useCase.execute(c.req.valid("json")), 201);
  },
);

// POST /bookings/availability/bulk — Bulk create slots (admin)
bookings.post(
  "/availability/bulk",
  requireAuth(),
  zValidator("json", bulkCreateAvailabilitySchema),
  async (c) => {
    const productRepo = new ProductRepository(createDb(c.env.DATABASE_URL), c.get("storeId") as string);
    const useCase = new CreateAvailabilityUseCase(c.get("availabilityRepo"), productRepo);
    return c.json(await useCase.executeBulk(c.req.valid("json")), 201);
  },
);

// GET /bookings — List user bookings
bookings.get(
  "/",
  requireAuth(),
  zValidator("query", paginationSchema),
  async (c) => {
    const result = await c.get("bookingRepo").findByUserId(c.get("userId"), c.req.valid("query"));
    return c.json(result, 200);
  },
);

// POST /bookings/request — Create booking request
bookings.post(
  "/request",
  requireAuth(),
  zValidator("json", createBookingRequestSchema),
  async (c) => {
    const useCase = new CreateBookingRequestUseCase(c.get("availabilityRepo"));
    const body = c.req.valid("json");
    return c.json(await useCase.execute({ ...body, userId: c.get("userId") }), 201);
  },
);

// POST /bookings/:id/check-in — Check in (admin)
bookings.post("/:id/check-in", requireAuth(), async (c) => {
  const useCase = new CheckInUseCase(c.get("bookingRepo"));
  return c.json(await useCase.execute(c.req.param("id")), 200);
});

// POST /bookings/:id/cancel — Cancel booking
bookings.post("/:id/cancel", requireAuth(), async (c) => {
  const useCase = new CancelBookingUseCase(c.get("bookingRepo"), c.get("availabilityRepo"), c.get("waitlistRepo"));
  return c.json(await useCase.execute(c.req.param("id"), c.get("userId")), 200);
});

// POST /bookings/availability/:id/waitlist — Join waitlist
bookings.post("/availability/:id/waitlist", requireAuth(), async (c) => {
  const useCase = new JoinWaitlistUseCase(c.get("availabilityRepo"), c.get("waitlistRepo"));
  return c.json(await useCase.execute(c.req.param("id"), c.get("userId")), 201);
});

// GET /bookings/waitlist — List user's waitlist entries
bookings.get("/waitlist", requireAuth(), async (c) => {
  return c.json({ entries: await c.get("waitlistRepo").findByUserId(c.get("userId")) }, 200);
});

// DELETE /bookings/waitlist/:id — Remove from waitlist
bookings.delete("/waitlist/:id", requireAuth(), async (c) => {
  const removed = await c.get("waitlistRepo").remove(c.req.param("id"), c.get("userId"));
  if (!removed) return c.json({ error: "Waitlist entry not found" }, 404);
  return c.json({ success: true }, 200);
});

// POST /bookings/:id/no-show — Admin mark no-show
bookings.post("/:id/no-show", requireAuth(), async (c) => {
  const useCase = new MarkNoShowUseCase(c.get("bookingRepo"));
  return c.json(await useCase.execute(c.req.param("id")), 200);
});

export { bookings as bookingRoutes };
```

**Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: Clean compile

**Step 3: Commit**

```bash
git add src/routes/api/bookings.routes.ts
git commit -m "refactor(routes): use DI middleware in booking routes, remove per-handler wiring"
```

---

### Task 10: Clean up old files and verify full build

**Files:**
- Modify: `src/infrastructure/repositories/booking.repository.ts` — remove or replace with re-export
- Remove: `src/domain/booking/booking.entity.ts` (replaced by `booking.aggregate.ts`)
- Remove: `src/domain/booking/booking-status.vo.ts` (absorbed into `Booking` class)
- Remove: `src/domain/booking/slot-availability.vo.ts` (absorbed into `AvailabilitySlot` class)
- Update: `src/domain/booking/booking-availability.entity.ts` — keep for consumers outside Booking context that may reference it, or replace imports

**Step 1: Update imports across the codebase**

Search for all imports of the old files and update them:

Run: `grep -r "booking.entity" src/ --include="*.ts" -l`
Run: `grep -r "booking-status.vo" src/ --include="*.ts" -l`
Run: `grep -r "slot-availability.vo" src/ --include="*.ts" -l`
Run: `grep -r "booking.repository" src/ --include="*.ts" -l`

Update each file to import from the new locations.

**Step 2: Replace the old monolithic repo with a re-export (backwards compat for any remaining consumers)**

```ts
// src/infrastructure/repositories/booking.repository.ts
// Re-export for backwards compatibility — consumers should migrate to direct imports
export { AvailabilityRepository } from "./booking/availability.repository";
export { BookingRepository } from "./booking/booking.repository";
export { WaitlistRepository } from "./booking/waitlist.repository";
```

**Step 3: Full verification**

Run: `npx tsc --noEmit`
Expected: Clean compile

Run: `pnpm test`
Expected: All domain tests pass

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: clean up old booking files, update imports, verify full build"
```

---

### Task 11: Final verification against success criteria

Run each check:

1. `npx tsc --noEmit` — passes clean
2. Domain classes enforce invariants — confirmed by unit tests
3. Use cases are <40 lines each — count lines: `wc -l src/application/booking/*.ts`
4. Atomic operations — `reserveSlot()` handles insert + increment together
5. Route handlers have zero DI boilerplate — confirmed by routes file review
6. No repository file exceeds 300 lines — count: `wc -l src/infrastructure/repositories/booking/*.ts`

If any check fails, fix before marking complete.

**Step 1: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final verification — booking DDD refactor complete"
```
