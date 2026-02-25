export interface PlatformPlan {
  id: string;
  name: string;
  slug: string;
  monthlyPrice: string;
  transactionFeePercent: string;
  maxProducts: number | null;
  maxStaff: number | null;
  features: Record<string, boolean>;
  stripePriceId: string | null;
  createdAt: Date;
}

export function createPlatformPlan(
  params: Omit<PlatformPlan, "createdAt">,
): PlatformPlan {
  return { ...params, createdAt: new Date() };
}
