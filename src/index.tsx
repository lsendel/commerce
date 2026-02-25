import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { createYoga } from "graphql-yoga";
import type { Env } from "./env";
import { handleScheduled } from "./scheduled/handler";
import { handleQueue } from "./queues/handler";

// Middleware
import { errorHandler } from "./middleware/error-handler.middleware";

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
import { DashboardPage as _DashboardPage } from "./routes/pages/account/dashboard.page";
import { OrdersPage as _OrdersPage } from "./routes/pages/account/orders.page";
import { AddressesPage as _AddressesPage } from "./routes/pages/account/addresses.page";
import { SubscriptionsPage as _SubscriptionsPage } from "./routes/pages/account/subscriptions.page";
import { PetsPage as _PetsPage } from "./routes/pages/account/pets.page";
import { StudioCreatePage as _StudioCreatePage } from "./routes/pages/studio/create.page";
import { StudioPreviewPage as _StudioPreviewPage } from "./routes/pages/studio/preview.page";
import { StudioGalleryPage as _StudioGalleryPage } from "./routes/pages/studio/gallery.page";
import { EventsListPage as _EventsListPage } from "./routes/pages/events/list.page";
import { EventDetailPage as _EventDetailPage } from "./routes/pages/events/detail.page";
import { EventCalendarPage as _EventCalendarPage } from "./routes/pages/events/calendar.page";

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
const StudioCreatePage = _StudioCreatePage as any;
const StudioPreviewPage = _StudioPreviewPage as any;
const StudioGalleryPage = _StudioGalleryPage as any;
const EventsListPage = _EventsListPage as any;
const EventDetailPage = _EventDetailPage as any;
const EventCalendarPage = _EventCalendarPage as any;

// Infrastructure
import { createDb } from "./infrastructure/db/client";
import { ProductRepository } from "./infrastructure/repositories/product.repository";
import { CartRepository } from "./infrastructure/repositories/cart.repository";
import { OrderRepository } from "./infrastructure/repositories/order.repository";
import { BookingRepository } from "./infrastructure/repositories/booking.repository";
import { AiJobRepository } from "./infrastructure/repositories/ai-job.repository";
import { UserRepository } from "./infrastructure/repositories/user.repository";
import { SubscriptionRepository } from "./infrastructure/repositories/subscription.repository";
import { verifyJwt } from "./infrastructure/security/jwt";
import { getCookie } from "hono/cookie";
import { AUTH_COOKIE_NAME, CART_COOKIE_NAME } from "./shared/constants";

const app = new Hono<{ Bindings: Env }>();

// ─── Global Middleware ─────────────────────────────────────
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", errorHandler());
app.use("/api/*", cors());

// ─── Health Check ──────────────────────────────────────────
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// ─── API Routes ────────────────────────────────────────────
app.route("/api/auth", authRoutes);
app.route("/api", productRoutes);
app.route("/api", cartRoutes);
app.route("/api", checkoutRoutes);
app.route("/api", orderRoutes);
app.route("/api", subscriptionRoutes);
app.route("/api", bookingRoutes);
app.route("/api", aiStudioRoutes);
app.route("/api", fulfillmentRoutes);
app.route("/api", webhookRoutes);

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

  let cartCount = 0;
  if (cartSessionId) {
    try {
      const cartRepo = new CartRepository(db);
      const cart = await cartRepo.findOrCreateCart(cartSessionId, user?.sub);
      const cartData = await cartRepo.findCartWithItems(cart.id);
      cartCount = (cartData as any)?.items?.length ?? 0;
    } catch { /* cart not critical for page render */ }
  }

  return { user, db, cartCount, isAuthenticated: !!user };
}

// ─── Page Routes ───────────────────────────────────────────

// Home
app.get("/", async (c) => {
  const { db, cartCount, isAuthenticated } = await getPageContext(c);
  const productRepo = new ProductRepository(db);
  const result = await productRepo.findAll({ limit: 8, available: true });
  const allCollections = await productRepo.findCollections();

  return c.html(
    <Layout title="Home" activePath="/" isAuthenticated={isAuthenticated} cartCount={cartCount} stripePublishableKey={c.env.STRIPE_PUBLISHABLE_KEY}>
      <HomePage
        featuredProducts={result.products as any}
        featuredCollections={allCollections as any}
      />
    </Layout>
  );
});

