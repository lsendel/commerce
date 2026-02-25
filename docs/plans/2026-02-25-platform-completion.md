# petm8.io Platform Completion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete all remaining work from PLAN.md phases 1-6: fix storeId scoping security gaps, create missing use cases, wire contracts, implement Phase 6 Printful improvements, and add email provider integration.

**Architecture:** DDD with per-request DI (`createDb() → Repository → UseCase`). Each use case is a class with an `execute()` method. Repositories are scoped to a `storeId` injected via constructor. Routes instantiate repos with `c.get("storeId")`.

**Tech Stack:** Cloudflare Workers, Hono (JSX + REST), Drizzle ORM on Neon PostgreSQL, ts-rest contracts, Stripe, Resend (email)

---

## Task 1: Fix storeId Scoping in OrderRepository

**Why:** Orders can currently be queried across stores — a multi-tenant security hole. The `storeId` is set on `create()` but never filtered in read/update methods.

**Files:**
- Modify: `src/infrastructure/repositories/order.repository.ts`

**Step 1: Add storeId filter to `findByUserId`**

In `findByUserId`, add `eq(orders.storeId, this.storeId)` to both the count query and the main query:

```typescript
// Count query — change from:
.where(eq(orders.userId, userId))
// to:
.where(and(eq(orders.userId, userId), eq(orders.storeId, this.storeId)))

// Main query — same change:
.where(and(eq(orders.userId, userId), eq(orders.storeId, this.storeId)))
```

**Step 2: Add storeId filter to `findById`**

```typescript
async findById(id: string, userId?: string) {
  const conditions = [eq(orders.id, id), eq(orders.storeId, this.storeId)];
  if (userId) {
    conditions.push(eq(orders.userId, userId));
  }
  // ... rest unchanged
}
```

**Step 3: Add storeId filter to `updateStatus`**

```typescript
.where(and(eq(orders.id, orderId), eq(orders.storeId, this.storeId)))
```

**Step 4: Add storeId filter to `findByStripeSessionId`**

```typescript
.where(and(
  eq(orders.stripeCheckoutSessionId, sessionId),
  eq(orders.storeId, this.storeId),
))
```

**Step 5: Verify `tsc --noEmit` passes**

Run: `pnpm exec tsc --noEmit`
Expected: no errors

**Step 6: Commit**

```bash
git add src/infrastructure/repositories/order.repository.ts
git commit -m "fix: add storeId scoping to OrderRepository query methods"
```

---

## Task 2: Fix storeId Scoping in BookingRepository

**Why:** Booking queries lack storeId filtering — availability, requests, and bookings can leak across stores.

**Files:**
- Modify: `src/infrastructure/repositories/booking.repository.ts`

**Step 1: Add storeId to `findAvailability` conditions**

At line 147, add `eq(bookingAvailability.storeId, this.storeId)` to the conditions array:

```typescript
const conditions: ReturnType<typeof eq>[] = [
  eq(bookingAvailability.storeId, this.storeId),
  eq(bookingAvailability.productId, filters.productId),
  eq(bookingAvailability.isActive, true),
];
```

**Step 2: Add storeId to `findAvailabilityById`**

```typescript
.where(and(eq(bookingAvailability.id, id), eq(bookingAvailability.storeId, this.storeId)))
```

**Step 3: Add storeId to `updateAvailabilityStatus`**

```typescript
.where(and(eq(bookingAvailability.id, id), eq(bookingAvailability.storeId, this.storeId)))
```

**Step 4: Add storeId to `incrementReservedCount` and `decrementReservedCount`**

```typescript
// incrementReservedCount
.where(and(eq(bookingAvailability.id, id), eq(bookingAvailability.storeId, this.storeId)))

// decrementReservedCount
.where(and(eq(bookingAvailability.id, id), eq(bookingAvailability.storeId, this.storeId)))
```

**Step 5: Add storeId to `findBookingsByUserId`**

```typescript
// Count query:
.where(and(eq(bookings.userId, userId), eq(bookings.storeId, this.storeId)))
// Main query:
.where(and(eq(bookings.userId, userId), eq(bookings.storeId, this.storeId)))
```

**Step 6: Add storeId to `findBookingById`**

```typescript
.where(and(eq(bookings.id, id), eq(bookings.storeId, this.storeId)))
```

**Step 7: Add storeId to `updateBookingStatus`**

```typescript
.where(and(eq(bookings.id, id), eq(bookings.storeId, this.storeId)))
```

**Step 8: Verify `tsc --noEmit` passes**

Run: `pnpm exec tsc --noEmit`

**Step 9: Commit**

```bash
git add src/infrastructure/repositories/booking.repository.ts
git commit -m "fix: add storeId scoping to BookingRepository query methods"
```

---

## Task 3: Fix storeId Scoping in AiJobRepository

**Why:** AI generation jobs and pet profiles can be read across stores.

**Files:**
- Modify: `src/infrastructure/repositories/ai-job.repository.ts`

**Step 1: Add storeId to `findById`**

```typescript
async findById(id: string) {
  const result = await this.db
    .select()
    .from(generationJobs)
    .where(and(eq(generationJobs.id, id), eq(generationJobs.storeId, this.storeId)))
    .limit(1);
  return result[0] ?? null;
}
```

**Step 2: Add storeId to `findByUserId`**

```typescript
async findByUserId(userId: string) {
  return this.db
    .select()
    .from(generationJobs)
    .where(and(eq(generationJobs.userId, userId), eq(generationJobs.storeId, this.storeId)));
}
```

**Step 3: Add storeId to `updateStatus`**

```typescript
.where(and(eq(generationJobs.id, id), eq(generationJobs.storeId, this.storeId)))
```

