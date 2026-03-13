export type RecommendationSource = "related" | "catalog";

export interface RecommendationCandidate {
  productId: string;
  source: RecommendationSource;
  price: number;
  compareAtPrice?: number | null;
  inventoryQuantity?: number | null;
  createdAt?: Date | string | null;
  sharedCollectionCount?: number;
  baseScore?: number;
  reasons?: Iterable<string>;
}

export interface RecommendationRankingContext {
  cartAveragePrice: number;
  limit: number;
}

export interface RankedRecommendation {
  productId: string;
  score: number;
  reasons: string[];
}

const MODEL_VERSION = "wk48-ranking-v1";

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function toTimeMs(value: RecommendationCandidate["createdAt"]): number | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function scoreSingleCandidate(
  candidate: RecommendationCandidate,
  context: RecommendationRankingContext,
): RankedRecommendation {
  const reasons = new Set<string>(candidate.reasons ?? []);
  let score = Number(candidate.baseScore ?? 0);

  if (candidate.source === "related") {
    score += 3;
    reasons.add("co_purchase_signal");
  } else {
    score += 1;
    reasons.add("catalog_fallback");
  }

  const sharedCount = Math.max(0, Number(candidate.sharedCollectionCount ?? 0));
  if (sharedCount > 0) {
    score += Math.min(sharedCount, 4) * 0.35;
    reasons.add("collection_overlap");
  }

  if (context.cartAveragePrice > 0) {
    const upperBound = context.cartAveragePrice * 1.25;
    const lowerBound = context.cartAveragePrice * 0.4;
    if (candidate.price <= upperBound && candidate.price >= lowerBound) {
      score += 1;
      reasons.add("price_fit");
    } else if (candidate.price > context.cartAveragePrice * 1.6) {
      score -= 0.35;
      reasons.add("price_outlier");
    }
  }

  const inventory = Number(candidate.inventoryQuantity ?? 0);
  if (Number.isFinite(inventory)) {
    if (inventory > 12) {
      score += 0.5;
      reasons.add("in_stock_depth");
    } else if (inventory > 0) {
      score += 0.2;
      reasons.add("in_stock");
    } else if (inventory <= 0) {
      score -= 1;
      reasons.add("low_stock_risk");
    }
  }

  const compareAtPrice = Number(candidate.compareAtPrice ?? 0);
  if (compareAtPrice > candidate.price && candidate.price > 0) {
    score += 0.4;
    reasons.add("value_signal");
  }

  const createdAtMs = toTimeMs(candidate.createdAt);
  if (createdAtMs) {
    const ageDays = (Date.now() - createdAtMs) / 86_400_000;
    if (ageDays <= 30) {
      score += 0.35;
      reasons.add("freshness");
    }
  }

  reasons.add(MODEL_VERSION);
  return {
    productId: candidate.productId,
    score: roundToTwo(score),
    reasons: [...reasons],
  };
}

export function rankUpsellCandidates(
  candidates: RecommendationCandidate[],
  context: RecommendationRankingContext,
): RankedRecommendation[] {
  const scored = candidates.map((candidate) => scoreSingleCandidate(candidate, context));
  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.productId.localeCompare(b.productId);
    })
    .slice(0, Math.max(1, Math.min(context.limit, 24)));
}

export function getRecommendationRankingModelVersion() {
  return MODEL_VERSION;
}
