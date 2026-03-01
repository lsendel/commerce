import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  integer,
  decimal,
  date,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const productTypeEnum = pgEnum("product_type", [
  "physical",
  "digital",
  "subscription",
  "bookable",
]);

export const productStatusEnum = pgEnum("product_status", ["draft", "active", "archived"]);

export const inventoryTransactionTypeEnum = pgEnum("inventory_transaction_type", [
  "adjustment", "sale", "return", "restock", "reservation", "release",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const refundStatusEnum = pgEnum("refund_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
]);

export const orderNoteTypeEnum = pgEnum("order_note_type", [
  "customer",
  "internal",
  "system",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "cancelled",
  "trialing",
  "paused",
]);

export const bookingAvailabilityStatusEnum = pgEnum(
  "booking_availability_status",
  ["available", "full", "in_progress", "completed", "closed", "canceled"],
);

export const bookingRequestStatusEnum = pgEnum("booking_request_status", [
  "cart",
  "pending_payment",
  "confirmed",
  "expired",
  "cancelled",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "confirmed",
  "checked_in",
  "cancelled",
  "no_show",
]);

export const personTypeEnum = pgEnum("person_type", ["adult", "child", "pet"]);

export const waitlistStatusEnum = pgEnum("waitlist_status", [
  "waiting",
  "notified",
  "expired",
  "converted",
]);

export const generationStatusEnum = pgEnum("generation_status", [
  "queued",
  "processing",
  "completed",
  "failed",
]);

export const aiProviderEnum = pgEnum("ai_provider", ["gemini", "flux"]);

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "pending",
  "shipped",
  "in_transit",
  "delivered",
  "returned",
]);

export const durationUnitEnum = pgEnum("duration_unit", ["minutes", "hours"]);

export const capacityTypeEnum = pgEnum("capacity_type", [
  "individual",
  "group",
]);

export const storeStatusEnum = pgEnum("store_status", [
  "trial",
  "active",
  "suspended",
  "deactivated",
]);

export const storeMemberRoleEnum = pgEnum("store_member_role", [
  "owner",
  "admin",
  "staff",
]);

export const platformRoleEnum = pgEnum("platform_role", [
  "super_admin",
  "group_admin",
  "user",
]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
]);

export const domainVerificationStatusEnum = pgEnum(
  "domain_verification_status",
  ["pending", "verified", "failed"],
);

export const affiliateStatusEnum = pgEnum("affiliate_status", [
  "pending",
  "approved",
  "suspended",
]);

export const conversionStatusEnum = pgEnum("conversion_status", [
  "pending",
  "approved",
  "paid",
  "rejected",
]);

export const attributionMethodEnum = pgEnum("attribution_method", [
  "link",
  "coupon",
  "tier",
]);

export const payoutStatusEnum = pgEnum("payout_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const fulfillmentProviderTypeEnum = pgEnum("fulfillment_provider_type", [
  "printful",
  "gooten",
  "prodigi",
  "shapeways",
]);

export const storeBillingStatusEnum = pgEnum("store_billing_status", [
  "active",
  "past_due",
  "cancelled",
  "trialing",
]);

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

export const integrationStatusEnum = pgEnum("integration_status", [
  "connected",
  "disconnected",
  "error",
  "pending_verification",
]);

export const fulfillmentRequestStatusEnum = pgEnum(
  "fulfillment_request_status",
  [
    "pending",
    "submitted",
    "processing",
    "shipped",
    "delivered",
    "cancel_requested",
    "cancelled",
    "failed",
  ],
);

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

export const loyaltyTransactionTypeEnum = pgEnum("loyalty_transaction_type", [
  "earn",
  "redeem",
  "refund",
  "adjustment",
]);

export const returnRequestTypeEnum = pgEnum("return_request_type", [
  "refund",
  "exchange",
]);

export const returnRequestStatusEnum = pgEnum("return_request_status", [
  "submitted",
  "approved",
  "rejected",
  "completed",
  "cancelled",
]);

// ─── Platform Context ───────────────────────────────────────────────────────

export const platformPlans = pgTable("platform_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  transactionFeePercent: decimal("transaction_fee_percent", {
    precision: 5,
    scale: 2,
  })
    .notNull()
    .default("5"),
  maxProducts: integer("max_products"),
  maxStaff: integer("max_staff"),
  features: jsonb("features").default({}),
  stripePriceId: text("stripe_price_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stores = pgTable(
  "stores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").unique().notNull(),
    subdomain: text("subdomain").unique(),
    customDomain: text("custom_domain"),
    logo: text("logo"),
    logoUrl: text("logo_url"),
    faviconUrl: text("favicon_url"),
    primaryColor: text("primary_color"),
    secondaryColor: text("secondary_color"),
    status: storeStatusEnum("status").default("trial"),
    planId: uuid("plan_id").references(() => platformPlans.id),
    stripeConnectAccountId: text("stripe_connect_account_id"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    subdomainIdx: index("stores_subdomain_idx").on(table.subdomain),
    customDomainIdx: index("stores_custom_domain_idx").on(table.customDomain),
  }),
);

export const storesRelations = relations(stores, ({ one, many }) => ({
  plan: one(platformPlans, {
    fields: [stores.planId],
    references: [platformPlans.id],
  }),
  members: many(storeMembers),
  domains: many(storeDomains),
  settings: many(storeSettings),
}));

export const storeMembers = pgTable(
  "store_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: storeMemberRoleEnum("role").notNull().default("staff"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueMember: uniqueIndex("store_members_store_user_idx").on(
      table.storeId,
      table.userId,
    ),
  }),
);

export const storeMembersRelations = relations(storeMembers, ({ one }) => ({
  store: one(stores, {
    fields: [storeMembers.storeId],
    references: [stores.id],
  }),
  user: one(users, {
    fields: [storeMembers.userId],
    references: [users.id],
  }),
}));

export const storeDomains = pgTable(
  "store_domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    domain: text("domain").notNull(),
    verificationStatus:
      domainVerificationStatusEnum("verification_status").default("pending"),
    verificationToken: text("verification_token"),
    isPrimary: boolean("is_primary").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    domainIdx: uniqueIndex("store_domains_domain_idx").on(table.domain),
  }),
);

export const storeDomainsRelations = relations(storeDomains, ({ one }) => ({
  store: one(stores, {
    fields: [storeDomains.storeId],
    references: [stores.id],
  }),
}));

export const storeSettings = pgTable(
  "store_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    key: text("key").notNull(),
    value: text("value"),
  },
  (table) => ({
    storeKeyIdx: uniqueIndex("store_settings_store_key_idx").on(
      table.storeId,
      table.key,
    ),
  }),
);

export const storeSettingsRelations = relations(storeSettings, ({ one }) => ({
  store: one(stores, {
    fields: [storeSettings.storeId],
    references: [stores.id],
  }),
}));

