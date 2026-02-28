import { Hono } from "hono";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { ProductRepository } from "../../infrastructure/repositories/product.repository";
import { BookingRepository } from "../../infrastructure/repositories/booking.repository";

const events = new Hono<{ Bindings: Env }>();

// GET /events — list bookable events with availability + location
events.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const productRepo = new ProductRepository(db, storeId);
  const bookingRepo = new BookingRepository(db, storeId);

  const query = c.req.query();
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 12));
  const search = query.search?.trim() ?? "";
  const dateFrom = query.dateFrom;
  const dateTo = query.dateTo;

  const result = await productRepo.findAll({ type: "bookable", available: true });

  const eventsWithDetails = await Promise.all(
    result.products.map(async (product: any) => {
      const slots = await bookingRepo.findAvailability({ productId: product.id, dateFrom, dateTo });
      const slotArray = (slots as any)?.slots ?? slots ?? [];
      const availableSlots = slotArray.filter?.((s: any) => s.status === "available") ?? [];
      const nextSlot = availableSlots[0];
      const config = await bookingRepo.findConfigByProductId(product.id);

      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.seoDescription ?? product.description ?? null,
        imageUrl: product.featuredImageUrl ?? null,
        priceFrom: product.variants?.[0]?.price ?? null,
        location: config?.location ?? null,
        nextAvailableDate: nextSlot?.slotDate ?? null,
        availableSlotCount: availableSlots.length,
      };
    }),
  );

  // Apply search filter
  const filtered = search.length === 0
    ? eventsWithDetails
    : eventsWithDetails.filter((e) => {
        const q = search.toLowerCase();
        return e.name.toLowerCase().includes(q)
          || (e.description ?? "").toLowerCase().includes(q)
          || (e.location ?? "").toLowerCase().includes(q);
      });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (Math.min(page, totalPages) - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  return c.json({ events: paged, total, page, limit, totalPages });
});

// GET /events/:slug — single event detail with availability
events.get("/:slug", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const productRepo = new ProductRepository(db, storeId);
  const bookingRepo = new BookingRepository(db, storeId);

  const slug = c.req.param("slug");
  const product = await productRepo.findBySlug(slug);
  if (!product || product.type !== "bookable") {
    return c.json({ error: "Event not found" }, 404);
  }

  const query = c.req.query();
  const slots = await bookingRepo.findAvailability({
    productId: product.id,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  });
  const slotArray = (slots as any)?.slots ?? slots ?? [];
  const config = await bookingRepo.findConfigByProductId(product.id);

  return c.json({
    event: {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      descriptionHtml: product.descriptionHtml ?? null,
      imageUrl: product.featuredImageUrl ?? null,
      images: product.images ?? [],
      variants: product.variants ?? [],
      location: config?.location ?? null,
      bookingConfig: config,
      availability: slotArray,
    },
  });
});

export { events as eventRoutes };
