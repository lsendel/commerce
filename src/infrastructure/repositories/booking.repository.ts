import { eq, and, gte, lte, desc, sql, count, lt, inArray } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  bookingAvailability,
  bookingAvailabilityPrices,
  bookingSettings,
  bookingConfig,
  bookingRequests,
  bookings,
  bookingItems,
  products,
} from "../db/schema";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateAvailabilityData {
  productId: string;
  slotDate: string;
  slotTime: string;
  totalCapacity: number;
  prices: Array<{
    personType: "adult" | "child" | "pet";
    price: number;
  }>;
}

export interface AvailabilityFilters {
  productId: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateBookingRequestData {
  availabilityId: string;
  userId: string;
  quantity: number;
  expiresAt: Date;
  cartItemId?: string;
}

export interface CreateBookingData {
  orderItemId: string | null;
  userId: string;
  bookingAvailabilityId: string;
}

export interface CreateBookingItemData {
  bookingId: string;
  personType: "adult" | "child" | "pet";
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

// ─── Repository ─────────────────────────────────────────────────────────────

export class BookingRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  // ─── Availability ───────────────────────────────────────────────────────

  async createAvailability(data: CreateAvailabilityData) {
    const slotDatetime = new Date(`${data.slotDate}T${data.slotTime}:00Z`);

    const rows = await this.db
      .insert(bookingAvailability)
      .values({
        storeId: this.storeId,
        productId: data.productId,
        slotDate: data.slotDate,
        slotTime: data.slotTime,
        slotDatetime: slotDatetime,
        totalCapacity: data.totalCapacity,
        reservedCount: 0,
        status: "available",
        isActive: true,
      })
      .returning();

    const slot = rows[0];

    // Insert prices for the slot
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
      priceRows.push(inserted[0]);
    }

    return {
      id: slot.id,
      productId: slot.productId,
      slotDate: slot.slotDate,
      slotTime: slot.slotTime,
      totalCapacity: slot.totalCapacity,
      reservedCount: slot.reservedCount ?? 0,
      remainingCapacity: slot.totalCapacity - (slot.reservedCount ?? 0),
      status: slot.status,
      isActive: slot.isActive,
      createdAt: slot.createdAt,
      prices: priceRows.map((pr) => ({
        id: pr.id,
        personType: pr.personType,
        price: Number(pr.price),
      })),
    };
  }

  async bulkCreateAvailability(
    productId: string,
    slots: Array<{ slotDate: string; slotTime: string; totalCapacity: number }>,
    prices: Array<{ personType: "adult" | "child" | "pet"; price: number }>,
  ) {
    const results = [];

    for (const slot of slots) {
      const result = await this.createAvailability({
        productId,
        slotDate: slot.slotDate,
        slotTime: slot.slotTime,
        totalCapacity: slot.totalCapacity,
        prices,
      });
      results.push(result);
    }

    return results;
  }