**Step 4: Add storeId to pet profile queries**

```typescript
// findPetsByUserId
.where(and(eq(petProfiles.userId, userId), eq(petProfiles.storeId, this.storeId)))

// findPetById
.where(and(eq(petProfiles.id, id), eq(petProfiles.storeId, this.storeId)))

// updatePetProfile
.where(and(eq(petProfiles.id, id), eq(petProfiles.storeId, this.storeId)))

// deletePetProfile
.where(and(eq(petProfiles.id, id), eq(petProfiles.storeId, this.storeId)))
```

**Step 5: Add storeId to template queries**

```typescript
// findTemplates — add storeId condition:
.where(and(eq(artTemplates.storeId, this.storeId), eq(artTemplates.isActive, true), ...))

// findTemplateById:
.where(and(eq(artTemplates.id, id), eq(artTemplates.storeId, this.storeId)))
```

> **Note:** If `artTemplates` are platform-level (shared across stores), skip the template scoping and add a comment explaining why.

**Step 6: Verify and commit**

```bash
pnpm exec tsc --noEmit
git add src/infrastructure/repositories/ai-job.repository.ts
git commit -m "fix: add storeId scoping to AiJobRepository query methods"
```

---

## Task 4: Fix storeId Scoping in SubscriptionRepository

**Why:** Subscription plans and user subscriptions can be queried across stores.

**Files:**
- Modify: `src/infrastructure/repositories/subscription.repository.ts`

**Step 1: Scope plan queries by storeId**

Subscription plans are scoped via their linked product. Since `products` already has `storeId`, add a filter through the join:

```typescript
// In findPlanById, findPlanByProductId, findPlanByStripePriceId, findAllPlans:
// Add to WHERE or JOIN condition:
.where(and(existingCondition, eq(products.storeId, this.storeId)))
```

**Step 2: Scope subscription queries**

```typescript
// findByUserId — add:
.where(and(eq(subscriptions.userId, userId), eq(subscriptions.storeId, this.storeId)))

// findById — add storeId to conditions:
const conditions = [eq(subscriptions.id, id), eq(subscriptions.storeId, this.storeId)];

// findByStripeId — add:
.where(and(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId), eq(subscriptions.storeId, this.storeId)))

// updateFromStripe — add:
.where(and(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId), eq(subscriptions.storeId, this.storeId)))

// delete — add:
.where(and(eq(subscriptions.id, id), eq(subscriptions.storeId, this.storeId)))
```

**Step 3: Verify and commit**

```bash
pnpm exec tsc --noEmit
git add src/infrastructure/repositories/subscription.repository.ts
git commit -m "fix: add storeId scoping to SubscriptionRepository query methods"
```

---

## Task 5: Fix storeId Scoping in PrintfulRepository

**Why:** Sync products and shipments can be read across stores.

**Files:**
- Modify: `src/infrastructure/repositories/printful.repository.ts`

**Step 1: Add storeId to sync product lookups**

```typescript
// upsertSyncProduct — scope existing check:
.where(and(eq(printfulSyncProducts.printfulId, data.printfulId), eq(printfulSyncProducts.storeId, this.storeId)))

// findSyncProductByProductId — add:
.where(and(eq(printfulSyncProducts.productId, productId), eq(printfulSyncProducts.storeId, this.storeId)))
```

**Step 2: Add storeId to shipment lookups**

```typescript
// findShipmentsByOrderId — add:
.where(and(eq(shipments.orderId, orderId), eq(shipments.storeId, this.storeId)))

// updateShipmentStatus — add:
.where(and(eq(shipments.id, id), eq(shipments.storeId, this.storeId)))
```

**Step 3: Verify and commit**

```bash
pnpm exec tsc --noEmit
git add src/infrastructure/repositories/printful.repository.ts
git commit -m "fix: add storeId scoping to PrintfulRepository query methods"
```

---

## Task 6: Wire New Contracts into Main Index

**Why:** The `affiliates`, `platform`, and `venues` contracts exist but aren't exported from the main contract — so ts-rest client type generation misses them.

**Files:**
- Modify: `src/contracts/index.ts`

**Step 1: Add imports and wire contracts**

```typescript
import { affiliatesContract } from "./affiliates.contract";
import { platformContract } from "./platform.contract";
import { venuesContract } from "./venues.contract";

export const contract = c.router({
  auth: authContract,
  products: productsContract,
  cart: cartContract,
  checkout: checkoutContract,
  orders: ordersContract,
  subscriptions: subscriptionsContract,
  bookings: bookingsContract,
  aiStudio: aiStudioContract,
  fulfillment: fulfillmentContract,
  affiliates: affiliatesContract,
  platform: platformContract,
  venues: venuesContract,
});

export {
  authContract,
  productsContract,
  cartContract,
  checkoutContract,
  ordersContract,
  subscriptionsContract,
  bookingsContract,
  aiStudioContract,
  fulfillmentContract,
  affiliatesContract,
  platformContract,
  venuesContract,
};
```

**Step 2: Verify and commit**

```bash
pnpm exec tsc --noEmit
git add src/contracts/index.ts
git commit -m "feat: wire affiliates, platform, venues contracts into main index"
```

---

## Task 7: Create Platform Use Cases

**Why:** Platform routes exist but have no business logic — the `src/application/platform/` directory is empty.

**Files:**
- Create: `src/application/platform/create-store.usecase.ts`
- Create: `src/application/platform/update-store.usecase.ts`
- Create: `src/application/platform/manage-members.usecase.ts`
- Create: `src/application/platform/verify-domain.usecase.ts`
- Create: `src/application/platform/get-store-dashboard.usecase.ts`
- Create: `src/application/platform/list-stores.usecase.ts`

