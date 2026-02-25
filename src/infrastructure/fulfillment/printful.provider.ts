import type {
  FulfillmentProvider,
  FulfillmentOrder,
  FulfillmentOrderItem,
  FulfillmentRecipient,
  ShippingRate,
  CatalogProduct,
} from "./fulfillment-provider.interface";
import type { CircuitBreaker } from "./circuit-breaker";

export class PrintfulProvider implements FulfillmentProvider {
  readonly type = "printful";
  private baseUrl = "https://api.printful.com";

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
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Printful API error ${res.status}: ${text}`);
      }
      const json = (await res.json()) as { result: T };
      return json.result;
    });
  }

  async createOrder(
    externalId: string,
    recipient: FulfillmentRecipient,
    items: FulfillmentOrderItem[],
    options?: { shippingMethod?: string; confirm?: boolean },
  ): Promise<FulfillmentOrder> {
    const payload = {
      external_id: externalId,
      recipient: {
        name: recipient.name,
        address1: recipient.address1,
        address2: recipient.address2,
        city: recipient.city,
        state_code: recipient.stateCode,
        country_code: recipient.countryCode,
        zip: recipient.zip,
        email: recipient.email,
        phone: recipient.phone,
      },
      items: items.map((i) => ({
        sync_variant_id: i.externalVariantId,
        quantity: i.quantity,
        retail_price: i.retailPrice,
        name: i.name,
        files: i.files,
      })),
      shipping: options?.shippingMethod,
    };

    const confirm = options?.confirm ?? false;
    const result = await this.request<any>(
      "POST",
      `/orders${confirm ? "?confirm=true" : ""}`,
      payload,
    );

    return this.mapOrder(result);
  }

  async getOrder(externalOrderId: string): Promise<FulfillmentOrder> {
    const result = await this.request<any>(
      "GET",
      `/orders/@${externalOrderId}`,
    );
    return this.mapOrder(result);
  }

  async cancelOrder(externalOrderId: string): Promise<void> {
    await this.request("DELETE", `/orders/@${externalOrderId}`);
  }

  async getShippingRates(
    recipient: FulfillmentRecipient,
    items: FulfillmentOrderItem[],
  ): Promise<ShippingRate[]> {
    const result = await this.request<any[]>("POST", "/shipping/rates", {
      recipient: {
        address1: recipient.address1,
        city: recipient.city,
        country_code: recipient.countryCode,
        state_code: recipient.stateCode,
        zip: recipient.zip,
      },
      items: items.map((i) => ({
        sync_variant_id: i.externalVariantId,
        quantity: i.quantity,
      })),
    });

    return result.map((r: any) => ({
      id: r.id,
      name: r.name,
      rate: r.rate,
      currency: r.currency,
      minDeliveryDays: r.minDeliveryDays ?? 5,
      maxDeliveryDays: r.maxDeliveryDays ?? 10,
    }));
  }

  async getCatalog(): Promise<CatalogProduct[]> {
    const result = await this.request<any[]>("GET", "/store/products");
    return result.map((p: any) => ({
      externalId: String(p.id),
      name: p.name,
      variants: (p.variants ?? []).map((v: any) => ({
        externalId: String(v.id),
        name: v.name,
        price: v.retail_price ?? "0",
      })),
      images: p.thumbnail_url ? [p.thumbnail_url] : [],
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

  private mapOrder(raw: any): FulfillmentOrder {
    return {
      id: String(raw.id),
      externalId: raw.external_id ?? "",
      status: raw.status ?? "draft",
      items: (raw.items ?? []).map((i: any) => ({
        externalVariantId: String(i.sync_variant_id),
        quantity: i.quantity,
        retailPrice: i.retail_price ?? "0",
        name: i.name ?? "",
      })),
      recipient: {
        name: raw.recipient?.name ?? "",
        address1: raw.recipient?.address1 ?? "",
        city: raw.recipient?.city ?? "",
        countryCode: raw.recipient?.country_code ?? "",
        zip: raw.recipient?.zip ?? "",
      },
      trackingNumber: raw.shipments?.[0]?.tracking_number,
      trackingUrl: raw.shipments?.[0]?.tracking_url,
      costs: raw.costs
        ? {
            subtotal: raw.costs.subtotal ?? "0",
            shipping: raw.costs.shipping ?? "0",
            tax: raw.costs.tax ?? "0",
            total: raw.costs.total ?? "0",
          }
        : undefined,
    };
  }
}