// Products
app.get("/products", async (c) => {
  const { db, cartCount, isAuthenticated } = await getPageContext(c);
  const productRepo = new ProductRepository(db);
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

  return c.html(
    <Layout title="Shop" activePath="/products" isAuthenticated={isAuthenticated} cartCount={cartCount}>
      <ProductListPage
        products={result.products as any}
        totalPages={Math.ceil(result.total / result.limit) as any}
        currentPage={result.page as any}
        collections={allCollections as any}
        filters={query as any}
      />
    </Layout>
  );
});

// Product Detail
app.get("/products/:slug", async (c) => {
  const { db, cartCount, isAuthenticated } = await getPageContext(c);
  const productRepo = new ProductRepository(db);
  const product = await productRepo.findBySlug(c.req.param("slug"));
  if (!product) {
    return c.html(
      <Layout title="Not Found" isAuthenticated={isAuthenticated} cartCount={cartCount}>
        <NotFoundPage />
      </Layout>,
      404
    );
  }

  let bookingSettings = null;
  let bookingConfig = null;
  let availability: any[] = [];
  if (product.type === "bookable") {
    const bookingRepo = new BookingRepository(db);
    bookingSettings = await bookingRepo.findSettingsByProductId(product.id);
    bookingConfig = await bookingRepo.findConfigByProductId(product.id);
    const avResult = await bookingRepo.findAvailability({ productId: product.id });
    availability = (avResult as any)?.slots ?? avResult ?? [];
  }

  return c.html(
    <Layout title={product.name} description={product.seoDescription ?? undefined} isAuthenticated={isAuthenticated} cartCount={cartCount} stripePublishableKey={c.env.STRIPE_PUBLISHABLE_KEY}>
      <ProductDetailPage
        product={product as any}
        bookingSettings={bookingSettings as any}
        bookingConfig={bookingConfig as any}
        availability={availability as any}
      />
    </Layout>
  );
});

// Cart
app.get("/cart", async (c) => {
  const { db, cartCount, isAuthenticated, user } = await getPageContext(c);
  const cartSessionId = getCookie(c, CART_COOKIE_NAME);
  let items: any[] = [];
  if (cartSessionId) {
    try {
      const cartRepo = new CartRepository(db);
      const cart = await cartRepo.findOrCreateCart(cartSessionId, user?.sub);
      const cartData = await cartRepo.findCartWithItems(cart.id);
      items = (cartData as any)?.items ?? [];
    } catch { /* empty cart */ }
  }

  return c.html(
    <Layout title="Cart" activePath="/cart" isAuthenticated={isAuthenticated} cartCount={cartCount} stripePublishableKey={c.env.STRIPE_PUBLISHABLE_KEY}>
      <CartPage items={items as any} />
    </Layout>
  );
});

// Checkout Success
app.get("/checkout/success", async (c) => {
  const { db, cartCount, isAuthenticated, user } = await getPageContext(c);
  const sessionId = c.req.query("session_id");
  let order: any = null;
  if (sessionId && user) {
    const orderRepo = new OrderRepository(db);
    order = await orderRepo.findByStripeSessionId(sessionId);
  }

  return c.html(
    <Layout title="Order Confirmed" isAuthenticated={isAuthenticated} cartCount={cartCount}>
      <CheckoutSuccessPage order={order as any} />
    </Layout>
  );
});

// Auth Pages
app.get("/auth/login", async (c) => {
  const { cartCount, isAuthenticated } = await getPageContext(c);
  return c.html(
    <Layout title="Sign In" activePath="/auth/login" isAuthenticated={isAuthenticated} cartCount={cartCount}>
      <LoginPage />
    </Layout>
  );
});