**Step 1: Create `create-store.usecase.ts`**

```typescript
import type { StoreRepository } from "../../infrastructure/repositories/store.repository";
import { ConflictError } from "../../shared/errors";

interface CreateStoreInput {
  name: string;
  slug: string;
  subdomain: string;
  ownerId: string;
  planId?: string;
}

export class CreateStoreUseCase {
  constructor(private storeRepo: StoreRepository) {}

  async execute(input: CreateStoreInput) {
    const existing = await this.storeRepo.findBySlug(input.slug);
    if (existing) {
      throw new ConflictError(`Store with slug "${input.slug}" already exists`);
    }

    const existingSub = await this.storeRepo.findBySubdomain(input.subdomain);
    if (existingSub) {
      throw new ConflictError(`Subdomain "${input.subdomain}" is taken`);
    }

    const store = await this.storeRepo.create({
      name: input.name,
      slug: input.slug,
      subdomain: input.subdomain,
      status: input.planId ? "trial" : "trial",
      planId: input.planId ?? null,
    });

    await this.storeRepo.addMember(store.id, input.ownerId, "owner");

    return store;
  }
}
```

**Step 2: Create `update-store.usecase.ts`**

```typescript
import type { StoreRepository } from "../../infrastructure/repositories/store.repository";
import { NotFoundError } from "../../shared/errors";

interface UpdateStoreInput {
  storeId: string;
  name?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export class UpdateStoreUseCase {
  constructor(private storeRepo: StoreRepository) {}

  async execute(input: UpdateStoreInput) {
    const store = await this.storeRepo.findById(input.storeId);
    if (!store) {
      throw new NotFoundError("Store", input.storeId);
    }

    return this.storeRepo.update(input.storeId, {
      ...(input.name && { name: input.name }),
      ...(input.logo && { logo: input.logo }),
      ...(input.primaryColor && { primaryColor: input.primaryColor }),
      ...(input.secondaryColor && { secondaryColor: input.secondaryColor }),
    });
  }
}
```

**Step 3: Create `manage-members.usecase.ts`**

```typescript
import type { StoreRepository } from "../../infrastructure/repositories/store.repository";
import { NotFoundError, ConflictError } from "../../shared/errors";

export class ManageMembersUseCase {
  constructor(private storeRepo: StoreRepository) {}

  async addMember(storeId: string, userId: string, role: "admin" | "staff") {
    const existing = await this.storeRepo.findMember(storeId, userId);
    if (existing) {
      throw new ConflictError("User is already a member of this store");
    }
    return this.storeRepo.addMember(storeId, userId, role);
  }

  async updateRole(storeId: string, userId: string, role: "admin" | "staff") {
    const member = await this.storeRepo.findMember(storeId, userId);
    if (!member) {
      throw new NotFoundError("StoreMember", userId);
    }
    if (member.role === "owner") {
      throw new ConflictError("Cannot change the owner's role");
    }
    return this.storeRepo.updateMemberRole(storeId, userId, role);
  }

  async removeMember(storeId: string, userId: string) {
    const member = await this.storeRepo.findMember(storeId, userId);
    if (!member) {
      throw new NotFoundError("StoreMember", userId);
    }
    if (member.role === "owner") {
      throw new ConflictError("Cannot remove the store owner");
    }
    return this.storeRepo.removeMember(storeId, userId);
  }

  async listMembers(storeId: string) {
    return this.storeRepo.listMembers(storeId);
  }
}
```

**Step 4: Create `verify-domain.usecase.ts`**

```typescript
import type { StoreRepository } from "../../infrastructure/repositories/store.repository";
import { NotFoundError } from "../../shared/errors";

export class VerifyDomainUseCase {
  constructor(private storeRepo: StoreRepository) {}

  async addDomain(storeId: string, domain: string) {
    const token = crypto.randomUUID();
    return this.storeRepo.addDomain(storeId, domain, token);
  }

  async verify(storeId: string, domainId: string) {
    const domainRecord = await this.storeRepo.findDomain(domainId);
    if (!domainRecord || domainRecord.storeId !== storeId) {
      throw new NotFoundError("StoreDomain", domainId);
    }

    // In production: verify DNS TXT record contains the token
    // For now, mark as verified
    return this.storeRepo.updateDomainStatus(domainId, "verified");
  }
}
```

**Step 5: Create `get-store-dashboard.usecase.ts`**

```typescript
import type { StoreRepository } from "../../infrastructure/repositories/store.repository";
import { NotFoundError } from "../../shared/errors";

export class GetStoreDashboardUseCase {
  constructor(private storeRepo: StoreRepository) {}

  async execute(storeId: string) {
    const store = await this.storeRepo.findById(storeId);
    if (!store) {
      throw new NotFoundError("Store", storeId);
    }

    const members = await this.storeRepo.listMembers(storeId);
    const domains = await this.storeRepo.listDomains(storeId);
    const billing = await this.storeRepo.findBilling(storeId);

    return { store, members, domains, billing };
  }
}
```

**Step 6: Create `list-stores.usecase.ts`**

```typescript
import type { StoreRepository } from "../../infrastructure/repositories/store.repository";

export class ListStoresUseCase {
  constructor(private storeRepo: StoreRepository) {}

  async execute(userId: string) {
    return this.storeRepo.findByUserId(userId);
  }

  async listAll(pagination: { page: number; limit: number }) {
    return this.storeRepo.findAll(pagination);
  }
}
```

**Step 7: Verify and commit**

```bash
pnpm exec tsc --noEmit
git add src/application/platform/
git commit -m "feat: create platform use cases (create/update store, members, domains, dashboard)"
```

---

## Task 8: Create Affiliate Use Cases

