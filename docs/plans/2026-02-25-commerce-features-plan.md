# Commerce Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 9 commerce features (promotions, inventory reservations, shipping, tax, CSV export, digital downloads, reviews, analytics, multi-currency) following existing DDD patterns.

**Architecture:** Each feature follows the existing per-request DI pattern: domain entity (pure TS interface) → repository (class with db+storeId) → use case (class with execute()) → route (Hono handler) → contract (ts-rest + zod). New bounded contexts for Promotions, Tax, Analytics, Currency; extensions to Catalog, Checkout, Fulfillment, Platform.

**Tech Stack:** Hono, Drizzle ORM, Neon PostgreSQL, ts-rest, Zod, Stripe, Cloudflare Workers/R2, ExchangeRate-API

**Verification:** Run `pnpm tsc --noEmit` after each task to confirm type safety. No test framework exists yet — type checking is the primary verification.

**Design doc:** `docs/plans/2026-02-25-commerce-features-design.md`

---

## Slice Overview (10 slices, 68 tasks)

| Slice | Feature | Tasks | Dependencies |
|-------|---------|-------|-------------|
| 1 | Schema & Enums (foundation) | 1-5 | None |
| 2 | Inventory Reservations | 6-12 | Slice 1 |
| 3 | Promotions Engine | 13-26 | Slice 1 |
| 4 | Shipping Zones & Rates | 27-34 | Slice 1 |
| 5 | Tax Engine | 35-42 | Slice 1 |
| 6 | Product Reviews & Moderation | 43-48 | Slice 1 |
| 7 | Products CSV Export | 49-51 | None |
| 8 | Digital Downloads | 52-57 | Slice 1 |
| 9 | Analytics & Events | 58-64 | Slice 1 |
| 10 | Multi-Currency | 65-68 | Slice 1 |

**Parallelism:** Slices 2-10 are independent of each other — only Slice 1 is a hard prerequisite. After Slice 1, all remaining slices can be worked in parallel.

**Final integration:** After all slices complete, modify `create-checkout.usecase.ts` and `add-to-cart.usecase.ts` to orchestrate the new features.

---

## Slice 1: Schema & Enums (Foundation)

### Task 1: Add new enums to schema

**Files:**
- Modify: `src/infrastructure/db/schema.ts` (after line 168, before Platform Context)

**Step 1:** Add new enums after the existing `integrationStatusEnum`:

```typescript
// ─── New Enums for Commerce Features ─────────────────────────────────────────

export const promotionTypeEnum = pgEnum("promotion_type", [
  "coupon",
  "automatic",
  "flash_sale",
]);

export const promotionStatusEnum = pgEnum("promotion_status", [
  "active",
  "scheduled",
  "expired",
  "disabled",
]);

export const promotionStrategyEnum = pgEnum("promotion_strategy", [
  "percentage_off",
  "fixed_amount",
  "free_shipping",
  "bogo",
  "buy_x_get_y",
  "tiered",
  "bundle",
]);

export const eligibilityTypeEnum = pgEnum("eligibility_type", [
  "include",
  "exclude",
]);

export const shippingRateTypeEnum = pgEnum("shipping_rate_type", [
  "flat",
  "weight_based",
  "price_based",
  "carrier_calculated",
]);

export const carrierEnum = pgEnum("carrier", ["usps", "fedex", "ups"]);

export const taxTypeEnum = pgEnum("tax_type", ["sales_tax", "vat", "gst"]);

export const taxAppliesToEnum = pgEnum("tax_applies_to", [
  "all",
  "physical",
  "digital",
  "shipping",
]);

export const reservationStatusEnum = pgEnum("reservation_status", [
  "held",
  "released",
  "converted",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "approved",
  "rejected",
  "flagged",
]);
```

**Step 2:** Extend `integrationProviderEnum` (line 153) to include new providers:

```typescript
export const integrationProviderEnum = pgEnum("integration_provider", [
  "stripe",
  "printful",
  "gemini",
  "resend",
  "gooten",
  "prodigi",
  "shapeways",
  "taxjar",
  "avalara",
  "usps",
  "fedex",
  "ups",
  "exchangerate_api",
  "segment",
  "mixpanel",
]);
```

**Step 3:** Run `pnpm tsc --noEmit` — expect PASS

**Step 4:** Commit:
```bash
git add src/infrastructure/db/schema.ts
git commit -m "feat: add enums for promotions, shipping, tax, inventory, reviews"
```

---

### Task 2: Add Promotions tables to schema

**Files:**
- Modify: `src/infrastructure/db/schema.ts` (add new section after Venue Context)

**Step 1:** Add promotions tables:

```typescript
// ─── Promotions Context ─────────────────────────────────────────────────────

export const promotions = pgTable(
  "promotions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    name: text("name").notNull(),
    description: text("description"),
    type: promotionTypeEnum("type").notNull(),
    status: promotionStatusEnum("status").default("active"),
    priority: integer("priority").default(0),
    stackable: boolean("stackable").default(false),
    strategyType: promotionStrategyEnum("strategy_type").notNull(),
    strategyParams: jsonb("strategy_params").default({}),
    conditions: jsonb("conditions").default({}),
    startsAt: timestamp("starts_at"),
    endsAt: timestamp("ends_at"),
    usageLimit: integer("usage_limit"),
    usageCount: integer("usage_count").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    storeStatusIdx: index("promotions_store_status_idx").on(
      table.storeId,
      table.status,
    ),
  }),
);

export const promotionsRelations = relations(promotions, ({ one, many }) => ({
  store: one(stores, {
    fields: [promotions.storeId],
    references: [stores.id],
  }),
  couponCodes: many(couponCodes),
  redemptions: many(promotionRedemptions),
  eligibility: many(promotionProductEligibility),
}));

export const couponCodes = pgTable(
  "coupon_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    promotionId: uuid("promotion_id")
      .notNull()
      .references(() => promotions.id),
    code: text("code").notNull(),
    maxRedemptions: integer("max_redemptions"),
    redemptionCount: integer("redemption_count").default(0),
    singleUsePerCustomer: boolean("single_use_per_customer").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    codeIdx: uniqueIndex("coupon_codes_promotion_code_idx").on(
      table.promotionId,
      table.code,
    ),
  }),
);

export const couponCodesRelations = relations(couponCodes, ({ one }) => ({
  promotion: one(promotions, {
    fields: [couponCodes.promotionId],
    references: [promotions.id],
  }),
}));

export const promotionRedemptions = pgTable("promotion_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  promotionId: uuid("promotion_id")
    .notNull()
    .references(() => promotions.id),
  couponCodeId: uuid("coupon_code_id").references(() => couponCodes.id),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => users.id),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  lineItemsAffected: jsonb("line_items_affected"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const promotionRedemptionsRelations = relations(
  promotionRedemptions,
  ({ one }) => ({
    promotion: one(promotions, {
      fields: [promotionRedemptions.promotionId],
      references: [promotions.id],
    }),
    couponCode: one(couponCodes, {
      fields: [promotionRedemptions.couponCodeId],
      references: [couponCodes.id],
    }),
    order: one(orders, {
      fields: [promotionRedemptions.orderId],
      references: [orders.id],
    }),
    customer: one(users, {
      fields: [promotionRedemptions.customerId],
      references: [users.id],
    }),
  }),
);

export const customerSegments = pgTable("customer_segments", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  name: text("name").notNull(),
  description: text("description"),
  rules: jsonb("rules").default({}),
  memberCount: integer("member_count").default(0),
  lastRefreshedAt: timestamp("last_refreshed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customerSegmentsRelations = relations(
  customerSegments,
  ({ one, many }) => ({
    store: one(stores, {
      fields: [customerSegments.storeId],
      references: [stores.id],
    }),
    memberships: many(customerSegmentMemberships),
  }),
);

export const customerSegmentMemberships = pgTable(
  "customer_segment_memberships",
  {
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id),
    segmentId: uuid("segment_id")
      .notNull()
      .references(() => customerSegments.id),
    addedAt: timestamp("added_at").defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.customerId, table.segmentId] }),
  }),
);

export const customerSegmentMembershipsRelations = relations(
  customerSegmentMemberships,
  ({ one }) => ({
    customer: one(users, {
      fields: [customerSegmentMemberships.customerId],
      references: [users.id],
    }),
    segment: one(customerSegments, {
      fields: [customerSegmentMemberships.segmentId],
      references: [customerSegments.id],
    }),
  }),
);

export const promotionProductEligibility = pgTable(
  "promotion_product_eligibility",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    promotionId: uuid("promotion_id")
      .notNull()
      .references(() => promotions.id),
    productId: uuid("product_id").references(() => products.id),
    collectionId: uuid("collection_id").references(() => collections.id),
    type: eligibilityTypeEnum("type").notNull(),
  },
);

export const promotionProductEligibilityRelations = relations(
  promotionProductEligibility,
  ({ one }) => ({
    promotion: one(promotions, {
      fields: [promotionProductEligibility.promotionId],
      references: [promotions.id],
    }),
    product: one(products, {
      fields: [promotionProductEligibility.productId],
      references: [products.id],
    }),
    collection: one(collections, {
      fields: [promotionProductEligibility.collectionId],
      references: [collections.id],
    }),
  }),
);
```

