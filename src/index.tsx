import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { createYoga } from "graphql-yoga";
import type { Env } from "./env";
import { handleScheduled } from "./scheduled/handler";
import { handleQueue } from "./queues/handler";
import { requireAuth } from "./middleware/auth.middleware";
import { requireRole } from "./middleware/role.middleware";

// Middleware
import { errorHandler } from "./middleware/error-handler.middleware";
import { tenantMiddleware } from "./middleware/tenant.middleware";
import { affiliateMiddleware } from "./middleware/affiliate.middleware";

// Repositories
import { RedirectRepository } from "./infrastructure/repositories/redirect.repository";

// API Routes
import { authRoutes } from "./routes/api/auth.routes";
import { productRoutes } from "./routes/api/products.routes";
import { cartRoutes } from "./routes/api/cart.routes";
import { checkoutRoutes } from "./routes/api/checkout.routes";
import { orderRoutes } from "./routes/api/orders.routes";
import { subscriptionRoutes } from "./routes/api/subscriptions.routes";
import { bookingRoutes } from "./routes/api/bookings.routes";
import { aiStudioRoutes } from "./routes/api/ai-studio.routes";
import { fulfillmentRoutes } from "./routes/api/fulfillment.routes";
import { webhookRoutes } from "./routes/api/webhooks.routes";
import platformRoutes from "./routes/api/platform.routes";
import affiliateRoutes from "./routes/api/affiliate.routes";
import venueRoutes from "./routes/api/venue.routes";
import { integrationRoutes } from "./routes/api/integrations.routes";
import { cacheRoutes } from "./routes/api/cache.routes";
import { cacheResponse } from "./middleware/cache.middleware";
import { browserCaching } from "./middleware/browser-cache.middleware";
import { adminProductRoutes } from "./routes/api/admin-products.routes";
import { adminCollectionRoutes } from "./routes/api/admin-collections.routes";
import { adminOrderRoutes } from "./routes/api/admin-orders.routes";
import { cancellationRoutes } from "./routes/api/cancellations.routes";
import { downloadRoutes } from "./routes/api/downloads.routes";
import promotionRoutes from "./routes/api/promotions.routes";
import { shippingZoneRoutes } from "./routes/api/shipping-zones.routes";
import { taxRoutes } from "./routes/api/tax.routes";
import { reviewRoutes } from "./routes/api/reviews.routes";
import { analyticsRoutes } from "./routes/api/analytics.routes";
import { currencyRoutes } from "./routes/api/currency.routes";

// GraphQL
import { schema } from "./graphql/schema";
import { createGraphQLContext } from "./graphql/context";

// Pages — use FC<any> wrappers to bridge repo return types with page prop interfaces
// The actual data shapes are compatible at runtime; the mismatch is null vs undefined and field naming
import { Layout } from "./routes/pages/_layout";
import { HomePage as _HomePage } from "./routes/pages/home.page";
import { ProductListPage as _ProductListPage } from "./routes/pages/product-list.page";
import { ProductDetailPage as _ProductDetailPage } from "./routes/pages/product-detail.page";
import { CartPage as _CartPage } from "./routes/pages/cart.page";
import { CheckoutSuccessPage as _CheckoutSuccessPage } from "./routes/pages/checkout-success.page";
import { LoginPage } from "./routes/pages/auth/login.page";
import { RegisterPage } from "./routes/pages/auth/register.page";
import { ForgotPasswordPage } from "./routes/pages/auth/forgot-password.page";
import { ResetPasswordPage as _ResetPasswordPage } from "./routes/pages/auth/reset-password.page";
import { VerifyEmailPage as _VerifyEmailPage } from "./routes/pages/auth/verify-email.page";
import { DashboardPage as _DashboardPage } from "./routes/pages/account/dashboard.page";
import { OrdersPage as _OrdersPage } from "./routes/pages/account/orders.page";
import { AddressesPage as _AddressesPage } from "./routes/pages/account/addresses.page";
import { SubscriptionsPage as _SubscriptionsPage } from "./routes/pages/account/subscriptions.page";
import { PetsPage as _PetsPage } from "./routes/pages/account/pets.page";
import { ArtworkPage as _ArtworkPage } from "./routes/pages/account/artwork.page";
import { SettingsPage as _SettingsPage } from "./routes/pages/account/settings.page";
import { StudioCreatePage as _StudioCreatePage } from "./routes/pages/studio/create.page";
import { StudioPreviewPage as _StudioPreviewPage } from "./routes/pages/studio/preview.page";
import { StudioGalleryPage as _StudioGalleryPage } from "./routes/pages/studio/gallery.page";
import { EventsListPage as _EventsListPage } from "./routes/pages/events/list.page";
import { EventDetailPage as _EventDetailPage } from "./routes/pages/events/detail.page";
import { EventCalendarPage as _EventCalendarPage } from "./routes/pages/events/calendar.page";
import { CreateStorePage as _CreateStorePage } from "./routes/pages/platform/create-store.page";
import { StoreDashboardPage as _StoreDashboardPage } from "./routes/pages/platform/store-dashboard.page";
import { StoreSettingsPage as _StoreSettingsPage } from "./routes/pages/platform/store-settings.page";
import { MembersPage as _MembersPage } from "./routes/pages/platform/members.page";
import { AffiliateDashboardPage as _AffiliateDashboardPage } from "./routes/pages/affiliates/dashboard.page";
import { AffiliateLinksPage as _AffiliateLinksPage } from "./routes/pages/affiliates/links.page";
import { AffiliatePayoutsPage as _AffiliatePayoutsPage } from "./routes/pages/affiliates/payouts.page";
import { AffiliateRegisterPage as _AffiliateRegisterPage } from "./routes/pages/affiliates/register.page";
import { VenueListPage as _VenueListPage } from "./routes/pages/venues/list.page";
import { VenueDetailPage as _VenueDetailPage } from "./routes/pages/venues/detail.page";
import { AdminIntegrationsPage as _AdminIntegrationsPage } from "./routes/pages/admin/integrations.page";
import { CreateProductPage as _CreateProductPage } from "./routes/pages/platform/create-product.page";
import { FulfillmentDashboardPage as _FulfillmentDashboardPage } from "./routes/pages/admin/fulfillment-dashboard.page";
import { AdminProductsPage as _AdminProductsPage } from "./routes/pages/admin/products.page";
import { ProductEditPage as _ProductEditPage } from "./routes/pages/admin/product-edit.page";
import { AdminCollectionsPage as _AdminCollectionsPage } from "./routes/pages/admin/collections.page";
import { AdminOrdersPage as _AdminOrdersPage } from "./routes/pages/admin/orders.page";
import { AdminOrderDetailPage as _AdminOrderDetailPage } from "./routes/pages/admin/order-detail.page";
import { AdminBookingsPage as _AdminBookingsPage } from "./routes/pages/admin/bookings.page";
import { FulfillmentDetailPage as _FulfillmentDetailPage } from "./routes/pages/admin/fulfillment-detail.page";
import { ShippingPage as _ShippingPage } from "./routes/pages/admin/shipping.page";
import { TaxPage as _TaxPage } from "./routes/pages/admin/tax.page";
import { PromotionsPage as _PromotionsPage } from "./routes/pages/admin/promotions.page";
import { PromotionCodesPage as _PromotionCodesPage } from "./routes/pages/admin/promotion-codes.page";
import { SegmentsPage as _SegmentsPage } from "./routes/pages/admin/segments.page";
import { AdminReviewsPage as _AdminReviewsPage } from "./routes/pages/admin/reviews.page";
import { AdminAffiliatesPage as _AdminAffiliatesPage } from "./routes/pages/admin/affiliates.page";
import { AdminAnalyticsPage as _AdminAnalyticsPage } from "./routes/pages/admin/analytics.page";
import { StoreIntegrationsPage as _StoreIntegrationsPage } from "./routes/pages/platform/store-integrations.page";
import { NotFoundPage } from "./routes/pages/404.page";
import { ErrorPage } from "./components/ui/error-page";
import { withErrorHandling } from "./middleware/page-error.middleware";

// Type-erased page components for flexible data passing from repositories
const HomePage = _HomePage as any;
const ProductListPage = _ProductListPage as any;
const ProductDetailPage = _ProductDetailPage as any;
const CartPage = _CartPage as any;
const CheckoutSuccessPage = _CheckoutSuccessPage as any;
const DashboardPage = _DashboardPage as any;
const OrdersPage = _OrdersPage as any;
const AddressesPage = _AddressesPage as any;
const SubscriptionsPage = _SubscriptionsPage as any;
const PetsPage = _PetsPage as any;
const ArtworkPage = _ArtworkPage as any;
const SettingsPage = _SettingsPage as any;
const StudioCreatePage = _StudioCreatePage as any;
const StudioPreviewPage = _StudioPreviewPage as any;
const StudioGalleryPage = _StudioGalleryPage as any;
const EventsListPage = _EventsListPage as any;
const EventDetailPage = _EventDetailPage as any;
const EventCalendarPage = _EventCalendarPage as any;
const CreateStorePage = _CreateStorePage as any;
const StoreDashboardPage = _StoreDashboardPage as any;
const StoreSettingsPage = _StoreSettingsPage as any;
const MembersPage = _MembersPage as any;
const AffiliateDashboardPage = _AffiliateDashboardPage as any;
const AffiliateLinksPage = _AffiliateLinksPage as any;
const AffiliatePayoutsPage = _AffiliatePayoutsPage as any;
const AffiliateRegisterPage = _AffiliateRegisterPage as any;
const VenueListPage = _VenueListPage as any;
const VenueDetailPage = _VenueDetailPage as any;
const AdminIntegrationsPage = _AdminIntegrationsPage as any;
const StoreIntegrationsPage = _StoreIntegrationsPage as any;
const CreateProductPage = _CreateProductPage as any;
const FulfillmentDashboardPage = _FulfillmentDashboardPage as any;
const AdminProductsPage = _AdminProductsPage as any;
const ProductEditPage = _ProductEditPage as any;
const AdminCollectionsPage = _AdminCollectionsPage as any;
const AdminOrdersPage = _AdminOrdersPage as any;
const AdminOrderDetailPage = _AdminOrderDetailPage as any;
const AdminBookingsPage = _AdminBookingsPage as any;
const FulfillmentDetailPage = _FulfillmentDetailPage as any;
const ShippingPage = _ShippingPage as any;
const TaxPage = _TaxPage as any;
const PromotionsPage = _PromotionsPage as any;
const PromotionCodesPage = _PromotionCodesPage as any;
const SegmentsPage = _SegmentsPage as any;
const AdminReviewsPage = _AdminReviewsPage as any;
const AdminAffiliatesPage = _AdminAffiliatesPage as any;
const AdminAnalyticsPage = _AdminAnalyticsPage as any;
const ResetPasswordPage = _ResetPasswordPage as any;
const VerifyEmailPage = _VerifyEmailPage as any;

