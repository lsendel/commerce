import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const productTypeEnum = pgEnum("product_type", [
  "physical",
  "digital",
  "subscription",
  "bookable",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
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
  name: text("name").notNull(),
  platformRole: platformRoleEnum("platform_role").default("user"),
  stripeCustomerId: text("stripe_customer_id"),
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
  availableForSale: boolean("available_for_sale").default(true),
  downloadUrl: text("download_url"),
  stripePriceId: text("stripe_price_id"),
  printfulSyncProductId: integer("printful_sync_product_id"),
  featuredImageUrl: text("featured_image_url"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  createdAt: timestamp("created_at").defaultNow(),
});

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
});

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

export const cartItems = pgTable("cart_items", {
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
});

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

export const orders = pgTable("orders", {
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
  shipments: many(shipments),
  bookingRequests: many(bookingRequests),
}));

export const orderItems = pgTable("order_items", {
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
  bookingAvailabilityId: uuid("booking_availability_id").references(
    () => bookingAvailability.id,
  ),
  createdAt: timestamp("created_at").defaultNow(),
});

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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
});

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
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  bookingAvailabilityId: uuid("booking_availability_id")
    .notNull()
    .references(() => bookingAvailability.id),
  status: bookingStatusEnum("status").default("confirmed"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
});

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
  carrier: text("carrier"),
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  status: shipmentStatusEnum("status").default("pending"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

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
  createdAt: timestamp("created_at").defaultNow(),
});

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
});

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
    parentAffiliateId: uuid("parent_affiliate_id"),
    tierId: uuid("tier_id").references(() => affiliateTiers.id),
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
  parentConversionId: uuid("parent_conversion_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

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