**Step 2:** Run `pnpm tsc --noEmit` — expect PASS

**Step 3:** Commit:
```bash
git add src/infrastructure/db/schema.ts
git commit -m "feat: add promotions schema tables (promotions, coupons, segments, eligibility)"
```

---

### Task 3: Add Shipping, Tax, and Inventory tables to schema

**Files:**
- Modify: `src/infrastructure/db/schema.ts`

**Step 1:** Add shipping tables:

```typescript
// ─── Shipping Context ───────────────────────────────────────────────────────

export const shippingZones = pgTable("shipping_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  name: text("name").notNull(),
  countries: jsonb("countries").default([]),
  regions: jsonb("regions").default([]),
  postalCodeRanges: jsonb("postal_code_ranges").default([]),
  isRestOfWorld: boolean("is_rest_of_world").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shippingZonesRelations = relations(
  shippingZones,
  ({ one, many }) => ({
    store: one(stores, {
      fields: [shippingZones.storeId],
      references: [stores.id],
    }),
    rates: many(shippingRates),
  }),
);

export const shippingRates = pgTable("shipping_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  zoneId: uuid("zone_id")
    .notNull()
    .references(() => shippingZones.id),
  name: text("name").notNull(),
  type: shippingRateTypeEnum("type").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).default("0"),
  minWeight: decimal("min_weight", { precision: 10, scale: 2 }),
  maxWeight: decimal("max_weight", { precision: 10, scale: 2 }),
  minOrderTotal: decimal("min_order_total", { precision: 10, scale: 2 }),
  maxOrderTotal: decimal("max_order_total", { precision: 10, scale: 2 }),
  carrierProvider: text("carrier_provider"),
  estimatedDaysMin: integer("estimated_days_min"),
  estimatedDaysMax: integer("estimated_days_max"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shippingRatesRelations = relations(shippingRates, ({ one }) => ({
  zone: one(shippingZones, {
    fields: [shippingRates.zoneId],
    references: [shippingZones.id],
  }),
}));

export const carrierAccounts = pgTable("carrier_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  carrier: carrierEnum("carrier").notNull(),
  integrationId: uuid("integration_id").references(
    () => platformIntegrations.id,
  ),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const carrierAccountsRelations = relations(
  carrierAccounts,
  ({ one }) => ({
    store: one(stores, {
      fields: [carrierAccounts.storeId],
      references: [stores.id],
    }),
    integration: one(platformIntegrations, {
      fields: [carrierAccounts.integrationId],
      references: [platformIntegrations.id],
    }),
  }),
);
```

**Step 2:** Add tax tables:

```typescript
// ─── Tax Context ────────────────────────────────────────────────────────────

export const taxZones = pgTable("tax_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  name: text("name").notNull(),
  countries: jsonb("countries").default([]),
  regions: jsonb("regions").default([]),
  postalCodes: jsonb("postal_codes").default([]),
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taxZonesRelations = relations(taxZones, ({ one, many }) => ({
  store: one(stores, {
    fields: [taxZones.storeId],
    references: [stores.id],
  }),
  rates: many(taxRates),
}));

export const taxRates = pgTable("tax_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  taxZoneId: uuid("tax_zone_id")
    .notNull()
    .references(() => taxZones.id),
  name: text("name").notNull(),
  rate: decimal("rate", { precision: 5, scale: 4 }).notNull(),
  type: taxTypeEnum("type").notNull(),
  appliesTo: taxAppliesToEnum("applies_to").default("all"),
  compound: boolean("compound").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taxRatesRelations = relations(taxRates, ({ one }) => ({
  zone: one(taxZones, {
    fields: [taxRates.taxZoneId],
    references: [taxZones.id],
  }),
}));
```

**Step 3:** Add inventory reservations table:

```typescript
// ─── Inventory Reservations ─────────────────────────────────────────────────

export const inventoryReservations = pgTable(
  "inventory_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),
    cartItemId: uuid("cart_item_id")
      .notNull()
      .references(() => cartItems.id),
    quantity: integer("quantity").notNull(),
    status: reservationStatusEnum("status").default("held"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    variantStatusIdx: index("inventory_reservations_variant_status_idx").on(
      table.variantId,
      table.status,
    ),
    expiresAtIdx: index("inventory_reservations_expires_at_idx").on(
      table.expiresAt,
    ),
  }),
);

export const inventoryReservationsRelations = relations(
  inventoryReservations,
  ({ one }) => ({
    variant: one(productVariants, {
      fields: [inventoryReservations.variantId],
      references: [productVariants.id],
    }),
    cartItem: one(cartItems, {
      fields: [inventoryReservations.cartItemId],
      references: [cartItems.id],
    }),
  }),
);
```

**Step 4:** Run `pnpm tsc --noEmit` — expect PASS

**Step 5:** Commit:
```bash
git add src/infrastructure/db/schema.ts
git commit -m "feat: add shipping, tax, and inventory reservation schema tables"
```

---

### Task 4: Add Analytics, Currency, and Digital Downloads tables to schema

**Files:**
- Modify: `src/infrastructure/db/schema.ts`

**Step 1:** Add analytics tables:

```typescript
// ─── Analytics Context ──────────────────────────────────────────────────────

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    sessionId: text("session_id"),
    userId: uuid("user_id").references(() => users.id),
    eventType: text("event_type").notNull(),
    properties: jsonb("properties").default({}),
    pageUrl: text("page_url"),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    storeEventTypeIdx: index("analytics_events_store_type_idx").on(
      table.storeId,
      table.eventType,
      table.createdAt,
    ),
  }),
);

export const analyticsDailyRollups = pgTable(
  "analytics_daily_rollups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    date: text("date").notNull(),
    metric: text("metric").notNull(),
    dimensions: jsonb("dimensions").default({}),
    value: decimal("value", { precision: 12, scale: 2 }).default("0"),
    count: integer("count").default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    storeDateMetricIdx: index("analytics_rollups_store_date_metric_idx").on(
      table.storeId,
      table.date,
      table.metric,
    ),
  }),
);
```

**Step 2:** Add currency tables:

```typescript
// ─── Currency Context ───────────────────────────────────────────────────────

export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    baseCurrency: text("base_currency").notNull(),
    targetCurrency: text("target_currency").notNull(),
    rate: decimal("rate", { precision: 12, scale: 6 }).notNull(),
    source: text("source").default("exchangerate_api"),
    fetchedAt: timestamp("fetched_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    currencyPairIdx: uniqueIndex("exchange_rates_pair_idx").on(
      table.baseCurrency,
      table.targetCurrency,
    ),
  }),
);

export const storeCurrencies = pgTable("store_currencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .unique()
    .references(() => stores.id),
  baseCurrency: text("base_currency").notNull().default("USD"),
  enabledCurrencies: jsonb("enabled_currencies").default([]),
  displayFormat: text("display_format").default("symbol_first"),
  autoDetectLocale: boolean("auto_detect_locale").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const storeCurrenciesRelations = relations(
  storeCurrencies,
  ({ one }) => ({
    store: one(stores, {
      fields: [storeCurrencies.storeId],
      references: [stores.id],
    }),
  }),
);
```

**Step 3:** Add digital downloads tables:

```typescript
// ─── Digital Downloads ──────────────────────────────────────────────────────

export const digitalAssets = pgTable("digital_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  storageKey: text("storage_key").notNull(),
  contentType: text("content_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const digitalAssetsRelations = relations(digitalAssets, ({ one }) => ({
  product: one(products, {
    fields: [digitalAssets.productId],
    references: [products.id],
  }),
}));

export const downloadTokens = pgTable("download_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  digitalAssetId: uuid("digital_asset_id")
    .notNull()
    .references(() => digitalAssets.id),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  token: text("token").unique().notNull(),
  downloadsUsed: integer("downloads_used").default(0),
  maxDownloads: integer("max_downloads").default(3),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const downloadTokensRelations = relations(
  downloadTokens,
  ({ one }) => ({
    digitalAsset: one(digitalAssets, {
      fields: [downloadTokens.digitalAssetId],
      references: [digitalAssets.id],
    }),
    order: one(orders, {
      fields: [downloadTokens.orderId],
      references: [orders.id],
    }),
    user: one(users, {
      fields: [downloadTokens.userId],
      references: [users.id],
    }),
  }),
);
```

**Step 4:** Run `pnpm tsc --noEmit` — expect PASS

**Step 5:** Commit:
```bash
git add src/infrastructure/db/schema.ts
git commit -m "feat: add analytics, currency, and digital downloads schema tables"
```

---