// Infrastructure
import { createDb } from "./infrastructure/db/client";
import { fulfillmentProviders, couponCodes, promotions } from "./infrastructure/db/schema";
import { ProductRepository } from "./infrastructure/repositories/product.repository";
import { CartRepository } from "./infrastructure/repositories/cart.repository";
import { OrderRepository } from "./infrastructure/repositories/order.repository";
import { BookingRepository } from "./infrastructure/repositories/booking.repository";
import { AiJobRepository } from "./infrastructure/repositories/ai-job.repository";
import { UserRepository } from "./infrastructure/repositories/user.repository";
import { SubscriptionRepository } from "./infrastructure/repositories/subscription.repository";
import { StoreRepository } from "./infrastructure/repositories/store.repository";
import { AffiliateRepository } from "./infrastructure/repositories/affiliate.repository";
import { VenueRepository } from "./infrastructure/repositories/venue.repository";
import { IntegrationRepository as IntegrationRepoImpl, IntegrationSecretRepository as SecretRepoImpl } from "./infrastructure/repositories/integration.repository";
import { ReviewRepository } from "./infrastructure/repositories/review.repository";
import { PromotionRepository } from "./infrastructure/repositories/promotion.repository";
import { AnalyticsRepository } from "./infrastructure/repositories/analytics.repository";
import { ListIntegrationsUseCase } from "./application/platform/list-integrations.usecase";
import { CheckInfrastructureUseCase } from "./application/platform/check-infrastructure.usecase";
import { verifyJwt } from "./infrastructure/security/jwt";
import { getCookie } from "hono/cookie";
import { AUTH_COOKIE_NAME, CART_COOKIE_NAME } from "./shared/constants";

const app = new Hono<{ Bindings: Env }>();

// ─── Global Middleware ─────────────────────────────────────
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", errorHandler());

function isAdminPlatformRole(role: string | null | undefined) {
  return role === "super_admin" || role === "group_admin";
}

// Protect admin pages at the app boundary.
app.use("/admin/*", async (c, next) => {
  const token = getCookie(c, AUTH_COOKIE_NAME);
  if (!token) return c.redirect("/auth/login");

  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) return c.redirect("/auth/login");

  const db = createDb(c.env.DATABASE_URL);
  const userRepo = new UserRepository(db);
  const dbUser = await userRepo.findById(payload.sub);

  if (!isAdminPlatformRole(dbUser?.platformRole)) {
    return c.text("Forbidden", 403);
  }

  await next();
});

app.use("/api/admin/*", requireAuth(), requireRole("admin"));
app.use("*", tenantMiddleware());
app.use("*", affiliateMiddleware());
app.use("/api/*", cors());
app.use("*", browserCaching());

// ─── Page-level Response Cache (product detail pages, 10min) ──
app.use(
  "/products/:slug",
  cacheResponse({
    ttl: 600,
    dynamicTags: (c) => {
      const slug = c.req.param("slug");
      return slug ? [`product:${slug}`] : [];
    },
  }),
);

// ─── Health Check ──────────────────────────────────────────
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// ─── API Routes ────────────────────────────────────────────
app.route("/api/auth", authRoutes);
app.route("/api", productRoutes);
app.route("/api", cartRoutes);
app.route("/api", checkoutRoutes);
app.route("/api", orderRoutes);
app.route("/api", subscriptionRoutes);
app.route("/api/bookings", bookingRoutes);
app.route("/api/studio", aiStudioRoutes);
app.route("/api", fulfillmentRoutes);
app.route("/api", webhookRoutes);
app.route("/api/platform", platformRoutes);
app.route("/api/affiliates", affiliateRoutes);
app.route("/api/venues", venueRoutes);
app.route("/api/integrations", integrationRoutes);
app.route("/api", cacheRoutes);
app.route("/api/admin", adminProductRoutes);
app.route("/api/admin/collections", adminCollectionRoutes);
app.route("/api/admin", adminOrderRoutes);
app.route("/api", cancellationRoutes);
app.route("/api", downloadRoutes);
app.route("/api/promotions", promotionRoutes);
app.route("/api", shippingZoneRoutes);
app.route("/api/tax", taxRoutes);
app.route("/api", reviewRoutes);
app.route("/api", analyticsRoutes);
app.route("/api", currencyRoutes);

// ─── GraphQL ───────────────────────────────────────────────
const yoga = createYoga({ schema, graphqlEndpoint: "/graphql" });

app.on(["GET", "POST"], "/graphql", async (c) => {
  const context = await createGraphQLContext(c);
  const response = await (yoga.handle as any)(c.req.raw, context) as Response;
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
});

// ─── Helper: get auth + cart state for pages ───────────────
async function getPageContext(c: any) {
  const token = getCookie(c, AUTH_COOKIE_NAME);
  let user: any = null;
  if (token) {
    user = await verifyJwt(token, c.env.JWT_SECRET);
  }
  const cartSessionId = getCookie(c, CART_COOKIE_NAME);
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const store = c.get("store") as any;

  let cartCount = 0;
  if (cartSessionId) {
    try {
      const cartRepo = new CartRepository(db, storeId);
      const cart = await cartRepo.findOrCreateCart(cartSessionId, user?.sub);
      const cartData = await cartRepo.findCartWithItems(cart.id);
      cartCount = (cartData as any)?.items?.length ?? 0;
    } catch { /* cart not critical for page render */ }
  }

  const storeName = store?.name ?? "petm8";
  const storeLogo = store?.logo ?? null;
  const primaryColor = store?.primaryColor ?? null;
  const secondaryColor = store?.secondaryColor ?? null;

  return { user, db, storeId, store, cartCount, isAuthenticated: !!user, storeName, storeLogo, primaryColor, secondaryColor };
}

function formatDateUs(input: string | Date | null | undefined) {
  if (!input) return "";
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTimeUs(slotTime: string) {
  const date = new Date(`1970-01-01T${slotTime}`);
  if (Number.isNaN(date.getTime())) return slotTime;
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeCsv(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function getPreviousDateRange(dateFrom: string, dateTo: string) {
  const startMs = Date.parse(`${dateFrom}T00:00:00Z`);
  const endMs = Date.parse(`${dateTo}T00:00:00Z`);
  const dayMs = 24 * 60 * 60 * 1000;

  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return { previousFrom: dateFrom, previousTo: dateTo };
  }

  const dayCount = Math.floor((endMs - startMs) / dayMs) + 1;
  const previousEndMs = startMs - dayMs;
  const previousStartMs = previousEndMs - (dayCount - 1) * dayMs;

  return {
    previousFrom: new Date(previousStartMs).toISOString().slice(0, 10),
    previousTo: new Date(previousEndMs).toISOString().slice(0, 10),
  };
}

function calculateTrendPercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

// ─── Page Routes ───────────────────────────────────────────

// Home
app.get("/", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const productRepo = new ProductRepository(db, storeId);
  const result = await productRepo.findAll({ limit: 8, available: true });
  const allCollections = await productRepo.findCollections();

  let userPets: any[] = [];
  if (user) {
    const aiRepo = new AiJobRepository(db, storeId);
    userPets = await aiRepo.findPetsByUserId(user.sub);
  }

  const siteUrl = c.env.APP_URL || "https://petm8.io";
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: storeName,
    url: siteUrl,
    logo: storeLogo || `${siteUrl}/logo.png`,
    description: "Everything for your furry friend. Premium supplies, custom AI pet portraits, and subscriptions.",
  };

  return c.html(
    <Layout
      title="Home"
      activePath="/"
      isAuthenticated={isAuthenticated}
      cartCount={cartCount}
      stripePublishableKey={c.env.STRIPE_PUBLISHABLE_KEY}
      url={siteUrl}
      jsonLd={organizationJsonLd}
      storeName={storeName}
      storeLogo={storeLogo}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
    >
      <HomePage
        user={user as any}
        userPets={userPets as any}
        featuredProducts={result.products as any}
        featuredCollections={allCollections as any}
      />
    </Layout>
  );
});