// ─── Identity Context ────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  googleSub: text("google_sub").unique(),
  appleSub: text("apple_sub").unique(),
  metaSub: text("meta_sub").unique(),
  name: text("name").notNull(),
  platformRole: platformRoleEnum("platform_role").default("user"),
  stripeCustomerId: text("stripe_customer_id"),
  emailVerifiedAt: timestamp("email_verified_at"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  locale: text("locale").default("en"),
  timezone: text("timezone").default("UTC"),
  marketingOptIn: boolean("marketing_opt_in").default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  carts: many(carts),
  orders: many(orders),
  subscriptions: many(subscriptions),
  petProfiles: many(petProfiles),
  generationJobs: many(generationJobs),
  bookingRequests: many(bookingRequests),
  bookings: many(bookings),
  reviews: many(productReviews),
}));

// ─── Auth Tokens ────────────────────────────────────────────────────────────

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  label: text("label"),
  street: text("street").notNull(),
  city: text("city").notNull(),
  state: text("state"),
  zip: text("zip").notNull(),
  country: text("country").notNull(), // 2-char ISO
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
}));

// ─── Catalog Context ─────────────────────────────────────────────────────────

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  descriptionHtml: text("description_html"),
  type: productTypeEnum("type").notNull(),
  status: productStatusEnum("status").notNull().default("active"),
  availableForSale: boolean("available_for_sale").default(true),
  downloadUrl: text("download_url"),
  stripePriceId: text("stripe_price_id"),
  printfulSyncProductId: integer("printful_sync_product_id"),
  featuredImageUrl: text("featured_image_url"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  artJobId: uuid("art_job_id").references(() => generationJobs.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  storeStatusIdx: index("products_store_status_idx").on(table.storeId, table.status),
  storeSlugIdx: index("products_store_slug_idx").on(table.storeId, table.slug),
}));

export const productsRelations = relations(products, ({ many, one }) => ({
  variants: many(productVariants),
  images: many(productImages),
  collectionProducts: many(collectionProducts),
  subscriptionPlans: many(subscriptionPlans),
  bookingSettings: one(bookingSettings),
  bookingConfig: one(bookingConfig),
  bookingAvailability: many(bookingAvailability),
  printfulSyncProduct: one(printfulSyncProducts),
  reviews: many(productReviews),
  artJob: one(generationJobs, {
    fields: [products.artJobId],
    references: [generationJobs.id],
  }),
  designPlacements: many(designPlacements),
}));

export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  title: text("title").notNull(),
  sku: text("sku").unique(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
  inventoryQuantity: integer("inventory_quantity").default(0),
  options: jsonb("options"),
  printfulSyncVariantId: integer("printful_sync_variant_id"),
  availableForSale: boolean("available_for_sale").default(true),
  weight: decimal("weight", { precision: 10, scale: 2 }),
  weightUnit: text("weight_unit").default("oz"),
  reservedQuantity: integer("reserved_quantity").default(0),
  digitalAssetKey: text("digital_asset_key"),
  fulfillmentProvider: fulfillmentProviderTypeEnum("fulfillment_provider"),
  estimatedProductionDays: integer("estimated_production_days"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  productIdx: index("product_variants_product_idx").on(table.productId),
}));

export const productVariantsRelations = relations(
  productVariants,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
    cartItems: many(cartItems),
    orderItems: many(orderItems),
    printfulSyncVariant: one(printfulSyncVariants),
  }),
);

export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  url: text("url").notNull(),
  altText: text("alt_text"),
  position: integer("position").default(0),
}, (table) => ({
  productIdx: index("product_images_product_idx").on(table.productId),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const collectionsRelations = relations(collections, ({ many }) => ({
  collectionProducts: many(collectionProducts),
}));

export const collectionProducts = pgTable(
  "collection_products",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    position: integer("position").default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.collectionId, table.productId] }),
  }),
);

export const collectionProductsRelations = relations(
  collectionProducts,
  ({ one }) => ({
    collection: one(collections, {
      fields: [collectionProducts.collectionId],
      references: [collections.id],
    }),
    product: one(products, {
      fields: [collectionProducts.productId],
      references: [products.id],
    }),
  }),
);

// ─── Cart Context ────────────────────────────────────────────────────────────

export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  userId: uuid("user_id").references(() => users.id),
  sessionId: text("session_id").notNull(),
  couponCodeId: uuid("coupon_code_id").references(() => couponCodes.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
  items: many(cartItems),
}));

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),
    quantity: integer("quantity").notNull().default(1),
    bookingAvailabilityId: uuid("booking_availability_id").references(
      () => bookingAvailability.id,
    ),
    personTypeQuantities: jsonb("person_type_quantities"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    cartIdx: index("cart_items_cart_id_idx").on(table.cartId),
  }),
);

export const cartItemsRelations = relations(cartItems, ({ one, many }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
  bookingAvailability: one(bookingAvailability, {
    fields: [cartItems.bookingAvailabilityId],
    references: [bookingAvailability.id],
  }),
  bookingRequests: many(bookingRequests),
}));

// ─── Checkout Context ────────────────────────────────────────────────────────

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    status: orderStatusEnum("status").default("pending"),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
    shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default(
      "0",
    ),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    shippingAddress: jsonb("shipping_address"),
    discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
    couponCode: text("coupon_code"),
    currency: text("currency").default("USD"),
    exchangeRate: decimal("exchange_rate", { precision: 12, scale: 6 }),
    notes: text("notes"),
    internalNotes: text("internal_notes"),
    cancelReason: text("cancel_reason"),
    cancelledAt: timestamp("cancelled_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdx: index("orders_user_idx").on(table.userId),
    storeUserIdx: index("orders_store_user_idx").on(table.storeId, table.userId),
    storeStatusIdx: index("orders_store_status_idx").on(table.storeId, table.status),
    stripeSessionIdx: index("orders_stripe_session_idx").on(table.stripeCheckoutSessionId),
    stripePaymentIdx: index("orders_stripe_payment_idx").on(table.stripePaymentIntentId),
  }),
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
  shipments: many(shipments),
  bookingRequests: many(bookingRequests),
  fulfillmentRequests: many(fulfillmentRequests),
  refunds: many(refunds),
  notes: many(orderNotes),
  loyaltyTransactions: many(loyaltyTransactions),
}));

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    variantId: uuid("variant_id").references(() => productVariants.id),
    productName: text("product_name").notNull(),
    variantTitle: text("variant_title"),
    quantity: integer("quantity").notNull(),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").default("USD"),
    bookingAvailabilityId: uuid("booking_availability_id").references(
      () => bookingAvailability.id,
    ),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    orderIdx: index("order_items_order_idx").on(table.orderId),
  }),
);

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
  bookingAvailability: one(bookingAvailability, {
    fields: [orderItems.bookingAvailabilityId],
    references: [bookingAvailability.id],
  }),
  booking: one(bookings),
}));

// ─── Refunds ─────────────────────────────────────────────────────────────────