### Task 5: Add columns to existing tables

**Files:**
- Modify: `src/infrastructure/db/schema.ts`

**Step 1:** Add columns to `orders` table (around line 539):

Add after `shippingAddress` field:
```typescript
    discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
    couponCode: text("coupon_code"),
    currency: text("currency").default("USD"),
    exchangeRate: decimal("exchange_rate", { precision: 12, scale: 6 }),
```

**Step 2:** Add columns to `productReviews` table (around line 1032):

Add after `isVerifiedPurchase` field:
```typescript
    status: reviewStatusEnum("status").default("approved"),
    moderatedAt: timestamp("moderated_at"),
    helpfulCount: integer("helpful_count").default(0),
    reportedCount: integer("reported_count").default(0),
```

**Step 3:** Add columns to `productVariants` table (around line 390):

Add after `availableForSale` field:
```typescript
    weight: decimal("weight", { precision: 10, scale: 2 }),
    weightUnit: text("weight_unit").default("oz"),
    reservedQuantity: integer("reserved_quantity").default(0),
```

**Step 4:** Update the `Order` domain entity at `src/domain/checkout/order.entity.ts` to include new fields:

Add to the `Order` interface:
```typescript
  discount: number;
  couponCode: string | null;
  currency: string;
  exchangeRate: number | null;
```

And update the `createOrder` factory defaults:
```typescript
    discount: params.discount ?? 0,
    couponCode: params.couponCode ?? null,
    currency: params.currency ?? "USD",
    exchangeRate: params.exchangeRate ?? null,
```

**Step 5:** Run `pnpm tsc --noEmit` — may need to update references to Order type throughout the codebase. Fix any type errors.

**Step 6:** Commit:
```bash
git add src/infrastructure/db/schema.ts src/domain/checkout/order.entity.ts
git commit -m "feat: add discount, currency, weight, review status columns to existing tables"
```

---

## Slice 2: Inventory Reservations

### Task 6: Create inventory reservation domain entity

**Files:**
- Create: `src/domain/catalog/inventory-reservation.entity.ts`

**Step 1:** Create the entity:

```typescript
export type ReservationStatus = "held" | "released" | "converted";

export interface InventoryReservation {
  id: string;
  variantId: string;
  cartItemId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: Date;
  createdAt: Date;
}

export function createInventoryReservation(
  params: Omit<InventoryReservation, "id" | "createdAt" | "status">,
): InventoryReservation {
  return {
    ...params,
    id: crypto.randomUUID(),
    status: "held",
    createdAt: new Date(),
  };
}
```

**Step 2:** Run `pnpm tsc --noEmit` — expect PASS

**Step 3:** Commit:
```bash
git add src/domain/catalog/inventory-reservation.entity.ts
git commit -m "feat: add inventory reservation domain entity"
```

---

### Task 7: Create inventory repository

**Files:**
- Create: `src/infrastructure/repositories/inventory.repository.ts`

**Step 1:** Create repository with atomic reservation logic:

```typescript
import { eq, and, sql, lt } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  productVariants,
  inventoryReservations,
  cartItems,
} from "../db/schema";

export class InventoryRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async reserve(variantId: string, cartItemId: string, quantity: number, ttlMinutes = 15) {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    // Atomic check-and-reserve: only succeeds if enough unreserved stock
    const updated = await this.db
      .update(productVariants)
      .set({
        reservedQuantity: sql`${productVariants.reservedQuantity} + ${quantity}`,
      })
      .where(
        and(
          eq(productVariants.id, variantId),
          sql`${productVariants.inventoryQuantity} - ${productVariants.reservedQuantity} >= ${quantity}`,
        ),
      )
      .returning();

    if (updated.length === 0) {
      return null; // insufficient stock
    }

    const inserted = await this.db
      .insert(inventoryReservations)
      .values({ variantId, cartItemId, quantity, expiresAt })
      .returning();

    return inserted[0] ?? null;
  }

  async release(reservationId: string) {
    const rows = await this.db
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.id, reservationId),
          eq(inventoryReservations.status, "held"),
        ),
      )
      .limit(1);

    const reservation = rows[0];
    if (!reservation) return null;

    // Decrement reserved quantity on variant
    await this.db
      .update(productVariants)
      .set({
        reservedQuantity: sql`GREATEST(${productVariants.reservedQuantity} - ${reservation.quantity}, 0)`,
      })
      .where(eq(productVariants.id, reservation.variantId));

    // Mark reservation as released
    const released = await this.db
      .update(inventoryReservations)
      .set({ status: "released" })
      .where(eq(inventoryReservations.id, reservationId))
      .returning();

    return released[0] ?? null;
  }

  async commit(reservationId: string) {
    const rows = await this.db
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.id, reservationId),
          eq(inventoryReservations.status, "held"),
        ),
      )
      .limit(1);

    const reservation = rows[0];
    if (!reservation) return null;

    // Decrement both inventory and reserved quantity atomically
    await this.db
      .update(productVariants)
      .set({
        inventoryQuantity: sql`${productVariants.inventoryQuantity} - ${reservation.quantity}`,
        reservedQuantity: sql`GREATEST(${productVariants.reservedQuantity} - ${reservation.quantity}, 0)`,
      })
      .where(eq(productVariants.id, reservation.variantId));

    const committed = await this.db
      .update(inventoryReservations)
      .set({ status: "converted" })
      .where(eq(inventoryReservations.id, reservationId))
      .returning();

    return committed[0] ?? null;
  }

  async findByCartItem(cartItemId: string) {
    const rows = await this.db
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.cartItemId, cartItemId),
          eq(inventoryReservations.status, "held"),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async releaseExpired() {
    const now = new Date();
    const expired = await this.db
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.status, "held"),
          lt(inventoryReservations.expiresAt, now),
        ),
      );

    let releasedCount = 0;
    for (const reservation of expired) {
      await this.release(reservation.id);
      releasedCount++;
    }
    return releasedCount;
  }
}
```

**Step 2:** Run `pnpm tsc --noEmit` — expect PASS

**Step 3:** Commit:
```bash
git add src/infrastructure/repositories/inventory.repository.ts
git commit -m "feat: add inventory repository with atomic reserve/release/commit"
```

---

### Task 8: Create reserve-inventory use case

**Files:**
- Create: `src/application/catalog/reserve-inventory.usecase.ts`

```typescript
import type { Database } from "../../infrastructure/db/client";
import { InventoryRepository } from "../../infrastructure/repositories/inventory.repository";
import { ValidationError } from "../../shared/errors";

export class ReserveInventoryUseCase {
  constructor(
    private repo: InventoryRepository,
  ) {}

  async execute(variantId: string, cartItemId: string, quantity: number) {
    if (quantity <= 0) {
      throw new ValidationError("Quantity must be positive");
    }

    const reservation = await this.repo.reserve(variantId, cartItemId, quantity);
    if (!reservation) {
      throw new ValidationError("Insufficient inventory for this item");
    }

    return reservation;
  }
}
```

Commit: `feat: add reserve-inventory use case`

---

### Task 9: Create release-inventory use case

**Files:**
- Create: `src/application/catalog/release-inventory.usecase.ts`

```typescript
import { InventoryRepository } from "../../infrastructure/repositories/inventory.repository";

export class ReleaseInventoryUseCase {
  constructor(private repo: InventoryRepository) {}

  async execute(cartItemId: string) {
    const reservation = await this.repo.findByCartItem(cartItemId);
    if (!reservation) return null;
    return this.repo.release(reservation.id);
  }
}
```

Commit: `feat: add release-inventory use case`

---

### Task 10: Create commit-inventory use case

**Files:**
- Create: `src/application/catalog/commit-inventory.usecase.ts`

```typescript
import { InventoryRepository } from "../../infrastructure/repositories/inventory.repository";

export class CommitInventoryUseCase {
  constructor(private repo: InventoryRepository) {}

  async execute(cartItemId: string) {
    const reservation = await this.repo.findByCartItem(cartItemId);
    if (!reservation) return null;
    return this.repo.commit(reservation.id);
  }
}
```

Commit: `feat: add commit-inventory use case`

---

### Task 11: Create expire-inventory-reservations cron job

**Files:**
- Create: `src/scheduled/expire-inventory-reservations.job.ts`
- Modify: `src/scheduled/handler.ts`

**Step 1:** Create the job:

```typescript
import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { InventoryRepository } from "../infrastructure/repositories/inventory.repository";
import { stores } from "../infrastructure/db/schema";

export async function runExpireInventoryReservations(env: Env): Promise<void> {
  const db = createDb(env.DATABASE_URL);

  // Run across all stores
  const allStores = await db.select({ id: stores.id }).from(stores);

  let totalReleased = 0;
  for (const store of allStores) {
    const repo = new InventoryRepository(db, store.id);
    const released = await repo.releaseExpired();
    totalReleased += released;
  }

  if (totalReleased > 0) {
    console.log(
      `[expire-inventory-reservations] Released ${totalReleased} expired reservation(s)`,
    );
  }
}
```