// Legacy route aliases
app.get("/shop", (c) => c.redirect("/products", 301));
app.get("/collections", (c) => c.redirect("/products", 301));
app.get("/collections/:slug", (c) => {
  const slug = c.req.param("slug");
  return c.redirect(`/products?collection=${encodeURIComponent(slug)}`, 301);
});
app.get("/login", (c) => c.redirect("/auth/login", 301));
app.get("/subscriptions", (c) => c.redirect("/products?type=subscription", 301));
app.get("/subscriptions/success", (c) => c.redirect("/account/subscriptions", 302));
// Forgot password page (fixes dead-end redirect)
app.get("/auth/forgot-password", async (c) => {
  const { cartCount, isAuthenticated, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  return c.html(
    <Layout url={c.req.url} title="Forgot Password" activePath="/auth/forgot-password" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <ForgotPasswordPage />
    </Layout>
  );
});

// Reset password page
app.get("/auth/reset-password", async (c) => {
  const { cartCount, isAuthenticated, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const token = c.req.query("token") || "";
  return c.html(
    <Layout url={c.req.url} title="Reset Password" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <ResetPasswordPage token={token} />
    </Layout>
  );
});

// Email verification page (server-side verification on GET)
app.get("/auth/verify-email", async (c) => {
  const { cartCount, isAuthenticated, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const token = c.req.query("token") || "";
  let success = false;
  let error: string | undefined;

  if (token) {
    try {
      const db = createDb(c.env.DATABASE_URL);
      const { VerifyEmailUseCase } = await import("./application/identity/verify-email.usecase");
      const { UserRepository } = await import("./infrastructure/repositories/user.repository");
      const useCase = new VerifyEmailUseCase(new UserRepository(db));
      await useCase.execute({ token });
      success = true;
    } catch (e) {
      error = e instanceof Error ? e.message : "Verification failed";
    }
  } else {
    error = "No verification token provided";
  }

  return c.html(
    <Layout url={c.req.url} title="Verify Email" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <VerifyEmailPage success={success} error={error} />
    </Layout>
  );
});

app.get("/about", async (c) => {
  const { cartCount, isAuthenticated, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  return c.html(
    <Layout url={c.req.url} title="About" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <div class="max-w-3xl mx-auto px-4 py-12">
        <h1 class="text-3xl font-bold text-gray-900 mb-4">About {storeName}</h1>
        <p class="text-gray-600 leading-relaxed">
          {storeName} helps pet families discover premium products, local events, and personalized AI-powered experiences.
        </p>
      </div>
    </Layout>
  );
});

app.get("/contact", async (c) => {
  const { cartCount, isAuthenticated, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  return c.html(
    <Layout url={c.req.url} title="Contact" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <div class="max-w-3xl mx-auto px-4 py-12">
        <h1 class="text-3xl font-bold text-gray-900 mb-4">Contact</h1>
        <p class="text-gray-600 leading-relaxed">
          Reach us at <a class="text-brand-600 hover:text-brand-700" href="mailto:support@petm8.io">support@petm8.io</a>.
        </p>
      </div>
    </Layout>
  );
});

app.get("/robots.txt", (c) => {
  const appUrl = (c.env.APP_URL || "https://petm8.io").replace(/\/$/, "");
  const robotsTxt = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /admin/",
    "Disallow: /platform/",
    "Disallow: /account/",
    "",
    `Sitemap: ${appUrl}/sitemap.xml`,
    "",
  ].join("\n");
  return c.text(robotsTxt, 200, { "Content-Type": "text/plain; charset=utf-8" });
});

// LLM discovery — describes site purpose and capabilities for AI agents
app.get("/llms.txt", (c) => {
  const store = c.get("store");
  const storeName = store?.name || "petm8";
  const appUrl = (c.env.APP_URL || "https://petm8.io").replace(/\/$/, "");
  const text = [
    `# ${storeName}`,
    "",
    `> ${storeName} is a pet commerce platform offering personalized pet products,`,
    "> AI-generated artwork, local pet events and bookings, and community features.",
    "",
    "## Key Capabilities",
    "- Product catalog with search, filtering, and collections",
    "- AI-powered pet artwork generation from photos",
    "- Local pet events calendar with online booking",
    "- Venue directory for pet-friendly locations",
    "- Customer reviews and ratings",
    "- Affiliate program for pet influencers",
    "",
    "## Structured Data",
    "This site provides JSON-LD structured data on all pages:",
    "- Product pages: Product schema with offers and aggregate ratings",
    "- Event pages: Event schema with location and availability",
    "- Venue pages: Place schema with geo coordinates",
    "- Collection pages: CollectionPage schema with ItemList",
    "- All pages: BreadcrumbList and Organization schemas",
    "",
    "## API",
    `- GraphQL: ${appUrl}/graphql`,
    `- Sitemap: ${appUrl}/sitemap.xml`,
    "",
    "## Contact",
    `- Website: ${appUrl}`,
  ].join("\n");
  return c.text(text, 200, { "Content-Type": "text/plain; charset=utf-8" });
});

// AI plugin manifest for agent discovery
app.get("/.well-known/ai-plugin.json", (c) => {
  const store = c.get("store");
  const storeName = store?.name || "petm8";
  const appUrl = (c.env.APP_URL || "https://petm8.io").replace(/\/$/, "");
  return c.json({
    schema_version: "v1",
    name_for_human: storeName,
    name_for_model: storeName.toLowerCase().replace(/\s+/g, "_"),
    description_for_human: `${storeName} — personalized pet products, AI artwork, events, and bookings.`,
    description_for_model: `${storeName} is a pet commerce platform. Use the GraphQL API at ${appUrl}/graphql for product search, event listings, and venue information. Structured data (JSON-LD) is available on all public pages.`,
    api: {
      type: "graphql",
      url: `${appUrl}/graphql`,
    },
    logo_url: `${appUrl}/favicon-192.png`,
    contact_email: "support@petm8.io",
    legal_info_url: `${appUrl}/about`,
  });
});

app.get("/sitemap.xml", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const sitemapStoreId = c.get("storeId") as string;
  const productRepo = new ProductRepository(db, sitemapStoreId);
  const appUrl = (c.env.APP_URL || "https://petm8.io").replace(/\/$/, "");
  const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const venueRepo = new VenueRepository(db, sitemapStoreId);

  const [productsResult, eventsResult, allCollections, allVenues] = await Promise.all([
    productRepo.findAll({ limit: 1000, available: true }),
    productRepo.findAll({ limit: 1000, type: "bookable", available: true }),
    productRepo.findCollections(),
    venueRepo.findAll(1, 500),
  ]);

  // Helper to build a <url> element with all SEO attributes
  const urlEntry = (loc: string, lastmod: string, changefreq: string, priority: string) =>
    `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

  const entries: string[] = [
    // Static pages
    urlEntry(`${appUrl}/`, now, "daily", "1.0"),
    urlEntry(`${appUrl}/products`, now, "daily", "0.9"),
    urlEntry(`${appUrl}/events`, now, "daily", "0.8"),
    urlEntry(`${appUrl}/events/calendar`, now, "daily", "0.7"),
    urlEntry(`${appUrl}/studio`, now, "weekly", "0.6"),
    urlEntry(`${appUrl}/about`, now, "monthly", "0.4"),
    urlEntry(`${appUrl}/contact`, now, "monthly", "0.4"),
    urlEntry(`${appUrl}/auth/login`, now, "monthly", "0.3"),
    urlEntry(`${appUrl}/auth/register`, now, "monthly", "0.3"),
    urlEntry(`${appUrl}/venues`, now, "weekly", "0.6"),
    // Collection pages (redirect to /products?collection=slug)
    ...allCollections.map((col: any) =>
      urlEntry(`${appUrl}/products?collection=${encodeURIComponent(col.slug)}`, now, "weekly", "0.7"),
    ),
    // Product detail pages
    ...productsResult.products.map((product: any) =>
      urlEntry(`${appUrl}/products/${product.slug}`, now, "weekly", "0.8"),
    ),
    // Event detail pages
    ...eventsResult.products.map((event: any) =>
      urlEntry(`${appUrl}/events/${event.slug}`, now, "weekly", "0.8"),
    ),
    // Venue detail pages
    ...allVenues.map((venue: any) => {
      const lastmod = venue.updatedAt ? new Date(venue.updatedAt).toISOString().slice(0, 10) : now;
      return urlEntry(`${appUrl}/venues/${venue.slug}`, lastmod, "weekly", "0.7");
    }),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.join("\n") +
    `\n</urlset>`;

  return c.body(xml, 200, { "Content-Type": "application/xml; charset=utf-8" });
});

// Products
app.get("/products", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const productRepo = new ProductRepository(db, storeId);
  const query = c.req.query();
  const result = await productRepo.findAll({
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 20,
    type: query.type,
    collection: query.collection,
    search: query.search,
    minPrice: query.minPrice ? Number(query.minPrice) : undefined,
    maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
    sort: query.sort,
    available: query.available === "false" ? false : undefined,
  });
  const allCollections = await productRepo.findCollections();

  const siteUrl = (c.env.APP_URL || "https://petm8.io").replace(/\/$/, "");
  const listingDescription = query.collection
    ? `Browse ${query.collection} products at ${storeName}`
    : `Shop ${result.total} products at ${storeName}. Premium pet supplies, events, and more.`;

  return c.html(
    <Layout
      title="Shop"
      description={listingDescription}
      activePath="/products"
      isAuthenticated={isAuthenticated}
      cartCount={cartCount}
      ogType="website"
      url={`${siteUrl}/products`}
      storeName={storeName}
      storeLogo={storeLogo}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
    >
      <ProductListPage
        products={result.products as any}
        total={result.total}
        page={result.page}
        limit={result.limit}
        collections={allCollections as any}
        filters={query as any}
      />
    </Layout>
  );
});

// Product Detail
app.get("/products/:slug", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const productRepo = new ProductRepository(db, storeId);
  const product = await productRepo.findBySlug(c.req.param("slug"));
  if (!product) {
    return c.html(
      <Layout url={c.req.url} title="Not Found" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
        <NotFoundPage />
      </Layout>,
      404
    );
  }

  let bookingSettings = null;
  let bookingConfig = null;
  let availability: any[] = [];
  if (product.type === "bookable") {
    const bookingRepo = new BookingRepository(db, storeId);
    bookingSettings = await bookingRepo.findSettingsByProductId(product.id);
    bookingConfig = await bookingRepo.findConfigByProductId(product.id);
    const avResult = await bookingRepo.findAvailability({ productId: product.id });
    availability = (avResult as any)?.slots ?? avResult ?? [];
  }

  // Fetch related products (same collections, or recently added fallback)
  const relatedProducts = await productRepo.findRelatedProducts(product.id, 4);

  // Fetch reviews and summary
  const reviewRepo = new ReviewRepository(db, storeId);
  const [reviewResult, ratingResult] = await Promise.all([
    reviewRepo.findByProduct(product.id, 1, 10),
    reviewRepo.getAverageRating(product.id),
  ]);

  const formattedReviews = reviewResult.reviews.map((r: any) => ({
    id: r.id,
    rating: r.rating,
    title: r.title ?? null,
    content: r.content ?? null,
    authorName: r.authorName ?? "Anonymous",
    verified: r.isVerifiedPurchase ?? false,
    storeResponse: r.storeResponse ?? null,
    createdAt: r.createdAt ? formatDateUs(r.createdAt) : "",
  }));

  // Compute rating distribution from reviews
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviewResult.reviews) {
    const rating = (r as any).rating;
    if (rating >= 1 && rating <= 5) distribution[rating]!++;
  }

  const reviewSummary = ratingResult.count > 0
    ? { averageRating: ratingResult.average, totalCount: ratingResult.count, distribution }
    : null;

  const siteUrl = (c.env.APP_URL || "https://petm8.io").replace(/\/$/, "");
  const productUrl = `${siteUrl}/products/${product.slug}`;
  const productImageUrl = product.featuredImageUrl || `${siteUrl}/og-image.jpg`;
  const productJsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    image: productImageUrl,
    description: product.seoDescription || product.description || product.name,
    sku: product.variants?.[0]?.sku || product.id,
    brand: {
      "@type": "Organization",
      name: storeName,
    },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "USD",
      price: product.variants?.[0]?.price || "0.00",
      availability: product.availableForSale ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: storeName,
      },
    },
  };

  return c.html(
    <Layout
      title={product.seoTitle || product.name}
      description={product.seoDescription || product.description || undefined}
      isAuthenticated={isAuthenticated}
      cartCount={cartCount}
      stripePublishableKey={c.env.STRIPE_PUBLISHABLE_KEY}
      ogImage={productImageUrl}
      ogType="product"
      url={productUrl}
      jsonLd={productJsonLd}
      ogPriceAmount={String(product.variants?.[0]?.price || "0.00")}
      ogPriceCurrency="USD"
      storeName={storeName}
      storeLogo={storeLogo}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
    >
      <ProductDetailPage
        product={{
          ...(product as any),
          bookingSettings: bookingSettings as any,
          bookingConfig: bookingConfig as any,
        }}
        slots={availability as any}
        relatedProducts={relatedProducts as any}
        reviews={formattedReviews}
        reviewSummary={reviewSummary}
        isAuthenticated={isAuthenticated}
        siteUrl={siteUrl}
      />
    </Layout>
  );
});

// Cart
app.get("/cart", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const cartSessionId = getCookie(c, CART_COOKIE_NAME);
  let items: any[] = [];
  let totals: any = null;
  let warnings: string[] = [];
  let couponCode: string | null = null;

  if (cartSessionId) {
    try {
      const cartRepo = new CartRepository(db, storeId);
      const { GetCartUseCase } = await import("./application/cart/get-cart.usecase");
      const useCase = new GetCartUseCase(cartRepo, db);
      const cartData = await useCase.execute(cartSessionId, user?.sub);
      items = (cartData as any)?.items ?? [];
      totals = (cartData as any)?.totals ?? null;
      warnings = (cartData as any)?.warnings ?? [];
    } catch { /* empty cart */ }
  }

  return c.html(
    <Layout url={c.req.url} title="Cart" activePath="/cart" isAuthenticated={isAuthenticated} cartCount={cartCount} stripePublishableKey={c.env.STRIPE_PUBLISHABLE_KEY} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <CartPage items={items as any} totals={totals} warnings={warnings} couponCode={couponCode} />
    </Layout>
  );
});

// Checkout Success
app.get("/checkout/success", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const sessionId = c.req.query("session_id");
  let order: any = null;
  if (sessionId && user) {
    const orderRepo = new OrderRepository(db, storeId);
    const orderSummary = await orderRepo.findByStripeSessionId(sessionId);
    if (orderSummary) {
      order = await orderRepo.findById(orderSummary.id, user.sub);
    }
  }

  const safeOrder = order ?? {
    id: "pending-order",
    status: "pending",
    subtotal: "0.00",
    tax: "0.00",
    shippingCost: "0.00",
    total: "0.00",
    items: [],
    createdAt: new Date().toISOString(),
  };

  return c.html(
    <Layout url={c.req.url} title="Order Confirmed" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <CheckoutSuccessPage order={safeOrder as any} />
    </Layout>
  );
});

// Auth Pages
app.get("/auth/login", async (c) => {
  const { cartCount, isAuthenticated, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const error = c.req.query("error");
  return c.html(
    <Layout url={c.req.url} title="Sign In" activePath="/auth/login" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <LoginPage error={error || undefined} />
    </Layout>
  );
});

app.get("/auth/register", async (c) => {
  const { cartCount, isAuthenticated, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const error = c.req.query("error");
  return c.html(
    <Layout url={c.req.url} title="Create Account" activePath="/auth/register" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <RegisterPage error={error || undefined} />
    </Layout>
  );
});

// Account Pages (require auth)
const accountPages = new Hono<{ Bindings: Env }>();
accountPages.use("*", async (c, next) => {
  const token = getCookie(c, AUTH_COOKIE_NAME);
  if (!token) return c.redirect("/auth/login");
  const user = await verifyJwt(token, c.env.JWT_SECRET);
  if (!user) return c.redirect("/auth/login");
  c.set("user" as any, user);
  c.set("userId" as any, user.sub);
  await next();
});

accountPages.get("/", async (c) => {
  const { db, storeId, cartCount, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const orderRepo = new OrderRepository(db, storeId);
  const subRepo = new SubscriptionRepository(db, storeId);
  const recentOrdersResult = await orderRepo.findByUserId(user!.sub, { page: 1, limit: 3 });
  const subscriptions = await subRepo.findByUserId(user!.sub);
  const recentOrders = recentOrdersResult.orders.map((order: any) => ({
    id: order.id,
    orderNumber: order.id.slice(0, 8).toUpperCase(),
    date: formatDateUs(order.createdAt),
    total: Number(order.total ?? 0).toFixed(2),
    status: (order.status ?? "pending") as any,
    itemCount: Array.isArray(order.items)
      ? order.items.reduce((sum: number, item: any) => sum + (item.quantity ?? 0), 0)
      : 0,
  }));
  const subscription = subscriptions[0]
    ? {
      planName: subscriptions[0].planName,
      status: subscriptions[0].status,
      nextBillingDate: formatDateUs(subscriptions[0].currentPeriodEnd) || "N/A",
    }
    : null;

  return c.html(
    <Layout url={c.req.url} title="Account" activePath="/account" isAuthenticated={true} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <DashboardPage
        userName={user!.name || "there"}
        recentOrders={recentOrders as any}
        subscription={subscription as any}
      />
    </Layout>
  );
});

accountPages.get("/orders", async (c) => {
  const { db, storeId, cartCount, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const orderRepo = new OrderRepository(db, storeId);
  const result = await orderRepo.findByUserId(user!.sub, { page: Number(c.req.query("page")) || 1, limit: 10 });
  const orders = result.orders.map((order: any) => ({
    id: order.id,
    orderNumber: order.id.slice(0, 8).toUpperCase(),
    date: formatDateUs(order.createdAt),
    total: Number(order.total ?? 0).toFixed(2),
    subtotal: Number(order.subtotal ?? 0).toFixed(2),
    tax: Number(order.tax ?? 0).toFixed(2),
    shipping: Number(order.shippingCost ?? 0).toFixed(2),
    status: (order.status ?? "pending") as any,
    itemCount: Array.isArray(order.items)
      ? order.items.reduce((sum: number, item: any) => sum + (item.quantity ?? 0), 0)
      : 0,
    items: Array.isArray(order.items)
      ? order.items.map((item: any) => ({
        name: item.productName,
        quantity: item.quantity,
        price: Number(item.totalPrice ?? 0).toFixed(2),
        imageUrl: item.variant?.product?.featuredImageUrl ?? undefined,
      }))
      : [],
  }));

  return c.html(
    <Layout url={c.req.url} title="Orders" activePath="/account" isAuthenticated={true} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <OrdersPage orders={orders as any} />
    </Layout>
  );
});

accountPages.get("/addresses", async (c) => {
  const { db, cartCount, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const userRepo = new UserRepository(db);
  const addressRows = await userRepo.findAddresses(user!.sub);
  const addresses = addressRows.map((address: any) => ({
    id: address.id,
    label: address.label,
    name: user?.name ?? "Primary Contact",
    line1: address.street,
    city: address.city,
    state: address.state ?? "",
    zip: address.zip,
    country: address.country,
    isDefault: !!address.isDefault,
  }));

  return c.html(
    <Layout url={c.req.url} title="Addresses" activePath="/account" isAuthenticated={true} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <AddressesPage addresses={addresses as any} />
    </Layout>
  );
});

accountPages.get("/subscriptions", async (c) => {
  const { db, storeId, cartCount, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const subRepo = new SubscriptionRepository(db, storeId);
  const subscriptions = await subRepo.findByUserId(user!.sub);
  const subscription = subscriptions[0]
    ? {
      id: subscriptions[0].id,
      planName: subscriptions[0].planName,
      status: subscriptions[0].status,
      currentPeriodEnd: formatDateUs(subscriptions[0].currentPeriodEnd) || "N/A",
      nextBillingDate: formatDateUs(subscriptions[0].currentPeriodEnd) || "N/A",
      amount: "0.00",
      interval: String(subscriptions[0].billingPeriod || "").toLowerCase().includes("year")
        ? "year"
        : "month",
      cancelAtPeriodEnd: !!subscriptions[0].cancelAtPeriodEnd,
    }
    : null;

  return c.html(
    <Layout url={c.req.url} title="Subscriptions" activePath="/account" isAuthenticated={true} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <SubscriptionsPage subscription={subscription as any} />
    </Layout>
  );
});

accountPages.get("/pets", async (c) => {
  const { db, storeId, cartCount, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const aiRepo = new AiJobRepository(db, storeId);
  const pets = await aiRepo.findPetsByUserId(user!.sub);

  return c.html(
    <Layout url={c.req.url} title="My Pets" activePath="/account" isAuthenticated={true} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <PetsPage pets={pets as any} />
    </Layout>
  );
});

accountPages.get("/artwork", async (c) => {
  const { db, storeId, cartCount, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const { ListUserArtworkUseCase } = await import("./application/ai-studio/list-user-artwork.usecase");
  const useCase = new ListUserArtworkUseCase(db, storeId);
  const page = Number(c.req.query("page") || "1");
  const result = await useCase.execute(user!.sub, { page, limit: 12 });

  return c.html(
    <Layout url={c.req.url} title="My Artwork" activePath="/account" isAuthenticated={true} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <ArtworkPage artwork={result.artwork as any} total={result.total} page={result.page} limit={result.limit} />
    </Layout>
  );
});

accountPages.get("/settings", async (c) => {
  const { db, cartCount, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const userRepo = new UserRepository(db);
  const profile = await userRepo.findById(user!.sub);

  return c.html(
    <Layout url={c.req.url} title="Settings" activePath="/account" isAuthenticated={true} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <SettingsPage
        user={{
          name: profile?.name || "",
          email: profile?.email || "",
          avatarUrl: profile?.avatarUrl ?? null,
          emailVerifiedAt: profile?.emailVerifiedAt ?? null,
          locale: profile?.locale ?? "en",
          timezone: profile?.timezone ?? "UTC",
          marketingOptIn: !!profile?.marketingOptIn,
        }}
      />
    </Layout>
  );
});

app.route("/account", accountPages);

// Studio Pages
app.get("/studio", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const aiRepo = new AiJobRepository(db, storeId);
  const templates = await aiRepo.findTemplates();
  const pets = user ? await aiRepo.findPetsByUserId(user.sub) : [];

  return c.html(
    <Layout url={c.req.url} title="AI Studio" activePath="/studio" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <StudioCreatePage
        templates={templates as any}
        pets={pets as any}
      />
    </Layout>
  );
});

app.get("/studio/create", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const aiRepo = new AiJobRepository(db, storeId);
  const templates = await aiRepo.findTemplates();
  const pets = await aiRepo.findPetsByUserId(user.sub);

  return c.html(
    <Layout url={c.req.url} title="Create Art" activePath="/studio" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <StudioCreatePage
        templates={templates as any}
        pets={pets as any}
      />
    </Layout>
  );
});

app.get("/studio/preview/:id", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const aiRepo = new AiJobRepository(db, storeId);
  const job = await aiRepo.findById(c.req.param("id"));
  if (!job || job.userId !== user.sub) {
    return c.html(
      <Layout url={c.req.url} title="Not Found" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
        <NotFoundPage />
      </Layout>,
      404,
    );
  }

  return c.html(
    <Layout url={c.req.url} title="Art Preview" activePath="/studio" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <StudioPreviewPage
        jobId={job.id}
        imageUrl={job.outputRasterUrl ?? job.outputSvgUrl ?? undefined}
      />
    </Layout>
  );
});

app.get("/studio/preview", async (c) => {
  const jobId = c.req.query("jobId");
  if (!jobId) return c.redirect("/studio/gallery");
  return c.redirect(`/studio/preview/${encodeURIComponent(jobId)}`);
});

// Product creation wizard from art
app.get("/products/create/:artJobId", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const aiRepo = new AiJobRepository(db, storeId);
  const job = await aiRepo.findById(c.req.param("artJobId"));
  if (!job || job.userId !== user.sub) {
    return c.html(
      <Layout url={c.req.url} title="Not Found" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
        <NotFoundPage />
      </Layout>,
      404,
    );
  }

  const { eq, and } = await import("drizzle-orm");
  const providers = await db.select().from(fulfillmentProviders).where(
    and(eq(fulfillmentProviders.storeId, storeId), eq(fulfillmentProviders.isActive, true)),
  );

  return c.html(
    <Layout url={c.req.url} title="Create Product" activePath="/studio" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <CreateProductPage
        artJobId={job.id}
        artImageUrl={job.outputRasterUrl ?? job.outputSvgUrl ?? null}
        providers={providers.map((p: any) => ({ id: p.id, name: p.name, type: p.type }))}
      />
    </Layout>
  );
});

app.get("/studio/gallery", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const aiRepo = new AiJobRepository(db, storeId);
  const category = c.req.query("category");
  const templates = await aiRepo.findTemplates(category);
  const allTemplates = await aiRepo.findTemplates();
  const categories = [...new Set(allTemplates.map((t: any) => t.category).filter(Boolean))] as string[];

  return c.html(
    <Layout url={c.req.url} title="Template Gallery" activePath="/studio" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <StudioGalleryPage
        templates={templates as any}
        categories={categories}
        activeCategory={category ?? null}
      />
    </Layout>
  );
});

// Event Pages
app.get("/events", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const productRepo = new ProductRepository(db, storeId);
  const bookingRepo = new BookingRepository(db, storeId);
  const result = await productRepo.findAll({ type: "bookable", available: true });
  const query = c.req.query();
  const dateFrom = query.dateFrom;
  const dateTo = query.dateTo;
  const filterSearch = query.search?.trim() ?? "";

  const eventsWithDates = await Promise.all(
    result.products.map(async (product: any) => {
      const slots = await bookingRepo.findAvailability({ productId: product.id, dateFrom, dateTo });
      const slotArray = (slots as any)?.slots ?? slots ?? [];
      const nextSlot = slotArray.find?.((s: any) => s.status === "available");
      const config = await bookingRepo.findConfigByProductId(product.id);

      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        imageUrl: product.featuredImageUrl ?? undefined,
        priceFrom: product.variants?.[0]?.price ?? "0.00",
        location: config?.location ?? "petm8 Studio",
        nextAvailableDate: nextSlot?.slotDate ? formatDateUs(nextSlot.slotDate) : undefined,
        shortDescription: product.seoDescription ?? product.description ?? undefined,
      };
    })
  );
  const normalizedSearch = filterSearch.toLowerCase();
  const filteredEvents = normalizedSearch.length === 0
    ? eventsWithDates
    : eventsWithDates.filter((event) =>
      event.name.toLowerCase().includes(normalizedSearch)
      || (event.shortDescription ?? "").toLowerCase().includes(normalizedSearch)
      || event.location.toLowerCase().includes(normalizedSearch),
    );

  const pageSize = 12;
  const requestedPage = Number.parseInt(query.page ?? "1", 10);
  const total = filteredEvents.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, totalPages) : 1;
  const start = (page - 1) * pageSize;
  const pagedEvents = filteredEvents.slice(start, start + pageSize);

  return c.html(
    <Layout url={c.req.url} title="Events" activePath="/events" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <EventsListPage
        events={pagedEvents as any}
        filterDateFrom={dateFrom}
        filterDateTo={dateTo}
        filterSearch={filterSearch}
        page={page}
        totalPages={totalPages}
        total={total}
      />
    </Layout>
  );
});

app.get("/events/calendar", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const productRepo = new ProductRepository(db, storeId);
  const bookingRepo = new BookingRepository(db, storeId);
  const result = await productRepo.findAll({ type: "bookable", available: true });
  const now = new Date();
  const year = Number(c.req.query("year")) || now.getFullYear();
  const month = Number(c.req.query("month")) || now.getMonth() + 1;
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

  const allSlots = await Promise.all(
    result.products.map(async (product: any) => {
      const config = await bookingRepo.findConfigByProductId(product.id);
      const slots = await bookingRepo.findAvailability({ productId: product.id, dateFrom: firstDay, dateTo: lastDay });
      const slotArray = (slots as any)?.slots ?? slots ?? [];
      return slotArray.map?.((slot: any) => ({
        id: `${product.id}:${slot.id}`,
        slug: product.slug,
        name: product.name,
        time: formatTimeUs(slot.slotTime),
        eventType: "workshop",
        location: config?.location ?? "petm8 Studio",
        spotsRemaining: Math.max(0, (slot.totalCapacity ?? 0) - (slot.reservedCount ?? 0)),
        slotDate: slot.slotDate,
      })) ?? [];
    })
  );
  const selectedDate = c.req.query("date") || undefined;
  const eventsByDate = allSlots.flat().reduce((acc: Record<string, any[]>, slot: any) => {
    const dateKey: string = slot.slotDate;
    const existing = acc[dateKey] ?? [];
    existing.push({
      id: slot.id,
      slug: slot.slug,
      name: slot.name,
      time: slot.time,
      eventType: slot.eventType,
      location: slot.location,
      spotsRemaining: slot.spotsRemaining,
    });
    acc[dateKey] = existing;
    return acc;
  }, {});
  const eventTypes = [
    { key: "workshop", label: "Workshop", color: "#22c55e", dotClass: "bg-green-500" },
  ];

  return c.html(
    <Layout url={c.req.url} title="Events Calendar" activePath="/events" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <EventCalendarPage
        eventsByDate={eventsByDate}
        selectedDate={selectedDate}
        eventTypes={eventTypes}
        year={year}
        month={month}
      />
    </Layout>
  );
});

app.get("/events/:slug", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const productRepo = new ProductRepository(db, storeId);
  const bookingRepo = new BookingRepository(db, storeId);
  const product = await productRepo.findBySlug(c.req.param("slug"));
  if (!product || product.type !== "bookable") {
    return c.html(
      <Layout url={c.req.url} title="Not Found" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
        <NotFoundPage />
      </Layout>,
      404
    );
  }

  const query = c.req.query();
  const settings = await bookingRepo.findSettingsByProductId(product.id);
  const config = await bookingRepo.findConfigByProductId(product.id);
  const now = new Date();
  const calendarYear = Number(query.year) || now.getFullYear();
  const calendarMonth = Number(query.month) || now.getMonth() + 1;
  const firstDay = `${calendarYear}-${String(calendarMonth).padStart(2, "0")}-01`;
  const lastDay = `${calendarYear}-${String(calendarMonth).padStart(2, "0")}-${new Date(calendarYear, calendarMonth, 0).getDate()}`;
  const avResult = await bookingRepo.findAvailability({ productId: product.id, dateFrom: firstDay, dateTo: lastDay });
  const availability = (avResult as any)?.slots ?? avResult ?? [];
  const availableDates = [...new Set(
    Array.isArray(availability)
      ? availability.filter((s: any) => s.status === "available").map((s: any) => s.slotDate)
      : []
  )] as string[];
  const selectedDate = query.date ?? availableDates[0] ?? null;
  const selectedSlots = selectedDate
    ? (Array.isArray(availability) ? availability.filter((s: any) => s.slotDate === selectedDate) : [])
    : [];
  const mappedSlots = selectedSlots.map((slot: any) => ({
    id: slot.id,
    time: formatTimeUs(slot.slotTime),
    remaining: Math.max(0, (slot.totalCapacity ?? 0) - (slot.reservedCount ?? 0)),
    total: slot.totalCapacity ?? 0,
    status: (
      slot.status === "full"
        ? "full"
        : slot.status === "closed" || slot.status === "canceled"
          ? "closed"
          : "available"
    ) as any,
    prices: Array.isArray(slot.prices)
      ? slot.prices.map((price: any) => ({
        label: String(price.personType || "").replace(/^\w/, (char) => char.toUpperCase()),
        price: Number(price.price ?? 0).toFixed(2),
      }))
      : [],
  }));
  const selectedSlotId = query.slot && mappedSlots.some((slot: any) => slot.id === query.slot)
    ? query.slot
    : mappedSlots[0]?.id;
  const selectedSlot = mappedSlots.find((slot: any) => slot.id === selectedSlotId);
  const personTypes = selectedSlot?.prices?.map((price: any) => ({
    key: String(price.label || "").toLowerCase(),
    label: price.label,
    unitPrice: price.price,
  })) ?? [];
  const duration = settings
    ? `${settings.duration} ${settings.durationUnit || "minutes"}`
    : "Flexible duration";

  const eventSiteUrl = (c.env.APP_URL || "https://petm8.io").replace(/\/$/, "");
  const eventUrl = `${eventSiteUrl}/events/${product.slug}`;
  const eventImageUrl = product.featuredImageUrl || `${eventSiteUrl}/og-image.jpg`;
  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: product.name,
    image: eventImageUrl,
    description: product.seoDescription || product.description || product.name,
    offers: {
      "@type": "Offer",
      url: eventUrl,
      price: product.variants?.[0]?.price || "0.00",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    location: {
      "@type": "Place",
      name: config?.location || "petm8 Studio",
      address: config?.location || "TBD"
    },
    startDate: availableDates.length > 0 ? availableDates[0] : new Date().toISOString().split('T')[0],
  };
  const faqEntries = Array.isArray(config?.faqs)
    ? (config.faqs as Array<{ question?: string; answer?: string }>).filter((faq) => faq?.question && faq?.answer)
    : [];
  const faqJsonLd = faqEntries.length > 0
    ? {
      "@type": "FAQPage",
      mainEntity: faqEntries.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    }
    : null;
  const eventJsonLdPayload = faqJsonLd
    ? {
      "@context": "https://schema.org",
      "@graph": [eventJsonLd, faqJsonLd],
    }
    : eventJsonLd;

  return c.html(
    <Layout
      title={product.seoTitle || product.name}
      description={product.seoDescription || product.description || undefined}
      activePath="/events"
      isAuthenticated={isAuthenticated}
      cartCount={cartCount}
      stripePublishableKey={c.env.STRIPE_PUBLISHABLE_KEY}
      ogImage={eventImageUrl}
      ogType="website"
      url={eventUrl}
      jsonLd={eventJsonLdPayload}
      storeName={storeName}
      storeLogo={storeLogo}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
    >
      <EventDetailPage
        id={product.id}
        variantId={product.variants?.[0]?.id || ""}
        slug={product.slug}
        name={product.name}
        description={product.description || product.seoDescription || product.name}
        imageUrl={product.featuredImageUrl || undefined}
        duration={duration}
        location={config?.location || "petm8 Studio"}
        included={Array.isArray(config?.included) ? config.included as string[] : []}
        notIncluded={Array.isArray(config?.notIncluded) ? config.notIncluded as string[] : []}
        itinerary={Array.isArray(config?.itinerary) ? config.itinerary as any : []}
        faqs={Array.isArray(config?.faqs) ? config.faqs as any : []}
        cancellationPolicy={config?.cancellationPolicy || undefined}
        calendarYear={calendarYear}
        calendarMonth={calendarMonth}
        availableDates={availableDates}
        selectedDate={selectedDate}
        slots={mappedSlots as any}
        selectedSlotId={selectedSlotId}
        personTypes={personTypes as any}
      />
    </Layout>
  );
});

// ─── Platform Pages ───────────────────────────────────────
app.get("/platform/create-store", async (c) => {
  const { cartCount, isAuthenticated, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  return c.html(
    <Layout url={c.req.url} title="Create Store" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <CreateStorePage isAuthenticated={isAuthenticated} />
    </Layout>
  );
});

app.get("/platform/dashboard", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const storeRepo = new StoreRepository(db);
  const { GetStoreDashboardUseCase: DashUC } = await import("./application/platform/get-store-dashboard.usecase");
  const dashUC = new DashUC(storeRepo);
  const { store, members, domains, billing, pendingInvitations } = await dashUC.execute(storeId);
  const plan = billing?.platformPlanId ? await storeRepo.findPlanById(billing.platformPlanId) : null;

  return c.html(
    <Layout url={c.req.url} title="Store Dashboard" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <StoreDashboardPage
        store={store as any}
        members={members as any}
        domains={domains as any}
        billing={billing as any}
        plan={plan as any}
        pendingInvitations={pendingInvitations as any}
      />
    </Layout>
  );
});

app.get("/platform/settings", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const storeRepo = new StoreRepository(db);
  const [store, plans, billing, domains] = await Promise.all([
    storeRepo.findById(storeId),
    storeRepo.findAllPlans(),
    storeRepo.getBilling(storeId),
    storeRepo.findDomains(storeId),
  ]);

  return c.html(
    <Layout url={c.req.url} title="Store Settings" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <StoreSettingsPage
        store={store as any}
        plans={plans as any}
        billing={billing as any}
        connectStatus={null}
        domains={domains as any}
      />
    </Layout>
  );
});

app.get("/platform/members", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const storeRepo = new StoreRepository(db);
  const [store, members, pendingInvitations] = await Promise.all([
    storeRepo.findById(storeId),
    storeRepo.findMembersWithUsers(storeId),
    storeRepo.findPendingInvitations(storeId),
  ]);
  if (!store) return c.notFound();

  return c.html(
    <Layout url={c.req.url} title="Team Members" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <MembersPage store={store as any} members={members as any} pendingInvitations={pendingInvitations as any} />
    </Layout>
  );
});

// ─── Admin Integrations Page ──────────────────────────────
app.get("/admin/integrations", async (c) => {
  const { db, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");

  const integrationRepo = new IntegrationRepoImpl(db);
  const secretRepo = new SecretRepoImpl(db);
  const listUseCase = new ListIntegrationsUseCase(integrationRepo, secretRepo);
  const checkUseCase = new CheckInfrastructureUseCase();

  const integrations = await listUseCase.listPlatform();
  const infraHealth = await checkUseCase.execute(c.env, db);

  return c.html(
    <Layout url={c.req.url} title="Platform Integrations" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <AdminIntegrationsPage integrations={integrations as any} infraHealth={infraHealth as any} />
    </Layout>,
  );
});

// ─── Admin Fulfillment Dashboard ──────────────────────────
app.get("/admin/fulfillment", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");

  const { eq, desc, sql, and, like } = await import("drizzle-orm");
  const { fulfillmentRequests: frTable } = await import("./infrastructure/db/schema");

  const pageNum = parseInt(c.req.query("page") || "1", 10);
  const limit = 50;
  const statusFilter = c.req.query("status") || "";
  const providerFilter = c.req.query("provider") || "";
  const searchFilter = c.req.query("search") || "";

  const conditions = [eq(frTable.storeId, storeId)];
  if (statusFilter) conditions.push(eq(frTable.status, statusFilter as any));
  if (providerFilter) conditions.push(eq(frTable.provider, providerFilter as any));
  if (searchFilter) conditions.push(like(frTable.orderId, `%${searchFilter}%`));

  const [requests, countRows, totalCountRows] = await Promise.all([
    db.select().from(frTable).where(and(...conditions)).orderBy(desc(frTable.createdAt)).limit(limit).offset((pageNum - 1) * limit),
    db.select({ status: frTable.status, count: sql<number>`count(*)` }).from(frTable).where(eq(frTable.storeId, storeId)).groupBy(frTable.status),
    db.select({ count: sql<number>`count(*)` }).from(frTable).where(and(...conditions)),
  ]);

  const totalFiltered = Number(totalCountRows[0]?.count ?? 0);
  const totalPages = Math.ceil(totalFiltered / limit);

  const counts: Record<string, number> = {};
  let total = 0;
  for (const row of countRows) {
    const n = Number(row.count);
    counts[row.status ?? "pending"] = n;
    total += n;
  }

  const stats = {
    total,
    pending: counts.pending ?? 0,
    submitted: counts.submitted ?? 0,
    processing: counts.processing ?? 0,
    shipped: counts.shipped ?? 0,
    delivered: counts.delivered ?? 0,
    failed: counts.failed ?? 0,
    cancelled: counts.cancelled ?? 0,
  };

  let health: any[] = [];
  try {
    const { GetProviderHealthUseCase } = await import("./application/fulfillment/get-provider-health.usecase");
    const useCase = new GetProviderHealthUseCase(db, storeId);
    health = await useCase.execute(30);
  } catch {
    // Health data is optional
  }

  const formatted = requests.map((r: any) => ({
    id: r.id,
    orderId: r.orderId,
    provider: r.provider,
    externalId: r.externalId,
    status: r.status ?? "pending",
    errorMessage: r.errorMessage,
    createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "",
    updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : "",
  }));

  return c.html(
    <Layout url={c.req.url} title="Fulfillment Dashboard" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <FulfillmentDashboardPage
        requests={formatted}
        stats={stats}
        health={health as any}
        page={pageNum}
        totalPages={totalPages}
        filters={{ status: statusFilter || undefined, provider: providerFilter || undefined, search: searchFilter || undefined }}
      />
    </Layout>,
  );
});

app.get("/admin/fulfillment/:id", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const requestId = c.req.param("id");
  const { FulfillmentRequestRepository } = await import("./infrastructure/repositories/fulfillment-request.repository");
  const repo = new FulfillmentRequestRepository(db, storeId);
  const request = await repo.findById(requestId);
  if (!request) return c.notFound();

  const { eq, desc } = await import("drizzle-orm");
  const { providerEvents, shipments: shipmentsTable } = await import("./infrastructure/db/schema");

  const [items, events, shipmentRows] = await Promise.all([
    repo.findItemsByRequestId(requestId),
    db.select().from(providerEvents).where(eq(providerEvents.externalOrderId, request.externalId ?? "")).orderBy(desc(providerEvents.receivedAt)),
    db.select().from(shipmentsTable).where(eq(shipmentsTable.fulfillmentRequestId, requestId)).limit(1),
  ]);

  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null;

  return c.html(
    <Layout url={c.req.url} title="Fulfillment Request" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <FulfillmentDetailPage
        request={{
          id: request.id,
          orderId: request.orderId,
          provider: request.provider,
          externalId: request.externalId,
          status: request.status ?? "pending",
          errorMessage: request.errorMessage,
          costEstimatedTotal: request.costEstimatedTotal,
          costActualTotal: request.costActualTotal,
          costShipping: request.costShipping,
          costTax: request.costTax,
          currency: request.currency ?? "USD",
          submittedAt: fmtDate(request.submittedAt),
          completedAt: fmtDate(request.completedAt),
          createdAt: fmtDate(request.createdAt) ?? "",
        }}
        items={items.map((i: any) => ({
          id: i.id,
          orderItemId: i.orderItemId,
          providerLineId: i.providerLineId,
          quantity: i.quantity,
          status: i.status,
        }))}
        events={events.map((e: any) => ({
          id: e.id,
          eventType: e.eventType,
          externalEventId: e.externalEventId,
          receivedAt: fmtDate(e.receivedAt) ?? "",
          processedAt: fmtDate(e.processedAt),
        }))}
        shipment={shipmentRows[0] ? {
          carrier: (shipmentRows[0] as any).carrier,
          trackingNumber: (shipmentRows[0] as any).trackingNumber,
          trackingUrl: (shipmentRows[0] as any).trackingUrl,
          status: (shipmentRows[0] as any).status,
          shippedAt: fmtDate((shipmentRows[0] as any).shippedAt),
          deliveredAt: fmtDate((shipmentRows[0] as any).deliveredAt),
        } : null}
      />
    </Layout>,
  );
});

app.get("/admin/shipping", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const { ShippingRepository } = await import("./infrastructure/repositories/shipping.repository");
  const { ManageShippingZonesUseCase } = await import("./application/fulfillment/manage-shipping-zones.usecase");
  const shippingRepo = new ShippingRepository(db, storeId);
  const useCase = new ManageShippingZonesUseCase(shippingRepo);
  const zones = await useCase.listZones();
  const zonesWithRates = await Promise.all(
    zones.map(async (zone) => {
      const rates = await useCase.listRates(zone.id);
      return {
        ...zone,
        countries: (zone.countries as string[]) ?? [],
        rates: rates.map((rate) => ({
          id: rate.id,
          name: rate.name,
          minWeight: rate.minWeight ?? null,
          maxWeight: rate.maxWeight ?? null,
          price: rate.price ?? "0",
          currency: "USD",
          minDeliveryDays: rate.estimatedDaysMin ?? 0,
          maxDeliveryDays: rate.estimatedDaysMax ?? 0,
        })),
      };
    }),
  );
  return c.html(
    <Layout url={c.req.url} title="Shipping Zones" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <ShippingPage zones={zonesWithRates as any} />
    </Layout>,
  );
});

app.get("/admin/tax", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const { ManageTaxZonesUseCase } = await import("./application/tax/manage-tax-zones.usecase");
  const useCase = new ManageTaxZonesUseCase();
  const zones = await useCase.listZones({ db, storeId });
  const zonesWithRates = await Promise.all(
    zones.map(async (zone) => {
      const rates = await useCase.listRates({ db, storeId, zoneId: zone.id });
      return {
        id: zone.id,
        name: zone.name,
        countries: zone.countries,
        rates: rates.map((rate) => ({
          id: rate.id,
          name: rate.name,
          rate: String(rate.rate),
          isCompound: rate.compound,
          priority: 0,
        })),
      };
    }),
  );

  return c.html(
    <Layout url={c.req.url} title="Tax Settings" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <TaxPage zones={zonesWithRates as any} />
    </Layout>,
  );
});

// ─── Admin Promotions Pages ──────────────────────────────
app.get("/admin/promotions", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const promoRepo = new PromotionRepository(db, storeId);
  const allPromos = await promoRepo.listAll();
  const statusFilter = c.req.query("status") || undefined;
  const typeFilter = c.req.query("type") || undefined;
  const filtered = allPromos.filter((p: any) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (typeFilter && p.type !== typeFilter) return false;
    return true;
  });
  return c.html(
    <Layout url={c.req.url} title="Promotions" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <PromotionsPage promotions={filtered as any} filters={{ status: statusFilter, type: typeFilter }} />
    </Layout>,
  );
});

app.get("/admin/promotions/codes", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const { eq } = await import("drizzle-orm");
  const promoRepo = new PromotionRepository(db, storeId);
  const [allPromos, codeRows] = await Promise.all([
    promoRepo.listAll(),
    db.select({
      id: couponCodes.id,
      promotionId: couponCodes.promotionId,
      promotionName: promotions.name,
      code: couponCodes.code,
      maxRedemptions: couponCodes.maxRedemptions,
      redemptionCount: couponCodes.redemptionCount,
      singleUsePerCustomer: couponCodes.singleUsePerCustomer,
      createdAt: couponCodes.createdAt,
    })
      .from(couponCodes)
      .innerJoin(promotions, eq(couponCodes.promotionId, promotions.id))
      .where(eq(promotions.storeId, storeId)),
  ]);
  return c.html(
    <Layout url={c.req.url} title="Coupon Codes" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <PromotionCodesPage codes={codeRows as any} promotions={allPromos as any} />
    </Layout>,
  );
});

app.get("/admin/segments", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const promoRepo = new PromotionRepository(db, storeId);
  const segments = await promoRepo.listSegments();
  return c.html(
    <Layout url={c.req.url} title="Customer Segments" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <SegmentsPage segments={segments as any} />
    </Layout>,
  );
});

// ─── Admin Reviews Page ──────────────────────────────────
app.get("/admin/reviews", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const reviewRepo = new ReviewRepository(db, storeId);
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = 20;
  const statusFilter = c.req.query("status") || undefined;
  const result = await reviewRepo.listAll(page, limit, statusFilter);
  const totalPages = Math.ceil(result.total / limit);
  return c.html(
    <Layout url={c.req.url} title="Reviews" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <AdminReviewsPage reviews={result.reviews as any} total={result.total} page={page} totalPages={totalPages} filters={{ status: statusFilter }} />
    </Layout>,
  );
});

// ─── Admin Affiliates Page ────────────────────────────────
app.get("/admin/affiliates", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const affiliateRepo = new AffiliateRepository(db, storeId);
  const allAffiliates = await affiliateRepo.listAll();
  return c.html(
    <Layout url={c.req.url} title="Affiliates" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <AdminAffiliatesPage affiliates={allAffiliates as any} />
    </Layout>,
  );
});

// ─── Admin Analytics Page ─────────────────────────────────
app.get("/admin/analytics", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const now = new Date();
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = now.toISOString().slice(0, 10);
  const requestedFrom = c.req.query("from");
  const requestedTo = c.req.query("to");
  const parsedFrom = requestedFrom && datePattern.test(requestedFrom) ? requestedFrom : defaultFrom;
  const parsedTo = requestedTo && datePattern.test(requestedTo) ? requestedTo : defaultTo;
  const dateFrom = parsedFrom <= parsedTo ? parsedFrom : parsedTo;
  const dateTo = parsedFrom <= parsedTo ? parsedTo : parsedFrom;
  const { previousFrom, previousTo } = getPreviousDateRange(dateFrom, dateTo);

  const analyticsRepo = new AnalyticsRepository(db, storeId);
  const { GetDashboardMetricsUseCase: DashMetrics } = await import("./application/analytics/get-dashboard-metrics.usecase");
  const { GetConversionFunnelUseCase: FunnelUC } = await import("./application/analytics/get-conversion-funnel.usecase");
  const { GetTopProductsUseCase: TopProdUC } = await import("./application/analytics/get-top-products.usecase");
  const { GetRevenueMetricsUseCase: RevUC } = await import("./application/analytics/get-revenue-metrics.usecase");

  const [dashMetrics, funnel, topProducts, revenue, attribution, previousAttribution] = await Promise.all([
    new DashMetrics(analyticsRepo).execute(dateFrom, dateTo),
    new FunnelUC(db, storeId).execute(dateFrom, dateTo),
    new TopProdUC(db, storeId).execute(dateFrom, dateTo),
    new RevUC(analyticsRepo).execute(dateFrom, dateTo),
    analyticsRepo.getAttributionBreakdown(dateFrom, dateTo, 10),
    analyticsRepo.getAttributionBreakdown(previousFrom, previousTo, 100),
  ]);

  const previousSourceEvents = new Map(
    previousAttribution.topSources.map((row) => [row.source, row.events]),
  );
  const previousCampaignEvents = new Map(
    previousAttribution.topCampaigns.map((row) => [row.campaign, row.events]),
  );
  const previousLandingEvents = new Map(
    previousAttribution.topLandingPaths.map((row) => [row.landingPath, row.events]),
  );

  const attributionWithTrend = {
    topSources: attribution.topSources.map((row) => ({
      ...row,
      trendPercent: calculateTrendPercent(
        row.events,
        previousSourceEvents.get(row.source) ?? 0,
      ),
    })),
    topCampaigns: attribution.topCampaigns.map((row) => ({
      ...row,
      trendPercent: calculateTrendPercent(
        row.events,
        previousCampaignEvents.get(row.campaign) ?? 0,
      ),
    })),
    topLandingPaths: attribution.topLandingPaths.map((row) => ({
      ...row,
      trendPercent: calculateTrendPercent(
        row.events,
        previousLandingEvents.get(row.landingPath) ?? 0,
      ),
    })),
  };

  const metrics = [
    { label: "Revenue", value: `$${dashMetrics.totalRevenue.toFixed(2)}` },
    { label: "Orders", value: String(dashMetrics.orderCount) },
    { label: "Visitors", value: String(dashMetrics.uniqueVisitors) },
    { label: "Page Views", value: String(dashMetrics.pageViews) },
    { label: "Add to Cart", value: String(dashMetrics.addToCartCount) },
    { label: "Checkout Started", value: String(dashMetrics.checkoutStartedCount) },
    { label: "Conversion Rate", value: `${(dashMetrics.conversionRate * 100).toFixed(1)}%` },
    { label: "Avg Order Value", value: `$${dashMetrics.averageOrderValue.toFixed(2)}` },
  ];

  return c.html(
    <Layout url={c.req.url} title="Analytics" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <AdminAnalyticsPage
        metrics={metrics}
        funnel={funnel as any}
        topProducts={topProducts as any}
        dailyRevenue={revenue.dailyRevenue as any}
        attribution={attributionWithTrend as any}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />
    </Layout>,
  );
});

app.get("/admin/analytics/export.csv", async (c) => {
  const { db, storeId, user } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");

  const now = new Date();
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = now.toISOString().slice(0, 10);
  const requestedFrom = c.req.query("from");
  const requestedTo = c.req.query("to");
  const parsedFrom = requestedFrom && datePattern.test(requestedFrom) ? requestedFrom : defaultFrom;
  const parsedTo = requestedTo && datePattern.test(requestedTo) ? requestedTo : defaultTo;
  const dateFrom = parsedFrom <= parsedTo ? parsedFrom : parsedTo;
  const dateTo = parsedFrom <= parsedTo ? parsedTo : parsedFrom;
  const { previousFrom, previousTo } = getPreviousDateRange(dateFrom, dateTo);

  const analyticsRepo = new AnalyticsRepository(db, storeId);
  const { GetDashboardMetricsUseCase: DashMetrics } = await import("./application/analytics/get-dashboard-metrics.usecase");
  const { GetConversionFunnelUseCase: FunnelUC } = await import("./application/analytics/get-conversion-funnel.usecase");
  const { GetTopProductsUseCase: TopProdUC } = await import("./application/analytics/get-top-products.usecase");
  const { GetRevenueMetricsUseCase: RevUC } = await import("./application/analytics/get-revenue-metrics.usecase");

  const [dashMetrics, funnel, topProducts, revenue, attribution, previousAttribution] = await Promise.all([
    new DashMetrics(analyticsRepo).execute(dateFrom, dateTo),
    new FunnelUC(db, storeId).execute(dateFrom, dateTo),
    new TopProdUC(db, storeId).execute(dateFrom, dateTo),
    new RevUC(analyticsRepo).execute(dateFrom, dateTo),
    analyticsRepo.getAttributionBreakdown(dateFrom, dateTo, 10),
    analyticsRepo.getAttributionBreakdown(previousFrom, previousTo, 100),
  ]);

  const previousSourceEvents = new Map(
    previousAttribution.topSources.map((row) => [row.source, row.events]),
  );
  const previousCampaignEvents = new Map(
    previousAttribution.topCampaigns.map((row) => [row.campaign, row.events]),
  );
  const previousLandingEvents = new Map(
    previousAttribution.topLandingPaths.map((row) => [row.landingPath, row.events]),
  );

  const lines: string[] = [];
  lines.push("section,date,metric,label,value,count,trend_percent");
  lines.push(`summary,,,Revenue,${dashMetrics.totalRevenue.toFixed(2)},,`);
  lines.push(`summary,,,Orders,${dashMetrics.orderCount},,`);
  lines.push(`summary,,,Visitors,${dashMetrics.uniqueVisitors},,`);
  lines.push(`summary,,,Page Views,${dashMetrics.pageViews},,`);
  lines.push(`summary,,,Add to Cart,${dashMetrics.addToCartCount},,`);
  lines.push(`summary,,,Checkout Started,${dashMetrics.checkoutStartedCount},,`);
  lines.push(`summary,,,Conversion Rate,${(dashMetrics.conversionRate * 100).toFixed(2)}%,,`);
  lines.push(`summary,,,Avg Order Value,${dashMetrics.averageOrderValue.toFixed(2)},,`);

  for (const day of revenue.dailyRevenue) {
    lines.push([
      "daily_revenue",
      escapeCsv(day.date),
      "",
      "Daily Revenue",
      day.revenue.toFixed(2),
      day.orders,
      "",
    ].join(","));
  }

  for (const step of funnel) {
    lines.push([
      "funnel",
      "",
      escapeCsv(step.step),
      "Step Count",
      step.count,
      "",
      "",
    ].join(","));
    lines.push([
      "funnel",
      "",
      escapeCsv(step.step),
      "Drop Off Percent",
      step.dropOffPercent,
      "",
      "",
    ].join(","));
  }

  for (const product of topProducts) {
    lines.push([
      "top_products",
      "",
      escapeCsv(product.productId),
      escapeCsv(product.productName),
      product.totalRevenue.toFixed(2),
      product.totalQuantity,
      "",
    ].join(","));
  }

  for (const source of attribution.topSources) {
    const trend = calculateTrendPercent(
      source.events,
      previousSourceEvents.get(source.source) ?? 0,
    );
    lines.push([
      "attribution_sources",
      "",
      "events",
      escapeCsv(source.source),
      source.events,
      source.sessions,
      trend === null ? "" : trend.toFixed(1),
    ].join(","));
  }

  for (const campaign of attribution.topCampaigns) {
    const trend = calculateTrendPercent(
      campaign.events,
      previousCampaignEvents.get(campaign.campaign) ?? 0,
    );
    lines.push([
      "attribution_campaigns",
      "",
      "events",
      escapeCsv(campaign.campaign),
      campaign.events,
      campaign.sessions,
      trend === null ? "" : trend.toFixed(1),
    ].join(","));
  }

  for (const landingPath of attribution.topLandingPaths) {
    const trend = calculateTrendPercent(
      landingPath.events,
      previousLandingEvents.get(landingPath.landingPath) ?? 0,
    );
    lines.push([
      "attribution_landing_paths",
      "",
      "events",
      escapeCsv(landingPath.landingPath),
      landingPath.events,
      landingPath.sessions,
      trend === null ? "" : trend.toFixed(1),
    ].join(","));
  }

  const csv = lines.join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"analytics-${dateFrom}-to-${dateTo}.csv\"`,
      "Cache-Control": "no-store",
    },
  });
});

