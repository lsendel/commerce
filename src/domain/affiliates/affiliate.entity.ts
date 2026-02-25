export type AffiliateStatus = "pending" | "approved" | "suspended";

export interface Affiliate {
  id: string;
  userId: string;
  storeId: string;
  status: AffiliateStatus;
  referralCode: string;
  customSlug: string | null;
  commissionRate: string;
  parentAffiliateId: string | null;
  tierId: string | null;
  totalEarnings: string;
  totalClicks: number;
  totalConversions: number;
  createdAt: Date;
  updatedAt: Date;
}

export function createAffiliate(
  params: Omit<
    Affiliate,
    | "createdAt"
    | "updatedAt"
    | "status"
    | "totalEarnings"
    | "totalClicks"
    | "totalConversions"
  > & { status?: AffiliateStatus },
): Affiliate {
  const now = new Date();
  return {
    ...params,
    status: params.status ?? "pending",
    totalEarnings: "0",
    totalClicks: 0,
    totalConversions: 0,
    createdAt: now,
    updatedAt: now,
  };
}
