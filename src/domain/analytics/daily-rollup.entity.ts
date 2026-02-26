export interface DailyRollup {
  id: string;
  storeId: string;
  date: string;
  metric: DailyRollupMetric;
  dimensions: Record<string, unknown>;
  value: string;
  count: number;
  createdAt: Date;
}

export type DailyRollupMetric =
  | "page_views"
  | "unique_visitors"
  | "add_to_cart"
  | "checkout_started"
  | "purchases"
  | "revenue"
  | "aov";