// ─── Admin Products Pages ─────────────────────────────────
app.get("/admin/products", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");

  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = 20;
  const status = c.req.query("status") || undefined;
  const type = c.req.query("type") || undefined;
  const search = c.req.query("search") || undefined;

  const productRepo = new ProductRepository(db, storeId);
  const result = await productRepo.findAll({ page, limit, status, type, search });

  const productRows = result.products.map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    type: p.type,
    status: p.status ?? "active",
    featuredImageUrl: p.featuredImageUrl,
    availableForSale: p.availableForSale,
    priceRange: p.priceRange,
    variantCount: p.variantCount ?? p.variants?.length ?? 0,
    totalInventory: p.totalInventory ?? 0,
  }));

  return c.html(
    <Layout url={c.req.url} title="Products – Admin" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <AdminProductsPage
        products={productRows}
        total={result.total}
        page={page}
        limit={limit}
        filters={{ status, type, search }}
      />
    </Layout>,
  );
});

app.get("/admin/products/new", async (c) => {
  const { cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");

  const emptyProduct = {
    id: "new",
    name: "",
    slug: "",
    description: null,
    descriptionHtml: null,
    type: "physical",
    status: "draft",
    availableForSale: true,
    featuredImageUrl: null,
    seoTitle: null,
    seoDescription: null,
  };

  return c.html(
    <Layout url={c.req.url} title="New Product – Admin" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <ProductEditPage product={emptyProduct} variants={[]} images={[]} isNew />
    </Layout>,
  );
});

app.get("/admin/products/:id", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");

  const productRepo = new ProductRepository(db, storeId);
  const product = await productRepo.findById(c.req.param("id"));
  if (!product) return c.notFound();

  return c.html(
    <Layout url={c.req.url} title={`${product.name} – Admin`} isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <ProductEditPage
        product={product as any}
        variants={product.variants as any}
        images={product.images as any}
      />
    </Layout>,
  );
});