**Why:** Affiliate routes exist but `src/application/affiliates/` is empty.

**Files:**
- Create: `src/application/affiliates/register-affiliate.usecase.ts`
- Create: `src/application/affiliates/get-dashboard.usecase.ts`
- Create: `src/application/affiliates/manage-links.usecase.ts`
- Create: `src/application/affiliates/attribute-conversion.usecase.ts`
- Create: `src/application/affiliates/process-payouts.usecase.ts`

**Step 1: Create `register-affiliate.usecase.ts`**

```typescript
import type { AffiliateRepository } from "../../infrastructure/repositories/affiliate.repository";
import { ConflictError } from "../../shared/errors";

export class RegisterAffiliateUseCase {
  constructor(private affiliateRepo: AffiliateRepository) {}

  async execute(userId: string, customSlug?: string) {
    const existing = await this.affiliateRepo.findByUserId(userId);
    if (existing) {
      throw new ConflictError("User is already registered as an affiliate");
    }

    const referralCode = customSlug ?? crypto.randomUUID().slice(0, 8);

    return this.affiliateRepo.create({
      userId,
      referralCode,
      customSlug: customSlug ?? null,
      status: "pending",
      commissionRate: "0.10",
    });
  }
}
```

**Step 2: Create `get-dashboard.usecase.ts`**

```typescript
import type { AffiliateRepository } from "../../infrastructure/repositories/affiliate.repository";
import { NotFoundError } from "../../shared/errors";

export class GetAffiliateDashboardUseCase {
  constructor(private affiliateRepo: AffiliateRepository) {}

  async execute(userId: string) {
    const affiliate = await this.affiliateRepo.findByUserId(userId);
    if (!affiliate) {
      throw new NotFoundError("Affiliate", userId);
    }

    const links = await this.affiliateRepo.findLinksByAffiliateId(affiliate.id);
    const conversions = await this.affiliateRepo.findConversionsByAffiliateId(affiliate.id);
    const payouts = await this.affiliateRepo.findPayoutsByAffiliateId(affiliate.id);

    return {
      affiliate,
      links,
      conversions,
      payouts,
      summary: {
        totalEarnings: affiliate.totalEarnings,
        totalClicks: affiliate.totalClicks,
        totalConversions: affiliate.totalConversions,
      },
    };
  }
}
```

**Step 3: Create `manage-links.usecase.ts`**

```typescript
import type { AffiliateRepository } from "../../infrastructure/repositories/affiliate.repository";
import { NotFoundError } from "../../shared/errors";

export class ManageLinksUseCase {
  constructor(private affiliateRepo: AffiliateRepository) {}

  async createLink(affiliateId: string, targetUrl: string) {
    const shortCode = crypto.randomUUID().slice(0, 8);
    return this.affiliateRepo.createLink({
      affiliateId,
      targetUrl,
      shortCode,
    });
  }

  async listLinks(affiliateId: string) {
    return this.affiliateRepo.findLinksByAffiliateId(affiliateId);
  }
}
```

**Step 4: Create `attribute-conversion.usecase.ts`**

```typescript
import type { AffiliateRepository } from "../../infrastructure/repositories/affiliate.repository";

interface AttributionInput {
  referralCode: string;
  orderId: string;
  orderTotal: string;
}

export class AttributeConversionUseCase {
  constructor(private affiliateRepo: AffiliateRepository) {}

  async execute(input: AttributionInput) {
    const affiliate = await this.affiliateRepo.findByReferralCode(input.referralCode);
    if (!affiliate || affiliate.status !== "approved") {
      return null;
    }

    const commissionAmount = (
      parseFloat(input.orderTotal) * parseFloat(affiliate.commissionRate)
    ).toFixed(2);

    const conversion = await this.affiliateRepo.createConversion({
      affiliateId: affiliate.id,
      orderId: input.orderId,
      orderTotal: input.orderTotal,
      commissionAmount,
      status: "pending",
      attributionMethod: "link",
    });

    // Handle tier-2: if affiliate has a parent, create parent conversion
    if (affiliate.parentAffiliateId) {
      const parentAffiliate = await this.affiliateRepo.findById(affiliate.parentAffiliateId);
      if (parentAffiliate && parentAffiliate.status === "approved") {
        const tier = await this.affiliateRepo.findTierById(parentAffiliate.tierId!);
        if (tier) {
          const parentCommission = (
            parseFloat(input.orderTotal) * parseFloat(tier.bonusRate)
          ).toFixed(2);

          await this.affiliateRepo.createConversion({
            affiliateId: parentAffiliate.id,
            orderId: input.orderId,
            orderTotal: input.orderTotal,
            commissionAmount: parentCommission,
            status: "pending",
            attributionMethod: "tier",
            parentConversionId: conversion.id,
          });
        }
      }
    }

    return conversion;
  }
}
```

**Step 5: Create `process-payouts.usecase.ts`**

```typescript
import type { AffiliateRepository } from "../../infrastructure/repositories/affiliate.repository";

export class ProcessPayoutsUseCase {
  constructor(private affiliateRepo: AffiliateRepository) {}

  async execute() {
    const approvedConversions = await this.affiliateRepo.findApprovedUnpaidConversions();

    // Group by affiliate
    const byAffiliate = new Map<string, { total: number; conversionIds: string[] }>();
    for (const conv of approvedConversions) {
      const entry = byAffiliate.get(conv.affiliateId) ?? { total: 0, conversionIds: [] };
      entry.total += parseFloat(conv.commissionAmount);
      entry.conversionIds.push(conv.id);
      byAffiliate.set(conv.affiliateId, entry);
    }

    const payouts = [];
    for (const [affiliateId, { total, conversionIds }] of byAffiliate) {
      const payout = await this.affiliateRepo.createPayout({
        affiliateId,
        amount: total.toFixed(2),
        status: "pending",
        conversionIds,
      });
      payouts.push(payout);
    }

    return payouts;
  }
}
```