export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    fulfillmentRequestId: uuid("fulfillment_request_id").references(
      () => fulfillmentRequests.id,
    ),
    stripeRefundId: text("stripe_refund_id"),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    reason: text("reason"),
    status: refundStatusEnum("status").notNull().default("pending"),
    lineItems: jsonb("line_items"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    processedAt: timestamp("processed_at"),
  },
  (table) => ({
    orderIdx: index("refunds_order_idx").on(table.orderId),
    storeIdx: index("refunds_store_idx").on(table.storeId),
  }),
);

export const refundsRelations = relations(refunds, ({ one }) => ({
  order: one(orders, {
    fields: [refunds.orderId],
    references: [orders.id],
  }),
  fulfillmentRequest: one(fulfillmentRequests, {
    fields: [refunds.fulfillmentRequestId],
    references: [fulfillmentRequests.id],
  }),
}));

export const orderReturnRequests = pgTable(
  "order_return_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    type: returnRequestTypeEnum("type").notNull(),
    status: returnRequestStatusEnum("status").notNull().default("submitted"),
    reason: text("reason"),
    requestedItems: jsonb("requested_items").notNull().default([]),
    exchangeItems: jsonb("exchange_items").default([]),
    refundAmount: decimal("refund_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    creditAmount: decimal("credit_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    instantExchange: boolean("instant_exchange").notNull().default(false),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    processedAt: timestamp("processed_at"),
  },
  (table) => ({
    storeIdx: index("order_return_requests_store_idx").on(table.storeId),
    orderIdx: index("order_return_requests_order_idx").on(table.orderId),
    userIdx: index("order_return_requests_user_idx").on(table.userId),
  }),
);

export const orderReturnRequestsRelations = relations(
  orderReturnRequests,
  ({ one }) => ({
    order: one(orders, {
      fields: [orderReturnRequests.orderId],
      references: [orders.id],
    }),
    user: one(users, {
      fields: [orderReturnRequests.userId],
      references: [users.id],
    }),
    store: one(stores, {
      fields: [orderReturnRequests.storeId],
      references: [stores.id],
    }),
  }),
);

// ─── Order Notes ─────────────────────────────────────────────────────────────

export const orderNotes = pgTable(
  "order_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    userId: uuid("user_id"),
    type: orderNoteTypeEnum("type").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orderIdx: index("order_notes_order_idx").on(table.orderId),
  }),
);

export const orderNotesRelations = relations(orderNotes, ({ one }) => ({
  order: one(orders, {
    fields: [orderNotes.orderId],
    references: [orders.id],
  }),
}));

export const loyaltyTiers = pgTable("loyalty_tiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  name: text("name").notNull(),
  minPoints: integer("min_points").notNull().default(0),
  multiplier: decimal("multiplier", { precision: 5, scale: 2 })
    .notNull()
    .default("1.00"),
  benefits: jsonb("benefits").default([]),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  storeMinPointsIdx: index("loyalty_tiers_store_min_points_idx").on(table.storeId, table.minPoints),
  storeNameUnique: uniqueIndex("loyalty_tiers_store_name_unique").on(table.storeId, table.name),
}));

export const loyaltyWallets = pgTable("loyalty_wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  availablePoints: integer("available_points").notNull().default(0),
  lifetimeEarned: integer("lifetime_earned").notNull().default(0),
  lifetimeRedeemed: integer("lifetime_redeemed").notNull().default(0),
  currentTierId: uuid("current_tier_id").references(() => loyaltyTiers.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  storeUserUnique: uniqueIndex("loyalty_wallets_store_user_unique").on(table.storeId, table.userId),
  storeTierIdx: index("loyalty_wallets_store_tier_idx").on(table.storeId, table.currentTierId),
}));

export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  walletId: uuid("wallet_id")
    .notNull()
    .references(() => loyaltyWallets.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  type: loyaltyTransactionTypeEnum("type").notNull(),
  points: integer("points").notNull(),
  description: text("description"),
  sourceOrderId: uuid("source_order_id").references(() => orders.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  walletCreatedIdx: index("loyalty_transactions_wallet_created_idx").on(table.walletId, table.createdAt),
  userCreatedIdx: index("loyalty_transactions_user_created_idx").on(table.userId, table.createdAt),
  walletOrderTypeUnique: uniqueIndex("loyalty_transactions_wallet_order_type_unique")
    .on(table.walletId, table.sourceOrderId, table.type),
}));

export const loyaltyTiersRelations = relations(loyaltyTiers, ({ one, many }) => ({
  store: one(stores, {
    fields: [loyaltyTiers.storeId],
    references: [stores.id],
  }),
  wallets: many(loyaltyWallets),
}));

export const loyaltyWalletsRelations = relations(loyaltyWallets, ({ one, many }) => ({
  store: one(stores, {
    fields: [loyaltyWallets.storeId],
    references: [stores.id],
  }),
  user: one(users, {
    fields: [loyaltyWallets.userId],
    references: [users.id],
  }),
  tier: one(loyaltyTiers, {
    fields: [loyaltyWallets.currentTierId],
    references: [loyaltyTiers.id],
  }),
  transactions: many(loyaltyTransactions),
}));

export const loyaltyTransactionsRelations = relations(loyaltyTransactions, ({ one }) => ({
  store: one(stores, {
    fields: [loyaltyTransactions.storeId],
    references: [stores.id],
  }),
  wallet: one(loyaltyWallets, {
    fields: [loyaltyTransactions.walletId],
    references: [loyaltyWallets.id],
  }),
  user: one(users, {
    fields: [loyaltyTransactions.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [loyaltyTransactions.sourceOrderId],
    references: [orders.id],
  }),
}));

// ─── Billing Context ─────────────────────────────────────────────────────────

export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  billingPeriod: text("billing_period").notNull(),
  billingInterval: integer("billing_interval").default(1),
  trialDays: integer("trial_days").default(0),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptionPlansRelations = relations(
  subscriptionPlans,
  ({ one, many }) => ({
    product: one(products, {
      fields: [subscriptionPlans.productId],
      references: [products.id],
    }),
    subscriptions: many(subscriptions),
  }),
);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  planId: uuid("plan_id")
    .notNull()
    .references(() => subscriptionPlans.id),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeCustomerId: text("stripe_customer_id"),
  status: subscriptionStatusEnum("status").default("active"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  mixConfiguration: jsonb("mix_configuration"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("subscriptions_user_idx").on(table.userId),
}));

export const subscriptionsRelations = relations(
  subscriptions,
  ({ one }) => ({
    user: one(users, {
      fields: [subscriptions.userId],
      references: [users.id],
    }),
    plan: one(subscriptionPlans, {
      fields: [subscriptions.planId],
      references: [subscriptionPlans.id],
    }),
  }),
);

// ─── Booking Context ─────────────────────────────────────────────────────────