// ─── Admin Collections Page ───────────────────────────────
app.get("/admin/collections", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");

  const productRepo = new ProductRepository(db, storeId);
  const cols = await productRepo.findCollections();

  return c.html(
    <Layout url={c.req.url} title="Collections – Admin" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <AdminCollectionsPage collections={cols as any} />
    </Layout>,
  );
});

// ─── Admin Orders Pages ──────────────────────────────────
app.get("/admin/orders", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");

  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = 20;
  const status = c.req.query("status") || undefined;
  const search = c.req.query("search") || undefined;
  const dateFrom = c.req.query("dateFrom") || undefined;
  const dateTo = c.req.query("dateTo") || undefined;

  const orderRepo = new OrderRepository(db, storeId);
  const result = await orderRepo.findByStore({ page, limit, status, search, dateFrom, dateTo });

  return c.html(
    <Layout url={c.req.url} title="Orders – Admin" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <AdminOrdersPage
        orders={result.orders as any}
        total={result.total}
        page={page}
        limit={limit}
        filters={{ status, search, dateFrom, dateTo }}
      />
    </Layout>,
  );
});

app.get("/admin/orders/:id", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");

  const orderId = c.req.param("id");
  const orderRepo = new OrderRepository(db, storeId);
  const order = await orderRepo.findById(orderId);
  if (!order) return c.notFound();

  const userRepo = new UserRepository(db);
  const customer = await userRepo.findById(order.userId);

  return c.html(
    <Layout url={c.req.url} title={`Order #${orderId.slice(0, 8)} – Admin`} isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <AdminOrderDetailPage
        order={order as any}
        customerName={customer?.name}
        customerEmail={customer?.email}
      />
    </Layout>,
  );
});