**Step 2:** Register in `src/scheduled/handler.ts` — add import and add to the `*/5 * * * *` case (every 5 minutes, same as booking request expiry):

```typescript
import { runExpireInventoryReservations } from "./expire-inventory-reservations.job";

// In switch, add to existing */5 case:
case "*/5 * * * *":
  ctx.waitUntil(runExpireBookingRequests(env));
  ctx.waitUntil(runExpireInventoryReservations(env));
  break;
```

**Step 3:** Run `pnpm tsc --noEmit` — expect PASS

**Step 4:** Commit:
```bash
git add src/scheduled/expire-inventory-reservations.job.ts src/scheduled/handler.ts
git commit -m "feat: add inventory reservation expiry cron (every 5 min)"
```

---

### Task 12: Integrate inventory reservation into add-to-cart flow

**Files:**
- Modify: `src/application/cart/add-to-cart.usecase.ts`

**Step 1:** After the cart item is added, reserve inventory. Add to the use case constructor:

```typescript
import { InventoryRepository } from "../../infrastructure/repositories/inventory.repository";

// In constructor, add:
private inventoryRepo: InventoryRepository,

// After addItem() call, before returning:
// Reserve inventory for physical products
if (product.type === "physical") {
  const reservation = await this.inventoryRepo.reserve(
    data.variantId,
    addedItem.id,
    data.quantity,
  );
  if (!reservation) {
    // Rollback: remove the cart item
    await this.repo.removeItem(cart.id, addedItem.id);
    throw new ValidationError("Insufficient inventory for this item");
  }
}
```

**Step 2:** Update the route at `src/routes/api/cart.routes.ts` to pass inventory repo:

```typescript
import { InventoryRepository } from "../../infrastructure/repositories/inventory.repository";

// In POST /cart/items handler:
const inventoryRepo = new InventoryRepository(db, c.get("storeId") as string);
const useCase = new AddToCartUseCase(repo, db, inventoryRepo);
```

**Step 3:** Similarly update `remove-from-cart.usecase.ts` to release inventory when item is removed.

**Step 4:** Run `pnpm tsc --noEmit` — fix any type errors

**Step 5:** Commit:
```bash
git add src/application/cart/add-to-cart.usecase.ts src/application/cart/remove-from-cart.usecase.ts src/routes/api/cart.routes.ts
git commit -m "feat: integrate inventory reservations into cart add/remove flow"
```

---

## Slice 3: Promotions Engine

### Task 13: Create promotion domain entities

**Files:**
- Create: `src/domain/promotions/promotion.entity.ts`
- Create: `src/domain/promotions/coupon-code.entity.ts`
- Create: `src/domain/promotions/promotion-rule.vo.ts`
- Create: `src/domain/promotions/promotion-action.vo.ts`
- Create: `src/domain/promotions/customer-segment.entity.ts`

**Step 1:** Create `src/domain/promotions/promotion.entity.ts`:

```typescript
export type PromotionType = "coupon" | "automatic" | "flash_sale";
export type PromotionStatus = "active" | "scheduled" | "expired" | "disabled";
export type PromotionStrategy =
  | "percentage_off"
  | "fixed_amount"
  | "free_shipping"
  | "bogo"
  | "buy_x_get_y"
  | "tiered"
  | "bundle";

export interface Promotion {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  type: PromotionType;
  status: PromotionStatus;
  priority: number;
  stackable: boolean;
  strategyType: PromotionStrategy;
  strategyParams: Record<string, unknown>;
  conditions: ConditionNode;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ConditionOperator = "and" | "or";
export type ConditionPredicate =
  | { type: "cart_total"; op: "gte" | "lte"; value: number }
  | { type: "item_count"; op: "gte" | "lte"; value: number }
  | { type: "product_in"; productIds: string[] }
  | { type: "collection_in"; collectionIds: string[] }
  | { type: "customer_segment"; segmentId: string }
  | { type: "first_purchase" }
  | { type: "min_quantity"; productId: string; quantity: number };

export type ConditionNode =
  | { operator: ConditionOperator; children: ConditionNode[] }
  | ConditionPredicate;

export function createPromotion(
  params: Omit<Promotion, "id" | "createdAt" | "updatedAt" | "usageCount">,
): Promotion {
  const now = new Date();
  return {
    ...params,
    id: crypto.randomUUID(),
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}
```

**Step 2:** Create `src/domain/promotions/coupon-code.entity.ts`:

```typescript
export interface CouponCode {
  id: string;
  promotionId: string;
  code: string;
  maxRedemptions: number | null;
  redemptionCount: number;
  singleUsePerCustomer: boolean;
  createdAt: Date;
}
```

**Step 3:** Create `src/domain/promotions/customer-segment.entity.ts`:

```typescript
export interface CustomerSegment {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  rules: SegmentRule;
  memberCount: number;
  lastRefreshedAt: Date | null;
  createdAt: Date;
}

export type SegmentRule =
  | { type: "total_spent"; op: "gte" | "lte"; value: number }
  | { type: "order_count"; op: "gte" | "lte"; value: number }
  | { type: "registered_before"; date: string }
  | { type: "and"; children: SegmentRule[] }
  | { type: "or"; children: SegmentRule[] };
```

**Step 4:** Run `pnpm tsc --noEmit` — expect PASS

**Step 5:** Commit:
```bash
git add src/domain/promotions/
git commit -m "feat: add promotion domain entities (promotion, coupon, segment, condition DSL)"
```

---

### Task 14: Create promotion repository

**Files:**
- Create: `src/infrastructure/repositories/promotion.repository.ts`

**Step 1:** Create repository with methods for CRUD + query active promotions:

```typescript
import { eq, and, or, lte, gte, sql, isNull } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  promotions,
  couponCodes,
  promotionRedemptions,
  promotionProductEligibility,
  customerSegmentMemberships,
} from "../db/schema";

export class PromotionRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async create(data: {
    name: string;
    description?: string;
    type: "coupon" | "automatic" | "flash_sale";
    strategyType: string;
    strategyParams: Record<string, unknown>;
    conditions: Record<string, unknown>;
    priority?: number;
    stackable?: boolean;
    startsAt?: Date;
    endsAt?: Date;
    usageLimit?: number;
  }) {
    const inserted = await this.db
      .insert(promotions)
      .values({
        storeId: this.storeId,
        name: data.name,
        description: data.description ?? null,
        type: data.type,
        strategyType: data.strategyType,
        strategyParams: data.strategyParams,
        conditions: data.conditions,
        priority: data.priority ?? 0,
        stackable: data.stackable ?? false,
        startsAt: data.startsAt ?? null,
        endsAt: data.endsAt ?? null,
        usageLimit: data.usageLimit ?? null,
      })
      .returning();
    return inserted[0] ?? null;
  }

  async findById(id: string) {
    const rows = await this.db
      .select()
      .from(promotions)
      .where(and(eq(promotions.id, id), eq(promotions.storeId, this.storeId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async listActive() {
    const now = new Date();
    return this.db
      .select()
      .from(promotions)
      .where(
        and(
          eq(promotions.storeId, this.storeId),
          eq(promotions.status, "active"),
          or(isNull(promotions.startsAt), lte(promotions.startsAt, now)),
          or(isNull(promotions.endsAt), gte(promotions.endsAt, now)),
        ),
      )
      .orderBy(promotions.priority);
  }

  async findCouponByCode(code: string) {
    const rows = await this.db
      .select({
        coupon: couponCodes,
        promotion: promotions,
      })
      .from(couponCodes)
      .innerJoin(promotions, eq(couponCodes.promotionId, promotions.id))
      .where(
        and(
          eq(couponCodes.code, code.toUpperCase()),
          eq(promotions.storeId, this.storeId),
          eq(promotions.status, "active"),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async createCouponCode(promotionId: string, code: string, maxRedemptions?: number) {
    const inserted = await this.db
      .insert(couponCodes)
      .values({
        promotionId,
        code: code.toUpperCase(),
        maxRedemptions: maxRedemptions ?? null,
      })
      .returning();
    return inserted[0] ?? null;
  }

  async recordRedemption(data: {
    promotionId: string;
    couponCodeId?: string;
    orderId: string;
    customerId: string;
    discountAmount: number;
  }) {
    // Increment usage count on promotion
    await this.db
      .update(promotions)
      .set({ usageCount: sql`${promotions.usageCount} + 1` })
      .where(eq(promotions.id, data.promotionId));

    // Increment redemption count on coupon if applicable
    if (data.couponCodeId) {
      await this.db
        .update(couponCodes)
        .set({ redemptionCount: sql`${couponCodes.redemptionCount} + 1` })
        .where(eq(couponCodes.id, data.couponCodeId));
    }

    const inserted = await this.db
      .insert(promotionRedemptions)
      .values({
        promotionId: data.promotionId,
        couponCodeId: data.couponCodeId ?? null,
        orderId: data.orderId,
        customerId: data.customerId,
        discountAmount: String(data.discountAmount),
      })
      .returning();
    return inserted[0] ?? null;
  }

  async getCustomerRedemptionCount(promotionId: string, customerId: string) {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(promotionRedemptions)
      .where(
        and(
          eq(promotionRedemptions.promotionId, promotionId),
          eq(promotionRedemptions.customerId, customerId),
        ),
      );
    return result[0]?.count ?? 0;
  }

  async getEligibility(promotionId: string) {
    return this.db
      .select()
      .from(promotionProductEligibility)
      .where(eq(promotionProductEligibility.promotionId, promotionId));
  }

  async isCustomerInSegment(customerId: string, segmentId: string) {
    const rows = await this.db
      .select()
      .from(customerSegmentMemberships)
      .where(
        and(
          eq(customerSegmentMemberships.customerId, customerId),
          eq(customerSegmentMemberships.segmentId, segmentId),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }
}
```

