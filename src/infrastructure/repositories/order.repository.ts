import { eq, and, desc, sql, count, like, gte, lte } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  orders,
  orderItems,
  productVariants,
  products,
  users,
} from "../db/schema";

export interface CreateOrderData {
  userId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string | null;
  status?: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  subtotal: string; // decimal string
  tax?: string;
  shippingCost?: string;
  discount?: string;
  total: string;
  shippingAddress?: Record<string, unknown> | null;
  couponCode?: string | null;
}

export interface CreateOrderItemData {
  orderId: string;
  variantId: string | null;
  productName: string;
  variantTitle: string | null;
  quantity: number;
  unitPrice: string; // decimal string
  totalPrice: string;
  bookingAvailabilityId?: string | null;
}

export class OrderRepository {
  constructor(private db: Database, private storeId: string) {}

  /**
   * Create an order with its items.
   * Items are inserted sequentially after the order (no transactions on HTTP driver).
   */
  async create(
    data: CreateOrderData,
    items: Omit<CreateOrderItemData, "orderId">[],
  ) {
    // Insert the order
    const orderRows = await this.db
      .insert(orders)
      .values({
        userId: data.userId,
        storeId: this.storeId,
        stripeCheckoutSessionId: data.stripeCheckoutSessionId,
        stripePaymentIntentId: data.stripePaymentIntentId ?? null,
        status: data.status ?? "pending",
        subtotal: data.subtotal,
        tax: data.tax ?? "0",
        shippingCost: data.shippingCost ?? "0",
        discount: data.discount ?? "0",
        total: data.total,
        shippingAddress: data.shippingAddress ?? null,
        couponCode: data.couponCode ?? null,
      })
      .returning();

    const order = orderRows[0];
    if (!order) {
      throw new Error("Failed to create order");
    }

    // Insert order items sequentially
    type OrderItemRow = {
      id: string;
      orderId: string;
      variantId: string | null;
      productName: string;
      variantTitle: string | null;
      quantity: number;
      unitPrice: string;
      totalPrice: string;
      bookingAvailabilityId: string | null;
      createdAt: Date | null;
    };

    const createdItems: OrderItemRow[] = [];
    for (const item of items) {
      const orderItemRows = await this.db
        .insert(orderItems)
        .values({
          orderId: order.id,
          variantId: item.variantId,
          productName: item.productName,
          variantTitle: item.variantTitle,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          bookingAvailabilityId: item.bookingAvailabilityId ?? null,
        })
        .returning();

      createdItems.push(...(orderItemRows as OrderItemRow[]));
    }

    return { ...order, items: createdItems };
  }