// ─── Admin Bookings Page ──────────────────────────────────
app.get("/admin/bookings", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");

  const page = Number(c.req.query("page") || "1");
  const limit = 20;
  const status = c.req.query("status");
  const date = c.req.query("date");
  const search = c.req.query("search");

  const bookingRepo = new BookingRepository(db, storeId);
  const { bookings: bookingsList, total } = await bookingRepo.findBookingsForAdmin({ page, limit, status, date, search });
  const stats = await bookingRepo.getBookingStats();
  const waitlist = await bookingRepo.findWaitlistForAdmin();

  return c.html(
    <Layout url={c.req.url} title="Bookings – Admin" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <AdminBookingsPage
        bookings={bookingsList as any}
        total={total}
        page={page}
        limit={limit}
        filters={{ status, date, search }}
        stats={stats}
        waitlist={waitlist as any}
      />
    </Layout>,
  );
});

// ─── Store Integrations Page ──────────────────────────────
app.get("/platform/integrations", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");

  const storeRepo = new StoreRepository(db);
  const store = await storeRepo.findById(storeId);
  if (!store) return c.notFound();

  const integrationRepo = new IntegrationRepoImpl(db);
  const secretRepo = new SecretRepoImpl(db);
  const listUseCase = new ListIntegrationsUseCase(integrationRepo, secretRepo);

  const integrations = await listUseCase.listForStore(storeId);

  return c.html(
    <Layout url={c.req.url} title="Store Integrations" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <StoreIntegrationsPage store={store as any} integrations={integrations as any} />
    </Layout>,
  );
});