export const bookingSettings = pgTable("booking_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .unique()
    .references(() => products.id),
  duration: integer("duration").notNull(),
  durationUnit: durationUnitEnum("duration_unit").default("minutes"),
  capacityType: capacityTypeEnum("capacity_type").default("individual"),
  capacityPerSlot: integer("capacity_per_slot").notNull(),
  cutOffTime: integer("cut_off_time").default(24),
  cutOffUnit: durationUnitEnum("cut_off_unit").default("hours"),
  maxAdvanceTime: integer("max_advance_time").default(90),
  maxAdvanceUnit: text("max_advance_unit").default("days"),
  minParticipants: integer("min_participants").default(1),
  enableWaitlist: boolean("enable_waitlist").default(false),
  enablePrivateEvent: boolean("enable_private_event").default(false),
  minPrivateSize: integer("min_private_size"),
  maxPrivateSize: integer("max_private_size"),
});

export const bookingSettingsRelations = relations(
  bookingSettings,
  ({ one }) => ({
    product: one(products, {
      fields: [bookingSettings.productId],
      references: [products.id],
    }),
  }),
);

export const bookingConfig = pgTable("booking_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .unique()
    .references(() => products.id),
  venueId: uuid("venue_id").references(() => venues.id),
  location: text("location"),
  included: jsonb("included"),
  notIncluded: jsonb("not_included"),
  itinerary: jsonb("itinerary"),
  faqs: jsonb("faqs"),
  cancellationPolicy: text("cancellation_policy"),
});

export const bookingConfigRelations = relations(bookingConfig, ({ one }) => ({
  product: one(products, {
    fields: [bookingConfig.productId],
    references: [products.id],
  }),
}));

export const bookingAvailability = pgTable(
  "booking_availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    totalCapacity: integer("total_capacity").notNull(),
    slotDate: text("slot_date").notNull(), // YYYY-MM-DD
    slotTime: text("slot_time").notNull(), // HH:MM
    slotDatetime: timestamp("slot_datetime").notNull(),
    reservedCount: integer("reserved_count").default(0),
    status: bookingAvailabilityStatusEnum("status").default("available"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    productDateIdx: index("booking_availability_product_date_idx").on(
      table.productId,
      table.slotDate,
    ),
    storeDatetimeIdx: index("booking_availability_store_datetime_idx").on(
      table.storeId,
      table.slotDatetime,
    ),
  }),
);

export const bookingAvailabilityRelations = relations(
  bookingAvailability,
  ({ one, many }) => ({
    product: one(products, {
      fields: [bookingAvailability.productId],
      references: [products.id],
    }),
    prices: many(bookingAvailabilityPrices),
    bookingRequests: many(bookingRequests),
    bookings: many(bookings),
    cartItems: many(cartItems),
    orderItems: many(orderItems),
  }),
);

export const bookingAvailabilityPrices = pgTable(
  "booking_availability_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    availabilityId: uuid("availability_id")
      .notNull()
      .references(() => bookingAvailability.id),
    personType: personTypeEnum("person_type").notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  },
);

export const bookingAvailabilityPricesRelations = relations(
  bookingAvailabilityPrices,
  ({ one }) => ({
    availability: one(bookingAvailability, {
      fields: [bookingAvailabilityPrices.availabilityId],
      references: [bookingAvailability.id],
    }),
  }),
);

export const bookingRequests = pgTable("booking_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  availabilityId: uuid("availability_id")
    .notNull()
    .references(() => bookingAvailability.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  status: bookingRequestStatusEnum("status").default("cart"),
  quantity: integer("quantity").notNull(),
  expiresAt: timestamp("expires_at"),
  orderId: uuid("order_id").references(() => orders.id),
  cartItemId: uuid("cart_item_id").references(() => cartItems.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userStatusIdx: index("booking_requests_user_status_idx").on(table.userId, table.status),
  availabilityStatusIdx: index("booking_requests_availability_status_idx").on(table.availabilityId, table.status),
}));

export const bookingRequestsRelations = relations(
  bookingRequests,
  ({ one }) => ({
    availability: one(bookingAvailability, {
      fields: [bookingRequests.availabilityId],
      references: [bookingAvailability.id],
    }),
    user: one(users, {
      fields: [bookingRequests.userId],
      references: [users.id],
    }),
    order: one(orders, {
      fields: [bookingRequests.orderId],
      references: [orders.id],
    }),
    cartItem: one(cartItems, {
      fields: [bookingRequests.cartItemId],
      references: [cartItems.id],
    }),
  }),
);

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  orderItemId: uuid("order_item_id").references(() => orderItems.id),
  bookingRequestId: uuid("booking_request_id").references(() => bookingRequests.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  bookingAvailabilityId: uuid("booking_availability_id")
    .notNull()
    .references(() => bookingAvailability.id),
  status: bookingStatusEnum("status").default("confirmed"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  availabilityIdx: index("bookings_availability_idx").on(table.bookingAvailabilityId),
  storeStatusIdx: index("bookings_store_status_idx").on(table.storeId, table.status),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  orderItem: one(orderItems, {
    fields: [bookings.orderItemId],
    references: [orderItems.id],
  }),
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  bookingAvailability: one(bookingAvailability, {
    fields: [bookings.bookingAvailabilityId],
    references: [bookingAvailability.id],
  }),
  items: many(bookingItems),
}));

export const bookingItems = pgTable("booking_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id),
  personType: personTypeEnum("person_type").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

export const bookingItemsRelations = relations(bookingItems, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingItems.bookingId],
    references: [bookings.id],
  }),
}));

export const bookingWaitlist = pgTable("booking_waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  availabilityId: uuid("availability_id")
    .notNull()
    .references(() => bookingAvailability.id),
  position: integer("position").notNull(),
  status: waitlistStatusEnum("status").notNull().default("waiting"),
  notifiedAt: timestamp("notified_at"),
  expiredAt: timestamp("expired_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  availabilityStatusIdx: index("booking_waitlist_availability_status_idx").on(
    table.availabilityId,
    table.status,
  ),
}));

export const bookingWaitlistRelations = relations(bookingWaitlist, ({ one }) => ({
  user: one(users, {
    fields: [bookingWaitlist.userId],
    references: [users.id],
  }),
  availability: one(bookingAvailability, {
    fields: [bookingWaitlist.availabilityId],
    references: [bookingAvailability.id],
  }),
}));

// ─── AI Studio Context ───────────────────────────────────────────────────────

