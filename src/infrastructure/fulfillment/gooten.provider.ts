import type {
  FulfillmentProvider,
  FulfillmentOrder,
  FulfillmentOrderItem,
  FulfillmentRecipient,
  ShippingRate,
  CatalogProduct,
} from "./fulfillment-provider.interface";
import type { CircuitBreaker } from "./circuit-breaker";

export class GootenProvider implements FulfillmentProvider {
  readonly type = "gooten";
  private baseUrl = "https://api.gooten.com/v1";

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
      const separator = path.includes("?") ? "&" : "?";
      const res = await fetch(
        `${this.baseUrl}${path}${separator}recipeid=${this.apiKey}`,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Gooten API error ${res.status}: ${text}`);
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
      ShipToAddress: {
        FirstName: recipient.name.split(" ")[0],
        LastName: recipient.name.split(" ").slice(1).join(" ") || recipient.name,
        Line1: recipient.address1,
        Line2: recipient.address2 ?? "",
        City: recipient.city,
        State: recipient.stateCode ?? "",
        CountryCode: recipient.countryCode,
        PostalCode: recipient.zip,
        Email: recipient.email ?? "",
        Phone: recipient.phone ?? "",
      },
      Items: items.map((i) => ({
        SKU: i.externalVariantId,
        Quantity: i.quantity,
        Images: i.files?.map((f) => ({ Url: f.url, Index: 0 })) ?? [],
      })),
      Meta: { PartnerBillingKey: externalId },
      Payment: { CurrencyCode: "USD" },
    };

    const result = await this.request<any>("POST", "/orders", payload);
    return {
      id: result.Id ?? "",
      externalId,
      status: "pending",
      items,
      recipient,
    };
  }

  async getOrder(externalOrderId: string): Promise<FulfillmentOrder> {
    const result = await this.request<any>(
      "GET",
      `/orders?id=${externalOrderId}`,
    );
    return {
      id: result.Id ?? externalOrderId,
      externalId: externalOrderId,
      status: result.StatusCode ?? "unknown",
      items: [],
      recipient: {
        name: "",
        address1: "",
        city: "",
        countryCode: "",
        zip: "",
      },
    };
  }

  async cancelOrder(externalOrderId: string): Promise<void> {
    await this.request("DELETE", `/orders/${externalOrderId}`);
  }

  async getShippingRates(
    recipient: FulfillmentRecipient,
    items: FulfillmentOrderItem[],
  ): Promise<ShippingRate[]> {
    const result = await this.request<any>("POST", "/shippingprices", {
      ShipToPostalCode: recipient.zip,
      ShipToCountry: recipient.countryCode,
      ShipToState: recipient.stateCode ?? "",
      Items: items.map((i) => ({
        SKU: i.externalVariantId,
        Quantity: i.quantity,
      })),
    });

    return (result.Result ?? []).map((r: any) => ({
      id: r.MethodId ?? "",
      name: r.Name ?? "",
      rate: r.Price?.Price ?? "0",
      currency: r.Price?.CurrencyCode ?? "USD",
      minDeliveryDays: r.EstBusinessDaysTilDelivery ?? 5,
      maxDeliveryDays: (r.EstBusinessDaysTilDelivery ?? 5) + 3,
    }));
  }

  async getCatalog(): Promise<CatalogProduct[]> {
    const result = await this.request<any>("GET", "/products");
    return (result.Products ?? []).map((p: any) => ({
      externalId: String(p.Id),
      name: p.Name ?? "",
      description: p.Description,
      variants: (p.Variants ?? []).map((v: any) => ({
        externalId: String(v.Sku),
        name: v.Name ?? "",
        price: v.PriceInfo?.Price ?? "0",
      })),
    }));
  }

  /**
   * Gooten does not support webhooks — order status is tracked via polling
   * (see Gooten status polling cron job). Always returns true as a no-op.
   */
  verifyWebhook(_payload: string, _signature: string): boolean {
    return true;
  }
}
