export interface CouponCode {
  id: string;
  promotionId: string;
  code: string;
  maxRedemptions: number | null;
  redemptionCount: number;
  singleUsePerCustomer: boolean;
  createdAt: Date;
}
