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