  async findAvailability(filters: AvailabilityFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [
      eq(bookingAvailability.storeId, this.storeId),
      eq(bookingAvailability.productId, filters.productId),
      eq(bookingAvailability.isActive, true),
    ];

    if (filters.dateFrom) {
      conditions.push(gte(bookingAvailability.slotDate, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(bookingAvailability.slotDate, filters.dateTo));
    }
    if (filters.status) {
      conditions.push(eq(bookingAvailability.status, filters.status as any));
    }

    const whereClause = and(...conditions);

    // Count total
    const countResult = await this.db
      .select({ total: count() })
      .from(bookingAvailability)
      .where(whereClause);

    const total = countResult[0]?.total ?? 0;

    // Fetch slots
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

    // Fetch prices for all slots
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

    const slots = slotRows.map((s) => {
      const reserved = s.reservedCount ?? 0;
      const remaining = s.totalCapacity - reserved;
      const slotPrices = (pricesBySlot.get(s.id) ?? []).map((pr) => ({
        id: pr.id,
        personType: pr.personType,
        price: Number(pr.price),
      }));

      return {
        id: s.id,
        productId: s.productId,
        slotDate: s.slotDate,
        slotTime: s.slotTime,
        totalCapacity: s.totalCapacity,
        reservedCount: reserved,
        remainingCapacity: remaining,
        status: s.status,
        isActive: s.isActive,
        createdAt: s.createdAt,
        prices: slotPrices,
      };
    });

    return { slots, total, page, limit };
  }

  async findAvailabilityById(id: string) {
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

    const reserved = slot.reservedCount ?? 0;

    return {
      id: slot.id,
      productId: slot.productId,
      slotDate: slot.slotDate,
      slotTime: slot.slotTime,
      totalCapacity: slot.totalCapacity,
      reservedCount: reserved,
      remainingCapacity: slot.totalCapacity - reserved,
      status: slot.status,
      isActive: slot.isActive,
      createdAt: slot.createdAt,
      prices: priceRows.map((pr) => ({
        id: pr.id,
        personType: pr.personType,
        price: Number(pr.price),
      })),
    };
  }

  async updateAvailabilityStatus(
    id: string,
    status: "available" | "full" | "in_progress" | "completed" | "closed" | "canceled",
  ) {
    const rows = await this.db
      .update(bookingAvailability)
      .set({ status })
      .where(and(eq(bookingAvailability.id, id), eq(bookingAvailability.storeId, this.storeId)))
      .returning();

    return rows[0] ?? null;
  }

  async incrementReservedCount(id: string, count: number) {
    const rows = await this.db
      .update(bookingAvailability)
      .set({
        reservedCount: sql`${bookingAvailability.reservedCount} + ${count}`,
      })
      .where(and(eq(bookingAvailability.id, id), eq(bookingAvailability.storeId, this.storeId)))
      .returning();

    return rows[0] ?? null;
  }

  async decrementReservedCount(id: string, count: number) {
    const rows = await this.db
      .update(bookingAvailability)
      .set({
        reservedCount: sql`GREATEST(${bookingAvailability.reservedCount} - ${count}, 0)`,
      })
      .where(and(eq(bookingAvailability.id, id), eq(bookingAvailability.storeId, this.storeId)))
      .returning();

    return rows[0] ?? null;
  }

  // ─── Settings & Config ──────────────────────────────────────────────────

  async findSettingsByProductId(productId: string) {
    const rows = await this.db
      .select()
      .from(bookingSettings)
      .where(eq(bookingSettings.productId, productId))
      .limit(1);

    return rows[0] ?? null;
  }

  async findConfigByProductId(productId: string) {
    const rows = await this.db
      .select()
      .from(bookingConfig)
      .where(eq(bookingConfig.productId, productId))
      .limit(1);

    return rows[0] ?? null;
  }

  // ─── Booking Requests ──────────────────────────────────────────────────

  async createBookingRequest(data: CreateBookingRequestData) {
    const rows = await this.db
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

    return rows[0];
  }

  async findRequestById(id: string) {
    const rows = await this.db
      .select()
      .from(bookingRequests)
      .where(eq(bookingRequests.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  async findRequestsByAvailabilityId(availabilityId: string) {
    return this.db
      .select()
      .from(bookingRequests)
      .where(
        and(
          eq(bookingRequests.availabilityId, availabilityId),
          eq(bookingRequests.status, "pending_payment"),
        ),
      );
  }

  async updateRequestStatus(
    id: string,
    status: "cart" | "pending_payment" | "confirmed" | "expired" | "cancelled",
  ) {
    const rows = await this.db
      .update(bookingRequests)
      .set({ status })
      .where(eq(bookingRequests.id, id))
      .returning();

    return rows[0] ?? null;
  }

  async expireStaleRequests() {
    const now = new Date();

    // Find all stale pending_payment requests
    const staleRequests = await this.db
      .select()
      .from(bookingRequests)
      .where(
        and(
          eq(bookingRequests.status, "pending_payment"),
          lt(bookingRequests.expiresAt, now),
        ),
      );

    if (staleRequests.length === 0) return { expired: 0 };

    // Group by availability to batch decrement
    const decrementMap = new Map<string, number>();
    const requestIds: string[] = [];

    for (const req of staleRequests) {
      requestIds.push(req.id);
      const current = decrementMap.get(req.availabilityId) ?? 0;
      decrementMap.set(req.availabilityId, current + req.quantity);
    }

    // Mark all as expired
    await this.db
      .update(bookingRequests)
      .set({ status: "expired" })
      .where(inArray(bookingRequests.id, requestIds));

    // Decrement reserved counts on availability slots
    for (const [availId, qty] of decrementMap) {
      await this.decrementReservedCount(availId, qty);
    }

    return { expired: staleRequests.length };
  }

  // ─── Bookings ─────────────────────────────────────────────────────────

  async createBooking(data: CreateBookingData, items: Omit<CreateBookingItemData, "bookingId">[]) {
    const bookingRows = await this.db
      .insert(bookings)
      .values({
        storeId: this.storeId,
        orderItemId: data.orderItemId,
        userId: data.userId,
        bookingAvailabilityId: data.bookingAvailabilityId,
        status: "confirmed",
      })
      .returning();

    const booking = bookingRows[0];

    const createdItems: Array<{
      id: string;
      bookingId: string;
      personType: string;
      quantity: number;
      unitPrice: string;
      totalPrice: string;
    }> = [];

    for (const item of items) {
      const itemRows = await this.db
        .insert(bookingItems)
        .values({
          bookingId: booking.id,
          personType: item.personType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })
        .returning();

      createdItems.push(itemRows[0] as any);
    }

    return { ...booking, items: createdItems };
  }

  async findBookingsByUserId(userId: string, pagination: { page: number; limit: number }) {
    const offset = (pagination.page - 1) * pagination.limit;

    // Count
    const countResult = await this.db
      .select({ total: count() })
      .from(bookings)
      .where(and(eq(bookings.userId, userId), eq(bookings.storeId, this.storeId)));

    const total = countResult[0]?.total ?? 0;

    // Fetch bookings
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

    // Enrich with availability, items, and product data
    const enriched = await Promise.all(
      bookingRows.map(async (b) => this.enrichBooking(b)),
    );

    return {
      bookings: enriched,
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async findBookingById(id: string) {
    const rows = await this.db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.storeId, this.storeId)))
      .limit(1);

    const booking = rows[0];
    if (!booking) return null;

    return this.enrichBooking(booking);
  }

  async updateBookingStatus(
    id: string,
    status: "confirmed" | "checked_in" | "cancelled" | "no_show",
  ) {
    const rows = await this.db
      .update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(bookings.id, id), eq(bookings.storeId, this.storeId)))
      .returning();

    const booking = rows[0];
    if (!booking) return null;

    return this.enrichBooking(booking);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────

  private async enrichBooking(booking: {
    id: string;
    orderItemId: string | null;
    userId: string;
    bookingAvailabilityId: string;
    status: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  }) {
    // Get booking items
    const itemRows = await this.db
      .select()
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, booking.id));

    // Get availability slot
    const slotRows = await this.db
      .select()
      .from(bookingAvailability)
      .where(eq(bookingAvailability.id, booking.bookingAvailabilityId))
      .limit(1);

    const slot = slotRows[0];

    // Get product for the slot
    let product: { name: string; slug: string; featuredImageUrl: string | null } | null = null;
    if (slot) {
      const productRows = await this.db
        .select()
        .from(products)
        .where(eq(products.id, slot.productId))
        .limit(1);

      if (productRows[0]) {
        product = {
          name: productRows[0].name,
          slug: productRows[0].slug,
          featuredImageUrl: productRows[0].featuredImageUrl,
        };
      }
    }

    // Build personTypeQuantities and totalPrice from items
    const personTypeQuantities: Record<string, number> = {};
    let totalPrice = 0;

    for (const item of itemRows) {
      personTypeQuantities[item.personType] = item.quantity;
      totalPrice += Number(item.totalPrice);
    }

    return {
      id: booking.id,
      userId: booking.userId,
      availabilityId: booking.bookingAvailabilityId,
      status: booking.status ?? "confirmed",
      personTypeQuantities,
      totalPrice,
      availability: slot
        ? {
            slotDate: slot.slotDate,
            slotTime: slot.slotTime,
            product: product ?? { name: "", slug: "", featuredImageUrl: null },
          }
        : {
            slotDate: "",
            slotTime: "",
            product: { name: "", slug: "", featuredImageUrl: null },
          },
      createdAt: booking.createdAt?.toISOString() ?? new Date().toISOString(),
      items: itemRows.map((item) => ({
        id: item.id,
        personType: item.personType,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    };
  }
}
