export const YOLO_WEEKLY_FLAG_MATRIX = [
  {
    key: "dynamic_bundles",
    featureId: 1,
    week: 2,
    description: "Dynamic bundles on cart and PDP.",
  },
  {
    key: "cart_goal_progress",
    featureId: 2,
    week: 2,
    description: "Cart progress bar for free shipping or gifts.",
  },
  {
    key: "checkout_recovery",
    featureId: 4,
    week: 3,
    description: "Recovery journeys for abandoned checkout.",
  },
  {
    key: "stock_confidence",
    featureId: 5,
    week: 4,
    description: "Low stock confidence and ETA hints.",
  },
  {
    key: "delivery_promise_engine",
    featureId: 6,
    week: 5,
    description: "Delivery promise and ETA calculation.",
  },
  {
    key: "review_intelligence",
    featureId: 10,
    week: 5,
    description: "Review enrichment and helpfulness ranking.",
  },
  {
    key: "intelligent_reorder",
    featureId: 3,
    week: 6,
    description: "One-click reorder from account and order history.",
  },
  {
    key: "loyalty_wallet",
    featureId: 7,
    week: 7,
    description: "Loyalty tiers, benefits wallet, and reward redemption.",
  },
  {
    key: "subscription_builder",
    featureId: 8,
    week: 8,
    description: "Mix-and-match subscription bundle builder and checkout flow.",
  },
  {
    key: "self_serve_returns_exchange",
    featureId: 9,
    week: 9,
    description: "Self-serve returns and instant exchange experiences for orders.",
  },
  {
    key: "affiliate_missions_dashboard",
    featureId: 11,
    week: 10,
    description: "Affiliate mission dashboard with weekly target progress.",
  },
  {
    key: "creator_storefront_pages",
    featureId: 12,
    week: 10,
    description: "Public creator storefront pages with tracked referral links.",
  },
  {
    key: "segment_orchestration",
    featureId: 13,
    week: 11,
    description: "Customer segment orchestration with refresh workflows.",
  },
  {
    key: "geo_aware_catalog_pricing",
    featureId: 14,
    week: 11,
    description: "Geo-aware catalog currency and localized pricing surfaces.",
  },
  {
    key: "intelligent_upsell_rules",
    featureId: 15,
    week: 12,
    description: "Contextual upsell recommendations based on cart contents.",
  },
  {
    key: "split_shipment_optimizer",
    featureId: 16,
    week: 12,
    description: "Multi-provider routing optimization for fulfillment requests.",
  },
  {
    key: "carrier_fallback_routing",
    featureId: 17,
    week: 12,
    description: "Fallback shipping-rate routing when carrier quotes are unavailable.",
  },
  {
    key: "ai_merchandising_copilot",
    featureId: 18,
    week: 13,
    description: "AI copilot for SKU copy drafting, enrichment, and SEO guardrails.",
  },
  {
    key: "ai_promotion_copilot",
    featureId: 19,
    week: 14,
    description: "AI copilot for campaign strategy drafting and promotion setup.",
  },
  {
    key: "ai_support_deflection",
    featureId: 20,
    week: 15,
    description: "AI support deflection assistant for tier-1 customer intents.",
  },
  {
    key: "ai_studio_product_pipeline",
    featureId: 21,
    week: 16,
    description: "AI-assisted studio-to-product pipeline draft automation.",
  },
  {
    key: "ai_incident_responder",
    featureId: 22,
    week: 17,
    description: "Agentic incident triage and runbook recommendation workflows.",
  },
  {
    key: "ai_fulfillment_exception_handler",
    featureId: 23,
    week: 18,
    description: "Agentic auto-handling for stuck or failed fulfillment requests.",
  },
  {
    key: "ai_pricing_experiments",
    featureId: 24,
    week: 19,
    description: "Agentic pricing experiments with guarded proposal and reversible rollout.",
  },
  {
    key: "no_code_workflow_builder",
    featureId: 25,
    week: 20,
    description: "No-code workflow builder for merchant automation rules.",
  },
] as const;

export type FeatureFlagKey = (typeof YOLO_WEEKLY_FLAG_MATRIX)[number]["key"];
export type FeatureFlags = Record<FeatureFlagKey, boolean>;

function parseCsvFlags(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function resolveFeatureFlags(enabledCsv: string | undefined): FeatureFlags {
  const enabled = parseCsvFlags(enabledCsv);

  return YOLO_WEEKLY_FLAG_MATRIX.reduce((acc, item) => {
    acc[item.key] = enabled.has(item.key);
    return acc;
  }, {} as FeatureFlags);
}

export function isFeatureEnabled(
  flags: FeatureFlags,
  key: FeatureFlagKey,
): boolean {
  return flags[key];
}
