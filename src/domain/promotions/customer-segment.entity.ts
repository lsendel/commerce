export interface CustomerSegment {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  rules: SegmentRule;
  memberCount: number;
  lastRefreshedAt: Date | null;
  createdAt: Date;
}

export type SegmentRule =
  | { type: "total_spent"; op: "gte" | "lte"; value: number }
  | { type: "order_count"; op: "gte" | "lte"; value: number }
  | { type: "registered_before"; date: string }
  | { type: "and"; children: SegmentRule[] }
  | { type: "or"; children: SegmentRule[] };
