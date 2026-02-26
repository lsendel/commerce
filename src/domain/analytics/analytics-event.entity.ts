export interface AnalyticsEvent {
  id: string;
  storeId: string;
  sessionId: string | null;
  userId: string | null;
  eventType: string;
  properties: Record<string, unknown>;
  pageUrl: string | null;
  referrer: string | null;
  userAgent: string | null;
  ipHash: string | null;
  syncedAt: Date | null;
  createdAt: Date;
}

export type AnalyticsEventType =
  | "page_view"
  | "add_to_cart"
  | "remove_from_cart"
  | "checkout_started"
  | "purchase"
  | "search"
  | "product_view"
  | "collection_view"
  | "signup"
  | "login";
