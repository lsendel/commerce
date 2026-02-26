import type {
  FulfillmentProvider,
  FulfillmentOrder,
  FulfillmentOrderItem,
  FulfillmentRecipient,
  ShippingRate,
  CatalogProduct,
} from "./fulfillment-provider.interface";
import type { CircuitBreaker } from "./circuit-breaker";

export class ProdigiProvider implements FulfillmentProvider {
  readonly type = "prodigi";
  private baseUrl = "https://api.prodigi.com/v4.0";

  constructor(
    private apiKey: string,
    private breaker: CircuitBreaker,
    private webhookSecret?: string,
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
          "X-API-Key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Prodigi API error ${res.status}: ${text}`);
      }
      return (await res.json()) as T;
    });
  }

  async createOrder(
    externalId: string,
    recipient: FulfillmentRecipient,
    items: FulfillmentOrderItem[],
    options?: { shippingMethod?: string },
  ): Promise<FulfillmentOrder> {
    const payload = {
      merchantReference: externalId,
      shippingMethod: options?.shippingMethod ?? "Standard",
      recipient: {
        name: recipient.name,
        line1: recipient.address1,
        line2: recipient.address2 ?? "",
        postalOrZipCode: recipient.zip,
        townOrCity: recipient.city,
        stateOrCounty: recipient.stateCode ?? "",
        countryCode: recipient.countryCode,
        email: recipient.email ?? "",
        phoneNumber: recipient.phone ?? "",
      },
      items: items.map((i) => ({
        merchantReference: i.name,
        sku: i.externalVariantId,
        copies: i.quantity,
        assets: i.files?.map((f) => ({
          printArea: "default",
          url: f.url,
        })) ?? [],
      })),
    };

    const result = await this.request<any>("POST", "/Orders", payload);
    const order = result.order ?? result;
    return {
      id: order.id ?? "",
      externalId,
      status: order.status?.stage ?? "InProgress",
      items,
      recipient,
    };
  }

  async getOrder(externalOrderId: string): Promise<FulfillmentOrder> {
    const result = await this.request<any>(
      "GET",
      `/Orders/${externalOrderId}`,
    );
    const order = result.order ?? result;
    return {
      id: order.id ?? externalOrderId,
      externalId: order.merchantReference ?? "",
      status: order.status?.stage ?? "unknown",
      items: (order.items ?? []).map((i: any) => ({
        externalVariantId: i.sku ?? "",
        quantity: i.copies ?? 1,
        retailPrice: "0",
        name: i.merchantReference ?? "",
      })),
      recipient: {
        name: order.recipient?.name ?? "",
        address1: order.recipient?.line1 ?? "",
        city: order.recipient?.townOrCity ?? "",
        countryCode: order.recipient?.countryCode ?? "",
        zip: order.recipient?.postalOrZipCode ?? "",
      },
      trackingNumber: order.shipments?.[0]?.tracking?.number,
      trackingUrl: order.shipments?.[0]?.tracking?.url,
    };
  }

  async cancelOrder(externalOrderId: string): Promise<void> {
    await this.request("POST", `/Orders/${externalOrderId}/actions/cancel`, {});
  }

  async getShippingRates(
    _recipient: FulfillmentRecipient,
    _items: FulfillmentOrderItem[],
  ): Promise<ShippingRate[]> {
    // Prodigi includes shipping in product pricing
    return [
      {
        id: "standard",
        name: "Standard",
        rate: "0",
        currency: "USD",
        minDeliveryDays: 5,
        maxDeliveryDays: 12,
      },
      {
        id: "express",
        name: "Express",
        rate: "9.99",
        currency: "USD",
        minDeliveryDays: 2,
        maxDeliveryDays: 5,
      },
    ];
  }

  async getCatalog(): Promise<CatalogProduct[]> {
    const result = await this.request<any>("GET", "/products");
    return (result.products ?? []).map((p: any) => ({
      externalId: p.sku ?? "",
      name: p.description ?? "",
      variants: (p.variants ?? []).map((v: any) => ({
        externalId: v.sku ?? "",
        name: v.description ?? "",
        price: "0",
        options: v.attributes,
      })),
    }));
  }

  async verifyWebhook(payload: string, signature: string): Promise<boolean> {
    if (!this.webhookSecret) return false;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(this.webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const computed = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison
    if (computed.length !== signature.length) return false;
    let mismatch = 0;
    for (let i = 0; i < computed.length; i++) {
      mismatch |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return mismatch === 0;
  }
}
