export const ANALYTICS_EVENT_ALIASES = {
  begin_checkout: "checkout_started",
  checkout_begin: "checkout_started",
  order_completed: "purchase",
  purchase_completed: "purchase",
} as const;

export const ANALYTICS_FUNNEL_STEPS = [
  "page_view",
  "product_view",
  "add_to_cart",
  "checkout_started",
  "order_completed",
] as const;

export const ANALYTICS_EVENT_TYPES_BY_FUNNEL_STEP: Record<
  (typeof ANALYTICS_FUNNEL_STEPS)[number],
  string[]
> = {
  page_view: ["page_view"],
  product_view: ["product_view"],
  add_to_cart: ["add_to_cart"],
  checkout_started: ["checkout_started", "begin_checkout"],
  order_completed: ["purchase", "order_completed"],
};

export function normalizeAnalyticsEventType(eventType: string): string {
  const key = eventType.trim().toLowerCase();
  if (!key) return "unknown";
  return ANALYTICS_EVENT_ALIASES[
    key as keyof typeof ANALYTICS_EVENT_ALIASES
  ] ?? key;
}