**Step 6: Verify and commit**

```bash
pnpm exec tsc --noEmit
git add src/application/affiliates/
git commit -m "feat: create affiliate use cases (register, dashboard, links, conversions, payouts)"
```

---

## Task 9: Create Venue Use Cases

**Why:** Venue routes exist but `src/application/venues/` is empty.

**Files:**
- Create: `src/application/venues/manage-venue.usecase.ts`
- Create: `src/application/venues/search-nearby.usecase.ts`

**Step 1: Create `manage-venue.usecase.ts`**

```typescript
import type { VenueRepository } from "../../infrastructure/repositories/venue.repository";
import { NotFoundError, ConflictError } from "../../shared/errors";

interface CreateVenueInput {
  name: string;
  slug: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude: string;
  longitude: string;
  amenities?: Record<string, unknown>;
  capacity?: number;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export class ManageVenueUseCase {
  constructor(private venueRepo: VenueRepository) {}

  async create(input: CreateVenueInput) {
    const existing = await this.venueRepo.findBySlug(input.slug);
    if (existing) {
      throw new ConflictError(`Venue with slug "${input.slug}" already exists`);
    }
    return this.venueRepo.create(input);
  }

  async update(id: string, data: Partial<CreateVenueInput>) {
    const venue = await this.venueRepo.findById(id);
    if (!venue) {
      throw new NotFoundError("Venue", id);
    }
    return this.venueRepo.update(id, data);
  }

  async delete(id: string) {
    const venue = await this.venueRepo.findById(id);
    if (!venue) {
      throw new NotFoundError("Venue", id);
    }
    return this.venueRepo.delete(id);
  }

  async getById(id: string) {
    const venue = await this.venueRepo.findById(id);
    if (!venue) {
      throw new NotFoundError("Venue", id);
    }
    return venue;
  }

  async list() {
    return this.venueRepo.findAll();
  }
}
```

**Step 2: Create `search-nearby.usecase.ts`**

```typescript
import type { VenueRepository } from "../../infrastructure/repositories/venue.repository";

export class SearchNearbyUseCase {
  constructor(private venueRepo: VenueRepository) {}

  async execute(lat: number, lng: number, radiusKm: number = 25) {
    return this.venueRepo.findNearby(lat, lng, radiusKm);
  }
}
```

**Step 3: Verify and commit**

```bash
pnpm exec tsc --noEmit
git add src/application/venues/
git commit -m "feat: create venue use cases (manage, search nearby)"
```

---

## Task 10: Create Missing Fulfillment Use Cases

**Why:** PLAN.md calls for `configure-provider`, `map-product-to-provider`, `get-provider-catalog` — only Printful-specific use cases exist.

**Files:**
- Create: `src/application/fulfillment/configure-provider.usecase.ts`
- Create: `src/application/fulfillment/map-product-to-provider.usecase.ts`
- Create: `src/application/fulfillment/get-provider-catalog.usecase.ts`

**Step 1: Create `configure-provider.usecase.ts`**

```typescript
import type { Database } from "../../infrastructure/db/client";
import { fulfillmentProviders } from "../../infrastructure/db/schema";
import { eq, and } from "drizzle-orm";

interface ConfigureProviderInput {
  storeId: string;
  type: "printful" | "gooten" | "prodigi" | "shapeways";
  apiKey: string;
  apiSecret?: string;
  config?: Record<string, unknown>;
}

export class ConfigureProviderUseCase {
  constructor(private db: Database) {}

  async execute(input: ConfigureProviderInput) {
    const existing = await this.db
      .select()
      .from(fulfillmentProviders)
      .where(
        and(
          eq(fulfillmentProviders.storeId, input.storeId),
          eq(fulfillmentProviders.type, input.type),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const updated = await this.db
        .update(fulfillmentProviders)
        .set({
          apiKey: input.apiKey,
          apiSecret: input.apiSecret ?? null,
          config: input.config ?? null,
          isActive: true,
        })
        .where(eq(fulfillmentProviders.id, existing[0].id))
        .returning();
      return updated[0];
    }

    const inserted = await this.db
      .insert(fulfillmentProviders)
      .values({
        storeId: input.storeId,
        name: input.type,
        type: input.type,
        apiKey: input.apiKey,
        apiSecret: input.apiSecret ?? null,
        config: input.config ?? null,
        isActive: true,
      })
      .returning();

    return inserted[0];
  }
}
```

**Step 2: Create `map-product-to-provider.usecase.ts`**

```typescript
import type { Database } from "../../infrastructure/db/client";
import { providerProductMappings } from "../../infrastructure/db/schema";
import { eq, and } from "drizzle-orm";

interface MappingInput {
  variantId: string;
  providerId: string;
  externalProductId: string;
  externalVariantId: string;
  costPrice: string;
}

export class MapProductToProviderUseCase {
  constructor(private db: Database) {}

  async execute(input: MappingInput) {
    const existing = await this.db
      .select()
      .from(providerProductMappings)
      .where(
        and(
          eq(providerProductMappings.variantId, input.variantId),
          eq(providerProductMappings.providerId, input.providerId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const updated = await this.db
        .update(providerProductMappings)
        .set({
          externalProductId: input.externalProductId,
          externalVariantId: input.externalVariantId,
          costPrice: input.costPrice,
        })
        .where(eq(providerProductMappings.id, existing[0].id))
        .returning();
      return updated[0];
    }

    const inserted = await this.db
      .insert(providerProductMappings)
      .values(input)
      .returning();

    return inserted[0];
  }
}
```