export const petProfiles = pgTable("pet_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  species: text("species").notNull(),
  breed: text("breed"),
  photoUrl: text("photo_url"),
  photoStorageKey: text("photo_storage_key"),
  dateOfBirth: timestamp("date_of_birth"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const petProfilesRelations = relations(
  petProfiles,
  ({ one, many }) => ({
    user: one(users, {
      fields: [petProfiles.userId],
      references: [users.id],
    }),
    generationJobs: many(generationJobs),
  }),
);

export const artTemplates = pgTable("art_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  stylePrompt: text("style_prompt").notNull(),
  previewImageUrl: text("preview_image_url"),
  category: text("category"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const artTemplatesRelations = relations(artTemplates, ({ many }) => ({
  generationJobs: many(generationJobs),
}));

export const generationJobs = pgTable("generation_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  petProfileId: uuid("pet_profile_id")
    .notNull()
    .references(() => petProfiles.id),
  templateId: uuid("template_id").references(() => artTemplates.id),
  status: generationStatusEnum("status").default("queued"),
  inputImageUrl: text("input_image_url"),
  outputSvgUrl: text("output_svg_url"),
  outputRasterUrl: text("output_raster_url"),
  provider: aiProviderEnum("provider"),
  prompt: text("prompt"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userStatusIdx: index("generation_jobs_user_status_idx").on(table.userId, table.status),
  storeStatusIdx: index("generation_jobs_store_status_idx").on(table.storeId, table.status),
}));

export const generationJobsRelations = relations(
  generationJobs,
  ({ one }) => ({
    user: one(users, {
      fields: [generationJobs.userId],
      references: [users.id],
    }),
    petProfile: one(petProfiles, {
      fields: [generationJobs.petProfileId],
      references: [petProfiles.id],
    }),
    template: one(artTemplates, {
      fields: [generationJobs.templateId],
      references: [artTemplates.id],
    }),
  }),
);

// ─── Fulfillment Context ─────────────────────────────────────────────────────

export const printfulSyncProducts = pgTable("printful_sync_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  printfulId: integer("printful_id").unique().notNull(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  externalId: text("external_id"),
  syncedAt: timestamp("synced_at"),
});

export const printfulSyncProductsRelations = relations(
  printfulSyncProducts,
  ({ one }) => ({
    product: one(products, {
      fields: [printfulSyncProducts.productId],
      references: [products.id],
    }),
  }),
);

export const printfulSyncVariants = pgTable("printful_sync_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  printfulId: integer("printful_id").unique().notNull(),
  variantId: uuid("variant_id")
    .notNull()
    .references(() => productVariants.id),
  printfulProductId: integer("printful_product_id"),
  syncedAt: timestamp("synced_at"),
});

export const printfulSyncVariantsRelations = relations(
  printfulSyncVariants,
  ({ one }) => ({
    variant: one(productVariants, {
      fields: [printfulSyncVariants.variantId],
      references: [productVariants.id],
    }),
  }),
);

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  fulfillmentRequestId: uuid("fulfillment_request_id").references(
    () => fulfillmentRequests.id,
  ),
  carrier: text("carrier"),
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  status: shipmentStatusEnum("status").default("pending"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  orderIdx: index("shipments_order_idx").on(table.orderId),
}));

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  order: one(orders, {
    fields: [shipments.orderId],
    references: [orders.id],
  }),
}));

export const productReviews = pgTable("product_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  title: text("title"),
  content: text("content"),
  isVerifiedPurchase: boolean("is_verified_purchase").default(false),
  verifiedPurchaseOrderId: uuid("verified_purchase_order_id").references(() => orders.id),
  status: reviewStatusEnum("status").default("approved"),
  moderatedAt: timestamp("moderated_at"),
  responseText: text("response_text"),
  responseAt: timestamp("response_at"),
  helpfulCount: integer("helpful_count").default(0),
  reportedCount: integer("reported_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  productUserIdx: uniqueIndex("reviews_product_user_idx").on(table.productId, table.userId),
  storeStatusIdx: index("reviews_store_status_idx").on(table.storeId, table.status),
}));

export const productReviewsRelations = relations(productReviews, ({ one }) => ({
  product: one(products, {
    fields: [productReviews.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [productReviews.userId],
    references: [users.id],
  }),
}));

// ─── Store Billing Context (Phase 2) ────────────────────────────────────────

export const storeBilling = pgTable("store_billing", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .unique()
    .references(() => stores.id),
  platformPlanId: uuid("platform_plan_id")
    .notNull()
    .references(() => platformPlans.id),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeCustomerId: text("stripe_customer_id"),
  status: storeBillingStatusEnum("status").default("trialing"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const storeBillingRelations = relations(storeBilling, ({ one }) => ({
  store: one(stores, {
    fields: [storeBilling.storeId],
    references: [stores.id],
  }),
  plan: one(platformPlans, {
    fields: [storeBilling.platformPlanId],
    references: [platformPlans.id],
  }),
}));

export const platformTransactions = pgTable("platform_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  orderTotal: decimal("order_total", { precision: 10, scale: 2 }).notNull(),
  platformFeePercent: decimal("platform_fee_percent", {
    precision: 5,
    scale: 2,
  }).notNull(),
  platformFeeAmount: decimal("platform_fee_amount", {
    precision: 10,
    scale: 2,
  }).notNull(),
  stripeTransferId: text("stripe_transfer_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  storeCreatedIdx: index("platform_transactions_store_created_idx").on(table.storeId, table.createdAt),
}));

export const platformTransactionsRelations = relations(
  platformTransactions,
  ({ one }) => ({
    store: one(stores, {
      fields: [platformTransactions.storeId],
      references: [stores.id],
    }),
    order: one(orders, {
      fields: [platformTransactions.orderId],
      references: [orders.id],
    }),
  }),
);

// ─── Multi-Provider Fulfillment Context (Phase 3) ───────────────────────────

export const fulfillmentProviders = pgTable(
  "fulfillment_providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    name: text("name").notNull(),
    type: fulfillmentProviderTypeEnum("type").notNull(),
    apiKey: text("api_key"),
    apiSecret: text("api_secret"),
    isActive: boolean("is_active").default(true),
    config: jsonb("config").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    storeTypeIdx: index("fulfillment_providers_store_type_idx").on(
      table.storeId,
      table.type,
    ),
  }),
);

export const fulfillmentProvidersRelations = relations(
  fulfillmentProviders,
  ({ one, many }) => ({
    store: one(stores, {
      fields: [fulfillmentProviders.storeId],
      references: [stores.id],
    }),
    productMappings: many(providerProductMappings),
  }),
);

export const providerProductMappings = pgTable(
  "provider_product_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => fulfillmentProviders.id),
    externalProductId: text("external_product_id"),
    externalVariantId: text("external_variant_id"),
    costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    variantProviderIdx: uniqueIndex(
      "provider_product_mappings_variant_provider_idx",
    ).on(table.variantId, table.providerId),
  }),
);

export const providerProductMappingsRelations = relations(
  providerProductMappings,
  ({ one }) => ({
    variant: one(productVariants, {
      fields: [providerProductMappings.variantId],
      references: [productVariants.id],
    }),
    provider: one(fulfillmentProviders, {
      fields: [providerProductMappings.providerId],
      references: [fulfillmentProviders.id],
    }),
  }),
);

