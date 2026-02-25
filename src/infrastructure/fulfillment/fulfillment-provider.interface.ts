export interface FulfillmentOrderItem {
  externalVariantId: string;
  quantity: number;
  retailPrice: string;
  name: string;
  files?: Array<{ type: string; url: string }>;
}

export interface FulfillmentRecipient {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  stateCode?: string;
  countryCode: string;
  zip: string;
  email?: string;
  phone?: string;
}

export interface FulfillmentOrder {
  id: string;
  externalId: string;
  status: string;
  items: FulfillmentOrderItem[];
  recipient: FulfillmentRecipient;
  shippingMethod?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  costs?: {
    subtotal: string;
    shipping: string;
    tax: string;
    total: string;
  };
}

export interface ShippingRate {
  id: string;
  name: string;
  rate: string;
  currency: string;
  minDeliveryDays: number;
  maxDeliveryDays: number;
}

export interface CatalogProduct {
  externalId: string;
  name: string;
  description?: string;
  variants: Array<{
    externalId: string;
    name: string;
    price: string;
    options?: Record<string, string>;
  }>;
  images?: string[];
}

export interface FulfillmentProvider {
  readonly type: string;

  createOrder(
    externalId: string,
    recipient: FulfillmentRecipient,
    items: FulfillmentOrderItem[],
    options?: { shippingMethod?: string; confirm?: boolean },
  ): Promise<FulfillmentOrder>;

  getOrder(externalOrderId: string): Promise<FulfillmentOrder>;

  cancelOrder(externalOrderId: string): Promise<void>;

  getShippingRates(
    recipient: FulfillmentRecipient,
    items: FulfillmentOrderItem[],
  ): Promise<ShippingRate[]>;

  getCatalog(page?: number): Promise<CatalogProduct[]>;

  verifyWebhook(payload: string, signature: string): boolean | Promise<boolean>;
}