**Step 2:** Run `pnpm tsc --noEmit` — expect PASS

**Step 3:** Commit:
```bash
git add src/infrastructure/repositories/promotion.repository.ts
git commit -m "feat: add promotion repository with CRUD, coupon lookup, redemption tracking"
```

---

### Task 15: Create PromotionEvaluator domain service

**Files:**
- Create: `src/domain/promotions/promotion-evaluator.service.ts`

This is the core engine — strategy pattern + DSL evaluation. The key piece where business logic decisions matter.

```typescript
import type { ConditionNode, ConditionPredicate, Promotion } from "./promotion.entity";

export interface CartForEvaluation {
  items: Array<{
    variantId: string;
    productId: string;
    collectionIds: string[];
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  itemCount: number;
  customerId: string | null;
}

export interface DiscountBreakdown {
  promotionId: string;
  promotionName: string;
  strategyType: string;
  discountAmount: number;
  freeShipping: boolean;
  affectedItems: string[]; // variantIds
}

export interface EvaluationContext {
  isFirstPurchase: boolean;
  customerSegmentIds: string[];
}

export function evaluateCondition(
  node: ConditionNode,
  cart: CartForEvaluation,
  ctx: EvaluationContext,
): boolean {
  if ("operator" in node) {
    const results = node.children.map((child) =>
      evaluateCondition(child, cart, ctx),
    );
    return node.operator === "and"
      ? results.every(Boolean)
      : results.some(Boolean);
  }

  return evaluatePredicate(node, cart, ctx);
}

function evaluatePredicate(
  pred: ConditionPredicate,
  cart: CartForEvaluation,
  ctx: EvaluationContext,
): boolean {
  switch (pred.type) {
    case "cart_total":
      return pred.op === "gte"
        ? cart.subtotal >= pred.value
        : cart.subtotal <= pred.value;
    case "item_count":
      return pred.op === "gte"
        ? cart.itemCount >= pred.value
        : cart.itemCount <= pred.value;
    case "product_in":
      return cart.items.some((i) => pred.productIds.includes(i.productId));
    case "collection_in":
      return cart.items.some((i) =>
        i.collectionIds.some((cid) => pred.collectionIds.includes(cid)),
      );
    case "customer_segment":
      return ctx.customerSegmentIds.includes(pred.segmentId);
    case "first_purchase":
      return ctx.isFirstPurchase;
    case "min_quantity":
      return cart.items.some(
        (i) => i.productId === pred.productId && i.quantity >= pred.quantity,
      );
  }
}

export function applyStrategy(
  promotion: Promotion,
  cart: CartForEvaluation,
): DiscountBreakdown {
  const params = promotion.strategyParams as Record<string, number>;
  const allVariantIds = cart.items.map((i) => i.variantId);

  switch (promotion.strategyType) {
    case "percentage_off": {
      const pct = params.percentage ?? 0;
      const amount = Math.round(cart.subtotal * (pct / 100) * 100) / 100;
      return {
        promotionId: promotion.id,
        promotionName: promotion.name,
        strategyType: promotion.strategyType,
        discountAmount: amount,
        freeShipping: false,
        affectedItems: allVariantIds,
      };
    }
    case "fixed_amount": {
      const amount = Math.min(params.amount ?? 0, cart.subtotal);
      return {
        promotionId: promotion.id,
        promotionName: promotion.name,
        strategyType: promotion.strategyType,
        discountAmount: amount,
        freeShipping: false,
        affectedItems: allVariantIds,
      };
    }
    case "free_shipping":
      return {
        promotionId: promotion.id,
        promotionName: promotion.name,
        strategyType: promotion.strategyType,
        discountAmount: 0,
        freeShipping: true,
        affectedItems: allVariantIds,
      };
    case "bogo": {
      // Buy one get one: cheapest item free
      const sorted = [...cart.items].sort((a, b) => a.unitPrice - b.unitPrice);
      const cheapest = sorted[0];
      return {
        promotionId: promotion.id,
        promotionName: promotion.name,
        strategyType: promotion.strategyType,
        discountAmount: cheapest ? cheapest.unitPrice : 0,
        freeShipping: false,
        affectedItems: cheapest ? [cheapest.variantId] : [],
      };
    }
    case "buy_x_get_y": {
      const buyQty = params.buy_quantity ?? 2;
      const getQty = params.get_quantity ?? 1;
      const getPct = params.get_percentage ?? 100; // 100 = free
      // Find qualifying items and discount the cheapest get_quantity
      const qualifying = cart.items.filter((i) => i.quantity >= buyQty);
      if (qualifying.length === 0) {
        return { promotionId: promotion.id, promotionName: promotion.name, strategyType: promotion.strategyType, discountAmount: 0, freeShipping: false, affectedItems: [] };
      }
      const sorted = [...qualifying].sort((a, b) => a.unitPrice - b.unitPrice);
      let discountAmount = 0;
      const affected: string[] = [];
      for (let i = 0; i < Math.min(getQty, sorted.length); i++) {
        const item = sorted[i];
        if (item) {
          discountAmount += item.unitPrice * (getPct / 100);
          affected.push(item.variantId);
        }
      }
      return { promotionId: promotion.id, promotionName: promotion.name, strategyType: promotion.strategyType, discountAmount: Math.round(discountAmount * 100) / 100, freeShipping: false, affectedItems: affected };
    }
    case "tiered": {
      // Tiered percentage: different % based on cart total thresholds
      const tiers = (promotion.strategyParams as { tiers?: Array<{ min: number; percentage: number }> }).tiers ?? [];
      const sortedTiers = [...tiers].sort((a, b) => b.min - a.min);
      const matchedTier = sortedTiers.find((t) => cart.subtotal >= t.min);
      if (!matchedTier) {
        return { promotionId: promotion.id, promotionName: promotion.name, strategyType: promotion.strategyType, discountAmount: 0, freeShipping: false, affectedItems: [] };
      }
      const amount = Math.round(cart.subtotal * (matchedTier.percentage / 100) * 100) / 100;
      return { promotionId: promotion.id, promotionName: promotion.name, strategyType: promotion.strategyType, discountAmount: amount, freeShipping: false, affectedItems: allVariantIds };
    }
    case "bundle": {
      const bundlePrice = params.bundle_price ?? 0;
      const discount = Math.max(0, cart.subtotal - bundlePrice);
      return { promotionId: promotion.id, promotionName: promotion.name, strategyType: promotion.strategyType, discountAmount: Math.round(discount * 100) / 100, freeShipping: false, affectedItems: allVariantIds };
    }
    default:
      return { promotionId: promotion.id, promotionName: promotion.name, strategyType: promotion.strategyType, discountAmount: 0, freeShipping: false, affectedItems: [] };
  }
}

export function evaluatePromotions(
  promotionsList: Promotion[],
  cart: CartForEvaluation,
  ctx: EvaluationContext,
): DiscountBreakdown[] {
  const results: DiscountBreakdown[] = [];
  let hasNonStackable = false;

  for (const promo of promotionsList) {
    // Check usage limit
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) continue;

    // Evaluate conditions
    if (!evaluateCondition(promo.conditions, cart, ctx)) continue;

    // Apply strategy
    const breakdown = applyStrategy(promo, cart);
    if (breakdown.discountAmount === 0 && !breakdown.freeShipping) continue;

    // Stacking logic
    if (!promo.stackable) {
      if (hasNonStackable) continue; // Already have a non-stackable promo
      hasNonStackable = true;
    }

    results.push(breakdown);
  }

  return results;
}
```

**Step 2:** Run `pnpm tsc --noEmit` — expect PASS

**Step 3:** Commit:
```bash
git add src/domain/promotions/promotion-evaluator.service.ts
git commit -m "feat: add PromotionEvaluator with DSL condition engine + strategy pattern"
```

---

### Task 16: Create evaluate-cart-promotions use case

**Files:**
- Create: `src/application/promotions/evaluate-cart-promotions.usecase.ts`