// ─── Affiliate Pages ──────────────────────────────────────
app.get("/affiliates", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const affiliateRepo = new AffiliateRepository(db, storeId);
  const affiliate = await affiliateRepo.findByUserId(user.sub);
  if (!affiliate) return c.redirect("/affiliates/register");
  const links = await affiliateRepo.findLinks(affiliate.id);
  const conversions = await affiliateRepo.findConversions(affiliate.id);

  return c.html(
    <Layout url={c.req.url} title="Affiliate Dashboard" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <AffiliateDashboardPage
        affiliate={affiliate as any}
        links={links as any}
        conversions={conversions as any}
      />
    </Layout>
  );
});

app.get("/affiliates/links", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const affiliateRepo = new AffiliateRepository(db, storeId);
  const affiliate = await affiliateRepo.findByUserId(user.sub);
  if (!affiliate) return c.redirect("/affiliates/register");
  const links = await affiliateRepo.findLinks(affiliate.id);

  return c.html(
    <Layout url={c.req.url} title="Affiliate Links" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <AffiliateLinksPage affiliate={affiliate as any} links={links as any} />
    </Layout>
  );
});

app.get("/affiliates/payouts", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, user, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const affiliateRepo = new AffiliateRepository(db, storeId);
  const affiliate = await affiliateRepo.findByUserId(user.sub);
  if (!affiliate) return c.redirect("/affiliates/register");
  const payouts = await affiliateRepo.findPayouts(affiliate.id);

  return c.html(
    <Layout url={c.req.url} title="Affiliate Payouts" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <AffiliatePayoutsPage payouts={payouts as any} />
    </Layout>
  );
});

