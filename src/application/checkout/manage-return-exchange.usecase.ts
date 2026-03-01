import type { OrderRepository } from "../../infrastructure/repositories/order.repository";
import type {
  OrderReturnRepository,
  ReturnRequestType,
} from "../../infrastructure/repositories/order-return.repository";
import { NotFoundError, ValidationError } from "../../shared/errors";

const RETURN_WINDOW_DAYS = 30;
const RETURN_ELIGIBLE_STATUSES = new Set(["delivered", "refunded"]);

export interface ReturnRequestItemInput {
  orderItemId: string;
  quantity: number;
  exchangeVariantId?: string;
}

export interface SubmitReturnExchangeInput {
  orderId: string;
  userId: string;
  mode: ReturnRequestType;
  reason?: string;
  instantExchange?: boolean;
  items: ReturnRequestItemInput[];
}

interface ReturnEligibleItem {
  orderItemId: string;
  productName: string;
  variantId: string | null;
  quantityPurchased: number;
  maxReturnableQuantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ReturnExchangeOptions {
  orderId: string;
  orderStatus: string;
  eligible: boolean;
  reasonIfIneligible: string | null;
  windowEndsAt: string | null;
  daysRemaining: number;
  items: ReturnEligibleItem[];
}

export class ManageReturnExchangeUseCase {
  constructor(
    private orderRepo: OrderRepository,
    private returnRepo: OrderReturnRepository,
  ) {}

  private resolveWindow(orderCreatedAt: Date | null) {
    if (!orderCreatedAt) {
      return {
        windowEndsAt: null,
        daysRemaining: 0,
        withinWindow: false,
      };
    }

    const end = new Date(orderCreatedAt);
    end.setUTCDate(end.getUTCDate() + RETURN_WINDOW_DAYS);
    const msRemaining = end.getTime() - Date.now();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

    return {
      windowEndsAt: end.toISOString(),
      daysRemaining,
      withinWindow: msRemaining >= 0,
    };
  }

  async getOptions(orderId: string, userId: string): Promise<ReturnExchangeOptions> {
    const order = await this.orderRepo.findById(orderId, userId);
    if (!order) {
      throw new NotFoundError("Order", orderId);
    }

    const orderStatus = order.status ?? "pending";
    const { windowEndsAt, daysRemaining, withinWindow } = this.resolveWindow(order.createdAt ?? null);
    const hasEligibleStatus = RETURN_ELIGIBLE_STATUSES.has(orderStatus);

    const eligibleItems: ReturnEligibleItem[] = (order.items ?? [])
      .map((item: any) => {
        const quantityPurchased = Number(item.quantity ?? 0);
        const unitPrice = Number(item.unitPrice ?? 0);
        return {
          orderItemId: String(item.id),
          productName: String(item.productName ?? item.variant?.product?.name ?? "Item"),
          variantId: item.variantId ? String(item.variantId) : null,
          quantityPurchased,
          maxReturnableQuantity: Math.max(0, quantityPurchased),
          unitPrice,
          lineTotal: Number((unitPrice * quantityPurchased).toFixed(2)),
        };
      })
      .filter((item) => item.maxReturnableQuantity > 0);

    let reasonIfIneligible: string | null = null;
    if (!hasEligibleStatus) {
      reasonIfIneligible = `Order status \"${orderStatus}\" is not eligible for return/exchange.`;
    } else if (!withinWindow) {
      reasonIfIneligible = `Return window closed (${RETURN_WINDOW_DAYS} days).`;
    } else if (eligibleItems.length === 0) {
      reasonIfIneligible = "No return-eligible items found on this order.";
    }

    return {
      orderId: order.id,
      orderStatus,
      eligible: !reasonIfIneligible,
      reasonIfIneligible,
      windowEndsAt,
      daysRemaining,
      items: eligibleItems,
    };
  }

  async submitRequest(input: SubmitReturnExchangeInput) {
    const options = await this.getOptions(input.orderId, input.userId);
    if (!options.eligible) {
      throw new ValidationError(options.reasonIfIneligible ?? "Order is not eligible for return/exchange.");
    }

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new ValidationError("Select at least one item for return/exchange.");
    }

    const optionByItemId = new Map(options.items.map((item) => [item.orderItemId, item]));
    const seen = new Set<string>();

    const plannedItems: Array<{
      orderItemId: string;
      quantity: number;
      unitPrice: number;
      totalAmount: number;
      productName: string;
      variantId: string | null;
    }> = [];

    const exchangeItems: Array<{
      orderItemId: string;
      quantity: number;
      replacementVariantId: string;
    }> = [];

    for (const item of input.items) {
      const orderItemId = String(item.orderItemId ?? "").trim();
      if (!orderItemId) {
        throw new ValidationError("Return item is missing an order item id.");
      }
      if (seen.has(orderItemId)) {
        throw new ValidationError("Return item list contains duplicate order items.");
      }
      seen.add(orderItemId);

      const option = optionByItemId.get(orderItemId);
      if (!option) {
        throw new ValidationError(`Order item ${orderItemId} is not eligible for return/exchange.`);
      }

      const quantity = Number(item.quantity ?? 0);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new ValidationError("Return quantity must be at least 1.");
      }
      if (quantity > option.maxReturnableQuantity) {
        throw new ValidationError(`Requested quantity exceeds purchased quantity for ${option.productName}.`);
      }

      const totalAmount = Number((quantity * option.unitPrice).toFixed(2));
      plannedItems.push({
        orderItemId,
        quantity,
        unitPrice: option.unitPrice,
        totalAmount,
        productName: option.productName,
        variantId: option.variantId,
      });

      if (input.mode === "exchange") {
        const replacementVariantId = String(item.exchangeVariantId ?? option.variantId ?? "").trim();
        if (!replacementVariantId) {
          throw new ValidationError(`Exchange variant is required for ${option.productName}.`);
        }

        exchangeItems.push({
          orderItemId,
          quantity,
          replacementVariantId,
        });
      }
    }

    const refundAmount = plannedItems.reduce((sum, item) => sum + item.totalAmount, 0);
    const creditAmount = input.mode === "exchange" ? refundAmount : 0;

    const created = await this.returnRepo.createRequest({
      orderId: input.orderId,
      userId: input.userId,
      type: input.mode,
      reason: input.reason ?? null,
      requestedItems: plannedItems,
      exchangeItems,
      refundAmount: refundAmount.toFixed(2),
      creditAmount: creditAmount.toFixed(2),
      instantExchange: input.mode === "exchange" ? input.instantExchange ?? true : false,
      metadata: {
        orderStatus: options.orderStatus,
        windowEndsAt: options.windowEndsAt,
      },
    });

    if (!created) {
      throw new ValidationError("Could not create return/exchange request.");
    }

    return {
      request: created,
      refundAmount,
      creditAmount,
      plannedItems,
      exchangeItems,
    };
  }

  async listRequests(userId: string) {
    return this.returnRepo.listByUserId(userId);
  }
}