  /**
   * List orders for a user, ordered by createdAt desc.
   */
  async findByUserId(userId: string, pagination: { page: number; limit: number }) {
    const offset = (pagination.page - 1) * pagination.limit;

    // Get total count
    const countResult = await this.db
      .select({ total: count() })
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.storeId, this.storeId)));

    const total = countResult[0]?.total ?? 0;

    // Get orders
    const orderRows = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.storeId, this.storeId)))
      .orderBy(desc(orders.createdAt))
      .limit(pagination.limit)
      .offset(offset);

    // Enrich each order with its items
    const enrichedOrders = await Promise.all(
      orderRows.map(async (order) => {
        const items = await this.getOrderItemsEnriched(order.id);
        return { ...order, items };
      }),
    );

    return {
      orders: enrichedOrders,
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  /**
   * Get a single order with items, optionally scoped to a user.
   */
  async findById(id: string, userId?: string) {
    const conditions = [eq(orders.id, id), eq(orders.storeId, this.storeId)];
    if (userId) {
      conditions.push(eq(orders.userId, userId));
    }

    const orderRows = await this.db
      .select()
      .from(orders)
      .where(and(...conditions))
      .limit(1);

    const order = orderRows[0];
    if (!order) return null;

    const items = await this.getOrderItemsEnriched(order.id);
    return { ...order, items };
  }

  /**
   * Update the status of an order.
   */
  async updateStatus(
    orderId: string,
    status: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded",
  ) {
    const updated = await this.db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.storeId, this.storeId)))
      .returning();

    return updated[0] ?? null;
  }

  /**
   * Find an order by its Stripe checkout session ID.
   */
  async findByStripeSessionId(sessionId: string) {
    const orderRows = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.stripeCheckoutSessionId, sessionId), eq(orders.storeId, this.storeId)))
      .limit(1);

    return orderRows[0] ?? null;
  }

  /**
   * Admin: list all orders for the store with filters and pagination.
   */
  async findByStore(filters: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(orders.storeId, this.storeId)];
    if (filters.status) {
      conditions.push(eq(orders.status, filters.status as any));
    }
    if (filters.dateFrom) {
      conditions.push(gte(orders.createdAt, new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      conditions.push(lte(orders.createdAt, new Date(filters.dateTo)));
    }

    const where = and(...conditions);

    const countResult = await this.db
      .select({ total: count() })
      .from(orders)
      .where(where);

    const total = countResult[0]?.total ?? 0;

    const orderRows = await this.db
      .select({
        id: orders.id,
        userId: orders.userId,
        status: orders.status,
        total: orders.total,
        subtotal: orders.subtotal,
        tax: orders.tax,
        shippingCost: orders.shippingCost,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        customerName: users.name,
        customerEmail: users.email,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    return { orders: orderRows, total, page, limit };
  }

  /**
   * Admin: append a note to an order's internalNotes field.
   */
  async addNote(orderId: string, author: string, text: string) {
    const order = await this.db
      .select({ internalNotes: orders.internalNotes })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.storeId, this.storeId)))
      .limit(1);

    const existing = order[0]?.internalNotes || "";
    const entry = `[${new Date().toISOString()}] ${author}: ${text}`;
    const updated = existing ? `${existing}\n${entry}` : entry;

    await this.db
      .update(orders)
      .set({ internalNotes: updated, updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.storeId, this.storeId)));

    return updated;
  }

  /**
   * Get order items enriched with variant and product data.
   * Falls back to denormalized names stored on the order item itself.
   */
  private async getOrderItemsEnriched(orderId: string) {
    const items = await this.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    if (items.length === 0) return [];

    // Get variant IDs (filter nulls for items where variant may have been deleted)
    const variantIds = items
      .map((i) => i.variantId)
      .filter((id): id is string => id !== null);

    let variantMap = new Map<string, { title: string; productId: string }>();
    let productMap = new Map<string, { name: string; slug: string; featuredImageUrl: string | null }>();

    if (variantIds.length > 0) {
      const { inArray } = await import("drizzle-orm");

      const variantRows = await this.db
        .select()
        .from(productVariants)
        .where(inArray(productVariants.id, variantIds));

      variantMap = new Map(
        variantRows.map((v) => [v.id, { title: v.title, productId: v.productId }]),
      );

      const productIds = [...new Set(variantRows.map((v) => v.productId))];
      if (productIds.length > 0) {
        const productRows = await this.db
          .select()
          .from(products)
          .where(inArray(products.id, productIds));

        productMap = new Map(
          productRows.map((p) => [
            p.id,
            { name: p.name, slug: p.slug, featuredImageUrl: p.featuredImageUrl },
          ]),
        );
      }
    }

    return items.map((item) => {
      const variant = item.variantId ? variantMap.get(item.variantId) : null;
      const product = variant ? productMap.get(variant.productId) : null;

      return {
        id: item.id,
        variantId: item.variantId,
        productName: item.productName,
        variantTitle: item.variantTitle,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        bookingAvailabilityId: item.bookingAvailabilityId,
        variant: variant
          ? {
              title: variant.title,
              product: product
                ? {
                    name: product.name,
                    slug: product.slug,
                    featuredImageUrl: product.featuredImageUrl,
                  }
                : {
                    name: item.productName,
                    slug: "",
                    featuredImageUrl: null,
                  },
            }
          : {
              title: item.variantTitle ?? "",
              product: {
                name: item.productName,
                slug: "",
                featuredImageUrl: null,
              },
            },
        createdAt: item.createdAt,
      };
    });
  }
}
