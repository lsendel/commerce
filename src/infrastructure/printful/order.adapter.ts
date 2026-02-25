import type { PrintfulClient } from "./printful.client";

// ─── Printful Order shapes ─────────────────────────────────────────────────

export interface PrintfulOrderRecipient {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
  email?: string;
  phone?: string;
}

export interface PrintfulOrderItem {
  sync_variant_id: number;
  quantity: number;
  retail_price?: string;
}

export interface PrintfulOrderInput {
  external_id?: string;
  recipient: PrintfulOrderRecipient;
  items: PrintfulOrderItem[];
  retail_costs?: {
    subtotal?: string;
    shipping?: string;
    tax?: string;
  };
}

interface PrintfulOrderResult {
  id: number;
  external_id: string;
  status: string;
  shipping: string;
  shipping_service_name: string;
  created: number;
  updated: number;
  recipient: PrintfulOrderRecipient;
  items: Array<{
    id: number;
    external_id: string;
    variant_id: number;
    sync_variant_id: number;
    quantity: number;
    price: string;
    retail_price: string;
    name: string;
    sku: string;
  }>;
  retail_costs: {
    currency: string;
    subtotal: string;
    discount: string;
    shipping: string;
    tax: string;
    total: string;
  };
  costs: {
    currency: string;
    subtotal: string;
    discount: string;
    shipping: string;
    tax: string;
    total: string;
  };
}

// ─── Order Adapter ─────────────────────────────────────────────────────────

export class PrintfulOrderAdapter {
  /**
   * Submit an order to Printful for fulfillment.
   * By default the order is created in draft status.
   * Pass confirm=true query param to auto-confirm.
   */
  async createOrder(
    client: PrintfulClient,
    orderData: PrintfulOrderInput,
    confirm = false,
  ): Promise<{
    printfulOrderId: number;
    status: string;
    costs: { subtotal: string; shipping: string; tax: string; total: string };
  }> {
    const path = confirm ? "/orders?confirm=true" : "/orders";
    const response = await client.post<PrintfulOrderResult>(path, orderData);

    const order = response.result;

    return {
      printfulOrderId: order.id,
      status: order.status,
      costs: {
        subtotal: order.costs.subtotal,
        shipping: order.costs.shipping,
        tax: order.costs.tax,
        total: order.costs.total,
      },
    };
  }

  /**
   * Get the current status and details of a Printful order.
   */
  async getOrder(
    client: PrintfulClient,
    orderId: number,
  ): Promise<{
    printfulOrderId: number;
    externalId: string;
    status: string;
    items: Array<{
      name: string;
      quantity: number;
      price: string;
      sku: string;
    }>;
    costs: { subtotal: string; shipping: string; tax: string; total: string };
  }> {
    const response = await client.get<PrintfulOrderResult>(
      `/orders/${orderId}`,
    );

    const order = response.result;

    return {
      printfulOrderId: order.id,
      externalId: order.external_id,
      status: order.status,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.retail_price,
        sku: item.sku,
      })),
      costs: {
        subtotal: order.costs.subtotal,
        shipping: order.costs.shipping,
        tax: order.costs.tax,
        total: order.costs.total,
      },
    };
  }

  /**
   * Cancel a Printful order. Only works for orders not yet in fulfillment.
   */
  async cancelOrder(
    client: PrintfulClient,
    orderId: number,
  ): Promise<{ printfulOrderId: number; status: string }> {
    const response = await client.delete<PrintfulOrderResult>(
      `/orders/${orderId}`,
    );

    return {
      printfulOrderId: response.result.id,
      status: response.result.status,
    };
  }
}