```typescript
import type { Database } from "../../infrastructure/db/client";
import { PromotionRepository } from "../../infrastructure/repositories/promotion.repository";
import { CartRepository } from "../../infrastructure/repositories/cart.repository";
import {
  evaluatePromotions,
  type CartForEvaluation,
  type DiscountBreakdown,
  type EvaluationContext,
} from "../../domain/promotions/promotion-evaluator.service";
import { orders, collectionProducts } from "../../infrastructure/db/schema";
import { eq, inArray } from "drizzle-orm";

export class EvaluateCartPromotionsUseCase {
  constructor(
    private promoRepo: PromotionRepository,
    private db: Database,
  ) {}

  async execute(
    cartItems: Array<{
      variantId: string;
      productId: string;
      quantity: number;
      unitPrice: number;
    }>,
    customerId: string | null,
  ): Promise<DiscountBreakdown[]> {
    // 1. Get all active promotions for this store
    const activePromotions = await this.promoRepo.listActive();
    if (activePromotions.length === 0) return [];

    // 2. Build cart for evaluation — enrich with collection IDs
    const productIds = [...new Set(cartItems.map((i) => i.productId))];
    const collectionRows = productIds.length > 0
      ? await this.db
          .select()
          .from(collectionProducts)
          .where(inArray(collectionProducts.productId, productIds))
      : [];

    const productCollections = new Map<string, string[]>();
    for (const row of collectionRows) {
      const existing = productCollections.get(row.productId) ?? [];
      existing.push(row.collectionId);
      productCollections.set(row.productId, existing);
    }

    const cart: CartForEvaluation = {
      items: cartItems.map((i) => ({
        ...i,
        collectionIds: productCollections.get(i.productId) ?? [],
        lineTotal: i.unitPrice * i.quantity,
      })),
      subtotal: cartItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      itemCount: cartItems.reduce((sum, i) => sum + i.quantity, 0),
      customerId,
    };

    // 3. Build evaluation context
    let isFirstPurchase = false;
    const customerSegmentIds: string[] = [];

    if (customerId) {
      const orderCount = await this.db
        .select()
        .from(orders)
        .where(eq(orders.userId, customerId))
        .limit(1);
      isFirstPurchase = orderCount.length === 0;

      // Get customer segments
      const segments = await this.promoRepo.getCustomerSegments?.(customerId) ?? [];
      customerSegmentIds.push(...segments);
    }

    const ctx: EvaluationContext = { isFirstPurchase, customerSegmentIds };

    // 4. Evaluate and return applicable discounts
    return evaluatePromotions(activePromotions as any, cart, ctx);
  }
}
```

Note: The `getCustomerSegments` method needs to be added to the PromotionRepository — query `customer_segment_memberships` where `customerId` matches and return segment IDs.

**Step 2:** Run `pnpm tsc --noEmit` — fix any type mismatches between schema rows and domain types

**Step 3:** Commit:
```bash
git add src/application/promotions/evaluate-cart-promotions.usecase.ts
git commit -m "feat: add evaluate-cart-promotions use case"
```

---

### Task 17: Create apply-coupon use case

**Files:**
- Create: `src/application/promotions/apply-coupon.usecase.ts`

```typescript
import { PromotionRepository } from "../../infrastructure/repositories/promotion.repository";
import { ValidationError, NotFoundError } from "../../shared/errors";

export class ApplyCouponUseCase {
  constructor(private repo: PromotionRepository) {}

  async execute(code: string, customerId: string | null) {
    const result = await this.repo.findCouponByCode(code);
    if (!result) {
      throw new NotFoundError("Coupon code");
    }

    const { coupon, promotion } = result;

    // Check max redemptions
    if (coupon.maxRedemptions && coupon.redemptionCount >= coupon.maxRedemptions) {
      throw new ValidationError("Coupon has reached maximum redemptions");
    }

    // Check single-use per customer
    if (coupon.singleUsePerCustomer && customerId) {
      const count = await this.repo.getCustomerRedemptionCount(
        promotion.id,
        customerId,
      );
      if (count > 0) {
        throw new ValidationError("You have already used this coupon");
      }
    }

    return { promotion, coupon };
  }
}
```

Commit: `feat: add apply-coupon use case`

---

### Task 18: Create redeem-promotion use case

**Files:**
- Create: `src/application/promotions/redeem-promotion.usecase.ts`

```typescript
import { PromotionRepository } from "../../infrastructure/repositories/promotion.repository";

export class RedeemPromotionUseCase {
  constructor(private repo: PromotionRepository) {}

  async execute(data: {
    promotionId: string;
    couponCodeId?: string;
    orderId: string;
    customerId: string;
    discountAmount: number;
  }) {
    return this.repo.recordRedemption(data);
  }
}
```

Commit: `feat: add redeem-promotion use case`

---

### Task 19: Create create-promotion use case

**Files:**
- Create: `src/application/promotions/create-promotion.usecase.ts`

```typescript
import { PromotionRepository } from "../../infrastructure/repositories/promotion.repository";
import { ValidationError } from "../../shared/errors";

export class CreatePromotionUseCase {
  constructor(private repo: PromotionRepository) {}

  async execute(data: {
    name: string;
    description?: string;
    type: "coupon" | "automatic" | "flash_sale";
    strategyType: string;
    strategyParams: Record<string, unknown>;
    conditions: Record<string, unknown>;
    priority?: number;
    stackable?: boolean;
    startsAt?: string;
    endsAt?: string;
    usageLimit?: number;
  }) {
    if (!data.name) throw new ValidationError("Promotion name is required");

    return this.repo.create({
      ...data,
      startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
      endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
    });
  }
}
```

Commit: `feat: add create-promotion use case`

---

### Task 20: Create manage-coupon-codes use case

**Files:**
- Create: `src/application/promotions/manage-coupon-codes.usecase.ts`

```typescript
import { PromotionRepository } from "../../infrastructure/repositories/promotion.repository";
import { NotFoundError, ValidationError } from "../../shared/errors";

export class ManageCouponCodesUseCase {
  constructor(private repo: PromotionRepository) {}

  async createCode(promotionId: string, code: string, maxRedemptions?: number) {
    const promotion = await this.repo.findById(promotionId);
    if (!promotion) throw new NotFoundError("Promotion", promotionId);
    if (promotion.type !== "coupon") {
      throw new ValidationError("Coupon codes can only be added to coupon-type promotions");
    }

    return this.repo.createCouponCode(promotionId, code, maxRedemptions);
  }
}
```

Commit: `feat: add manage-coupon-codes use case`

---

### Task 21: Create manage-customer-segments use case

**Files:**
- Create: `src/application/promotions/manage-customer-segments.usecase.ts`

Handles CRUD for customer segments. Similar pattern to other CRUD use cases. Add `createSegment`, `listSegments`, `updateSegment` methods.

Commit: `feat: add manage-customer-segments use case`

---

### Task 22: Create refresh-segment-memberships cron job

**Files:**
- Create: `src/scheduled/refresh-customer-segments.job.ts`
- Modify: `src/scheduled/handler.ts`

The job queries each segment's rules (JSON), evaluates against users' order history, and upserts memberships. Register at `0 */6 * * *` (every 6 hours).

Commit: `feat: add customer segment refresh cron job (every 6 hours)`

---

### Task 23: Create expire-promotions cron job

**Files:**
- Create: `src/scheduled/expire-promotions.job.ts`
- Modify: `src/scheduled/handler.ts`

Simple: `UPDATE promotions SET status = 'expired' WHERE status = 'active' AND ends_at < NOW()`. Register at `0 * * * *` (hourly, alongside abandoned-cart).

Commit: `feat: add expire-promotions cron job (hourly)`

---

### Task 24: Create promotions validators and contract

**Files:**
- Create: `src/contracts/promotions.contract.ts`
- Modify: `src/shared/validators.ts`

Add zod schemas for promotion creation, coupon application, etc. Create ts-rest contract following existing pattern.

Commit: `feat: add promotions contract and validators`

---

### Task 25: Create promotions routes

**Files:**
- Create: `src/routes/api/promotions.routes.ts`
- Modify: `src/index.tsx` (import and mount routes)

Follow existing route pattern: `Hono<{ Bindings: Env }>`, per-request DI, zValidator.

Endpoints:
- `POST /api/promotions` — create promotion (admin)
- `GET /api/promotions` — list promotions (admin)
- `PATCH /api/promotions/:id` — update promotion (admin)
- `DELETE /api/promotions/:id` — disable promotion (admin)
- `POST /api/promotions/:id/codes` — create coupon code (admin)
- `POST /api/cart/apply-coupon` — apply coupon to cart (customer)
- `DELETE /api/cart/remove-coupon` — remove coupon from cart (customer)

Commit: `feat: add promotions API routes`

---

### Task 26: Create get-promotion-analytics use case

