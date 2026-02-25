export type ConversionStatus = "pending" | "approved" | "paid" | "rejected";
export type AttributionMethod = "link" | "coupon" | "tier";

export interface AffiliateConversion {
  id: string;
  affiliateId: string;
  orderId: string;
  orderTotal: string;
  commissionAmount: string;
  status: ConversionStatus;
  attributionMethod: AttributionMethod;
  clickId: string | null;
  couponCode: string | null;
  parentConversionId: string | null;
  createdAt: Date;
}

export function createAffiliateConversion(
  params: Omit<AffiliateConversion, "createdAt" | "status"> & {
    status?: ConversionStatus;
  },
): AffiliateConversion {
  return {
    ...params,
    status: params.status ?? "pending",
    createdAt: new Date(),
  };
}
