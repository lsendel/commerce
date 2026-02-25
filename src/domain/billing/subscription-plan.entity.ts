export type BillingPeriod = "day" | "week" | "month" | "year";

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: BillingPeriod;
  billingInterval: number;
  trialDays: number;
  stripePriceId: string;
  isActive: boolean;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

export function createSubscriptionPlan(
  params: Omit<SubscriptionPlan, "createdAt" | "updatedAt" | "isActive" | "trialDays" | "features"> & {
    isActive?: boolean;
    trialDays?: number;
    features?: string[];
  }
): SubscriptionPlan {
  const now = new Date();
  return {
    ...params,
    isActive: params.isActive ?? true,
    trialDays: params.trialDays ?? 0,
    features: params.features ?? [],
    createdAt: now,
    updatedAt: now,
  };
}