**Files:**
- Create: `src/application/promotions/get-promotion-analytics.usecase.ts`

Query `promotion_redemptions` grouped by promotion, returning total redemptions, total discount given, and unique customers.

Commit: `feat: add promotion analytics use case`

---

## Slice 4: Shipping Zones & Rates

### Task 27: Create shipping domain entities

**Files:**
- Create: `src/domain/fulfillment/shipping-zone.entity.ts`
- Create: `src/domain/fulfillment/shipping-rate.entity.ts`

Follow existing pattern: pure TS interfaces + factory functions.

Commit: `feat: add shipping zone and rate domain entities`

---

### Task 28: Create shipping repository

**Files:**
- Create: `src/infrastructure/repositories/shipping.repository.ts`

Methods: `createZone`, `listZones`, `createRate`, `listRatesByZone`, `findZoneForAddress` (match country → region → postal code → rest-of-world fallback).

Commit: `feat: add shipping repository with zone matching`

---

### Task 29: Create calculate-shipping use case

**Files:**
- Create: `src/application/fulfillment/calculate-shipping.usecase.ts`

Given cart items (with weights) + shipping address:
1. Find matching zone via repository
2. Filter applicable rates by type
3. For weight-based: sum item weights, find matching rate bracket
4. For price-based: use cart subtotal to find matching bracket
5. For flat: return rate price directly
6. For carrier_calculated: delegate to carrier adapter (Task 31)

Commit: `feat: add calculate-shipping use case`

---

### Task 30: Create manage-shipping-zones use case

**Files:**
- Create: `src/application/fulfillment/manage-shipping-zones.usecase.ts`

CRUD operations for zones and rates. Admin-only.

Commit: `feat: add manage-shipping-zones use case`

---

### Task 31: Create carrier rate adapter (optional real-time rates)

**Files:**
- Create: `src/infrastructure/carriers/carrier-adapter.interface.ts`
- Create: `src/infrastructure/carriers/usps.adapter.ts` (stub)

Define interface: `getRates(origin, destination, packages): ShippingOption[]`. USPS adapter as first implementation (can be stubbed initially).

Commit: `feat: add carrier adapter interface with USPS stub`

---

### Task 32: Create shipping contract and validators

**Files:**
- Create: `src/contracts/shipping.contract.ts`
- Modify: `src/shared/validators.ts`

Commit: `feat: add shipping contract and validators`

---

### Task 33: Create shipping routes

**Files:**
- Create: `src/routes/api/shipping-zones.routes.ts`
- Modify: `src/index.tsx`

Endpoints: CRUD for zones/rates + `POST /shipping/calculate`.

Commit: `feat: add shipping zones API routes`

---

### Task 34: Type check full slice

Run `pnpm tsc --noEmit` and fix any errors across the shipping slice.

Commit: `fix: resolve type errors in shipping slice`

---

## Slice 5: Tax Engine

### Task 35: Create tax domain entities

**Files:**
- Create: `src/domain/tax/tax-zone.entity.ts`
- Create: `src/domain/tax/tax-rate.entity.ts`
- Create: `src/domain/tax/tax-provider.interface.ts`

The `TaxProvider` interface:
```typescript
export interface TaxBreakdown {
  totalTax: number;
  lines: Array<{ itemId: string; taxAmount: number; rate: number; taxType: string }>;
}

export interface TaxProvider {
  calculateTax(input: {
    lineItems: Array<{ id: string; amount: number; productType: string }>;
    shippingAmount: number;
    address: { country: string; state?: string; zip: string };
  }): Promise<TaxBreakdown>;
}
```

Commit: `feat: add tax domain entities and TaxProvider interface`

---

### Task 36: Create tax repository

**Files:**
- Create: `src/infrastructure/repositories/tax.repository.ts`

Methods: CRUD for zones/rates + `findZonesForAddress` (match by country, region, postal code, ordered by priority).

Commit: `feat: add tax repository with zone matching`

---

### Task 37: Create built-in TaxCalculator domain service

**Files:**
- Create: `src/domain/tax/tax-calculator.service.ts`

Implements `TaxProvider` interface using local tax zones/rates from the database. Handles compound tax (tax-on-tax) and per-item-type filtering.

Commit: `feat: add built-in TaxCalculator domain service`

---

### Task 38: Create TaxJar adapter (stub)

**Files:**
- Create: `src/infrastructure/tax/taxjar.adapter.ts`

Implements `TaxProvider` interface. Calls TaxJar API for real-time tax calculation. Initially stubbed with TODO for API integration.

Commit: `feat: add TaxJar adapter stub implementing TaxProvider`

---

### Task 39: Create calculate-tax use case

**Files:**
- Create: `src/application/tax/calculate-tax.usecase.ts`

Checks store integration config: if TaxJar/Avalara configured, use external adapter; otherwise use built-in calculator.

Commit: `feat: add calculate-tax use case with provider dispatch`

---

### Task 40: Create manage-tax-zones use case

**Files:**
- Create: `src/application/tax/manage-tax-zones.usecase.ts`

CRUD for tax zones and rates.

Commit: `feat: add manage-tax-zones use case`

---

### Task 41: Create tax contract, validators, routes

**Files:**
- Create: `src/contracts/tax.contract.ts`
- Create: `src/routes/api/tax.routes.ts`
- Modify: `src/shared/validators.ts`
- Modify: `src/index.tsx`

Endpoints: CRUD for zones/rates + `POST /tax/calculate`.

Commit: `feat: add tax API routes and contract`

---

### Task 42: Type check full slice

Run `pnpm tsc --noEmit` and fix any errors.

Commit: `fix: resolve type errors in tax slice`

---

## Slice 6: Product Reviews & Moderation

### Task 43: Create review domain entity (extend existing)

**Files:**
- Create: `src/domain/catalog/review.entity.ts`

```typescript
export type ReviewStatus = "pending" | "approved" | "rejected" | "flagged";

export interface ProductReview {
  id: string;
  storeId: string;
  productId: string;
  userId: string;
  rating: number;
  title: string | null;
  content: string | null;
  isVerifiedPurchase: boolean;
  status: ReviewStatus;
  moderatedAt: Date | null;
  helpfulCount: number;
  reportedCount: number;
  createdAt: Date;
}
```

Commit: `feat: add product review domain entity`

---

### Task 44: Create review repository

**Files:**
- Create: `src/infrastructure/repositories/review.repository.ts`

Methods: `create`, `findByProduct` (paginated, only approved), `findFlagged` (admin moderation queue), `moderate` (approve/reject), `getAverageRating`.

Commit: `feat: add review repository with moderation support`

---

### Task 45: Create submit-review use case

**Files:**
- Create: `src/application/catalog/submit-review.usecase.ts`

1. Validate rating 1-5
2. Check if user purchased this product (verified purchase flag)
3. Basic content filter: check for profanity patterns, excessive caps, URLs
4. Set status to "approved" if clean, "flagged" if suspicious
5. Insert review

Commit: `feat: add submit-review use case with content filtering`

---

### Task 46: Create moderate-review and list-reviews use cases

**Files:**
- Create: `src/application/catalog/moderate-review.usecase.ts`
- Create: `src/application/catalog/list-reviews.usecase.ts`

Commit: `feat: add review moderation and listing use cases`

---

### Task 47: Create reviews contract and routes

**Files:**
- Create: `src/contracts/reviews.contract.ts`
- Create: `src/routes/api/reviews.routes.ts`
- Modify: `src/shared/validators.ts`
- Modify: `src/index.tsx`

Endpoints:
- `POST /api/products/:slug/reviews` — submit review (authenticated)
- `GET /api/products/:slug/reviews` — list approved reviews (public)
- `GET /api/reviews/moderation` — flagged reviews queue (admin)
- `PATCH /api/reviews/:id/moderate` — approve/reject (admin)

Commit: `feat: add reviews API routes and contract`

---

### Task 48: Type check full slice

Run `pnpm tsc --noEmit` and fix any errors.

Commit: `fix: resolve type errors in reviews slice`

---

## Slice 7: Products CSV Export

### Task 49: Create export-products-csv use case

**Files:**
- Create: `src/application/catalog/export-products-csv.usecase.ts`

```typescript
import type { Database } from "../../infrastructure/db/client";
import { products, productVariants, collectionProducts, collections } from "../../infrastructure/db/schema";
import { eq, inArray } from "drizzle-orm";

export class ExportProductsCsvUseCase {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async execute(): Promise<string> {
    const allProducts = await this.db
      .select()
      .from(products)
      .where(eq(products.storeId, this.storeId));

    if (allProducts.length === 0) return "name,sku,price,compare_at_price,inventory,type,available\n";

    const productIds = allProducts.map((p) => p.id);
    const variants = await this.db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.productId, productIds));

    const rows: string[] = [
      "name,variant_title,sku,price,compare_at_price,inventory,type,available,weight,weight_unit",
    ];

    for (const product of allProducts) {
      const productVariantsList = variants.filter(
        (v) => v.productId === product.id,
      );
      for (const variant of productVariantsList) {
        const row = [
          csvEscape(product.name),
          csvEscape(variant.title),
          csvEscape(variant.sku ?? ""),
          variant.price,
          variant.compareAtPrice ?? "",
          String(variant.inventoryQuantity ?? 0),
          product.type,
          String(variant.availableForSale ?? true),
          variant.weight ?? "",
          variant.weightUnit ?? "oz",
        ].join(",");
        rows.push(row);
      }
    }

    return rows.join("\n");
  }
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
```