export const designPlacements = pgTable("design_placements", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  area: text("area").notNull(),
  imageUrl: text("image_url").notNull(),
  x: integer("x").default(0),
  y: integer("y").default(0),
  scale: decimal("scale", { precision: 5, scale: 3 }).default("1.000"),
  rotation: integer("rotation").default(0),
  printAreaId: text("print_area_id"),
  providerMeta: jsonb("provider_meta"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const designPlacementsRelations = relations(
  designPlacements,
  ({ one }) => ({
    product: one(products, {
      fields: [designPlacements.productId],
      references: [products.id],
    }),
  }),
);

// ─── Fulfillment Requests Context ───────────────────────────────────────────

export const fulfillmentRequests = pgTable(
  "fulfillment_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    provider: fulfillmentProviderTypeEnum("provider").notNull(),
    providerId: uuid("provider_id").references(() => fulfillmentProviders.id),
    externalId: text("external_id"),
    status: fulfillmentRequestStatusEnum("status").default("pending"),
    itemsSnapshot: jsonb("items_snapshot"),
    costEstimatedTotal: decimal("cost_estimated_total", {
      precision: 10,
      scale: 2,
    }),
    costActualTotal: decimal("cost_actual_total", {
      precision: 10,
      scale: 2,
    }),
    costShipping: decimal("cost_shipping", { precision: 10, scale: 2 }),
    costTax: decimal("cost_tax", { precision: 10, scale: 2 }),
    currency: text("currency").default("USD"),
    refundStripeId: text("refund_stripe_id"),
    refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
    refundStatus: text("refund_status"),
    errorMessage: text("error_message"),
    submittedAt: timestamp("submitted_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orderIdx: index("fulfillment_requests_order_idx").on(table.orderId),
    providerExternalIdx: index("fulfillment_requests_provider_external_idx").on(
      table.provider,
      table.externalId,
    ),
  }),
);

export const fulfillmentRequestsRelations = relations(
  fulfillmentRequests,
  ({ one, many }) => ({
    order: one(orders, {
      fields: [fulfillmentRequests.orderId],
      references: [orders.id],
    }),
    provider_: one(fulfillmentProviders, {
      fields: [fulfillmentRequests.providerId],
      references: [fulfillmentProviders.id],
    }),
    items: many(fulfillmentRequestItems),
  }),
);

export const fulfillmentRequestItems = pgTable("fulfillment_request_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  fulfillmentRequestId: uuid("fulfillment_request_id")
    .notNull()
    .references(() => fulfillmentRequests.id, { onDelete: "cascade" }),
  orderItemId: uuid("order_item_id").references(() => orderItems.id),
  providerLineId: text("provider_line_id"),
  quantity: integer("quantity").notNull(),
  status: text("status"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  requestIdx: index("fulfillment_request_items_request_idx").on(table.fulfillmentRequestId),
  orderItemIdx: index("fulfillment_request_items_order_item_idx").on(table.orderItemId),
}));

export const fulfillmentRequestItemsRelations = relations(
  fulfillmentRequestItems,
  ({ one }) => ({
    request: one(fulfillmentRequests, {
      fields: [fulfillmentRequestItems.fulfillmentRequestId],
      references: [fulfillmentRequests.id],
    }),
    orderItem: one(orderItems, {
      fields: [fulfillmentRequestItems.orderItemId],
      references: [orderItems.id],
    }),
  }),
);

export const providerEvents = pgTable(
  "provider_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    provider: text("provider").notNull(),
    externalEventId: text("external_event_id"),
    externalOrderId: text("external_order_id"),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload"),
    receivedAt: timestamp("received_at").defaultNow(),
    processedAt: timestamp("processed_at"),
    errorMessage: text("error_message"),
  },
  (table) => ({
    providerEventIdx: uniqueIndex("provider_events_provider_event_idx")
      .on(table.provider, table.externalEventId),
  }),
);

export const providerEventsRelations = relations(
  providerEvents,
  ({ one }) => ({
    store: one(stores, {
      fields: [providerEvents.storeId],
      references: [stores.id],
    }),
  }),
);

// ─── Provider Health Snapshots ───────────────────────────────────────────────

export const providerHealthSnapshots = pgTable("provider_health_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  provider: text("provider").notNull(),
  period: date("period").notNull(),
  totalRequests: integer("total_requests").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  avgResponseMs: integer("avg_response_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  storeProviderPeriodIdx: uniqueIndex("health_store_provider_period_idx").on(table.storeId, table.provider, table.period),
}));

export const providerHealthSnapshotsRelations = relations(providerHealthSnapshots, ({ one }) => ({
  store: one(stores, {
    fields: [providerHealthSnapshots.storeId],
    references: [stores.id],
  }),
}));

// ─── Download Tokens (Digital Products) ─────────────────────────────────────

export const downloadTokens = pgTable(
  "download_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    orderItemId: uuid("order_item_id").references(() => orderItems.id),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    downloadedAt: timestamp("downloaded_at"),
    revoked: boolean("revoked").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("download_tokens_token_idx").on(table.token),
  }),
);

export const downloadTokensRelations = relations(
  downloadTokens,
  ({ one }) => ({
    store: one(stores, {
      fields: [downloadTokens.storeId],
      references: [stores.id],
    }),
    user: one(users, {
      fields: [downloadTokens.userId],
      references: [users.id],
    }),
    order: one(orders, {
      fields: [downloadTokens.orderId],
      references: [orders.id],
    }),
    orderItem: one(orderItems, {
      fields: [downloadTokens.orderItemId],
      references: [orderItems.id],
    }),
  }),
);

// ─── Affiliate Context (Phase 4) ────────────────────────────────────────────