**Step 3: Create `get-provider-catalog.usecase.ts`**

```typescript
import type { Database } from "../../infrastructure/db/client";
import { fulfillmentProviders } from "../../infrastructure/db/schema";
import { eq, and } from "drizzle-orm";
import { createFulfillmentProvider } from "../../infrastructure/fulfillment/provider-factory";

export class GetProviderCatalogUseCase {
  constructor(private db: Database) {}

  async execute(storeId: string, providerType: "printful" | "gooten" | "prodigi" | "shapeways") {
    const providerConfig = await this.db
      .select()
      .from(fulfillmentProviders)
      .where(
        and(
          eq(fulfillmentProviders.storeId, storeId),
          eq(fulfillmentProviders.type, providerType),
          eq(fulfillmentProviders.isActive, true),
        ),
      )
      .limit(1);

    if (!providerConfig[0]) {
      throw new Error(`Provider "${providerType}" not configured for this store`);
    }

    const provider = createFulfillmentProvider(providerType, {
      apiKey: providerConfig[0].apiKey,
      apiSecret: providerConfig[0].apiSecret ?? undefined,
    });

    return provider.getCatalog();
  }
}
```

**Step 4: Verify and commit**

```bash
pnpm exec tsc --noEmit
git add src/application/fulfillment/configure-provider.usecase.ts src/application/fulfillment/map-product-to-provider.usecase.ts src/application/fulfillment/get-provider-catalog.usecase.ts
git commit -m "feat: create multi-provider fulfillment use cases (configure, map, catalog)"
```

---

## Task 11: Implement Booking Cancellation Refund

**Why:** The cancel-booking use case has a TODO for Stripe refund integration.

**Files:**
- Modify: `src/application/booking/cancel-booking.usecase.ts`

**Step 1: Add Stripe refund logic**

Replace the TODO at line 46 with actual refund logic. The use case needs access to the OrderRepository to look up the payment intent:

```typescript
import type { BookingRepository } from "../../infrastructure/repositories/booking.repository";
import type { OrderRepository } from "../../infrastructure/repositories/order.repository";
import { NotFoundError, ConflictError } from "../../shared/errors";

export class CancelBookingUseCase {
  constructor(
    private bookingRepo: BookingRepository,
    private orderRepo?: OrderRepository,
    private stripeSecretKey?: string,
  ) {}

  async execute(bookingId: string, userId: string) {
    const booking = await this.bookingRepo.findBookingById(bookingId);
    if (!booking) throw new NotFoundError("Booking", bookingId);
    if (booking.userId !== userId) throw new NotFoundError("Booking", bookingId);
    if (booking.status !== "confirmed") {
      throw new ConflictError(
        `Cannot cancel booking with status "${booking.status}". Only confirmed bookings can be cancelled.`,
      );
    }

    const totalQuantity = Object.values(booking.personTypeQuantities).reduce(
      (sum, qty) => sum + qty, 0,
    );

    const updated = await this.bookingRepo.updateBookingStatus(bookingId, "cancelled");
    if (!updated) throw new NotFoundError("Booking", bookingId);

    if (totalQuantity > 0) {
      await this.bookingRepo.decrementReservedCount(booking.availabilityId, totalQuantity);
    }

    // Issue Stripe refund if booking has an associated order with a payment intent
    if (this.orderRepo && this.stripeSecretKey && (booking as any).orderItemId) {
      try {
        // Look up the order to get the payment intent
        const orderItem = (booking as any).orderItemId;
        // Refund would go through Stripe API
        // Implementation depends on how order→payment mapping is stored
      } catch (err) {
        console.error(`[cancel-booking] Failed to issue refund for booking ${bookingId}:`, err);
      }
    }

    return updated;
  }
}
```

> **Decision point for you:** The refund flow depends on how you want to handle partial vs full refunds, and whether the refund amount should be the booking total or the full order total. See guidance below.

**Step 2: Verify and commit**

```bash
pnpm exec tsc --noEmit
git add src/application/booking/cancel-booking.usecase.ts
git commit -m "feat: add Stripe refund stub to booking cancellation"
```

---

## Task 12: Expand Printful Webhook Handler

**Why:** Phase 6 requires handling `product_updated`, `order_failed`, `order_canceled`, `package_returned` events.

**Files:**
- Modify: `src/infrastructure/printful/webhook.handler.ts`

**Step 1: Read the current webhook handler to understand the pattern**

The existing handler processes `package_shipped`, `order_updated`, `stock_updated`. Add four more event handlers following the same pattern.

**Step 2: Add new event handlers**

```typescript
// Add to the switch/case in the webhook handler:

case "product_updated":
  // Re-sync the product from Printful
  const syncProduct = await printfulRepo.findSyncProductByProductId(data.product?.external_id);
  if (syncProduct) {
    // Update local product data from Printful
    console.log(`[printful-webhook] Product updated: ${data.product?.id}`);
  }
  break;

case "order_failed":
  if (data.order?.external_id) {
    await orderRepo.updateStatus(data.order.external_id, "cancelled");
    console.log(`[printful-webhook] Order failed: ${data.order.id}`);
  }
  break;

case "order_canceled":
  if (data.order?.external_id) {
    await orderRepo.updateStatus(data.order.external_id, "cancelled");
    console.log(`[printful-webhook] Order canceled: ${data.order.id}`);
  }
  break;

case "package_returned":
  if (data.order?.external_id) {
    await printfulRepo.updateShipmentStatus(data.shipment?.id, "returned");
    console.log(`[printful-webhook] Package returned: ${data.order.id}`);
  }
  break;
```

