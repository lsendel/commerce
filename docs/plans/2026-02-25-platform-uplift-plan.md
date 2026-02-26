# Platform Uplift — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all broken features, enforce DDD clean code across every bounded context, build branded platform identity with premium commerce aesthetic, SEO/LLM discoverability, and marketing automation.

**Architecture:** Vertical slice by bounded context. Each context is fixed completely (domain → schema → repo → use case → API → page) before moving to the next. Shared Kernel first (design system, layout, SEO framework), then contexts in dependency order.

**Tech Stack:** Hono + Cloudflare Workers, Drizzle ORM + Neon PostgreSQL, Stripe, R2, Tailwind CSS v3, TypeScript strict mode.

**Design doc:** `docs/plans/2026-02-25-platform-uplift-design.md`

**Verification:** `npx tsc --noEmit` after every code task.

---

## Slice A: Shared Kernel — Design System, Layout, SEO Framework

Foundation that every bounded context depends on.

---

### Task 1: Design tokens + UI component interfaces

**Files:**
- Create: `src/components/ui/types.ts`
- Create: `src/components/ui/tokens.ts`

**Step 1:** Create `src/components/ui/types.ts` with shared component prop interfaces:
- `ButtonProps` — variant (primary/secondary/outline/danger/ghost), size (sm/md/lg), loading, disabled, type, onClick, children, className
- `CardProps` — variant (default/elevated/outlined), padding (sm/md/lg), children, className
- `BadgeProps` — variant (success/warning/error/info/neutral), size (sm/md), children
- `InputProps` — label, helperText, error, required, type, name, value, placeholder, className + standard HTML input attrs
- `SelectProps` — label, helperText, error, required, options array (value/label), name, value, className
- `TextareaProps` — same as Input but for textarea
- `ModalProps` — isOpen, onClose, title, children, footer
- `TableColumn` — key, label, sortable, render function
- `TableProps` — columns, data, emptyMessage, pagination (page/limit/total), onPageChange
- `StatCardProps` — icon (string), label, value, trend (up/down/neutral), trendValue
- `EmptyStateProps` — icon, title, description, actionLabel, actionHref
- `PageHeaderProps` — title, breadcrumbs (label/href)[], actions (ReactNode)
- `TabsProps` — tabs (id/label)[], activeTab, onTabChange (URL-based, not client state)
- `ToastType` — success/error/warning/info
- `CopyButtonProps` — text, label
- `SkeletonProps` — variant (line/card/table-row), count

**Step 2:** Create `src/components/ui/tokens.ts` with design token constants:
- `COLORS` object mapping variant names to Tailwind classes (e.g., `success: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dark: { bg: 'dark:bg-emerald-900/20', text: 'dark:text-emerald-400' } }`)
- `SIZES` object for consistent sizing
- `TYPOGRAPHY` object for font sizes/weights
- `SHADOWS`, `RADII`, `TRANSITIONS` constants

**Step 3:** Run `npx tsc --noEmit`. Commit: `feat: add design system type interfaces and token constants`

---

### Task 2: Upgrade existing UI components + add new ones (batch 1)

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/modal.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/select.tsx`
- Create: `src/components/ui/textarea.tsx`
- Create: `src/components/ui/stat-card.tsx`
- Create: `src/components/ui/empty-state.tsx`

**Step 1:** Refactor existing `button.tsx` to use `ButtonProps` from types.ts. Add loading spinner state, all variant styles using tokens. Ensure consistent dark mode support.

**Step 2:** Refactor existing `badge.tsx` to use `BadgeProps`. Standardize the 5 variants (currently different pages use different color schemes for status badges).

**Step 3:** Refactor existing `input.tsx` to use `InputProps`. Add label, helperText, error message display, required asterisk indicator.

**Step 4:** Refactor existing `modal.tsx` to use `ModalProps`. Add focus trap (track first/last focusable elements, trap Tab key), Escape-to-close, backdrop click-to-close, ARIA attributes.

**Step 5:** Create `card.tsx`, `select.tsx`, `textarea.tsx`, `stat-card.tsx`, `empty-state.tsx` implementing their respective typed props from types.ts.

**Step 6:** Run `npx tsc --noEmit`. Commit: `feat: upgrade and add design system components (batch 1)`

---

### Task 3: UI components batch 2

**Files:**
- Create: `src/components/ui/table.tsx`
- Create: `src/components/ui/page-header.tsx`
- Create: `src/components/ui/tabs.tsx`
- Create: `src/components/ui/copy-button.tsx`
- Modify: `src/components/ui/skeleton.tsx`
- Modify: `src/components/ui/pagination.tsx`

**Step 1:** Create `table.tsx` — renders `<table>` with typed columns, sortable headers (URL-param based), built-in pagination via the existing `pagination.tsx` component, empty state via `empty-state.tsx`, loading skeleton rows via `skeleton.tsx`.

**Step 2:** Create `page-header.tsx` — title, breadcrumb trail with links, optional action buttons slot (right-aligned).

**Step 3:** Create `tabs.tsx` — horizontal tab bar with `<a>` tags (URL-based navigation, not client state). Active tab styling from tokens.

**Step 4:** Create `copy-button.tsx` — button that copies `text` prop to clipboard via `navigator.clipboard.writeText()`, shows checkmark for 2 seconds, returns to copy icon. Works with inline script for the clipboard interaction.

**Step 5:** Refactor existing `skeleton.tsx` to support line/card/table-row variants. Refactor `pagination.tsx` to use `ButtonProps` styling and preserve all URL query params.

**Step 6:** Run `npx tsc --noEmit`. Commit: `feat: add table, page-header, tabs, copy-button components (batch 2)`

---

### Task 4: Layout fixes — sign-out, toast upgrade, conditional scripts

**Files:**
- Modify: `src/components/layout/header.tsx`
- Modify: `src/components/layout/nav.tsx`
- Modify: `src/components/layout/footer.tsx`
- Modify: `src/routes/pages/_layout.tsx`
- Modify: `public/scripts/auth.js`
- Modify: `public/scripts/toast.js`

**Step 1:** In `header.tsx`, add user dropdown menu for authenticated users: avatar/initials circle, dropdown with "Account", "Orders", "Settings", "Sign Out". Sign out calls `POST /api/auth/logout` then redirects to `/`. Use proper `<details>`+`<summary>` for no-JS dropdown or inline script.

**Step 2:** In `nav.tsx`, add conditional sections based on user role:
- Authenticated non-admin: Account link
- Store owner/admin: "Admin" link → `/admin/products` (entry point to admin shell)
- Registered affiliate: "Affiliates" link → `/affiliates/dashboard`

**Step 3:** In `footer.tsx`, update links: replace hardcoded emoji with SVG brand mark. Add social links section (renders if store has social URLs in settings).

**Step 4:** In `_layout.tsx`, make script loading conditional:
- Always load: `darkmode.js`, `toast.js`, `cart.js`, `auth.js`
- Load only on product pages: `gallery.js`, `variant-selector.js`
- Load only on booking pages: `booking.js`
- Load only on studio pages: `studio.js`
- Pass a `scripts?: string[]` prop to Layout and render `<script>` tags for each.

**Step 5:** Upgrade `toast.js` to support typed toasts: `showToast(message, type)` where type is success/error/warning/info, each with different icon and color from design tokens.

**Step 6:** In `auth.js`, add `signOut()` function that POSTs to `/api/auth/logout`, clears UI state, redirects to `/`.

**Step 7:** Run `npx tsc --noEmit`. Commit: `feat: add sign-out button, conditional scripts, toast upgrade`

---

### Task 5: Admin shell layout

**Files:**
- Create: `src/components/layout/admin-shell.tsx`
- Create: `src/components/layout/admin-sidebar.tsx`
- Create: `src/components/layout/admin-topbar.tsx`
- Create: `public/scripts/admin-shell.js`

**Step 1:** Create `admin-sidebar.tsx` — left sidebar with navigation sections:
- **Commerce**: Products, Collections, Orders
- **Marketing**: Promotions, Reviews, Analytics, Affiliates
- **Operations**: Fulfillment, Bookings, Venues
- **Settings**: Shipping, Tax, Integrations, Store Settings
- Each item: icon (inline SVG) + label + optional count badge
- Active item highlighted based on current URL path
- Collapsible on mobile (hamburger toggle via `admin-shell.js`)

**Step 2:** Create `admin-topbar.tsx` — store name, store switcher dropdown (for multi-store users), user avatar + sign-out. Breadcrumb trail.

**Step 3:** Create `admin-shell.tsx` — wraps page content with the Layout (full HTML shell), sidebar, and topbar. Props: `title`, `breadcrumbs`, `storeName`, `storeId`, `user`, `children`, `scripts?`. Uses `_layout.tsx` internally but replaces the storefront header/nav with admin chrome.

**Step 4:** Create `admin-shell.js` — sidebar toggle for mobile, any admin-specific UI interactions.

**Step 5:** Run `npx tsc --noEmit`. Commit: `feat: add admin shell with sidebar navigation`

---

### Task 6: SEO framework — JSON-LD helpers, meta helpers, sitemap expansion

**Files:**
- Create: `src/infrastructure/seo/json-ld.ts`
- Create: `src/infrastructure/seo/meta.ts`
- Modify: `src/routes/pages/_layout.tsx` (add breadcrumb JSON-LD support)
- Modify: `src/index.tsx` (~line 1453, sitemap handler)

**Step 1:** Create `json-ld.ts` with typed builder functions:
- `buildOrganization(store)` → Organization schema
- `buildBreadcrumbList(crumbs: {name, url}[])` → BreadcrumbList schema
- `buildProduct(product, variants, reviews?)` → Product schema with offers, AggregateRating
- `buildEvent(event, availability)` → Event schema with location, offers, dates
- `buildFAQPage(faqs: {question, answer}[])` → FAQPage schema
- `buildCollectionPage(collection, products)` → CollectionPage schema
- `buildWebSite(store)` → WebSite schema with SearchAction (sitelinks search box)
- `buildPlace(venue)` → Place schema
- `buildReview(review)` → Review schema
- All return plain objects for JSON.stringify in Layout.

**Step 2:** Create `meta.ts` with helper functions:
- `generateMetaDescription(content: string, maxLength = 160): string` — truncates at sentence boundary
- `generateMetaTitle(pageTitle: string, storeName: string): string` — "{page} | {store}"
- `generateCanonical(path: string, baseUrl: string): string`
- `generatePaginationLinks(page, totalPages, baseUrl)` → `{ prev?: string, next?: string }`
- `autoGenerateSEO(name: string, description?: string)` → `{ title, description }` — fallback when marketer doesn't set custom SEO

**Step 3:** In `_layout.tsx`, add `breadcrumbs?: {name: string, url: string}[]` prop. When present, inject BreadcrumbList JSON-LD alongside existing `jsonLd` prop. Add `paginationLinks?: { prev?: string, next?: string }` prop for `rel=prev/next` link tags.

**Step 4:** Expand sitemap handler in `index.tsx`:
- Add collections (query `collections` table for slugs)
- Add venues (query `venues` table for slugs)
- Add static pages: `/about`, `/contact`, `/events/calendar`
- Add `<lastmod>` using `updatedAt` column values
- Add `Sitemap:` directive to robots.txt handler

**Step 5:** Add `GET /llms.txt` route in `index.tsx` returning plain text describing the site's purpose, key categories, product types, and structured data availability.

**Step 6:** Add `GET /.well-known/ai-plugin.json` route returning JSON with site description for AI agents.

**Step 7:** Run `npx tsc --noEmit`. Commit: `feat: add SEO framework with JSON-LD builders, meta helpers, expanded sitemap`

---

### Task 7: Redirects table + middleware

**Files:**
- Modify: `src/infrastructure/db/schema.ts` (~line 2298)
- Modify: `scripts/sql/add-fulfillment-commerce-tables.sql`
- Create: `src/infrastructure/repositories/redirect.repository.ts`
- Modify: `src/index.tsx` (~line 168, before route mounting)

**Step 1:** Add `redirects` table to schema.ts:
```typescript
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
```

**Step 2:** Create `redirect.repository.ts` with `findByPath(storeId, path)`, `create(data)`, `delete(id)`.

**Step 3:** Add redirect middleware in `index.tsx` before the 404 handler (~line 1445): query `redirects` table for current path, if found return `c.redirect(toPath, statusCode)`.

**Step 4:** Append DDL to SQL migration script.

**Step 5:** Run `npx tsc --noEmit`. Commit: `feat: add redirects table and 301 redirect middleware`

---

### Task 8: Audit log table (used by all contexts)

**Files:**
- Modify: `src/infrastructure/db/schema.ts`
- Modify: `scripts/sql/add-fulfillment-commerce-tables.sql`
- Create: `src/infrastructure/repositories/audit-log.repository.ts`
- Create: `src/application/shared/audit-log.usecase.ts`

**Step 1:** Add `auditLog` table to schema.ts:
```typescript
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
```

**Step 2:** Create repository with `record(entry)`, `findByEntity(entityType, entityId)`, `findByStore(storeId, filters)` with pagination.

**Step 3:** Create `AuditLogUseCase` with `record(storeId, userId, action, entityType, entityId, details?, ipAddress?)` and `query(storeId, filters)`.

**Step 4:** Run `npx tsc --noEmit`. Commit: `feat: add audit log table and use case`

---

## Slice B: Identity — Auth Flows, Profile, Verification

---

### Task 9: Schema — auth tokens + profile columns

**Files:**
- Modify: `src/infrastructure/db/schema.ts`
- Modify: `scripts/sql/add-fulfillment-commerce-tables.sql`

**Step 1:** Add columns to `users` table after existing columns:
```typescript
emailVerifiedAt: timestamp("email_verified_at"),
avatarUrl: text("avatar_url"),
locale: text("locale").default("en"),
timezone: text("timezone").default("UTC"),
marketingOptIn: boolean("marketing_opt_in").default(false),
lastLoginAt: timestamp("last_login_at"),
```

**Step 2:** Add `passwordResetTokens` table:
```typescript
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Step 3:** Add `emailVerificationTokens` table (same shape as password reset).