export const affiliateTiers = pgTable("affiliate_tiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  name: text("name").notNull(),
  level: integer("level").notNull(),
  commissionRate: decimal("commission_rate", {
    precision: 5,
    scale: 2,
  }).notNull(),
  bonusRate: decimal("bonus_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  minSales: integer("min_sales").default(0),
  minRevenue: decimal("min_revenue", { precision: 10, scale: 2 }).default("0"),
  minimumPayoutAmount: decimal("minimum_payout_amount", { precision: 10, scale: 2 }).default("25.00"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const affiliateTiersRelations = relations(
  affiliateTiers,
  ({ one, many }) => ({
    store: one(stores, {
      fields: [affiliateTiers.storeId],
      references: [stores.id],
    }),
    affiliates: many(affiliates),
  }),
);

export const affiliates = pgTable(
  "affiliates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    status: affiliateStatusEnum("status").default("pending"),
    referralCode: text("referral_code").unique().notNull(),
    customSlug: text("custom_slug"),
    commissionRate: decimal("commission_rate", {
      precision: 5,
      scale: 2,
    }).notNull(),
    parentAffiliateId: uuid("parent_affiliate_id").references((): AnyPgColumn => affiliates.id),
    tierId: uuid("tier_id").references(() => affiliateTiers.id),
    payoutEmail: text("payout_email"),
    totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    totalClicks: integer("total_clicks").notNull().default(0),
    totalConversions: integer("total_conversions").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    storeUserIdx: uniqueIndex("affiliates_store_user_idx").on(
      table.storeId,
      table.userId,
    ),
    referralCodeIdx: index("affiliates_referral_code_idx").on(
      table.referralCode,
    ),
  }),
);

export const affiliatesRelations = relations(
  affiliates,
  ({ one, many }) => ({
    user: one(users, {
      fields: [affiliates.userId],
      references: [users.id],
    }),
    store: one(stores, {
      fields: [affiliates.storeId],
      references: [stores.id],
    }),
    tier: one(affiliateTiers, {
      fields: [affiliates.tierId],
      references: [affiliateTiers.id],
    }),
    parent: one(affiliates, {
      fields: [affiliates.parentAffiliateId],
      references: [affiliates.id],
      relationName: "parentAffiliate",
    }),
    children: many(affiliates, { relationName: "parentAffiliate" }),
    links: many(affiliateLinks),
    conversions: many(affiliateConversions),
    payouts: many(affiliatePayouts),
  }),
);

export const affiliateLinks = pgTable("affiliate_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  affiliateId: uuid("affiliate_id")
    .notNull()
    .references(() => affiliates.id),
  targetUrl: text("target_url").notNull(),
  shortCode: text("short_code").unique().notNull(),
  clickCount: integer("click_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const affiliateLinksRelations = relations(
  affiliateLinks,
  ({ one, many }) => ({
    affiliate: one(affiliates, {
      fields: [affiliateLinks.affiliateId],
      references: [affiliates.id],
    }),
    clicks: many(affiliateClicks),
  }),
);

export const affiliateClicks = pgTable(
  "affiliate_clicks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    linkId: uuid("link_id")
      .notNull()
      .references(() => affiliateLinks.id),
    ip: text("ip"),
    userAgent: text("user_agent"),
    referrer: text("referrer"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    linkCreatedIdx: index("affiliate_clicks_link_created_idx").on(
      table.linkId,
      table.createdAt,
    ),
  }),
);

export const affiliateClicksRelations = relations(
  affiliateClicks,
  ({ one }) => ({
    link: one(affiliateLinks, {
      fields: [affiliateClicks.linkId],
      references: [affiliateLinks.id],
    }),
  }),
);

export const affiliateConversions = pgTable("affiliate_conversions", {
  id: uuid("id").primaryKey().defaultRandom(),
  affiliateId: uuid("affiliate_id")
    .notNull()
    .references(() => affiliates.id),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  orderTotal: decimal("order_total", { precision: 10, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", {
    precision: 10,
    scale: 2,
  }).notNull(),
  status: conversionStatusEnum("status").default("pending"),
  attributionMethod: attributionMethodEnum("attribution_method").notNull(),
  clickId: uuid("click_id").references(() => affiliateClicks.id),
  couponCode: text("coupon_code"),
  parentConversionId: uuid("parent_conversion_id").references((): AnyPgColumn => affiliateConversions.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  affiliateStatusIdx: index("conversions_affiliate_status_idx").on(table.affiliateId, table.status),
  orderIdx: index("conversions_order_idx").on(table.orderId),
}));

export const affiliateConversionsRelations = relations(
  affiliateConversions,
  ({ one }) => ({
    affiliate: one(affiliates, {
      fields: [affiliateConversions.affiliateId],
      references: [affiliates.id],
    }),
    order: one(orders, {
      fields: [affiliateConversions.orderId],
      references: [orders.id],
    }),
    click: one(affiliateClicks, {
      fields: [affiliateConversions.clickId],
      references: [affiliateClicks.id],
    }),
  }),
);

export const affiliatePayouts = pgTable("affiliate_payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  affiliateId: uuid("affiliate_id")
    .notNull()
    .references(() => affiliates.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  stripeTransferId: text("stripe_transfer_id"),
  status: payoutStatusEnum("status").default("pending"),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const affiliatePayoutsRelations = relations(
  affiliatePayouts,
  ({ one }) => ({
    affiliate: one(affiliates, {
      fields: [affiliatePayouts.affiliateId],
      references: [affiliates.id],
    }),
  }),
);

// ─── Venue Context (Phase 5) ────────────────────────────────────────────────

export const venues = pgTable(
  "venues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    state: text("state"),
    country: text("country").notNull(),
    postalCode: text("postal_code").notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    amenities: jsonb("amenities").default([]),
    photos: jsonb("photos").default([]),
    capacity: integer("capacity"),
    description: text("description"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    storeSlugIdx: uniqueIndex("venues_store_slug_idx").on(
      table.storeId,
      table.slug,
    ),
    cityIdx: index("venues_city_idx").on(table.city),
  }),
);

export const venuesRelations = relations(venues, ({ one }) => ({
  store: one(stores, {
    fields: [venues.storeId],
    references: [stores.id],
  }),
}));

// ─── Integration Management ─────────────────────────────────────────────────

export const platformIntegrations = pgTable(
  "platform_integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").references(() => stores.id),
    provider: integrationProviderEnum("provider").notNull(),
    enabled: boolean("enabled").default(true),
    config: jsonb("config").default({}),
    status: integrationStatusEnum("status").default("disconnected"),
    statusMessage: text("status_message"),
    lastVerifiedAt: timestamp("last_verified_at"),
    lastSyncAt: timestamp("last_sync_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    storeProviderIdx: uniqueIndex("integrations_store_provider_idx").on(
      table.storeId,
      table.provider,
    ),
  }),
);

export const platformIntegrationsRelations = relations(
  platformIntegrations,
  ({ one, many }) => ({
    store: one(stores, {
      fields: [platformIntegrations.storeId],
      references: [stores.id],
    }),
    secrets: many(integrationSecrets),
  }),
);

export const integrationSecrets = pgTable(
  "integration_secrets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    integrationId: uuid("integration_id")
      .notNull()
      .references(() => platformIntegrations.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    encryptedValue: text("encrypted_value").notNull(),
    iv: text("iv").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    integrationKeyIdx: uniqueIndex("secrets_integration_key_idx").on(
      table.integrationId,
      table.key,
    ),
  }),
);

export const integrationSecretsRelations = relations(
  integrationSecrets,
  ({ one }) => ({
    integration: one(platformIntegrations, {
      fields: [integrationSecrets.integrationId],
      references: [platformIntegrations.id],
    }),
  }),
);

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
    codeLookupIdx: index("coupon_codes_code_idx").on(table.code),
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
}, (table) => ({
  promotionIdx: index("redemptions_promotion_idx").on(table.promotionId),
  orderIdx: index("redemptions_order_idx").on(table.orderId),
}));

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
    storeCreatedIdx: index("analytics_events_store_created_idx").on(
      table.storeId,
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

export const funnelStepEnum = pgEnum("funnel_step", [
  "page_view", "product_view", "add_to_cart", "checkout_started", "order_completed",
]);

export const analyticsFunnels = pgTable("analytics_funnels", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  sessionId: text("session_id").notNull(),
  step: funnelStepEnum("step").notNull(),
  productId: uuid("product_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  storeStepIdx: index("funnels_store_step_idx").on(table.storeId, table.step, table.createdAt),
  sessionIdx: index("funnels_session_idx").on(table.sessionId),
}));

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

