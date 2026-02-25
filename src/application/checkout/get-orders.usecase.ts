import type { OrderRepository } from "../../infrastructure/repositories/order.repository";
import { NotFoundError } from "../../shared/errors";

export class GetOrdersUseCase {
  constructor(private orderRepo: OrderRepository) {}

  /**
   * List orders for the authenticated user with pagination.
   */
  async list(userId: string, pagination: { page: number; limit: number }) {
    const result = await this.orderRepo.findByUserId(userId, pagination);

    return {
      orders: result.orders.map((order) => this.formatOrder(order)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /**
   * Get a single order by ID, scoped to the authenticated user.
   */
  async getById(orderId: string, userId: string) {
    const order = await this.orderRepo.findById(orderId, userId);
    if (!order) {
      throw new NotFoundError("Order", orderId);
    }

    return this.formatOrder(order);
  }

  /**
   * Format an order for the API response.
   */
  private formatOrder(order: {
    id: string;
    userId: string;
    status: string | null;
    subtotal: string;
    tax: string | null;
    shippingCost: string | null;
    total: string;
    shippingAddress: unknown;
    createdAt: Date | null;
    updatedAt: Date | null;
    items: Array<{
      id: string;
      variantId: string | null;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      variant: {
        title: string;
        product: {
          name: string;
          slug: string;
          featuredImageUrl: string | null;
        };
      };
    }>;
  }) {
    return {
      id: order.id,
      status: order.status ?? "pending",
      subtotal: Number(order.subtotal),
      tax: Number(order.tax ?? 0),
      total: Number(order.total),
      currency: "usd",
      items: order.items.map((item) => ({
        id: item.id,
        variantId: item.variantId ?? "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        variant: {
          title: item.variant.title,
          product: {
            name: item.variant.product.name,
            slug: item.variant.product.slug,
            featuredImageUrl: item.variant.product.featuredImageUrl,
          },
        },
      })),
      shippingAddress: order.shippingAddress as {
        street: string;
        city: string;
        state: string | null;
        zip: string;
        country: string;
      } | null,
      createdAt: order.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: order.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}