**Step 4:** Append DDL to SQL migration.

**Step 5:** Run `npx tsc --noEmit`. Commit: `feat: add auth tokens tables and user profile columns`

---

### Task 10: Domain — Identity VOs and guards

**Files:**
- Create: `src/domain/identity/password-reset-token.entity.ts`
- Create: `src/domain/identity/email-verification-token.entity.ts`
- Create: `src/domain/identity/user-profile.entity.ts`
- Modify: `src/domain/identity/user.entity.ts`

**Step 1:** Create `PasswordResetToken` interface: id, userId, token, expiresAt, usedAt, createdAt. Add `isExpired(token): boolean` and `isUsed(token): boolean` guards.

**Step 2:** Create `EmailVerificationToken` interface with same pattern.

**Step 3:** Create `UserProfile` interface: name, email, avatarUrl, locale, timezone, marketingOptIn, emailVerifiedAt. Add `isEmailVerified(user): boolean` guard.

**Step 4:** Update `User` entity to include new columns in its interface.

**Step 5:** Run `npx tsc --noEmit`. Commit: `feat: add Identity domain entities and guards`

---

### Task 11: Use cases — password reset, email verification, profile

**Files:**
- Create: `src/application/identity/request-password-reset.usecase.ts`
- Create: `src/application/identity/reset-password.usecase.ts`
- Create: `src/application/identity/verify-email.usecase.ts`
- Create: `src/application/identity/update-profile.usecase.ts`
- Create: `src/application/identity/change-password.usecase.ts`
- Modify: `src/application/identity/register.usecase.ts`
- Modify: `src/application/identity/login.usecase.ts`