// Note: downloadTokens table already exists in Fulfillment Requests Context above.
// It will be extended with digitalAssetId FK in Slice 8 (Digital Downloads).

// ─── Redirects ──────────────────────────────────────────────────────────────

export const redirects = pgTable("redirects", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  fromPath: text("from_path").notNull(),
  toPath: text("to_path").notNull(),
  statusCode: integer("status_code").notNull().default(301),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  storeFromIdx: uniqueIndex("redirects_store_from_idx").on(table.storeId, table.fromPath),
}));

// ─── Audit Log ──────────────────────────────────────────────────────────────

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  userId: uuid("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  storeEntityIdx: index("audit_log_store_entity_idx").on(table.storeId, table.entityType, table.createdAt),
}));

// ─── No-code Workflow Builder ───────────────────────────────────────────────

export const storeWorkflows = pgTable("store_workflows", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: text("trigger_type").notNull(),
  triggerConfig: jsonb("trigger_config").notNull().default({}),
  actionType: text("action_type").notNull(),
  actionConfig: jsonb("action_config").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  lastRunAt: timestamp("last_run_at"),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  storeActiveIdx: index("store_workflows_store_active_idx").on(table.storeId, table.isActive, table.updatedAt),
  storeUpdatedIdx: index("store_workflows_store_updated_idx").on(table.storeId, table.updatedAt),
}));

export const storeWorkflowsRelations = relations(storeWorkflows, ({ one }) => ({
  store: one(stores, {
    fields: [storeWorkflows.storeId],
    references: [stores.id],
  }),
  creator: one(users, {
    fields: [storeWorkflows.createdBy],
    references: [users.id],
  }),
  updater: one(users, {
    fields: [storeWorkflows.updatedBy],
    references: [users.id],
  }),
}));

// ─── Headless API Packs ─────────────────────────────────────────────────────

export const headlessApiPacks = pgTable("headless_api_packs", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  name: text("name").notNull(),
  description: text("description"),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  scopes: jsonb("scopes").notNull().default([]),
  status: text("status").notNull().default("active"),
  rateLimitPerMinute: integer("rate_limit_per_minute").notNull().default(120),
  lastUsedAt: timestamp("last_used_at"),
  createdBy: uuid("created_by").references(() => users.id),
  revokedBy: uuid("revoked_by").references(() => users.id),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  storeStatusIdx: index("headless_api_packs_store_status_idx").on(table.storeId, table.status, table.updatedAt),
  storeCreatedIdx: index("headless_api_packs_store_created_idx").on(table.storeId, table.createdAt),
  keyHashUnique: uniqueIndex("headless_api_packs_key_hash_unique").on(table.keyHash),
}));

export const headlessApiPacksRelations = relations(headlessApiPacks, ({ one }) => ({
  store: one(stores, {
    fields: [headlessApiPacks.storeId],
    references: [stores.id],
  }),
  creator: one(users, {
    fields: [headlessApiPacks.createdBy],
    references: [users.id],
  }),
  revoker: one(users, {
    fields: [headlessApiPacks.revokedBy],
    references: [users.id],
  }),
}));

// ─── Store Templates and Clone Snapshots ────────────────────────────────────

export const storeTemplates = pgTable("store_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  sourceStoreId: uuid("source_store_id").notNull().references(() => stores.id),
  name: text("name").notNull(),
  description: text("description"),
  snapshot: jsonb("snapshot").notNull().default({}),
  isDefault: boolean("is_default").notNull().default(false),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  storeUpdatedIdx: index("store_templates_store_updated_idx").on(table.storeId, table.updatedAt),
  sourceStoreUpdatedIdx: index("store_templates_source_store_updated_idx").on(table.sourceStoreId, table.updatedAt),
  storeNameIdx: index("store_templates_store_name_idx").on(table.storeId, table.name),
}));

export const storeTemplatesRelations = relations(storeTemplates, ({ one }) => ({
  store: one(stores, {
    fields: [storeTemplates.storeId],
    references: [stores.id],
  }),
  sourceStore: one(stores, {
    fields: [storeTemplates.sourceStoreId],
    references: [stores.id],
  }),
  creator: one(users, {
    fields: [storeTemplates.createdBy],
    references: [users.id],
  }),
  updater: one(users, {
    fields: [storeTemplates.updatedBy],
    references: [users.id],
  }),
}));

// ─── Policy Engine ──────────────────────────────────────────────────────────

export const storePolicyConfigs = pgTable("store_policy_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  policies: jsonb("policies").notNull().default({}),
  updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  storeUnique: uniqueIndex("store_policy_configs_store_unique").on(table.storeId),
  storeActiveIdx: index("store_policy_configs_store_active_idx").on(table.storeId, table.isActive),
}));

export const storePolicyConfigsRelations = relations(storePolicyConfigs, ({ one }) => ({
  store: one(stores, {
    fields: [storePolicyConfigs.storeId],
    references: [stores.id],
  }),
  updater: one(users, {
    fields: [storePolicyConfigs.updatedBy],
    references: [users.id],
  }),
}));

export const policyViolations = pgTable("policy_violations", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  domain: text("domain").notNull(),
  action: text("action").notNull(),
  severity: text("severity").notNull().default("error"),
  message: text("message").notNull(),
  details: jsonb("details").notNull().default({}),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  storeCreatedIdx: index("policy_violations_store_created_idx").on(table.storeId, table.createdAt),
  storeDomainCreatedIdx: index("policy_violations_store_domain_created_idx").on(table.storeId, table.domain, table.createdAt),
}));

export const policyViolationsRelations = relations(policyViolations, ({ one }) => ({
  store: one(stores, {
    fields: [policyViolations.storeId],
    references: [stores.id],
  }),
  actor: one(users, {
    fields: [policyViolations.actorUserId],
    references: [users.id],
  }),
}));

// ─── Inventory Transactions ─────────────────────────────────────────────────

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id),
  type: inventoryTransactionTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  reference: text("reference"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  variantIdx: index("inventory_transactions_variant_idx").on(table.variantId, table.createdAt),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  variant: one(productVariants, {
    fields: [inventoryTransactions.variantId],
    references: [productVariants.id],
  }),
}));

// ─── Store Invitations ──────────────────────────────────────────────────────

export const storeInvitations = pgTable("store_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  email: text("email").notNull(),
  role: storeMemberRoleEnum("role").notNull(),
  token: text("token").notNull().unique(),
  invitedBy: uuid("invited_by").notNull().references(() => users.id),
  status: invitationStatusEnum("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  storeEmailIdx: index("store_invitations_store_email_idx").on(table.storeId, table.email),
  tokenIdx: uniqueIndex("store_invitations_token_idx").on(table.token),
}));

export const storeInvitationsRelations = relations(storeInvitations, ({ one }) => ({
  store: one(stores, {
    fields: [storeInvitations.storeId],
    references: [stores.id],
  }),
  inviter: one(users, {
    fields: [storeInvitations.invitedBy],
    references: [users.id],
  }),
}));