app.get("/affiliates/register", async (c) => {
  const { cartCount, isAuthenticated, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);

  return c.html(
    <Layout url={c.req.url} title="Become an Affiliate" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <AffiliateRegisterPage />
    </Layout>
  );
});

// ─── Venue Pages ──────────────────────────────────────────
app.get("/venues", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const venueRepo = new VenueRepository(db, storeId);
  const venues = await venueRepo.findAll();

  return c.html(
    <Layout url={c.req.url} title="Venues" activePath="/venues" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <VenueListPage venues={venues as any} />
    </Layout>
  );
});

app.get("/venues/:slug", async (c) => {
  const { db, storeId, cartCount, isAuthenticated, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  const venueRepo = new VenueRepository(db, storeId);
  const venue = await venueRepo.findBySlug(c.req.param("slug"));
  if (!venue) {
    return c.html(
      <Layout url={c.req.url} title="Not Found" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
        <NotFoundPage />
      </Layout>,
      404
    );
  }

  return c.html(
    <Layout url={c.req.url} title={venue.name} isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <VenueDetailPage venue={venue as any} events={[]} />
    </Layout>
  );
});

// Error pages are now imported from:
//   src/routes/pages/404.page.tsx (NotFoundPage)
//   src/components/ui/error-page.tsx (ErrorPage)

// ─── CDN Image Proxy with Cache + WebP negotiation (C5) ──
app.get("/cdn/*", async (c) => {
  const key = c.req.path.slice(5); // strip "/cdn/"
  if (!key) return c.notFound();

  const bucket = c.env.IMAGES;
  const object = await bucket.get(key);
  if (!object) return c.notFound();

  const acceptHeader = c.req.header("Accept") || "";
  const supportsWebP = acceptHeader.includes("image/webp");

  const headers = new Headers();
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Vary", "Accept");

  const ct = object.httpMetadata?.contentType;
  if (ct) {
    headers.set("Content-Type", ct);
  } else {
    const ext = key.split(".").pop()?.toLowerCase();
    const mime: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
      webp: "image/webp", svg: "image/svg+xml", gif: "image/gif", avif: "image/avif",
    };
    headers.set("Content-Type", mime[ext ?? ""] ?? "application/octet-stream");
  }

  // WebP negotiation: try .webp variant if browser supports it
  if (supportsWebP && ct && !ct.includes("webp") && !ct.includes("svg")) {
    const webpKey = key.replace(/\.(jpe?g|png)$/i, ".webp");
    if (webpKey !== key) {
      const webpObj = await bucket.get(webpKey);
      if (webpObj) {
        headers.set("Content-Type", "image/webp");
        headers.set("ETag", webpObj.httpEtag);
        return new Response(webpObj.body as ReadableStream, { headers });
      }
    }
  }

  headers.set("ETag", object.httpEtag);
  return new Response(object.body as ReadableStream, { headers });
});

// Redirect middleware — check for stored redirects before 404
app.use("*", async (c, next) => {
  await next();
  if (c.res.status === 404 && !c.req.path.startsWith("/api/")) {
    try {
      const db = createDb(c.env.DATABASE_URL);
      const storeId = c.get("storeId") as string;
      const redirectRepo = new RedirectRepository(db, storeId);
      const redirect = await redirectRepo.findByPath(c.req.path);
      if (redirect) {
        return c.redirect(redirect.toPath, redirect.statusCode as 301 | 302);
      }
    } catch {
      // If redirect lookup fails, continue to 404
    }
  }
});

// 404 catch-all
app.notFound(async (c) => {
  const { cartCount, isAuthenticated, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
  return c.html(
    <Layout url={c.req.url} title="Not Found" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <NotFoundPage />
    </Layout>,
    404
  );
});

// Global error handler for unhandled page errors
app.onError(async (err, c) => {
  console.error("Unhandled error:", err);
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "Internal server error" }, 500);
  }
  try {
    const { cartCount, isAuthenticated, storeName, storeLogo, primaryColor, secondaryColor } = await getPageContext(c);
    return c.html(
      <Layout url={c.req.url} title="Error" isAuthenticated={isAuthenticated} cartCount={cartCount} storeName={storeName} storeLogo={storeLogo} primaryColor={primaryColor} secondaryColor={secondaryColor}>
        <ErrorPage status={500} />
      </Layout>,
      500
    );
  } catch {
    return c.html("<h1>Internal Server Error</h1>", 500);
  }
});

// ─── Export ────────────────────────────────────────────────
export default {
  fetch: app.fetch,
  scheduled: async (ctrl: ScheduledController, env: Env, ctx: ExecutionContext) => {
    await handleScheduled(ctrl, env, ctx);
  },
  queue: async (batch: MessageBatch, env: Env, ctx: ExecutionContext) => {
    await handleQueue(batch, env, ctx);
  },
};