**Step 1:** Create `RequestPasswordResetUseCase`:
1. Find user by email (return success even if not found — don't leak existence)
2. Generate token via `crypto.randomUUID()`
3. Insert into `passwordResetTokens` with 1h expiry
4. Enqueue email to `NOTIFICATIONS` queue with type `password_reset`
5. Return `{ success: true }`

**Step 2:** Create `ResetPasswordUseCase`:
1. Find token by value, verify not expired and not used
2. Hash new password with PBKDF2
3. Update user password hash
4. Mark token as used
5. Return `{ success: true }`

**Step 3:** Create `VerifyEmailUseCase`:
1. Find token by value, verify not expired and not used
2. Set `emailVerifiedAt` on user
3. Mark token as used

**Step 4:** Create `UpdateProfileUseCase`:
1. Accept partial profile update (name, avatarUrl, locale, timezone, marketingOptIn)
2. If email changes, require re-verification: generate new verification token, send email, don't update email until verified
3. Update user record

**Step 5:** Create `ChangePasswordUseCase`:
1. Verify current password with constant-time comparison
2. Validate new password strength (reuse existing Password VO validation)
3. Hash new password, update user

**Step 6:** Modify `RegisterUseCase`: after creating user, generate email verification token, enqueue verification email.

**Step 7:** Modify `LoginUseCase`: update `lastLoginAt`. Accept `rememberMe` boolean — if true, set JWT expiry to 7 days; if false, 24 hours.

**Step 8:** Run `npx tsc --noEmit`. Commit: `feat: add Identity use cases — password reset, email verification, profile`

---

### Task 12: API routes — Identity endpoints

**Files:**
- Modify: `src/routes/api/auth.routes.ts`

**Step 1:** Add endpoints:
- `POST /auth/forgot-password` — Zod: `{ email }`. Calls `RequestPasswordResetUseCase`. Rate limit 3/min.
- `POST /auth/reset-password` — Zod: `{ token, password }`. Calls `ResetPasswordUseCase`.
- `POST /auth/verify-email` — Zod: `{ token }`. Calls `VerifyEmailUseCase`.
- `PATCH /auth/profile` — Zod: partial `{ name?, avatarUrl?, locale?, timezone?, marketingOptIn? }`. Requires auth. Calls `UpdateProfileUseCase`.
- `POST /auth/change-password` — Zod: `{ currentPassword, newPassword }`. Requires auth. Calls `ChangePasswordUseCase`.

**Step 2:** Modify existing `POST /auth/login` — pass `rememberMe` from request body to `LoginUseCase`, use returned expiry for JWT cookie.

**Step 3:** Run `npx tsc --noEmit`. Commit: `feat: add Identity API routes — password reset, verification, profile`

---

### Task 13: Auth pages — forgot password, reset, verify email

**Files:**
- Create: `src/routes/pages/auth/forgot-password.page.tsx`
- Create: `src/routes/pages/auth/reset-password.page.tsx`
- Create: `src/routes/pages/auth/verify-email.page.tsx`
- Modify: `src/routes/pages/auth/login.page.tsx`
- Modify: `src/routes/pages/auth/register.page.tsx`
- Modify: `src/index.tsx` (add page routes)

**Step 1:** Create `forgot-password.page.tsx`:
- Centered card (same style as login/register)
- Email input form
- "Send Reset Link" button
- Success state: "Check your email for a reset link"
- Back to login link

**Step 2:** Create `reset-password.page.tsx`:
- Accepts `?token=` query param
- New password + confirm password form with strength indicators
- "Reset Password" button
- Success state: "Password reset! Sign in with your new password" + link
- Error state for invalid/expired token

**Step 3:** Create `verify-email.page.tsx`:
- Accepts `?token=` query param
- Route handler verifies token server-side on GET
- Shows success or expired/invalid message

**Step 4:** Fix `login.page.tsx`: change "Forgot password?" href from `/auth/forgot-password` (the dead-end) to new working page. Add show/hide password toggle button.

**Step 5:** Fix `register.page.tsx`: add Terms of Service checkbox (required). Add show/hide password toggle. After registration, redirect to `/auth/verify-email-sent` message page instead of `/account`.

**Step 6:** Add page routes in `index.tsx` for all new auth pages.

**Step 7:** Run `npx tsc --noEmit`. Commit: `feat: add auth pages — forgot password, reset, email verification`

---

### Task 14: Account pages — settings, fix dashboard/addresses

**Files:**
- Create: `src/routes/pages/account/settings.page.tsx`
- Modify: `src/routes/pages/account/dashboard.page.tsx`
- Modify: `src/routes/pages/account/addresses.page.tsx`
- Modify: `src/routes/pages/account/pets.page.tsx`
- Modify: `src/index.tsx` (add `/account/settings` route)

**Step 1:** Create `settings.page.tsx` with sections:
- Profile: name input, email display (with "verified" badge or "verify" CTA), avatar display
- Preferences: locale dropdown, timezone dropdown, marketing opt-in toggle
- Change Password: current + new + confirm inputs, submit button
- Danger Zone: "Delete Account" button with Modal confirmation

**Step 2:** Fix `dashboard.page.tsx`:
- Add "Sign Out" button (visible, top-right)
- Add "Settings" to quick links grid
- Add "Artwork" link → `/account/artwork` (for AI Studio context later)
- Fix order deep-link: add inline script that auto-opens `<details>` matching `location.hash`

**Step 3:** Fix `addresses.page.tsx`:
- Edit form pre-population: read `data-*` attributes from address card, populate form fields before showing. Add `data-name`, `data-line1`, `data-line2`, `data-city`, `data-state`, `data-zip`, `data-country`, `data-phone`, `data-label` attributes to each address card.
- Replace free-text country code with `<Select>` component using ISO 3166-1 alpha-2 country list.

**Step 4:** Fix `pets.page.tsx`:
- Make Edit/Delete buttons always visible (remove opacity-0 hover-only — use small icon buttons visible by default)
- Edit form pre-population: same `data-*` attribute pattern as addresses

**Step 5:** Run `npx tsc --noEmit`. Commit: `feat: add account settings page, fix dashboard and address pre-population`

---

## Slice C: Catalog — Products, Collections, Admin CRUD

---

### Task 15: Schema — product status, indexes, inventory transactions

**Files:**
- Modify: `src/infrastructure/db/schema.ts`
- Modify: `scripts/sql/add-fulfillment-commerce-tables.sql`

**Step 1:** Add `productStatusEnum`:
```typescript
export const productStatusEnum = pgEnum("product_status", ["draft", "active", "archived"]);
```

**Step 2:** Add `status` column to `products` table:
```typescript
status: productStatusEnum("status").notNull().default("active"),
```

**Step 3:** Add `inventoryTransactions` table:
```typescript
export const inventoryTransactionTypeEnum = pgEnum("inventory_transaction_type", [
  "adjustment", "sale", "return", "restock", "reservation", "release"
]);

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
```

**Step 4:** Add missing indexes:
```typescript
// In products table options:
storeStatusIdx: index("products_store_status_idx").on(table.storeId, table.status),

// In productVariants table options:
productIdx: index("product_variants_product_idx").on(table.productId),

// In productImages table options:
productIdx: index("product_images_product_idx").on(table.productId),
```

**Step 5:** Fix `product_variants.fulfillment_provider` from `text` to `fulfillmentProviderTypeEnum`:
```typescript
fulfillmentProvider: fulfillmentProviderTypeEnum("fulfillment_provider"),
```

**Step 6:** Append DDL to SQL migration.

**Step 7:** Run `npx tsc --noEmit`. Commit: `feat: add product status, inventory transactions, catalog indexes`

---

### Task 16: Domain — Catalog VOs

**Files:**
- Create: `src/domain/catalog/product-status.vo.ts`
- Create: `src/domain/catalog/product-type.vo.ts`
- Create: `src/domain/catalog/price.vo.ts`
- Create: `src/domain/catalog/inventory-level.vo.ts`
- Create: `src/domain/catalog/seo-metadata.vo.ts`
- Modify: `src/domain/catalog/product.entity.ts`
- Modify: `src/domain/catalog/variant.entity.ts`

**Step 1:** Create VOs:
- `ProductStatus`: type `"draft" | "active" | "archived"` + guards `isVisible()`, `canPurchase()`, `canEdit()`
- `ProductType`: wraps enum + helpers `isPhysical()`, `isDigital()`, `isBookable()`, `isSubscription()`, `requiresFulfillment()`, `requiresShipping()`
- `Price`: `{ amount: string, currency: string }` + `format()`, `compare()`, `applyDiscount(percent)`
- `InventoryLevel`: `{ quantity: number, reserved: number }` + `availableCount()`, `isLowStock(threshold)`, `isOutOfStock()`
- `SEOMetadata`: `{ title?: string, description?: string, slug: string }` + `generateDefaults(name, description)`

**Step 2:** Update `Product` entity interface to include `status` field. Update `Variant` entity to include `fulfillmentProvider` as typed enum.

**Step 3:** Add guard functions:
- `canPurchase(variant, product): { ok: boolean, reason?: string }`
- `canReview(userId, productId, purchasedProductIds): boolean`

**Step 4:** Run `npx tsc --noEmit`. Commit: `feat: add Catalog domain value objects and guards`

---

### Task 17: Use cases — ManageProduct, ManageCollection, fixes

**Files:**
- Create: `src/application/catalog/manage-product.usecase.ts`
- Create: `src/application/catalog/manage-collection.usecase.ts`
- Create: `src/application/catalog/manage-redirects.usecase.ts`
- Modify: `src/application/catalog/list-products.usecase.ts`
- Modify: `src/application/catalog/get-product.usecase.ts`
- Modify: `src/application/catalog/create-product-from-art.usecase.ts`
- Modify: `src/application/catalog/submit-review.usecase.ts`

**Step 1:** Create `ManageProductUseCase` with methods:
- `create(input)` — validate, generate slug + SEO defaults, create product + variants + images
- `update(id, input)` — validate, if slug changed create redirect via `ManageRedirectsUseCase`, update record
- `archive(id)` — set status to archived
- `updateImages(id, images[])` — reorder, add, remove product images
- `addVariant(productId, variant)` / `updateVariant(variantId, data)` / `removeVariant(variantId)`

**Step 2:** Create `ManageCollectionUseCase`:
- `create(input)` — name, slug, description, SEO, image
- `update(id, input)` — same with redirect on slug change
- `delete(id)` — remove collection and junction records
- `addProducts(collectionId, productIds[])` / `removeProducts(collectionId, productIds[])` / `reorderProducts(collectionId, ordered[])`

**Step 3:** Create `ManageRedirectsUseCase`:
- `createRedirect(storeId, fromPath, toPath, statusCode = 301)`
- `deleteRedirect(id)`
- `listRedirects(storeId)` with pagination

**Step 4:** Fix `ListProductsUseCase`: add SQL `ORDER BY` on min variant price (subquery or join) instead of in-memory sort. Add `status` filter parameter for admin use.

**Step 5:** Fix `GetProductUseCase`: include review summary calculation (avg rating, count). Move related products loading from route handler into use case.

**Step 6:** Fix `CreateProductFromArtUseCase`: auto-generate SEO metadata from product name. Support `status: "draft"`.

**Step 7:** Fix `SubmitReviewUseCase`: add verified purchase check — query orders for this user + product. Prevent duplicate reviews (query existing review by user + product).

**Step 8:** Run `npx tsc --noEmit`. Commit: `feat: add catalog management use cases, fix existing use cases`

---

### Task 18: API routes — Admin product/collection CRUD

**Files:**
- Modify: `src/routes/api/admin-products.routes.ts`
- Create: `src/routes/api/admin-collections.routes.ts`
- Modify: `src/index.tsx` (~line 195)

**Step 1:** Add to `admin-products.routes.ts`:
- `GET /products` — admin list with status filter, search, pagination
- `PATCH /products/:id` — update product
- `DELETE /products/:id` — archive product
- `POST /products/:id/variants` — add variant
- `PATCH /products/:id/variants/:variantId` — update variant
- `POST /products/:id/images` — manage images
- `POST /products/:id/provider-mapping` — map variant to fulfillment provider

**Step 2:** Create `admin-collections.routes.ts`:
- `GET /` — list collections
- `POST /` — create collection
- `PATCH /:id` — update collection
- `DELETE /:id` — delete collection
- `POST /:id/products` — add products
- `DELETE /:id/products` — remove products

**Step 3:** Mount in `index.tsx`: `app.route("/api/admin/collections", adminCollectionRoutes);`

**Step 4:** Run `npx tsc --noEmit`. Commit: `feat: add admin product and collection CRUD API routes`

---

### Task 19: Admin product pages

**Files:**
- Create: `src/routes/pages/admin/products.page.tsx`
- Create: `src/routes/pages/admin/product-edit.page.tsx`
- Create: `src/routes/pages/admin/collections.page.tsx`
- Create: `public/scripts/admin-products.js`
- Modify: `src/index.tsx` (add admin page routes)

**Step 1:** Create `products.page.tsx` using admin shell:
- `PageHeader` with "Products" title + "Add Product" button
- Filter bar: status dropdown (all/active/draft/archived), search input, product type filter
- `Table` component with columns: image thumbnail, name, status badge, type badge, price range, inventory, actions (edit/archive)
- Pagination

**Step 2:** Create `product-edit.page.tsx` using admin shell:
- Product form: name, description (textarea), product type (select), status (select)
- SEO section: title, description, slug with auto-generate button. SEO preview component showing Google SERP appearance (title in blue, URL in green, description in gray).
- Images section: sortable list with add/remove
- Variants section: table with add/edit/remove per variant (title, SKU, price, compareAtPrice, inventory, fulfillment provider)
- Design placement section (for art products)

**Step 3:** Create `collections.page.tsx` using admin shell:
- Collection table with name, product count, image, actions
- Create/edit modal or inline form
- Product assignment interface

**Step 4:** Create `admin-products.js` for form submissions, image management, variant CRUD interactions.

**Step 5:** Add page routes in `index.tsx`.

**Step 6:** Run `npx tsc --noEmit`. Commit: `feat: add admin product and collection management pages`

---

### Task 20: Fix product listing + product detail pages

**Files:**
- Modify: `src/routes/pages/product-list.page.tsx`
- Modify: `src/routes/pages/product-detail.page.tsx`
- Modify: `src/components/product/product-grid.tsx`

**Step 1:** Fix `product-list.page.tsx`:
- Add `EmptyState` component when 0 products match filters
- Add active filter chips above grid showing current filters with X to remove each
- Add currency symbol to price range inputs
- Add `rel=prev/next` using `paginationLinks` from SEO meta helper

**Step 2:** Fix `product-detail.page.tsx`:
- Add reviews section: summary bar (avg rating, distribution histogram), individual reviews with stars/content/author/date/verified badge/store response, review submission form for authenticated users
- Add breadcrumb JSON-LD using SEO builder
- Add `AggregateRating` to Product JSON-LD when reviews exist
- Add "Share" button (copy link + social share URLs)
- Add "Notify when available" email capture for out-of-stock variants
- Improve variant selector: clear visual feedback on which variant is selected

**Step 3:** Fix `product-grid.tsx`: add `EmptyState` fallback when products array is empty.

**Step 4:** Run `npx tsc --noEmit`. Commit: `feat: fix product listing and detail pages — reviews, filters, SEO`

---

## Slice D: Cart

---

### Task 21: Cart — schema, domain, use cases, page fixes

**Files:**
- Modify: `src/infrastructure/db/schema.ts`
- Create: `src/domain/cart/cart-total.vo.ts`
- Modify: `src/application/cart/get-cart.usecase.ts`
- Modify: `src/application/cart/add-to-cart.usecase.ts`
- Modify: `src/application/cart/apply-coupon.usecase.ts`
- Create: `src/application/cart/remove-coupon.usecase.ts`
- Create: `src/application/cart/validate-cart.usecase.ts`
- Modify: `src/routes/api/cart.routes.ts`
- Modify: `src/routes/pages/cart.page.tsx`
- Modify: `src/components/cart/cart-summary.tsx`
- Modify: `src/components/cart/cart-drawer.tsx`

**Step 1:** Schema: add index on `cart_items(cart_id)`. Add `coupon_code_id` FK column to `carts`.

**Step 2:** Create `CartTotal` VO: subtotal, discount, shipping estimate, tax estimate, total. With `recalculate(items, coupon?)`.

**Step 3:** Fix `GetCartUseCase`: return server-calculated `CartTotal`. Include `warnings[]` array (stale prices, low stock, expired slots).

**Step 4:** Fix `AddToCartUseCase`: user-friendly stock messages ("Only 3 left" not "insufficient inventory").

**Step 5:** Fix `ApplyCouponUseCase`: persist `coupon_code_id` on cart row. Return discount amount.

**Step 6:** Create `RemoveCouponUseCase`: clear coupon from cart, return updated totals.

**Step 7:** Create `ValidateCartUseCase`: run all `canCheckout` checks, return itemized problem list.

**Step 8:** Fix cart routes: wire `RemoveCouponUseCase` (currently stub). Add warnings to GET cart response.

**Step 9:** Fix cart page: add coupon input field with apply/remove buttons. Show applied coupon with discount. Show item-level warnings. Add order notes textarea. Show savings on compare-at-price items.

**Step 10:** Fix cart summary: show server-calculated totals instead of client-side calculation.

**Step 11:** Run `npx tsc --noEmit`. Commit: `feat: fix cart — server totals, coupon persistence, validation, warnings`

---

## Slice E: Checkout

---

### Task 22: Schema — orders, refunds, indexes

**Files:**
- Modify: `src/infrastructure/db/schema.ts`
- Modify: `scripts/sql/add-fulfillment-commerce-tables.sql`

**Step 1:** Add columns to `orders`:
```typescript
notes: text("notes"),
internalNotes: text("internal_notes"),
```

**Step 2:** Add `refundStatusEnum` and `refunds` table:
```typescript
export const refundStatusEnum = pgEnum("refund_status", ["pending", "processing", "succeeded", "failed"]);

export const refunds = pgTable("refunds", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  fulfillmentRequestId: uuid("fulfillment_request_id").references(() => fulfillmentRequests.id),
  stripeRefundId: text("stripe_refund_id"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  reason: text("reason"),
  status: refundStatusEnum("status").notNull().default("pending"),
  lineItems: jsonb("line_items"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});
```

**Step 3:** Add `orderNotes` table:
```typescript
export const orderNoteTypeEnum = pgEnum("order_note_type", ["customer", "internal", "system"]);

export const orderNotes = pgTable("order_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  userId: uuid("user_id"),
  type: orderNoteTypeEnum("type").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Step 4:** Add missing indexes:
```typescript
// orders table:
userIdx: index("orders_user_idx").on(table.userId),
storeStatusIdx: index("orders_store_status_idx").on(table.storeId, table.status),
stripeSessionIdx: index("orders_stripe_session_idx").on(table.stripeCheckoutSessionId),
stripePaymentIdx: index("orders_stripe_payment_idx").on(table.stripePaymentIntentId),

// order_items table:
orderIdx: index("order_items_order_idx").on(table.orderId),
```

**Step 5:** Add `currency` column to `order_items`.

**Step 6:** Append DDL to SQL migration.

**Step 7:** Run `npx tsc --noEmit`. Commit: `feat: add refunds, order notes tables, checkout indexes`

---

### Task 23: Domain — Checkout VOs and guards

**Files:**
- Create: `src/domain/checkout/order-status.vo.ts`
- Create: `src/domain/checkout/refund-request.entity.ts`
- Create: `src/domain/checkout/order-note.entity.ts`
- Modify: `src/domain/checkout/order.entity.ts`

**Step 1:** Create `OrderStatus` VO: type from enum + transition guards `canCancel(status)`, `canRefund(status)`, `canShip(status)`, `nextStatuses(status)`.

**Step 2:** Create `RefundRequest` interface and `OrderNote` interface.

**Step 3:** Update `Order` entity to include `notes`, `internalNotes`, `cancelReason`, `cancelledAt`.

**Step 4:** Run `npx tsc --noEmit`. Commit: `feat: add Checkout domain value objects`

---

### Task 24: Fix CreateCheckoutUseCase — real tax + shipping

**Files:**
- Modify: `src/application/checkout/create-checkout.usecase.ts`
- Modify: `src/application/checkout/fulfill-order.usecase.ts`

**Step 1:** In `CreateCheckoutUseCase`, before creating Stripe session:
1. Call `ValidateCartUseCase` — reject if any blockers
2. Get user's default shipping address (or require one in request body)
3. Call `CalculateShippingUseCase` with cart items + address → get shipping cost
4. Call `CalculateTaxUseCase` with line items + shipping + address → get tax breakdown
5. Apply automatic promotions via `EvaluateCartPromotionsUseCase` (if wired)
6. Build Stripe line items with real prices
7. Add shipping as a separate Stripe line item
8. Store calculated breakdown in Stripe session `metadata`: `{ subtotal, shipping, tax, discount, total }`
9. Return checkout URL + calculated breakdown in response

**Step 2:** In `FulfillOrderUseCase`, read real amounts from Stripe session metadata:
```typescript
const metadata = session.metadata;
const tax = metadata?.tax || "0";
const shippingCost = metadata?.shipping || "0";
const discount = metadata?.discount || "0";
```
Replace hardcoded `tax: "0"` and `shippingCost: "0"` with these values.

**Step 3:** Run `npx tsc --noEmit`. Commit: `fix: integrate real tax and shipping into checkout flow`

---

### Task 25: Fix CancelOrderUseCase + new refund/admin use cases

**Files:**
- Modify: `src/application/checkout/cancel-order.usecase.ts`
- Create: `src/application/checkout/request-refund.usecase.ts`
- Create: `src/application/checkout/get-order-admin.usecase.ts`
- Create: `src/application/checkout/add-order-note.usecase.ts`
- Create: `src/infrastructure/repositories/refund.repository.ts`

**Step 1:** Create `RefundRepository` with `create(data)`, `findByOrderId(orderId)`, `updateStatus(id, status)`.

**Step 2:** Fix `CancelOrderUseCase`: after calculating refund amount, actually call Stripe:
```typescript
if (refundableAmount > 0 && order.stripePaymentIntentId) {
  const stripeRefund = await stripe.refunds.create({
    payment_intent: order.stripePaymentIntentId,
    amount: Math.round(refundableAmount * 100),
  });
  await refundRepo.create({
    storeId, orderId, stripeRefundId: stripeRefund.id,
    amount: refundableAmount.toString(), reason: input.reason,
    status: "succeeded",
  });
}
```

**Step 3:** Create `RequestRefundUseCase` — partial refunds: accept line items or flat amount, create Stripe refund, record in refunds table.

**Step 4:** Create `GetOrderAdminUseCase` — returns full order with items, fulfillment requests, shipments, refunds, notes.

**Step 5:** Create `AddOrderNoteUseCase` — accepts orderId, type (customer/internal), content.

**Step 6:** Run `npx tsc --noEmit`. Commit: `fix: implement actual Stripe refunds, add admin order use cases`

---

### Task 26: Checkout API routes

**Files:**
- Modify: `src/routes/api/checkout.routes.ts`
- Create: `src/routes/api/admin-orders.routes.ts`
- Modify: `src/routes/api/order.routes.ts`
- Modify: `src/index.tsx`

**Step 1:** Modify `POST /api/checkout` — accept `{ shippingAddressId }` or `{ shippingAddress }`. Return `{ url, breakdown: { subtotal, shipping, tax, discount, total } }`.

**Step 2:** Create `admin-orders.routes.ts`:
- `GET /orders` — admin list with filters (status, date range, search), pagination
- `GET /orders/:id` — admin detail with fulfillment, shipments, refunds, notes
- `POST /orders/:id/refund` — partial/full refund
- `POST /orders/:id/notes` — add note

**Step 3:** Mount: `app.route("/api/admin", adminOrderRoutes);`

**Step 4:** Run `npx tsc --noEmit`. Commit: `feat: add checkout and admin order API routes`

---

### Task 27: Checkout pages — order review, admin orders, fixes

**Files:**
- Create: `src/routes/pages/checkout-review.page.tsx`
- Create: `src/routes/pages/admin/orders.page.tsx`
- Create: `src/routes/pages/admin/order-detail.page.tsx`
- Create: `public/scripts/admin-orders.js`
- Modify: `src/routes/pages/checkout-success.page.tsx`
- Modify: `src/routes/pages/account/orders.page.tsx`
- Modify: `src/index.tsx`

**Step 1:** Create `checkout-review.page.tsx`:
- Cart items summary
- Shipping address selector (saved addresses dropdown + "use different address" form)
- Calculated shipping options (radio buttons)
- Tax breakdown
- Coupon display
- Order total
- Order notes textarea
- "Place Order" button → calls `/api/checkout` with address → redirects to Stripe

**Step 2:** Create admin `orders.page.tsx` in admin shell:
- `PageHeader` with "Orders" + export CSV button
- Filter bar: status, date range, search (order ID or email)
- `Table` with columns: order #, customer, date, items, status badge, total, actions

**Step 3:** Create admin `order-detail.page.tsx` in admin shell:
- Order info card: customer, address, dates, status
- Items table with line prices
- Price breakdown (subtotal, shipping, tax, discount, total)
- Fulfillment requests panel with status, provider, retry
- Shipments panel with tracking
- Refunds panel with history + "Issue Refund" button
- Notes panel with timeline + add note form

**Step 4:** Fix `checkout-success.page.tsx`: add next-steps guidance by product type. Show estimated delivery. Download button for digital products.

**Step 5:** Fix `orders.page.tsx`: add pagination. Add inline script to auto-open `<details>` matching `location.hash`. Format dates properly.

**Step 6:** Run `npx tsc --noEmit`. Commit: `feat: add order review page, admin orders, fix checkout flows`

---

## Slice F: Billing

---

### Task 28: Billing — schema, use cases, page

**Files:**
- Modify: `src/infrastructure/db/schema.ts`
- Modify: `src/application/billing/manage-subscription.usecase.ts`
- Create: `src/application/billing/resume-subscription.usecase.ts`
- Modify: `src/routes/api/subscription.routes.ts`
- Modify: `src/routes/pages/account/subscriptions.page.tsx`

**Step 1:** Add indexes to schema: `subscriptions(user_id)`, `subscriptions(stripe_subscription_id)`.

**Step 2:** Add `changePlan(subscriptionId, newPlanId)` method to `ManageSubscriptionUseCase` — calls `stripe.subscriptions.update()` with proration.

**Step 3:** Create `ResumeSubscriptionUseCase` — calls `stripe.subscriptions.update({ cancel_at_period_end: false })`.

**Step 4:** Add API routes: `PATCH /subscriptions/:id/change-plan`, `POST /subscriptions/:id/resume`.

**Step 5:** Fix subscriptions page: add plan comparison table, upgrade/downgrade buttons, resume button, fix dark mode `dark:bg-gray-800`.

**Step 6:** Run `npx tsc --noEmit`. Commit: `feat: add plan changes, resume subscription, fix billing page`

---

## Slice G: Booking

---

### Task 29: Booking schema + domain

**Files:**
- Modify: `src/infrastructure/db/schema.ts`
- Modify: `scripts/sql/add-fulfillment-commerce-tables.sql`
- Create: `src/domain/booking/waitlist-entry.entity.ts`
- Create: `src/domain/booking/booking-status.vo.ts`
- Create: `src/domain/booking/slot-availability.vo.ts`

**Step 1:** Add `booking_waitlist` table:
```typescript
export const waitlistStatusEnum = pgEnum("waitlist_status", ["waiting", "notified", "expired", "converted"]);

export const bookingWaitlist = pgTable("booking_waitlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  availabilityId: uuid("availability_id").notNull().references(() => bookingAvailability.id),
  position: integer("position").notNull(),
  status: waitlistStatusEnum("status").notNull().default("waiting"),
  notifiedAt: timestamp("notified_at"),
  expiredAt: timestamp("expired_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Step 2:** Add indexes: `booking_requests(user_id, status)`, `booking_requests(availability_id, status)`, `booking_availability(store_id, slot_datetime)`.

**Step 3:** Add `booking_request_id` FK to `bookings` table.

**Step 4:** Create domain VOs: `BookingStatus` (with policy-aware `canCancel`), `SlotAvailability` (`remainingSpots()`, `isFull()`), `WaitlistEntry` interface.

**Step 5:** Run `npx tsc --noEmit`. Commit: `feat: add booking waitlist schema and domain VOs`

---

### Task 30: Booking use cases + API routes

**Files:**
- Create: `src/application/booking/join-waitlist.usecase.ts`
- Create: `src/application/booking/process-waitlist.usecase.ts`
- Create: `src/application/booking/mark-no-show.usecase.ts`
- Modify: `src/application/booking/create-booking-request.usecase.ts`
- Modify: `src/application/booking/check-in.usecase.ts`
- Modify: `src/application/booking/cancel-booking.usecase.ts`
- Modify: `src/routes/api/booking.routes.ts`

**Step 1:** Create `JoinWaitlistUseCase`: verify slot is full, verify waitlist enabled, verify user not already on list, insert at next position.

**Step 2:** Create `ProcessWaitlistUseCase`: when cancellation opens a spot, notify next waitlisted user, set 30-min expiry.

**Step 3:** Create `MarkNoShowUseCase`: admin marks booking as no-show after event time.

**Step 4:** Fix `CreateBookingRequestUseCase`: enforce cutoff time and max advance time from booking settings.

**Step 5:** Fix `CheckInUseCase`: validate booking is for today (or configurable window).

**Step 6:** Fix `CancelBookingUseCase`: enforce cancellation policy from `booking_config`. Call `ProcessWaitlistUseCase` to backfill the opened spot.

**Step 7:** Add API routes: `POST /bookings/availability/:id/waitlist`, `GET /bookings/waitlist`, `DELETE /bookings/waitlist/:id`, `POST /bookings/:id/no-show`.

**Step 8:** Run `npx tsc --noEmit`. Commit: `feat: add booking waitlist, no-show, enforce policies`

---

### Task 31: Booking pages

**Files:**
- Create: `src/routes/pages/admin/bookings.page.tsx`
- Modify: `src/routes/pages/events/list.page.tsx`
- Modify: `src/routes/pages/events/detail.page.tsx`
- Modify: `src/routes/pages/events/calendar.page.tsx`
- Modify: `src/index.tsx`

**Step 1:** Create admin `bookings.page.tsx` in admin shell:
- Upcoming bookings table with date/event/status filters
- Check-in and no-show action buttons
- Attendance stats per event
- Waitlist section

**Step 2:** Fix events list: add search input, add pagination, format dates as human-readable.

**Step 3:** Fix event detail: add "Join Waitlist" button when full and waitlist enabled. Add cancellation policy preview. Wire review submission form.

**Step 4:** Fix event calendar: add keyboard navigation for grid cells. Add month/year jump dropdown.

**Step 5:** Run `npx tsc --noEmit`. Commit: `feat: add admin bookings page, fix event pages`

---

## Slice H: AI Studio

---

### Task 32: AI Studio schema + fix photo upload

**Files:**
- Modify: `src/infrastructure/db/schema.ts`
- Modify: `src/application/ai-studio/manage-pet-profile.usecase.ts`
- Create: `src/routes/api/pet-photo.routes.ts`
- Modify: `src/routes/api/ai-studio.routes.ts`
- Modify: `src/index.tsx`

**Step 1:** Add `photoStorageKey` column to `pet_profiles`:
```typescript
photoStorageKey: text("photo_storage_key"),
```

**Step 2:** Add indexes: `generation_jobs(user_id, status)`, `generation_jobs(store_id, status)`.

**Step 3:** Add `uploadPhoto(petId, userId, file)` method to `ManagePetProfileUseCase`:
1. Validate file type (image/jpeg, image/png, image/webp) and size (< 5MB)
2. Upload to R2 via `R2StorageAdapter` with key `pets/{petId}/{timestamp}.{ext}`
3. Update pet profile with `photoStorageKey` and `photoUrl` (public URL)

**Step 4:** Create photo upload route: `POST /api/studio/pets/:id/photo` — multipart form data, extracts file, calls use case.

**Step 5:** Run `npx tsc --noEmit`. Commit: `fix: implement pet photo upload (was silently broken)`

---

### Task 33: AI Studio — new use cases, gallery, page fixes

**Files:**
- Create: `src/application/ai-studio/retry-generation.usecase.ts`
- Create: `src/application/ai-studio/list-user-artwork.usecase.ts`
- Create: `src/application/ai-studio/delete-artwork.usecase.ts`
- Modify: `src/application/ai-studio/generate-artwork.usecase.ts`
- Create: `src/routes/pages/account/artwork.page.tsx`
- Modify: `src/routes/pages/account/pets.page.tsx`
- Modify: `src/routes/pages/studio/create.page.tsx`
- Modify: `src/routes/pages/studio/preview.page.tsx`
- Modify: `src/routes/api/ai-studio.routes.ts`
- Modify: `src/index.tsx`

**Step 1:** Create `RetryGenerationUseCase`: verify job failed, reset to queued, re-enqueue.

**Step 2:** Create `ListUserArtworkUseCase`: list completed generation jobs for user with pagination.

**Step 3:** Create `DeleteArtworkUseCase`: delete job record, delete R2 artifacts.

**Step 4:** Fix `GenerateArtworkUseCase`: validate pet has photo (`photoUrl` exists). Add quota concept (placeholder for plan-based limits).

**Step 5:** Add API routes: `POST /studio/jobs/:id/retry`, `GET /studio/gallery`, `DELETE /studio/jobs/:id`.

**Step 6:** Create `artwork.page.tsx`: grid of completed generations, delete/retry buttons, "Create Product" for admins.

**Step 7:** Fix pets page: split photo upload from profile save (two-step: save JSON, then upload file). Pre-populate edit form. Make buttons always visible (not hover-only).

**Step 8:** Fix studio create page: visual step progress (checkmarks), "no photo" warning with inline upload option.

**Step 9:** Fix studio preview: conditionally show "Create Product" only for admin users. Add prominent download button.

**Step 10:** Run `npx tsc --noEmit`. Commit: `feat: add artwork gallery, retry, fix photo upload UX`

---

## Slice I: Fulfillment

---

### Task 34: Fulfillment schema + domain

**Files:**
- Modify: `src/infrastructure/db/schema.ts`
- Modify: `scripts/sql/add-fulfillment-commerce-tables.sql`
- Create: `src/domain/fulfillment/fulfillment-status.vo.ts`

**Step 1:** Add indexes: `shipments(order_id)`, `fulfillment_request_items(fulfillment_request_id)`, `fulfillment_request_items(order_item_id)`.

**Step 2:** Add `providerHealthSnapshots` table:
```typescript
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
```

**Step 3:** Fix `fulfillment_requests.provider` column: change from `text("provider")` to use `fulfillmentProviderTypeEnum`.

**Step 4:** Create `FulfillmentRequestStatus` VO with transition guards.

**Step 5:** Run `npx tsc --noEmit`. Commit: `feat: add fulfillment health snapshots, fix column types`

---

### Task 35: Fulfillment use cases + provider fixes

**Files:**
- Create: `src/application/fulfillment/get-provider-health.usecase.ts`
- Create: `src/application/fulfillment/retry-fulfillment-batch.usecase.ts`
- Modify: `src/infrastructure/fulfillment/gooten.provider.ts`
- Modify: `src/infrastructure/fulfillment/shapeways.provider.ts`

**Step 1:** Create `GetProviderHealthUseCase`: aggregate from health snapshots — success rate, avg response, volume.

**Step 2:** Create `RetryFulfillmentBatchUseCase`: find all failed requests matching filters, reset to pending, re-enqueue each.

**Step 3:** Fix Gooten/Shapeways `verifyWebhook()`: add code comment documenting why verification returns true (no webhook support — Gooten uses polling, Shapeways status TBD).

**Step 4:** Run `npx tsc --noEmit`. Commit: `feat: add fulfillment health tracking, batch retry`

---

### Task 36: Fulfillment pages + shipping/tax admin

**Files:**
- Create: `src/routes/pages/admin/fulfillment-detail.page.tsx`
- Create: `src/routes/pages/admin/shipping.page.tsx`
- Create: `src/routes/pages/admin/tax.page.tsx`
- Create: `public/scripts/admin-shipping.js`
- Modify: `src/routes/pages/admin/fulfillment-dashboard.page.tsx`
- Modify: `src/routes/api/admin-products.routes.ts`
- Modify: `src/index.tsx`

**Step 1:** Fix `fulfillment-dashboard.page.tsx`:
- Add pagination via `Table` component
- Add filter bar: status dropdown, provider dropdown, date range, order ID search
- Make request/order IDs clickable links
- Add provider health cards at top (success rate %, volume)
- Format dates as human-readable
- Add confirmation dialog on retry

**Step 2:** Create `fulfillment-detail.page.tsx` in admin shell:
- Status timeline (visual progression through statuses)
- Items table
- Provider events log (chronological)
- Shipment info with tracking link
- Action buttons (retry/cancel)

**Step 3:** Create `shipping.page.tsx` in admin shell:
- Shipping zones table with country/region display
- Create/edit zone with country multi-select
- Rate management per zone
- Test shipping calculator

**Step 4:** Create `tax.page.tsx` in admin shell:
- Tax zones table
- Create/edit zone
- Rate management
- Test tax calculator

**Step 5:** Add API routes for admin fulfillment: `GET /admin/fulfillment/requests` (paginated, filtered), `GET /admin/fulfillment/requests/:id`, `POST /admin/fulfillment/retry-batch`, `GET /admin/fulfillment/health`.

**Step 6:** Run `npx tsc --noEmit`. Commit: `feat: add fulfillment detail, shipping/tax admin pages`

---

## Slice J: Promotions

---

### Task 37: Fix promotion route registration + schema

**Files:**
- Modify: `src/index.tsx` (line 190)
- Modify: `src/routes/api/promotion.routes.ts`
- Modify: `src/infrastructure/db/schema.ts`

**Step 1:** **Critical fix** — change `index.tsx` line 190:
```typescript
// Before (BUG):
app.route("/api", promotionRoutes);
// After:
app.route("/api/promotions", promotionRoutes);
```

**Step 2:** Update `promotion.routes.ts`: verify all route paths are relative (no `/promotions` prefix in the router since the mount provides it). Fix any affected paths.

**Step 3:** Add indexes: `promotion_redemptions(promotion_id)`, `promotion_redemptions(order_id)`, `coupon_codes(code)`, `customer_segment_memberships(customer_id)`.

**Step 4:** Run `npx tsc --noEmit`. Commit: `fix: promotion route path conflict, add indexes`

---

### Task 38: Promotions — wire use cases + admin pages

**Files:**
- Modify: `src/application/checkout/fulfill-order.usecase.ts`
- Modify: `src/application/checkout/create-checkout.usecase.ts`
- Create: `src/routes/pages/admin/promotions.page.tsx`
- Create: `src/routes/pages/admin/promotion-codes.page.tsx`
- Create: `src/routes/pages/admin/segments.page.tsx`
- Create: `public/scripts/admin-promotions.js`
- Modify: `src/index.tsx`

**Step 1:** Wire `EvaluateCartPromotionsUseCase` into `CreateCheckoutUseCase`: after loading cart, evaluate automatic promotions and apply best one.

**Step 2:** Wire `RedeemPromotionUseCase` into `FulfillOrderUseCase`: when order is created and has a coupon, record redemption and increment usage count.

**Step 3:** Create `promotions.page.tsx` in admin shell:
- Promotion table with status filters
- Create/edit form with strategy selection, conditions, scheduling
- Duplicate and disable buttons

**Step 4:** Create `promotion-codes.page.tsx`: codes table, generate single/bulk, deactivate, export.

**Step 5:** Create `segments.page.tsx`: segment list, rule builder form, manual refresh.

**Step 6:** Run `npx tsc --noEmit`. Commit: `feat: wire promotion evaluation, add admin promotion pages`

---

## Slice K: Reviews

---

### Task 39: Reviews — schema, use cases, pages

**Files:**
- Modify: `src/infrastructure/db/schema.ts`
- Modify: `src/application/catalog/submit-review.usecase.ts`
- Modify: `src/application/catalog/list-reviews.usecase.ts`
- Create: `src/application/catalog/respond-to-review.usecase.ts`
- Create: `src/routes/pages/admin/reviews.page.tsx`
- Modify: `src/routes/api/review.routes.ts`
- Modify: `src/index.tsx`

**Step 1:** Schema changes to `product_reviews`:
- Add `response_text` text column, `response_at` timestamp
- Add `verified_purchase_order_id` UUID FK column
- Add unique constraint on `(product_id, user_id)`
- Add index on `(store_id, status)`

**Step 2:** Fix `SubmitReviewUseCase`: verified purchase check, duplicate prevention, set `verified_purchase_order_id`.

**Step 3:** Fix `ListReviewsUseCase`: calculate and return `ReviewSummary` (avg rating, count, star distribution).

**Step 4:** Create `RespondToReviewUseCase`: store owner adds public reply.

**Step 5:** Add API route: `POST /api/reviews/:id/respond` (requires admin role).

**Step 6:** Create admin `reviews.page.tsx` in admin shell:
- Moderation queue (pending reviews)
- Filters: status, product, rating, date range
- Approve/reject/flag actions
- Inline reply form

**Step 7:** Run `npx tsc --noEmit`. Commit: `feat: add review responses, verified purchases, admin moderation page`

---

## Slice L: Affiliates

---

### Task 40: Affiliates — schema, use cases, attribution, pages

**Files:**
- Modify: `src/infrastructure/db/schema.ts`
- Modify: `scripts/sql/add-fulfillment-commerce-tables.sql`
- Create: `src/application/affiliates/register-affiliate.usecase.ts`
- Create: `src/application/affiliates/get-affiliate-dashboard.usecase.ts`
- Create: `src/application/affiliates/attribute-conversion.usecase.ts`
- Modify: `src/application/checkout/fulfill-order.usecase.ts`
- Modify: `src/routes/api/affiliate.routes.ts`
- Modify: `src/routes/pages/affiliates/dashboard.page.tsx`
- Modify: `src/routes/pages/affiliates/links.page.tsx`
- Modify: `src/routes/pages/affiliates/payouts.page.tsx`
- Modify: `src/routes/pages/affiliates/register.page.tsx`
- Create: `src/routes/pages/admin/affiliates.page.tsx`
- Modify: `src/components/layout/nav.tsx`
- Modify: `src/index.tsx`

**Step 1:** Schema fixes:
- Add proper FK constraint on `affiliates.parent_affiliate_id` → `affiliates(id)`
- Add proper FK constraint on `affiliate_conversions.parent_conversion_id` → `affiliate_conversions(id)`
- Add indexes: `affiliate_conversions(affiliate_id, status)`, `affiliate_conversions(order_id)`
- Add `minimum_payout_amount` to `affiliate_tiers` (default 25.00)
- Add `payout_email` to `affiliates`

**Step 2:** Extract `RegisterAffiliateUseCase` from inline route handler. Add email verified check.

**Step 3:** Extract `GetAffiliateDashboardUseCase` from inline handler. Add trend data (this month vs last month).

**Step 4:** Create `AttributeConversionUseCase`: check request for affiliate cookie, look up affiliate, create conversion record. Wire into `FulfillOrderUseCase`.

**Step 5:** Fix affiliate page props: replace all `any` with typed interfaces. Add copy-to-clipboard buttons on referral codes and short links. Add commission rate display on register page.

**Step 6:** Add "Affiliates" to nav.tsx for registered affiliate users.

**Step 7:** Create admin `affiliates.page.tsx`: table with approve/suspend, performance view.

**Step 8:** Run `npx tsc --noEmit`. Commit: `feat: fix affiliates — attribution, typed props, admin page`

---

## Slice M: Analytics

---

### Task 41: Analytics — schema, use cases, dashboard

**Files:**
- Modify: `src/infrastructure/db/schema.ts`
- Create: `src/application/analytics/get-conversion-funnel.usecase.ts`
- Create: `src/application/analytics/get-top-products.usecase.ts`
- Create: `src/application/analytics/get-revenue-metrics.usecase.ts`
- Modify: `src/application/analytics/track-event.usecase.ts`
- Modify: `src/application/analytics/get-dashboard-metrics.usecase.ts`
- Modify: `src/routes/api/analytics.routes.ts`
- Create: `src/routes/pages/admin/analytics.page.tsx`
- Modify: `src/index.tsx`

**Step 1:** Add `analytics_funnels` table:
```typescript
export const funnelStepEnum = pgEnum("funnel_step", [
  "page_view", "product_view", "add_to_cart", "checkout_started", "order_completed"
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
```

**Step 2:** Fix analytics index: ensure `analytics_events` has `(store_id, created_at)` compound index (current one has `event_type` in the middle).

**Step 3:** Remove duplicate analytics stub in `index.tsx` (the one that just logs and returns 202).

**Step 4:** Fix `TrackEventUseCase`: when event type matches a funnel step, also insert into `analytics_funnels`.

**Step 5:** Fix `GetDashboardMetricsUseCase`: make store-scoped (remove super_admin restriction). Add period comparison.

**Step 6:** Create `GetConversionFunnelUseCase`, `GetTopProductsUseCase`, `GetRevenueMetricsUseCase`.

**Step 7:** Add API routes: `GET /analytics/funnel`, `GET /analytics/top-products`, `GET /analytics/revenue`.

**Step 8:** Create admin `analytics.page.tsx` in admin shell:
- Summary stat cards with trend arrows
- Revenue chart (server-rendered SVG bar chart)
- Conversion funnel visualization
- Top products table
- Date range picker

**Step 9:** Run `npx tsc --noEmit`. Commit: `feat: add analytics funnel, revenue metrics, admin dashboard`

---

## Slice N: Platform

---

### Task 42: Platform schema + invitation flow

**Files:**
- Modify: `src/infrastructure/db/schema.ts`
- Modify: `scripts/sql/add-fulfillment-commerce-tables.sql`
- Create: `src/application/platform/invite-member.usecase.ts`
- Create: `src/application/platform/accept-invitation.usecase.ts`
- Create: `src/application/platform/change-member-role.usecase.ts`
- Modify: `src/routes/api/platform.routes.ts`

**Step 1:** Add `storeInvitations` table:
```typescript
export const invitationStatusEnum = pgEnum("invitation_status", ["pending", "accepted", "expired"]);

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
});
```

**Step 2:** Add `logo_url` and `favicon_url` columns to `stores` table.

**Step 3:** Add index: `platform_transactions(store_id, created_at)`.

**Step 4:** Create `InviteMemberUseCase`: generate token, insert invitation, enqueue invitation email.

**Step 5:** Create `AcceptInvitationUseCase`: validate token not expired, find or prompt user creation, add store member, mark accepted.

**Step 6:** Create `ChangeMemberRoleUseCase`: validate requester is owner, update role.

**Step 7:** Add API routes: `POST /platform/stores/:id/invite`, `POST /platform/invitations/:token/accept`, `PATCH /platform/stores/:id/members/:userId/role`.

**Step 8:** Run `npx tsc --noEmit`. Commit: `feat: add email-based member invitation flow`

---

### Task 43: Platform — extract use cases, fix pages

**Files:**
- Create: `src/application/platform/create-store.usecase.ts`
- Create: `src/application/platform/update-store.usecase.ts`
- Create: `src/application/platform/get-store-dashboard.usecase.ts`
- Create: `src/application/platform/upload-store-logo.usecase.ts`
- Modify: `src/routes/api/platform.routes.ts`
- Modify: `src/routes/pages/platform/store-dashboard.page.tsx`
- Modify: `src/routes/pages/platform/store-settings.page.tsx`
- Modify: `src/routes/pages/platform/members.page.tsx`
- Modify: `src/routes/pages/platform/create-store.page.tsx`
- Modify: `src/index.tsx`

**Step 1:** Extract `CreateStoreUseCase`: validate, create store, add creator as owner, create default settings.

**Step 2:** Extract `UpdateStoreUseCase`: validate, handle slug change (create redirect), update record.

**Step 3:** Extract `GetStoreDashboardUseCase`: return store + members (with names, not UUIDs) + domains + billing + revenue stats + order count.

**Step 4:** Create `UploadStoreLogoUseCase`: upload to R2, update store `logo_url`.

**Step 5:** Wire extracted use cases to routes (replace inline logic).

**Step 6:** Fix store dashboard: show member names/emails not UUIDs. Add revenue/order stat cards. Replace emoji with SVG icons. Add action items section.

**Step 7:** Fix store settings: add logo upload. Make plan cards clickable for upgrade. Add social links inputs. Add custom domain management section.

**Step 8:** Fix members page: change "User ID" input to "Email" input. Wire to invitation flow. Add role change dropdown. Show invitation pending state.

**Step 9:** Fix create store: add logo upload. Add real-time slug availability check. Add color preview.

**Step 10:** Run `npx tsc --noEmit`. Commit: `feat: extract platform use cases, fix member invitations and store pages`

---

## Slice O: Venues

---

### Task 44: Venues — schema, MapLibre fix, pages

**Files:**
- Modify: `src/infrastructure/db/schema.ts`
- Modify: `src/routes/pages/venues/list.page.tsx`
- Modify: `src/routes/pages/venues/detail.page.tsx`
- Create: `src/routes/pages/admin/venues.page.tsx`
- Modify: `public/scripts/map.js`
- Modify: `src/index.tsx`

**Step 1:** Schema: add `operating_hours` jsonb and `featured_image_url` to `venues`.

**Step 2:** Fix MapLibre loading in both venue pages:
- Add SRI integrity hash to CDN `<script>` and `<link>` tags
- Move MapLibre CSS `<link>` into `<head>` via Layout prop (not inside `<body>`)
- Add `defer` to map scripts
- Add loading state and error fallback for map container

**Step 3:** Fix venue list page: replace `any` types with typed props. Add search input. Add capacity with units ("50 people").

**Step 4:** Fix venue detail page: replace `any` types. Add photo gallery. Add operating hours display. Add directions link (Google Maps URL). Add `Place` JSON-LD.

**Step 5:** Create admin `venues.page.tsx` in admin shell:
- Venue table with status, city, event count
- Create/edit form with map pin, hours editor, photo upload, amenities

**Step 6:** Run `npx tsc --noEmit`. Commit: `feat: fix venues — MapLibre security, typed props, admin page`

---

## Slice P: Cross-Cutting — Content, Errors, Performance, Accessibility, LLM

---

### Task 45: About + Contact pages

**Files:**
- Modify: `src/index.tsx` (about and contact inline handlers)
- Create: `src/routes/pages/about.page.tsx`
- Create: `src/routes/pages/contact.page.tsx`
- Create: `public/scripts/contact.js`

**Step 1:** Create `about.page.tsx`:
- Store description section (from store settings or description)
- Team section (from store members with role badges)
- Social links
- Organization JSON-LD

**Step 2:** Create `contact.page.tsx`:
- Contact form (name, email, subject, message) with validation
- `contact.js` handles form submission → `POST` to a new notification queue message
- Store contact info (email, phone from store settings)
- Location with map if venue exists
- ContactPage JSON-LD

**Step 3:** Replace inline handlers in index.tsx with page component routes.

**Step 4:** Run `npx tsc --noEmit`. Commit: `feat: add real about and contact pages with structured data`

---

### Task 46: Error states + empty states standardization

**Files:**
- Modify: `src/routes/pages/404.page.tsx`
- Modify: `src/components/ui/error-page.tsx`
- Modify: (multiple page files that need EmptyState)

**Step 1:** Enhance 404 page: add search bar, popular links (Shop, Events, Studio), "Back to Home" CTA.

**Step 2:** Add 500 error page variant to `error-page.tsx`: friendly message, "Try again" button, support contact.

**Step 3:** Audit and replace hand-rolled empty states across pages with the `EmptyState` component: product grid, orders list, bookings list, events list, affiliate links, pets list, etc.

**Step 4:** Run `npx tsc --noEmit`. Commit: `feat: standardize error and empty states across all pages`

---

### Task 47: Performance — conditional scripts, lazy images

**Files:**
- Modify: `src/routes/pages/_layout.tsx`
- Modify: (product grid, event cards, and other image-heavy components)

**Step 1:** Implement conditional script loading in Layout (verify Task 4 covered this, expand if needed):
- Add `loading="lazy"` to all below-fold images in product grids, event cards, gallery thumbnails
- Add `fetchpriority="high"` to hero/LCP images (home page hero, product detail main image)
- Add preconnect for Stripe.js domain: `<link rel="preconnect" href="https://js.stripe.com">`

**Step 2:** Run `npx tsc --noEmit`. Commit: `perf: lazy images, fetch priority, preconnect hints`

---

### Task 48: Accessibility fixes

**Files:**
- Modify: `src/routes/pages/account/pets.page.tsx` (already partly fixed in Task 14)
- Modify: `src/routes/pages/events/calendar.page.tsx`
- Modify: `src/components/booking/calendar-view.tsx`
- Modify: (form components)

**Step 1:** Fix calendar keyboard navigation: add `tabindex="0"` to event day cells, arrow key handlers for grid navigation, Enter to select.

**Step 2:** Ensure all modals use the `Modal` component (focus trap, Escape, backdrop).

**Step 3:** Ensure all form error messages use `aria-describedby` linking error to input.

**Step 4:** Audit heading hierarchy: ensure no pages skip heading levels (h1 → h3 without h2).

**Step 5:** Run `npx tsc --noEmit`. Commit: `fix: accessibility — keyboard nav, focus traps, ARIA attributes`

---

### Task 49: LLM discoverability

**Files:**
- Already created in Task 6: `/llms.txt`, `/.well-known/ai-plugin.json`
- Modify: `src/routes/pages/product-detail.page.tsx` (add FAQ section)
- Modify: `src/routes/pages/events/detail.page.tsx` (already has FAQs, ensure schema)

**Step 1:** Verify `llms.txt` is comprehensive: site purpose, key pages, product categories, structured data types available.

**Step 2:** Add FAQ section to product detail pages: if product has description with common questions, render as `<details>` elements and add FAQPage JSON-LD.

**Step 3:** Ensure every page has sufficient unique text content beyond just data. Add descriptive intro paragraphs to listing pages (products, events, venues).

**Step 4:** Run `npx tsc --noEmit`. Commit: `feat: enhance LLM discoverability — FAQ sections, rich text content`

---

### Task 50: Final verification

**Step 1:** Run `npx tsc --noEmit` — expect 0 errors.

**Step 2:** Review all SQL migration files for completeness.

**Step 3:** Verify no `as any` remains at page prop boundaries (grep for `as any` in pages directory).

**Step 4:** Verify all design system components are used consistently (grep for raw Tailwind badge/button patterns in pages).

**Step 5:** Commit any fixes: `fix: address remaining type errors from full verification`

---

## Summary

| Slice | Tasks | What it delivers |
|---|---|---|
| A: Shared Kernel | 1-8 | Design system (13 components), admin shell, SEO framework, redirects, audit log |
| B: Identity | 9-14 | Password reset, email verification, profile management, sign-out |
| C: Catalog | 15-20 | Product status, admin CRUD, collection management, review display, SEO |
| D: Cart | 21 | Server totals, coupon persistence, validation, warnings |
| E: Checkout | 22-27 | Real tax/shipping, Stripe refunds, order review page, admin orders |
| F: Billing | 28 | Plan changes, resume subscription |
| G: Booking | 29-31 | Waitlist, no-show, policy enforcement, admin bookings |
| H: AI Studio | 32-33 | Photo upload fix, artwork gallery, retry, quotas |
| I: Fulfillment | 34-36 | Health tracking, batch retry, shipping/tax admin pages |
| J: Promotions | 37-38 | Route fix, wire evaluation, admin promotion pages |
| K: Reviews | 39 | Store responses, verified purchases, admin moderation |
| L: Affiliates | 40 | Attribution wiring, typed props, admin page |
| M: Analytics | 41 | Conversion funnel, revenue metrics, admin dashboard |
| N: Platform | 42-43 | Email invitations, logo upload, extract use cases, fix pages |
| O: Venues | 44 | MapLibre security fix, typed props, admin page |
| P: Cross-Cutting | 45-50 | Content pages, error states, performance, accessibility, LLM |

**Total: 50 tasks across 16 vertical slices.**