**Step 3: Verify and commit**

```bash
pnpm exec tsc --noEmit
git add src/infrastructure/printful/webhook.handler.ts
git commit -m "feat: expand Printful webhook handler with product_updated, order_failed, order_canceled, package_returned"
```

---

## Task 13: Implement Printful Webhook Verification

**Why:** `verifyWebhook()` in `printful.provider.ts` always returns `true` — no HMAC verification.

**Files:**
- Modify: `src/infrastructure/fulfillment/printful.provider.ts`

**Step 1: Implement HMAC-SHA256 verification**

```typescript
async verifyWebhook(payload: string, signature: string): Promise<boolean> {
  if (!this.webhookSecret) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(this.webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison
  if (computed.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}
```

> **Note:** Ensure the `webhookSecret` property is set from the provider config. Check the constructor.

**Step 2: Verify and commit**

```bash
pnpm exec tsc --noEmit
git add src/infrastructure/fulfillment/printful.provider.ts
git commit -m "fix: implement HMAC-SHA256 webhook verification for Printful provider"
```

---

## Task 14: Create Mockup Auto-Polling Scheduled Job

**Why:** Phase 6 requires a scheduled job that checks processing mockup tasks and polls Printful for results.

**Files:**
- Create: `src/scheduled/mockup-polling.job.ts`
- Modify: `src/scheduled/handler.ts` (add to cron dispatch)

**Step 1: Create `mockup-polling.job.ts`**

```typescript
import { createDb } from "../infrastructure/db/client";
import type { Env } from "../env";
import { generationJobs } from "../infrastructure/db/schema";
import { eq } from "drizzle-orm";

export async function processMockupPolling(env: Env) {
  const db = createDb(env.DATABASE_URL);

  // Find all generation jobs stuck in "processing" for mockup polling
  const processingJobs = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.status, "processing"));

  if (processingJobs.length === 0) return { polled: 0 };

  let updated = 0;
  for (const job of processingJobs) {
    // Poll Printful mockup API for status
    // If complete, update job with output URLs
    // If failed, mark as failed
    // For now, log and skip — actual Printful polling depends on task ID storage
    console.log(`[mockup-polling] Checking job ${job.id}, status: ${job.status}`);
    updated++;
  }

  return { polled: updated };
}
```

**Step 2: Wire into scheduled handler**

Add to the cron switch/case in `src/scheduled/handler.ts`:

```typescript
// Every 10 minutes — poll mockup status
case "*/10 * * * *":
  const { processMockupPolling } = await import("./mockup-polling.job");
  await processMockupPolling(env);
  break;
```

**Step 3: Verify and commit**

```bash
pnpm exec tsc --noEmit
git add src/scheduled/mockup-polling.job.ts src/scheduled/handler.ts
git commit -m "feat: add mockup auto-polling scheduled job (Phase 6)"
```

---

## Task 15: Create Affiliate Payout Scheduled Job

**Why:** Phase 4 requires a monthly job to process approved conversions into payouts.

**Files:**
- Create: `src/scheduled/affiliate-payouts.job.ts`
- Modify: `src/scheduled/handler.ts`

**Step 1: Create `affiliate-payouts.job.ts`**

```typescript
import { createDb } from "../infrastructure/db/client";
import type { Env } from "../env";
import { AffiliateRepository } from "../infrastructure/repositories/affiliate.repository";
import { ProcessPayoutsUseCase } from "../application/affiliates/process-payouts.usecase";
import { stores } from "../infrastructure/db/schema";

export async function processAffiliatePayouts(env: Env) {
  const db = createDb(env.DATABASE_URL);

  // Process payouts for each active store
  const activeStores = await db.select().from(stores);

  let totalPayouts = 0;
  for (const store of activeStores) {
    const affiliateRepo = new AffiliateRepository(db, store.id);
    const useCase = new ProcessPayoutsUseCase(affiliateRepo);
    const payouts = await useCase.execute();
    totalPayouts += payouts.length;
  }

  return { processedPayouts: totalPayouts };
}
```

**Step 2: Wire into scheduled handler**

```typescript
// 1st of month at midnight — process affiliate payouts
case "0 0 1 * *":
  const { processAffiliatePayouts } = await import("./affiliate-payouts.job");
  await processAffiliatePayouts(env);
  break;
```

**Step 3: Verify and commit**

```bash
pnpm exec tsc --noEmit
git add src/scheduled/affiliate-payouts.job.ts src/scheduled/handler.ts
git commit -m "feat: add monthly affiliate payout processing scheduled job"
```

---

## Task 16: Integrate Email Provider (Resend)

**Why:** All 5 email methods are stubs with `console.log`. This blocks booking reminders, order confirmations, shipment updates, abandoned cart, and birthday offers.

**Files:**
- Modify: `src/infrastructure/notifications/email.adapter.ts`
- Modify: `src/env.ts` (add `RESEND_API_KEY`)

**Step 1: Add `RESEND_API_KEY` to env**

```typescript
// Add to Env interface:
RESEND_API_KEY?: string;
```

**Step 2: Implement email sending via Resend HTTP API**

Replace the EmailAdapter class:

