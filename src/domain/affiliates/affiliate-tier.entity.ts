export interface AffiliateTier {
  id: string;
  storeId: string;
  name: string;
  level: number;
  commissionRate: string;
  bonusRate: string;
  minSales: number;
  minRevenue: string;
  createdAt: Date;
}

export function createAffiliateTier(
  params: Omit<AffiliateTier, "createdAt">,
): AffiliateTier {
  return { ...params, createdAt: new Date() };
}