Commit: `feat: add export-products-csv use case`

---

### Task 50: Create export route

**Files:**
- Modify: `src/routes/api/products.routes.ts`

Add endpoint to existing products routes:

```typescript
// GET /api/products/export/csv
products.get("/products/export/csv", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const useCase = new ExportProductsCsvUseCase(db, storeId);
  const csv = await useCase.execute();

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=products.csv",
    },
  });
});
```

Commit: `feat: add products CSV export endpoint`

---

### Task 51: Type check

Run `pnpm tsc --noEmit` and fix any errors.

Commit: `fix: resolve type errors in CSV export`

---

## Slice 8: Digital Downloads

### Task 52: Create digital download domain entities

**Files:**
- Create: `src/domain/catalog/digital-asset.entity.ts`
- Create: `src/domain/catalog/download-token.entity.ts`

Commit: `feat: add digital asset and download token entities`

---

### Task 53: Create digital downloads repository

**Files:**
- Create: `src/infrastructure/repositories/download.repository.ts`

Methods: `createAsset`, `findAssetsByProduct`, `createToken`, `findByToken`, `incrementDownloadCount`.

Commit: `feat: add digital downloads repository`

---

### Task 54: Create manage-digital-assets use case

**Files:**
- Create: `src/application/catalog/manage-digital-assets.usecase.ts`

Upload file to R2 bucket (`c.env.IMAGES`), record metadata in `digital_assets` table.

Commit: `feat: add manage-digital-assets use case`

---

### Task 55: Create generate-download-token use case

**Files:**
- Create: `src/application/catalog/generate-download-token.usecase.ts`

Called on order fulfillment for digital products. Creates token with 30-day expiry and 3 max downloads.

Commit: `feat: add generate-download-token use case`

---

### Task 56: Create redeem-download use case and route

**Files:**
- Create: `src/application/catalog/redeem-download.usecase.ts`
- Create: `src/routes/api/downloads.routes.ts`
- Modify: `src/index.tsx`

The redeem use case:
1. Find token by value
2. Check expiry and download count
3. Generate signed R2 URL (1 hour)
4. Increment `downloads_used`
5. Redirect to signed URL

Route: `GET /api/downloads/:token` — public (token is the auth)

Commit: `feat: add download redemption use case and route`

---

### Task 57: Type check full slice

Run `pnpm tsc --noEmit` and fix any errors.

Commit: `fix: resolve type errors in digital downloads slice`

---

## Slice 9: Analytics & Events

### Task 58: Create analytics domain entities

**Files:**
- Create: `src/domain/analytics/analytics-event.entity.ts`
- Create: `src/domain/analytics/daily-rollup.entity.ts`

Commit: `feat: add analytics domain entities`

---

### Task 59: Create analytics repository

**Files:**
- Create: `src/infrastructure/repositories/analytics.repository.ts`

Methods: `trackEvent` (insert), `queryRollups` (by store, date range, metric), `rollupDay` (aggregate events for a date into rollups).

Commit: `feat: add analytics repository`

---

### Task 60: Create track-event use case

**Files:**
- Create: `src/application/analytics/track-event.usecase.ts`

Lightweight — just inserts into `analytics_events`. Called from routes/middleware.

Commit: `feat: add track-event use case`

---

### Task 61: Create get-dashboard-metrics use case

**Files:**
- Create: `src/application/analytics/get-dashboard-metrics.usecase.ts`

Query `analytics_daily_rollups` for a date range. Return: revenue, order count, AOV, top products, conversion rate.

Commit: `feat: add dashboard metrics use case`

---

### Task 62: Create rollup-analytics cron job

**Files:**
- Create: `src/scheduled/rollup-analytics.job.ts`
- Modify: `src/scheduled/handler.ts`

Daily at 2am: aggregate yesterday's `analytics_events` into `analytics_daily_rollups` by event type. Register at `0 2 * * *`.

Commit: `feat: add daily analytics rollup cron job`

---

### Task 63: Create analytics contract and routes

**Files:**
- Create: `src/contracts/analytics.contract.ts`
- Create: `src/routes/api/analytics.routes.ts`
- Modify: `src/index.tsx`

Endpoints:
- `POST /api/analytics/events` — track client-side event
- `GET /api/analytics/dashboard` — dashboard metrics (admin)
- `GET /api/analytics/funnel` — conversion funnel (admin)

Commit: `feat: add analytics API routes`

---

### Task 64: Create push-to-external cron job (optional)

**Files:**
- Create: `src/scheduled/push-analytics-external.job.ts`
- Create: `src/infrastructure/analytics/segment.adapter.ts` (stub)
- Modify: `src/scheduled/handler.ts`

Every 15 minutes: batch-forward un-synced events to Segment/Mixpanel if integration is configured. Register at existing `*/15 * * * *` slot.

Commit: `feat: add external analytics push cron job with Segment adapter stub`

---

## Slice 10: Multi-Currency

### Task 65: Create currency domain entities and converter service

**Files:**
- Create: `src/domain/currency/exchange-rate.entity.ts`
- Create: `src/domain/currency/store-currency.entity.ts`
- Create: `src/domain/currency/currency-converter.service.ts`

The converter service:
```typescript
export function convertMoney(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Map<string, number>,
): number {
  if (fromCurrency === toCurrency) return amount;

  const rate = rates.get(`${fromCurrency}_${toCurrency}`);
  if (!rate) {
    throw new Error(`No exchange rate found for ${fromCurrency} → ${toCurrency}`);
  }

  return Math.round(amount * rate * 100) / 100;
}
```

Commit: `feat: add currency domain entities and converter service`

---

### Task 66: Create currency repository

**Files:**
- Create: `src/infrastructure/repositories/currency.repository.ts`

Methods: `upsertRate`, `getRates` (all rates for a base currency), `getStoreConfig`, `updateStoreConfig`.

Commit: `feat: add currency repository`

---

### Task 67: Create sync-exchange-rates cron job

**Files:**
- Create: `src/scheduled/sync-exchange-rates.job.ts`
- Modify: `src/scheduled/handler.ts`

Daily at 6am: fetch from `https://open.er-api.com/v6/latest/USD` (free, no key), upsert all rates. Register at `0 6 * * *`.

Commit: `feat: add daily exchange rate sync cron job`

---

### Task 68: Create currency routes

**Files:**
- Create: `src/routes/api/currency.routes.ts`
- Create: `src/contracts/currency.contract.ts`
- Modify: `src/index.tsx`

Endpoints:
- `GET /api/currency/rates` — current rates (public, cached)
- `PATCH /api/currency/config` — update store currency settings (admin)

Commit: `feat: add currency API routes`

---

## Final Integration (after all slices)

### Modify create-checkout.usecase.ts

After all slices are complete, update `src/application/checkout/create-checkout.usecase.ts` to orchestrate:

1. `EvaluateCartPromotionsUseCase` — get discount breakdown
2. `ReserveInventoryUseCase` — verify all items (already done at add-to-cart, but re-verify)
3. `CalculateShippingUseCase` — get shipping cost
4. `CalculateTaxUseCase` — get tax amount
5. Pass all totals to Stripe checkout session
6. `TrackEventUseCase` — track "checkout_started"

### Modify fulfill-order.usecase.ts

Update `src/application/checkout/fulfill-order.usecase.ts` to:

1. `CommitInventoryUseCase` — finalize stock decrement
2. `RedeemPromotionUseCase` — record redemption
3. `GenerateDownloadTokenUseCase` — for digital products
4. `TrackEventUseCase` — track "purchase"

Commit: `feat: integrate all commerce features into checkout flow`

---

## Summary

| Slice | Tasks | New Files | Modified Files |
|-------|-------|-----------|----------------|
| 1. Schema | 1-5 | 0 | 2 |
| 2. Inventory | 6-12 | 5 | 3 |
| 3. Promotions | 13-26 | 15 | 3 |
| 4. Shipping | 27-34 | 7 | 3 |
| 5. Tax | 35-42 | 7 | 3 |
| 6. Reviews | 43-48 | 5 | 3 |
| 7. CSV Export | 49-51 | 1 | 1 |
| 8. Downloads | 52-57 | 5 | 2 |
| 9. Analytics | 58-64 | 7 | 2 |
| 10. Currency | 65-68 | 5 | 2 |
| **Total** | **68** | **~57** | **~24** |
