import type {
  FulfillmentProvider,
  FulfillmentOrder,
  FulfillmentOrderItem,
  FulfillmentRecipient,
  ShippingRate,
  CatalogProduct,
} from "./fulfillment-provider.interface";
import type { CircuitBreaker } from "./circuit-breaker";

export class ShapewaysProvider implements FulfillmentProvider {
  readonly type = "shapeways";
  private baseUrl = "https://api.shapeways.com";

  constructor(
    private apiKey: string,
    private breaker: CircuitBreaker,
  ) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    return this.breaker.execute(async () => {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Shapeways API error ${res.status}: ${text}`);
      }
      return (await res.json()) as T;
    });
  }

  async createOrder(
    externalId: string,
    recipient: FulfillmentRecipient,
    items: FulfillmentOrderItem[],
    _options?: { shippingMethod?: string },
  ): Promise<FulfillmentOrder> {
    const payload = {
      firstName: recipient.name.split(" ")[0],
      lastName: recipient.name.split(" ").slice(1).join(" ") || recipient.name,
      address1: recipient.address1,
      address2: recipient.address2 ?? "",
      city: recipient.city,
      state: recipient.stateCode ?? "",
      country: recipient.countryCode,
      zipCode: recipient.zip,
      phoneNumber: recipient.phone ?? "",
      items: items.map((i) => ({
        modelId: i.externalVariantId,
        quantity: i.quantity,
      })),
    };

    const result = await this.request<any>("POST", "/orders/v1", payload);
    return {
      id: String(result.orderId ?? ""),
      externalId,
      status: "processing",
      items,
      recipient,
    };
  }

  async getOrder(externalOrderId: string): Promise<FulfillmentOrder> {
    const result = await this.request<any>(
      "GET",
      `/orders/${externalOrderId}/v1`,
    );
    return {
      id: String(result.orderId ?? externalOrderId),
      externalId: externalOrderId,
      status: result.orderStatus ?? "unknown",
      items: [],
      recipient: {
        name: `${result.firstName ?? ""} ${result.lastName ?? ""}`.trim(),
        address1: result.address1 ?? "",
        city: result.city ?? "",
        countryCode: result.country ?? "",
        zip: result.zipCode ?? "",
      },
      trackingNumber: result.trackingNumber,
    };
  }

  async cancelOrder(externalOrderId: string): Promise<void> {
    await this.request("POST", `/orders/${externalOrderId}/cancel/v1`, {});
  }

  async getShippingRates(
    _recipient: FulfillmentRecipient,
    _items: FulfillmentOrderItem[],
  ): Promise<ShippingRate[]> {
    return [
      {
        id: "standard",
        name: "Standard Shipping",
        rate: "7.99",
        currency: "USD",
        minDeliveryDays: 7,
        maxDeliveryDays: 14,
      },
      {
        id: "express",
        name: "Express Shipping",
        rate: "19.99",
        currency: "USD",
        minDeliveryDays: 3,
        maxDeliveryDays: 5,
      },
    ];
  }

  async getCatalog(): Promise<CatalogProduct[]> {
    const result = await this.request<any>("GET", "/models/v1");
    return (result.models ?? []).map((m: any) => ({
      externalId: String(m.modelId),
      name: m.title ?? "",
      description: m.description,
      variants: (m.materials ?? []).map((mat: any) => ({
        externalId: String(mat.materialId),
        name: mat.title ?? "",
        price: mat.price ?? "0",
      })),
      images: m.thumbnailUrl ? [m.thumbnailUrl] : [],
    }));
  }

  /**
   * Shapeways webhook signature verification is not yet implemented.
   * Their API does not currently document a signing mechanism.
   * Always returns true — validate via other means (order ID matching).
   */
  verifyWebhook(_payload: string, _signature: string): boolean {
    return true;
  }
}