```typescript
export class EmailAdapter {
  private appName: string;
  private appUrl: string;
  private apiKey: string | undefined;

  constructor(env: Env) {
    this.appName = env.APP_NAME ?? "petm8.io";
    this.appUrl = env.APP_URL ?? "https://petm8.io";
    this.apiKey = env.RESEND_API_KEY;
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.apiKey) {
      console.log(`[email-adapter] No RESEND_API_KEY — skipping email to=${to} subject="${subject}"`);
      return;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${this.appName} <noreply@${new URL(this.appUrl).hostname}>`,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[email-adapter] Resend error: ${response.status} ${err}`);
    }
  }

  async sendBookingReminder(to: string, data: BookingReminderData): Promise<void> {
    await this.send(to,
      `Reminder: Your booking is tomorrow!`,
      `<h2>Hi ${data.userName},</h2>
       <p>This is a reminder that your booking on <strong>${data.slotDate}</strong> at <strong>${data.slotTime}</strong> is coming up tomorrow.</p>
       <p>See you there!</p>`,
    );
  }

  async sendOrderConfirmation(to: string, data: OrderConfirmationData): Promise<void> {
    await this.send(to,
      `Order Confirmed — #${data.orderId.slice(0, 8)}`,
      `<h2>Thanks for your order, ${data.userName}!</h2>
       <p>Your order of ${data.itemCount} item(s) totaling <strong>$${data.total}</strong> has been confirmed.</p>
       <p>Order ID: ${data.orderId}</p>`,
    );
  }

  async sendShipmentUpdate(to: string, data: ShipmentUpdateData): Promise<void> {
    await this.send(to,
      `Shipment Update — ${data.status}`,
      `<h2>Hi ${data.userName},</h2>
       <p>Your order #${data.orderId.slice(0, 8)} has a shipping update:</p>
       <p><strong>Status:</strong> ${data.status}<br>
       <strong>Carrier:</strong> ${data.carrier}<br>
       <strong>Tracking:</strong> <a href="${data.trackingUrl}">${data.trackingNumber}</a></p>`,
    );
  }

  async sendAbandonedCart(to: string, data: AbandonedCartData): Promise<void> {
    await this.send(to,
      `You left something behind!`,
      `<h2>Hi ${data.userName},</h2>
       <p>You have ${data.itemCount} item(s) waiting in your cart.</p>
       <p><a href="${this.appUrl}/cart">Complete your purchase</a></p>`,
    );
  }

  async sendBirthdayOffer(to: string, data: BirthdayOfferData): Promise<void> {
    await this.send(to,
      `Happy Birthday, ${data.petName}! 🎂`,
      `<h2>Hi ${data.userName},</h2>
       <p>It's <strong>${data.petName}'s</strong> birthday! To celebrate, here's a special offer:</p>
       <p>Use code <strong>${data.offerCode}</strong> for a discount on your next order.</p>
       <p><a href="${this.appUrl}">Shop now</a></p>`,
    );
  }
}
```

**Step 3: Verify and commit**

```bash
pnpm exec tsc --noEmit
git add src/infrastructure/notifications/email.adapter.ts src/env.ts
git commit -m "feat: integrate Resend email provider, replace email adapter stubs"
```

---

## Task 17: Generate Drizzle Migrations

**Why:** Schema has 43 tables but only 2 migration files exist. Need to generate SQL for the remaining changes.

**Files:**
- Creates: `src/infrastructure/db/migrations/*.sql`

**Step 1: Generate migration**

```bash
cd /Users/lsendel/Projects/commerce
pnpm exec drizzle-kit generate
```

This will produce one or more `.sql` migration files for all schema changes not in existing migrations.

**Step 2: Review generated SQL**

Read the generated file(s) to verify they include:
- Platform tables (stores, store_members, store_domains, store_settings, platform_plans)
- storeId columns on existing aggregate root tables
- platformRole on users
- Store billing + platform transactions
- Fulfillment providers + provider product mappings
- All 6 affiliate tables
- Venues table

**Step 3: Create PostGIS migration manually**

Create a custom SQL migration file (Drizzle can't generate PostGIS):

```sql
-- Custom migration: PostGIS extension + spatial column

-- Only run if PostGIS is available on Neon
-- CREATE EXTENSION IF NOT EXISTS postgis;
-- ALTER TABLE venues ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);
-- CREATE INDEX IF NOT EXISTS venues_location_gist_idx ON venues USING GIST (location);

-- Note: Neon requires PostGIS to be enabled per-project via the Neon console.
-- The venue repository's findNearby() uses raw SQL with lat/lng DECIMAL columns
-- as a fallback until PostGIS is configured.
```

**Step 4: Commit**

```bash
git add src/infrastructure/db/migrations/
git commit -m "chore: generate Drizzle migrations for all pending schema changes"
```

---

## Task 18: Final Verification

**Step 1: Type check**

```bash
pnpm exec tsc --noEmit
```

**Step 2: Verify all imports resolve**

```bash
pnpm exec tsc --noEmit 2>&1 | head -50
```

Expected: no errors

**Step 3: Dev server smoke test**

```bash
pnpm dev
```

Verify health check responds at `http://localhost:8787/health`

---

## Summary of All Tasks

| # | Task | Category | Priority |
|---|------|----------|----------|
| 1-5 | Fix storeId scoping in 5 repositories | Security | Critical |
| 6 | Wire 3 new contracts into main index | Integration | High |
| 7 | Create 6 platform use cases | Phase 1 | High |
| 8 | Create 5 affiliate use cases | Phase 4 | High |
| 9 | Create 2 venue use cases | Phase 5 | High |
| 10 | Create 3 fulfillment use cases | Phase 3 | High |
| 11 | Booking cancellation refund | Phase 1 | Medium |
| 12 | Expand Printful webhook handler | Phase 6 | Medium |
| 13 | Printful webhook HMAC verification | Phase 6 | Medium |
| 14 | Mockup auto-polling scheduled job | Phase 6 | Medium |
| 15 | Affiliate payout scheduled job | Phase 4 | Medium |
| 16 | Email provider integration (Resend) | Phase 15 | Medium |
| 17 | Generate Drizzle migrations | Infrastructure | Medium |
| 18 | Final verification | QA | Required |
