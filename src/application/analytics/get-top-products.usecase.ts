import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import {
  orderItems,
  orders,
  products,
  productVariants,
} from "../../infrastructure/db/schema";

export class GetTopProductsUseCase {
  constructor(private db: Database, private storeId: string) {}

  async execute(dateFrom: string, dateTo: string, limit = 10) {
    const rows = await this.db
      .select({
        productId: products.id,
        productName: products.name,
        totalQuantity: sql<number>`sum(${orderItems.quantity})::int`,
        totalRevenue: sql<string>`sum(${orderItems.totalPrice})`,
        orderCount: sql<number>`count(distinct ${orders.id})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          eq(orders.storeId, this.storeId),
          gte(orders.createdAt, new Date(`${dateFrom}T00:00:00Z`)),
          lte(orders.createdAt, new Date(`${dateTo}T23:59:59Z`)),
        ),
      )
      .groupBy(products.id, products.name)
      .orderBy(desc(sql`sum(${orderItems.totalPrice})`))
      .limit(limit);

    return rows.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      totalQuantity: r.totalQuantity ?? 0,
      totalRevenue: Number(r.totalRevenue ?? 0),
      orderCount: r.orderCount ?? 0,
    }));
  }
}