app.get("/auth/register", async (c) => {
  const { cartCount, isAuthenticated } = await getPageContext(c);
  return c.html(
    <Layout title="Create Account" activePath="/auth/register" isAuthenticated={isAuthenticated} cartCount={cartCount}>
      <RegisterPage />
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
  const { db, cartCount, user } = await getPageContext(c);
  const orderRepo = new OrderRepository(db);
  const subRepo = new SubscriptionRepository(db);
  const recentOrders = await orderRepo.findByUserId(user!.sub, { page: 1, limit: 3 });
  const subscriptions = await subRepo.findByUserId(user!.sub);

  return c.html(
    <Layout title="Account" activePath="/account" isAuthenticated={true} cartCount={cartCount}>
      <DashboardPage
        user={{ name: user!.name, email: user!.email } as any}
        recentOrders={recentOrders.orders as any}
        subscription={subscriptions[0] as any ?? null}
      />
    </Layout>
  );
});

accountPages.get("/orders", async (c) => {
  const { db, cartCount, user } = await getPageContext(c);
  const orderRepo = new OrderRepository(db);
  const result = await orderRepo.findByUserId(user!.sub, { page: Number(c.req.query("page")) || 1, limit: 10 });

  return c.html(
    <Layout title="Orders" activePath="/account" isAuthenticated={true} cartCount={cartCount}>
      <OrdersPage orders={result.orders as any} />
    </Layout>
  );
});

accountPages.get("/addresses", async (c) => {
  const { db, cartCount, user } = await getPageContext(c);
  const userRepo = new UserRepository(db);
  const addresses = await userRepo.findAddresses(user!.sub);

  return c.html(
    <Layout title="Addresses" activePath="/account" isAuthenticated={true} cartCount={cartCount}>
      <AddressesPage addresses={addresses as any} />
    </Layout>
  );
});

accountPages.get("/subscriptions", async (c) => {
  const { db, cartCount, user } = await getPageContext(c);
  const subRepo = new SubscriptionRepository(db);
  const subscriptions = await subRepo.findByUserId(user!.sub);

  return c.html(
    <Layout title="Subscriptions" activePath="/account" isAuthenticated={true} cartCount={cartCount}>
      <SubscriptionsPage subscription={subscriptions[0] as any ?? null} />
    </Layout>
  );
});

accountPages.get("/pets", async (c) => {
  const { db, cartCount, user } = await getPageContext(c);
  const aiRepo = new AiJobRepository(db);
  const pets = await aiRepo.findPetsByUserId(user!.sub);

  return c.html(
    <Layout title="My Pets" activePath="/account" isAuthenticated={true} cartCount={cartCount}>
      <PetsPage pets={pets as any} />
    </Layout>
  );
});

app.route("/account", accountPages);

// Studio Pages
app.get("/studio", async (c) => {
  const { db, cartCount, isAuthenticated, user } = await getPageContext(c);
  const aiRepo = new AiJobRepository(db);
  const templates = await aiRepo.findTemplates();
  const pets = user ? await aiRepo.findPetsByUserId(user.sub) : [];

  return c.html(
    <Layout title="AI Studio" activePath="/studio" isAuthenticated={isAuthenticated} cartCount={cartCount}>
      <StudioCreatePage
        templates={templates as any}
        pets={pets as any}
      />
    </Layout>
  );
});

app.get("/studio/create", async (c) => {
  const { db, cartCount, isAuthenticated, user } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const aiRepo = new AiJobRepository(db);
  const templates = await aiRepo.findTemplates();
  const pets = await aiRepo.findPetsByUserId(user.sub);

  return c.html(
    <Layout title="Create Art" activePath="/studio" isAuthenticated={isAuthenticated} cartCount={cartCount}>
      <StudioCreatePage
        templates={templates as any}
        pets={pets as any}
      />
    </Layout>
  );
});

app.get("/studio/preview/:id", async (c) => {
  const { db, cartCount, isAuthenticated, user } = await getPageContext(c);
  if (!user) return c.redirect("/auth/login");
  const aiRepo = new AiJobRepository(db);
  const job = await aiRepo.findById(c.req.param("id"));

  return c.html(
    <Layout title="Art Preview" activePath="/studio" isAuthenticated={isAuthenticated} cartCount={cartCount}>
      <StudioPreviewPage {...(job as any)} />
    </Layout>
  );
});

app.get("/studio/gallery", async (c) => {
  const { db, cartCount, isAuthenticated } = await getPageContext(c);
  const aiRepo = new AiJobRepository(db);
  const category = c.req.query("category");
  const templates = await aiRepo.findTemplates(category);
  const allTemplates = await aiRepo.findTemplates();
  const categories = [...new Set(allTemplates.map((t: any) => t.category).filter(Boolean))] as string[];

  return c.html(
    <Layout title="Template Gallery" activePath="/studio" isAuthenticated={isAuthenticated} cartCount={cartCount}>
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
  const { db, cartCount, isAuthenticated } = await getPageContext(c);
  const productRepo = new ProductRepository(db);
  const bookingRepo = new BookingRepository(db);
  const result = await productRepo.findAll({ type: "bookable", available: true });

  const eventsWithDates = await Promise.all(
    result.products.map(async (product: any) => {
      const slots = await bookingRepo.findAvailability({ productId: product.id });
      const slotArray = (slots as any)?.slots ?? slots ?? [];
      const nextSlot = slotArray.find?.((s: any) => s.status === "available");
      return { ...product, nextAvailableDate: nextSlot?.slotDate ?? null };
    })
  );

  return c.html(
    <Layout title="Events" activePath="/events" isAuthenticated={isAuthenticated} cartCount={cartCount}>
      <EventsListPage events={eventsWithDates as any} />
    </Layout>
  );
});

app.get("/events/calendar", async (c) => {
  const { db, cartCount, isAuthenticated } = await getPageContext(c);
  const productRepo = new ProductRepository(db);
  const bookingRepo = new BookingRepository(db);
  const result = await productRepo.findAll({ type: "bookable", available: true });
  const now = new Date();
  const year = Number(c.req.query("year")) || now.getFullYear();
  const month = Number(c.req.query("month")) || now.getMonth() + 1;
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

  const allSlots = await Promise.all(
    result.products.map(async (product: any) => {
      const slots = await bookingRepo.findAvailability({ productId: product.id, dateFrom: firstDay, dateTo: lastDay });
      const slotArray = (slots as any)?.slots ?? slots ?? [];
      return slotArray.map?.((s: any) => ({ ...s, productName: product.name, productSlug: product.slug })) ?? [];
    })
  );

  return c.html(
    <Layout title="Events Calendar" activePath="/events" isAuthenticated={isAuthenticated} cartCount={cartCount}>
      <EventCalendarPage
        events={result.products as any}
        slots={allSlots.flat() as any}
        year={year}
        month={month}
      />
    </Layout>
  );
});

app.get("/events/:slug", async (c) => {
  const { db, cartCount, isAuthenticated } = await getPageContext(c);
  const productRepo = new ProductRepository(db);
  const bookingRepo = new BookingRepository(db);
  const product = await productRepo.findBySlug(c.req.param("slug"));
  if (!product || product.type !== "bookable") {
    return c.html(
      <Layout title="Not Found" isAuthenticated={isAuthenticated} cartCount={cartCount}>
        <NotFoundPage />
      </Layout>,
      404
    );
  }

  const settings = await bookingRepo.findSettingsByProductId(product.id);
  const config = await bookingRepo.findConfigByProductId(product.id);
  const query = c.req.query();
  const avResult = await bookingRepo.findAvailability({
    productId: product.id,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  });
  const availability = (avResult as any)?.slots ?? avResult ?? [];
  const availableDates = [...new Set(
    Array.isArray(availability)
      ? availability.filter((s: any) => s.status === "available").map((s: any) => s.slotDate)
      : []
  )] as string[];
  const selectedDate = query.date ?? null;
  const selectedSlots = selectedDate
    ? (Array.isArray(availability) ? availability.filter((s: any) => s.slotDate === selectedDate) : [])
    : [];

  return c.html(
    <Layout title={product.name} activePath="/events" isAuthenticated={isAuthenticated} cartCount={cartCount} stripePublishableKey={c.env.STRIPE_PUBLISHABLE_KEY}>
      <EventDetailPage
        event={product as any}
        settings={settings as any}
        config={config as any}
        availability={availability as any}
        availableDates={availableDates}
        selectedDate={selectedDate}
        selectedSlots={selectedSlots as any}
      />
    </Layout>
  );
});

// ─── Error Pages ───────────────────────────────────────────
const NotFoundPage = () => (
  <div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <div class="text-8xl mb-4">🐾</div>
    <h1 class="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h1>
    <p class="text-gray-500 mb-8 max-w-md">
      Looks like this page wandered off. Let's get you back on track.
    </p>
    <a href="/" class="inline-flex items-center px-6 py-3 bg-brand-500 text-white font-medium rounded-xl hover:bg-brand-600 transition-colors">
      Back to Home
    </a>
  </div>
);

const ErrorPage = () => (
  <div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <div class="text-8xl mb-4">🙀</div>
    <h1 class="text-3xl font-bold text-gray-900 mb-2">Something Went Wrong</h1>
    <p class="text-gray-500 mb-8 max-w-md">
      We hit an unexpected snag. Please try again.
    </p>
    <a href="/" class="inline-flex items-center px-6 py-3 bg-brand-500 text-white font-medium rounded-xl hover:bg-brand-600 transition-colors">
      Back to Home
    </a>
  </div>
);

// 404 catch-all
app.notFound(async (c) => {
  const { cartCount, isAuthenticated } = await getPageContext(c);
  return c.html(
    <Layout title="Not Found" isAuthenticated={isAuthenticated} cartCount={cartCount}>
      <NotFoundPage />
    </Layout>,
    404
  );
});

// Global error handler for unhandled page errors
app.onError(async (err, c) => {
  console.error("Unhandled error:", err);
  try {
    const { cartCount, isAuthenticated } = await getPageContext(c);
    return c.html(
      <Layout title="Error" isAuthenticated={isAuthenticated} cartCount={cartCount}>
        <ErrorPage />
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
