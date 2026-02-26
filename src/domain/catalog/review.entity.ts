export type ReviewStatus = "pending" | "approved" | "rejected" | "flagged";

export interface ProductReview {
  id: string;
  storeId: string;
  productId: string;
  userId: string;
  rating: number;
  title: string | null;
  content: string | null;
  isVerifiedPurchase: boolean;
  status: ReviewStatus;
  moderatedAt: Date | null;
  helpfulCount: number;
  reportedCount: number;
  createdAt: Date;
}
